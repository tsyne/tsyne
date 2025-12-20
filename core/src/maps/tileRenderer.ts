/**
 * Tile Renderer
 *
 * Utilities for fetching, decoding, and rendering map tiles.
 * Uses pngjs for PNG decoding in Node.js environment.
 * Supports filesystem caching for offline use (OSM requires 7-day min TTL).
 */

import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';
import { RenderTarget, fetchResource, drawImage } from '../graphics';
import { TileSource, TileCoord, buildTileUrl } from './tiles';

// ============================================================================
// PNG Decoding
// ============================================================================

export interface ImageData {
    width: number;
    height: number;
    data: Uint8Array;
}

/**
 * Decode a PNG from ArrayBuffer to RGBA pixels
 */
export async function decodePNG(buffer: ArrayBuffer): Promise<ImageData> {
    return new Promise((resolve, reject) => {
        const png = new PNG();

        png.on('parsed', function() {
            resolve({
                width: png.width,
                height: png.height,
                data: new Uint8Array(png.data)
            });
        });

        png.on('error', reject);

        png.parse(Buffer.from(buffer));
    });
}

// ============================================================================
// Tile Fetching and Rendering
// ============================================================================

export interface TileImage {
    coord: TileCoord;
    image: ImageData;
}

/**
 * Fetch and decode a single tile
 */
