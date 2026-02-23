/**
 * Phase 6c: Tile cache tests for TileMapRenderer
 *
 * Unit tests with mocked HTTP (fetchResource) and filesystem (fs).
 * Verifies: in-memory cache hit/miss, LRU eviction, TTL expiry,
 * filesystem cache path structure, deduplication of concurrent fetches.
 */

// Import directly from dist to avoid pulling in gRPC via full tsyne bundle
import { TileMapRenderer } from 'tsyne/dist/src/maps/tileRenderer';
import type { TileSource, TileCoord } from 'tsyne/dist/src/maps/tiles';

// ============================================================================
// Mock setup — must be before imports that use these modules
// ============================================================================

// Create a minimal valid 1×1 PNG buffer
function createMockPngBuffer(): Buffer {
  const { PNG } = require('pngjs');
  const png = new PNG({ width: 1, height: 1 });
  // Set a single red pixel
  png.data[0] = 255; // R
  png.data[1] = 0;   // G
  png.data[2] = 0;   // B
  png.data[3] = 255; // A
  return PNG.sync.write(png);
}

let mockPngBuffer: Buffer;
let fetchCallCount: number;
let fetchUrls: string[];

// Mock fetchResource at the graphics module level
// tileRenderer.ts imports from '../graphics' which re-exports from './platform'
jest.mock('tsyne/dist/src/graphics/platform', () => {
  const original = jest.requireActual('tsyne/dist/src/graphics/platform');
  return {
    ...original,
    fetchResource: jest.fn(async (url: string) => {
      fetchCallCount++;
      fetchUrls.push(url);
      return {
        ok: true,
        status: 200,
        headers: new Map(),
        arrayBuffer: () => Promise.resolve(mockPngBuffer.buffer.slice(
          mockPngBuffer.byteOffset,
          mockPngBuffer.byteOffset + mockPngBuffer.byteLength
        )),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      };
    }),
  };
});

// Also mock the barrel re-export
jest.mock('tsyne/dist/src/graphics', () => {
  return jest.requireActual('tsyne/dist/src/graphics');
});

// Mock fs to avoid real filesystem writes during tests
const mockFsFiles: Map<string, { data: Buffer; mtime: number }> = new Map();

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  statSync: jest.fn((path: string) => {
    const file = mockFsFiles.get(path);
    if (!file) throw new Error('ENOENT');
    return { mtimeMs: file.mtime };
  }),
  readFileSync: jest.fn((path: string) => {
    const file = mockFsFiles.get(path);
    if (!file) throw new Error('ENOENT');
    return file.data;
  }),
  writeFileSync: jest.fn((path: string, data: Buffer) => {
    mockFsFiles.set(path, { data, mtime: Date.now() });
  }),
  unlinkSync: jest.fn((path: string) => {
    mockFsFiles.delete(path);
  }),
}));

// ============================================================================
// Test helpers
// ============================================================================

const OSM_SOURCE: TileSource = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  type: 'raster',
  tileSize: 256,
};

function coord(z: number, x: number, y: number): TileCoord {
  return { z, x, y };
}

// ============================================================================
// Tests
// ============================================================================

