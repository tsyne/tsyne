/**
 * Tile Loading
 *
 * Utilities for fetching map tiles from Mapbox and other tile servers.
 * Uses Node.js fetch API (no DOM dependencies).
 */

import { fetchResource } from '../graphics';

// ============================================================================
// Tile Coordinate Types
// ============================================================================

export interface TileCoord {
    z: number;  // Zoom level
    x: number;  // Tile column
    y: number;  // Tile row
}

export interface TileBounds {
    minZoom: number;
    maxZoom: number;
    bounds?: [number, number, number, number];  // [west, south, east, north]
}

// ============================================================================
// Tile URL Templates
// ============================================================================

export interface TileSource {
    url: string;
    type: 'vector' | 'raster' | 'raster-dem';
    tileSize?: number;
    minZoom?: number;
    maxZoom?: number;
}

/**
 * Common tile source presets
 */
export const TILE_SOURCES = {
    // Mapbox styled raster tiles (require access token)
    // These use the Static Tiles API to get pre-rendered raster versions of vector styles
    mapboxLight: (accessToken: string): TileSource => ({
        url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}?access_token=${accessToken}`,
        type: 'raster',
        tileSize: 256,
        minZoom: 0,
        maxZoom: 22
    }),

    mapboxDark: (accessToken: string): TileSource => ({
        url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${accessToken}`,
        type: 'raster',
        tileSize: 256,
        minZoom: 0,
        maxZoom: 22
    }),

    mapboxStreets: (accessToken: string): TileSource => ({
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=${accessToken}`,
        type: 'raster',
        tileSize: 256,
        minZoom: 0,
        maxZoom: 22
    }),

    mapboxSatellite: (accessToken: string): TileSource => ({
        url: `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token=${accessToken}`,
        type: 'raster',
        tileSize: 512,
        minZoom: 0,
        maxZoom: 22
    }),

    mapboxTerrain: (accessToken: string): TileSource => ({
        url: `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=${accessToken}`,
        type: 'raster-dem',
        tileSize: 256,
        minZoom: 0,
        maxZoom: 15
    }),

    // OpenStreetMap (no token required)
    osmRaster: (): TileSource => ({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        type: 'raster',
        tileSize: 256,
        minZoom: 0,
        maxZoom: 19
    })
};

// ============================================================================
// Tile Math
// ============================================================================

/**
 * Convert longitude/latitude to tile coordinates at a given zoom level
 */
export function lngLatToTile(lng: number, lat: number, zoom: number): TileCoord {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);

    return { z: zoom, x, y };
}

/**
 * Convert tile coordinates to longitude/latitude (northwest corner)
 */
export function tileToLngLat(tile: TileCoord): { lng: number; lat: number } {
    const n = Math.pow(2, tile.z);
    const lng = tile.x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tile.y / n)));
    const lat = latRad * 180 / Math.PI;

    return { lng, lat };
}

/**
 * Get the bounding box of a tile
 */
export function tileBounds(tile: TileCoord): {
    west: number;
    south: number;
    east: number;
    north: number;
} {
    const nw = tileToLngLat(tile);
    const se = tileToLngLat({ z: tile.z, x: tile.x + 1, y: tile.y + 1 });

    return {
        west: nw.lng,
        north: nw.lat,
        east: se.lng,
        south: se.lat
    };
}

/**
 * Get all tiles that cover a given bounds at a zoom level
 */
export function getTilesInBounds(
    west: number, south: number, east: number, north: number,
    zoom: number
): TileCoord[] {
    const nwTile = lngLatToTile(west, north, zoom);
    const seTile = lngLatToTile(east, south, zoom);

    const tiles: TileCoord[] = [];

    for (let x = nwTile.x; x <= seTile.x; x++) {
        for (let y = nwTile.y; y <= seTile.y; y++) {
            tiles.push({ z: zoom, x, y });
        }
    }

    return tiles;
}

// ============================================================================
// Tile Fetching
// ============================================================================

export interface TileData {
    coord: TileCoord;
    data: ArrayBuffer;
    type: 'vector' | 'raster' | 'raster-dem';
}

/**
 * Build tile URL from template
 */
export function buildTileUrl(source: TileSource, tile: TileCoord): string {
    return source.url
        .replace('{z}', String(tile.z))
        .replace('{x}', String(tile.x))
        .replace('{y}', String(tile.y));
}

/**
 * Fetch a single tile
 */
export async function fetchTile(
    source: TileSource,
    tile: TileCoord,
    signal?: AbortSignal
): Promise<TileData> {
    const url = buildTileUrl(source, tile);

    const response = await fetchResource(url, { signal });

    if (!response.ok) {
        throw new Error(`Failed to fetch tile ${tile.z}/${tile.x}/${tile.y}: ${response.status}`);
    }

    const data = await response.arrayBuffer();

    return {
        coord: tile,
        data,
        type: source.type
    };
}

/**
 * Fetch multiple tiles in parallel
 */
export async function fetchTiles(
    source: TileSource,
    tiles: TileCoord[],
    options?: {
        maxConcurrent?: number;
        signal?: AbortSignal;
        onProgress?: (loaded: number, total: number) => void;
    }
): Promise<TileData[]> {
    const { maxConcurrent = 6, signal, onProgress } = options || {};

    const results: TileData[] = [];
    let loaded = 0;

    // Process in batches to limit concurrency
    for (let i = 0; i < tiles.length; i += maxConcurrent) {
        if (signal?.aborted) {
            throw new Error('Tile fetch aborted');
        }

        const batch = tiles.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(
            batch.map(tile => fetchTile(source, tile, signal))
        );

        results.push(...batchResults);
        loaded += batchResults.length;

        if (onProgress) {
            onProgress(loaded, tiles.length);
        }
    }

    return results;
}

// ============================================================================
// Tile Cache
// ============================================================================

interface CacheEntry {
    data: TileData;
    timestamp: number;
}

/**
 * Simple in-memory tile cache with LRU eviction
 */
export class TileCache {
    private cache: Map<string, CacheEntry> = new Map();
    private maxSize: number;
    private maxAge: number;  // milliseconds

    constructor(maxSize: number = 100, maxAgeMs: number = 5 * 60 * 1000) {
        this.maxSize = maxSize;
        this.maxAge = maxAgeMs;
    }

    private key(tile: TileCoord, sourceUrl: string): string {
        return `${sourceUrl}:${tile.z}/${tile.x}/${tile.y}`;
    }

    get(tile: TileCoord, sourceUrl: string): TileData | null {
        const k = this.key(tile, sourceUrl);
        const entry = this.cache.get(k);

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.cache.delete(k);
            return null;
        }

        // Move to end (most recently used)
        this.cache.delete(k);
        this.cache.set(k, entry);

        return entry.data;
    }

    set(tile: TileCoord, sourceUrl: string, data: TileData): void {
        const k = this.key(tile, sourceUrl);

        // Evict oldest if at capacity
        while (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            } else {
                break;
            }
        }

        this.cache.set(k, {
            data,
            timestamp: Date.now()
        });
    }

    has(tile: TileCoord, sourceUrl: string): boolean {
        return this.get(tile, sourceUrl) !== null;
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

// ============================================================================
// Tile Manager
// ============================================================================

/**
 * Manages tile loading with caching and deduplication
 */
export class TileManager {
    private cache: TileCache;
    private pending: Map<string, Promise<TileData>> = new Map();
    private source: TileSource;

    constructor(source: TileSource, cacheSize: number = 100) {
        this.source = source;
        this.cache = new TileCache(cacheSize);
    }

    private key(tile: TileCoord): string {
        return `${tile.z}/${tile.x}/${tile.y}`;
    }

    /**
     * Get a tile, using cache or fetching as needed
     */
    async getTile(tile: TileCoord, signal?: AbortSignal): Promise<TileData> {
        const k = this.key(tile);

        // Check cache
        const cached = this.cache.get(tile, this.source.url);
        if (cached) {
            return cached;
        }

        // Check if already fetching
        const pending = this.pending.get(k);
        if (pending) {
            return pending;
        }

        // Fetch
        const promise = fetchTile(this.source, tile, signal)
            .then(data => {
                this.cache.set(tile, this.source.url, data);
                this.pending.delete(k);
                return data;
            })
            .catch(err => {
                this.pending.delete(k);
                throw err;
            });

        this.pending.set(k, promise);
        return promise;
    }

    /**
     * Get multiple tiles
     */
    async getTiles(tiles: TileCoord[], signal?: AbortSignal): Promise<TileData[]> {
        return Promise.all(tiles.map(tile => this.getTile(tile, signal)));
    }

    /**
     * Get all tiles needed for a viewport
     */
    async getTilesForBounds(
        west: number, south: number, east: number, north: number,
        zoom: number,
        signal?: AbortSignal
    ): Promise<TileData[]> {
        const clampedZoom = Math.max(
            this.source.minZoom || 0,
            Math.min(this.source.maxZoom || 22, Math.round(zoom))
        );

        const tiles = getTilesInBounds(west, south, east, north, clampedZoom);
        return this.getTiles(tiles, signal);
    }

    clearCache(): void {
        this.cache.clear();
    }
}