export async function fetchTileImage(
    source: TileSource,
    coord: TileCoord,
    signal?: AbortSignal
): Promise<TileImage> {
    const url = buildTileUrl(source, coord);

    const response = await fetchResource(url, { signal });
    if (!response.ok) {
        throw new Error(`Failed to fetch tile ${coord.z}/${coord.x}/${coord.y}: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const image = await decodePNG(buffer);

    return { coord, image };
}

// ============================================================================
// Map Viewport
// ============================================================================

export interface MapViewport {
    center: { lng: number; lat: number };
    zoom: number;
    width: number;
    height: number;
}

/**
 * Get tile coordinates needed to cover a viewport
 */
export function getTilesForViewport(viewport: MapViewport): TileCoord[] {
    const { center, zoom, width, height } = viewport;
    const z = Math.round(zoom);

    // World size at this zoom level
    const worldSize = 256 * Math.pow(2, z);

    // Center in world pixels
    const centerX = ((center.lng + 180) / 360) * worldSize;
    const latRad = center.lat * Math.PI / 180;
    const centerY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * worldSize;

    // Viewport bounds in world pixels
    const left = centerX - width / 2;
    const right = centerX + width / 2;
    const top = centerY - height / 2;
    const bottom = centerY + height / 2;

    // Convert to tile coordinates
    const tileSize = 256;
    const minTileX = Math.floor(left / tileSize);
    const maxTileX = Math.floor(right / tileSize);
    const minTileY = Math.floor(top / tileSize);
    const maxTileY = Math.floor(bottom / tileSize);

    const tiles: TileCoord[] = [];
    const maxTile = Math.pow(2, z) - 1;

    for (let x = minTileX; x <= maxTileX; x++) {
        for (let y = minTileY; y <= maxTileY; y++) {
            // Handle world wrapping for x, clamp y
            const wrappedX = ((x % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1);
            if (y >= 0 && y <= maxTile) {
                tiles.push({ z, x: wrappedX, y });
            }
        }
    }

    return tiles;
}

/**
 * Calculate where a tile should be drawn in the viewport
 */
export function getTilePosition(
    coord: TileCoord,
    viewport: MapViewport,
    tileSize: number = 256
): { x: number; y: number; size: number } {
    const { center, zoom, width, height } = viewport;
    const z = Math.round(zoom);

    // World size at this zoom level
    const worldSize = 256 * Math.pow(2, z);

    // Center in world pixels
    const centerX = ((center.lng + 180) / 360) * worldSize;
    const latRad = center.lat * Math.PI / 180;
    const centerY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * worldSize;

    // Tile position in world pixels
    const tileX = coord.x * tileSize;
    const tileY = coord.y * tileSize;

    // Position relative to viewport center
    const x = (tileX - centerX) + width / 2;
    const y = (tileY - centerY) + height / 2;

    return { x, y, size: tileSize };
}

// ============================================================================
// Tile Map Renderer
// ============================================================================

interface CachedTile {
    coord: TileCoord;
    image: ImageData;
    timestamp: number;
}

export interface TileMapRendererOptions {
    maxCacheSize?: number;
    cacheMaxAge?: number;
    /** Filesystem cache directory. If provided, tiles are cached to disk with 7-day TTL (per OSM policy) */
    fsCachePath?: string;
    /** Filesystem cache TTL in ms. Defaults to 7 days (OSM requirement) */
    fsCacheMaxAge?: number;
}

/**
 * Manages tile loading and rendering for a map viewport
 */
export class TileMapRenderer {
    private source: TileSource;
    private cache: Map<string, CachedTile> = new Map();
    private pending: Map<string, Promise<TileImage | null>> = new Map();
    private maxCacheSize: number;
    private cacheMaxAge: number;
    private fsCachePath?: string;
    private fsCacheMaxAge: number;

    constructor(source: TileSource, options?: TileMapRendererOptions) {
        this.source = source;
        this.maxCacheSize = options?.maxCacheSize ?? 50;
        this.cacheMaxAge = options?.cacheMaxAge ?? 5 * 60 * 1000; // 5 minutes in-memory
        this.fsCachePath = options?.fsCachePath;
        this.fsCacheMaxAge = options?.fsCacheMaxAge ?? 7 * 24 * 60 * 60 * 1000; // 7 days (OSM policy)

        // Ensure cache directory exists
        if (this.fsCachePath) {
            try {
                fs.mkdirSync(this.fsCachePath, { recursive: true });
            } catch (err) {
                console.error('Failed to create tile cache directory:', err);
                this.fsCachePath = undefined;
            }
        }
    }

    /**
     * Get the source identifier for cache subdirectory
     */
    private getSourceId(): string {
        // Create a safe directory name from the source URL
        const url = this.source.url;
        if (url.includes('openstreetmap')) return 'osm';
        if (url.includes('mapbox') && url.includes('light')) return 'mapbox-light';
        if (url.includes('mapbox') && url.includes('dark')) return 'mapbox-dark';
        if (url.includes('mapbox') && url.includes('streets')) return 'mapbox-streets';
        if (url.includes('mapbox') && url.includes('satellite')) return 'mapbox-satellite';
        // Fallback: hash-like identifier
        return 'tiles-' + url.replace(/[^a-z0-9]/gi, '').slice(0, 16);
    }

    /**
     * Get filesystem cache path for a tile
     */
    private getFsCachePath(coord: TileCoord): string | null {
        if (!this.fsCachePath) return null;
        const sourceDir = path.join(this.fsCachePath, this.getSourceId());
        return path.join(sourceDir, `${coord.z}`, `${coord.x}`, `${coord.y}.png`);
    }

    /**
     * Try to load tile from filesystem cache
     */
    private async loadFromFsCache(coord: TileCoord): Promise<ImageData | null> {
        const cachePath = this.getFsCachePath(coord);
        if (!cachePath) return null;

        try {
            const stat = fs.statSync(cachePath);
            const age = Date.now() - stat.mtimeMs;

            // Check if cache is still valid
            if (age > this.fsCacheMaxAge) {
                // Cache expired, delete it
                fs.unlinkSync(cachePath);
                return null;
            }

            // Read and decode the cached PNG
            const buffer = fs.readFileSync(cachePath);
            return await decodePNG(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        } catch {
            // File doesn't exist or read error
            return null;
        }
    }

    /**
     * Save tile to filesystem cache
     */
    private saveToFsCache(coord: TileCoord, pngBuffer: ArrayBuffer): void {
        const cachePath = this.getFsCachePath(coord);
        if (!cachePath) return;

        try {
            // Ensure directory exists
            const dir = path.dirname(cachePath);
            fs.mkdirSync(dir, { recursive: true });

            // Write the PNG file
            fs.writeFileSync(cachePath, Buffer.from(pngBuffer));
        } catch (err) {
            // Silently fail - caching is best-effort
            console.error('Failed to cache tile:', err);
        }
    }

    private key(coord: TileCoord): string {
        return `${coord.z}/${coord.x}/${coord.y}`;
    }

    /**
     * Get a tile (from memory cache, filesystem cache, or network)
     */
    async getTile(coord: TileCoord): Promise<TileImage | null> {
        const k = this.key(coord);

        // 1. Check in-memory cache (fastest)
        const cached = this.cache.get(k);
        if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
            return { coord: cached.coord, image: cached.image };
        }

        // Check pending
        const pending = this.pending.get(k);
        if (pending) {
            return pending;
        }

        // 2. Check filesystem cache
        const promise = (async (): Promise<TileImage | null> => {
            // Try filesystem cache first
            const fsImage = await this.loadFromFsCache(coord);
            if (fsImage) {
                // Add to in-memory cache
                this.addToMemoryCache(k, coord, fsImage);
                return { coord, image: fsImage };
            }

            // 3. Fetch from network
            try {
                const url = buildTileUrl(this.source, coord);
                const response = await fetchResource(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const buffer = await response.arrayBuffer();

                // Save to filesystem cache (raw PNG bytes)
                this.saveToFsCache(coord, buffer);

                // Decode PNG
                const image = await decodePNG(buffer);

                // Add to in-memory cache
                this.addToMemoryCache(k, coord, image);

                return { coord, image };
            } catch (err: any) {
                console.error(`Failed to load tile ${k}:`, err.message);
                return null;
            }
        })();

        this.pending.set(k, promise);
        promise.finally(() => this.pending.delete(k));
        return promise;
    }

    /**
     * Add a tile to the in-memory cache with LRU eviction
     */
    private addToMemoryCache(key: string, coord: TileCoord, image: ImageData): void {
        // Evict old entries if at capacity
        while (this.cache.size >= this.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            coord,
            image,
            timestamp: Date.now()
        });
    }

    /**
     * Render tiles for a viewport to the target
     */
    async render(target: RenderTarget, viewport: MapViewport): Promise<void> {
        const tiles = getTilesForViewport(viewport);

        // Fetch all tiles in parallel
        const tileImages = await Promise.all(
            tiles.map(coord => this.getTile(coord))
        );

        // Render tiles to target
        for (const tileImage of tileImages) {
            if (!tileImage) continue;

            const pos = getTilePosition(tileImage.coord, viewport, this.source.tileSize || 256);

            // Scale tile to match viewport zoom if needed
            const scale = viewport.width / (viewport.width); // 1:1 for now
            const destSize = (this.source.tileSize || 256) * scale;

            drawImage(
                target,
                tileImage.image,
                pos.x,
                pos.y,
                destSize,
                destSize
            );
        }
    }

    /**
     * Clear the tile cache
     */
    clearCache(): void {
        this.cache.clear();
        this.pending.clear();
    }
}