describe('TileMapRenderer Cache', () => {
  beforeEach(() => {
    mockPngBuffer = createMockPngBuffer();
    fetchCallCount = 0;
    fetchUrls = [];
    mockFsFiles.clear();
    jest.clearAllMocks();
  });

  describe('In-memory cache', () => {
    it('should cache tiles in memory — second request does not fetch', async () => {
      const renderer = new TileMapRenderer(OSM_SOURCE, { maxCacheSize: 10 });

      const tile1 = await renderer.getTile(coord(12, 2074, 1410));
      expect(tile1).not.toBeNull();
      expect(fetchCallCount).toBe(1);

      // Second request for same tile should be cached
      const tile2 = await renderer.getTile(coord(12, 2074, 1410));
      expect(tile2).not.toBeNull();
      expect(fetchCallCount).toBe(1); // No additional fetch
    });

    it('should fetch different tiles separately', async () => {
      const renderer = new TileMapRenderer(OSM_SOURCE, { maxCacheSize: 10 });

      await renderer.getTile(coord(12, 2074, 1410));
      await renderer.getTile(coord(12, 2075, 1410));

      expect(fetchCallCount).toBe(2);
      expect(fetchUrls).toContain('https://tile.openstreetmap.org/12/2074/1410.png');
      expect(fetchUrls).toContain('https://tile.openstreetmap.org/12/2075/1410.png');
    });

    it('should evict oldest tiles when at max capacity (LRU)', async () => {
      const renderer = new TileMapRenderer(OSM_SOURCE, { maxCacheSize: 2 });

      // Fill cache to capacity
      await renderer.getTile(coord(12, 1, 1)); // fetch #1
      await renderer.getTile(coord(12, 2, 1)); // fetch #2
      expect(fetchCallCount).toBe(2);

      // Add a third tile — should evict tile (12/1/1)
      await renderer.getTile(coord(12, 3, 1)); // fetch #3
      expect(fetchCallCount).toBe(3);

      // Re-request evicted tile — should refetch
      await renderer.getTile(coord(12, 1, 1)); // fetch #4
      expect(fetchCallCount).toBe(4);

      // Tile (12/2/1) was also evicted by the insertion above — verify
      // (12/3/1) is still cached
      await renderer.getTile(coord(12, 3, 1));
      expect(fetchCallCount).toBe(4); // still cached
    });
  });

  describe('In-memory TTL', () => {
    it('should expire cached tiles after cacheMaxAge', async () => {
      // Use a very short TTL for testing
      const renderer = new TileMapRenderer(OSM_SOURCE, {
        maxCacheSize: 10,
        cacheMaxAge: 50, // 50ms TTL
      });

      await renderer.getTile(coord(12, 2074, 1410));
      expect(fetchCallCount).toBe(1);

      // Wait for TTL to expire
      await new Promise(r => setTimeout(r, 80));

      // Should refetch after expiry
      await renderer.getTile(coord(12, 2074, 1410));
      expect(fetchCallCount).toBe(2);
    });
  });

  describe('Concurrent request deduplication', () => {
    it('should deduplicate concurrent requests for the same tile', async () => {
      const renderer = new TileMapRenderer(OSM_SOURCE, { maxCacheSize: 10 });

      // Fire two requests simultaneously
      const [tile1, tile2] = await Promise.all([
        renderer.getTile(coord(12, 2074, 1410)),
        renderer.getTile(coord(12, 2074, 1410)),
      ]);

      expect(tile1).not.toBeNull();
      expect(tile2).not.toBeNull();
      // Only one network fetch should have been made
      expect(fetchCallCount).toBe(1);
    });
  });

  describe('Filesystem cache path', () => {
    it('should use osm source id for OpenStreetMap URLs', async () => {
      const renderer = new TileMapRenderer(OSM_SOURCE, {
        maxCacheSize: 10,
        fsCachePath: '/tmp/tile-test-cache',
      });

      await renderer.getTile(coord(12, 2074, 1410));

      // Verify fs.writeFileSync was called with correct path structure
      const fs = require('fs');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/tile-test-cache/osm/12/2074/1410.png'),
        expect.any(Buffer)
      );
    });
  });

  describe('Filesystem cache read', () => {
    it('should load from filesystem cache when available and not expired', async () => {
      // Pre-populate filesystem cache
      const cachePath = '/tmp/tile-test-cache/osm/12/2074/1410.png';
      mockFsFiles.set(cachePath, { data: mockPngBuffer, mtime: Date.now() });

      const renderer = new TileMapRenderer(OSM_SOURCE, {
        maxCacheSize: 10,
        fsCachePath: '/tmp/tile-test-cache',
      });

      await renderer.getTile(coord(12, 2074, 1410));

      // Should NOT have fetched from network (fs cache hit)
      expect(fetchCallCount).toBe(0);
    });

    it('should refetch when filesystem cache is expired', async () => {
      // Pre-populate filesystem cache with expired timestamp
      const cachePath = '/tmp/tile-test-cache/osm/12/2074/1410.png';
      const expiredTime = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      mockFsFiles.set(cachePath, { data: mockPngBuffer, mtime: expiredTime });

      const renderer = new TileMapRenderer(OSM_SOURCE, {
        maxCacheSize: 10,
        fsCachePath: '/tmp/tile-test-cache',
        fsCacheMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      await renderer.getTile(coord(12, 2074, 1410));

      // Should have fetched from network (fs cache expired)
      expect(fetchCallCount).toBe(1);
    });
  });

  describe('clearCache', () => {
    it('should clear in-memory cache forcing refetch', async () => {
      const renderer = new TileMapRenderer(OSM_SOURCE, { maxCacheSize: 10 });

      await renderer.getTile(coord(12, 2074, 1410));
      expect(fetchCallCount).toBe(1);

      renderer.clearCache();

      await renderer.getTile(coord(12, 2074, 1410));
      expect(fetchCallCount).toBe(2);
    });
  });
});
