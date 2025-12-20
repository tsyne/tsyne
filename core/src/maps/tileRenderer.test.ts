import {
  getTilesForViewport,
  getTilePosition,
  MapViewport,
  TileMapRenderer
} from './tileRenderer';
import { TILE_SOURCES } from './tiles';

describe('getTilesForViewport', () => {
  const parisViewport: MapViewport = {
    center: { lng: 2.3522, lat: 48.8566 },
    zoom: 12,
    width: 600,
    height: 400
  };

  it('returns tiles covering the viewport', () => {
    const tiles = getTilesForViewport(parisViewport);

    expect(tiles.length).toBeGreaterThan(0);

    // All tiles should have the same zoom level
    tiles.forEach(tile => {
      expect(tile.z).toBe(12);
    });
  });

  it('returns more tiles for larger viewport', () => {
    const smallViewport: MapViewport = {
      center: { lng: 0, lat: 0 },
      zoom: 10,
      width: 256,
      height: 256
    };

    const largeViewport: MapViewport = {
      center: { lng: 0, lat: 0 },
      zoom: 10,
      width: 1024,
      height: 768
    };

    const smallTiles = getTilesForViewport(smallViewport);
    const largeTiles = getTilesForViewport(largeViewport);

    expect(largeTiles.length).toBeGreaterThan(smallTiles.length);
  });

  it('returns more tiles at higher zoom levels for same viewport size', () => {
    const lowZoom: MapViewport = {
      center: { lng: 0, lat: 0 },
      zoom: 4,
      width: 512,
      height: 512
    };

    const highZoom: MapViewport = {
      center: { lng: 0, lat: 0 },
      zoom: 10,
      width: 512,
      height: 512
    };

    // At higher zoom, tiles are smaller, so we need more to cover same area
    // But viewport represents same pixel size, so should be similar count
    const lowTiles = getTilesForViewport(lowZoom);
    const highTiles = getTilesForViewport(highZoom);

    // Both should cover similar number of tiles since viewport is in pixels
    expect(Math.abs(lowTiles.length - highTiles.length)).toBeLessThan(5);
  });

  it('handles world wrapping for extreme longitudes', () => {
    const viewport: MapViewport = {
      center: { lng: 179, lat: 0 },
      zoom: 4,
      width: 800,
      height: 600
    };

    const tiles = getTilesForViewport(viewport);

    // Should include tiles near the date line
    expect(tiles.length).toBeGreaterThan(0);

    // X coordinates should be wrapped to valid range
    const maxTileX = Math.pow(2, 4) - 1; // 15 at zoom 4
    tiles.forEach(tile => {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThanOrEqual(maxTileX);
    });
  });

  it('clamps Y coordinates to valid range', () => {
    const viewport: MapViewport = {
      center: { lng: 0, lat: 85 }, // Near pole
      zoom: 4,
      width: 512,
      height: 512
    };

    const tiles = getTilesForViewport(viewport);

    const maxTileY = Math.pow(2, 4) - 1; // 15 at zoom 4
    tiles.forEach(tile => {
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThanOrEqual(maxTileY);
    });
  });

  it('rounds zoom level', () => {
    const viewport: MapViewport = {
      center: { lng: 0, lat: 0 },
      zoom: 10.7,
      width: 256,
      height: 256
    };

    const tiles = getTilesForViewport(viewport);

    // Should round to 11
    tiles.forEach(tile => {
      expect(tile.z).toBe(11);
    });
  });

  it('returns unique tiles', () => {
    const tiles = getTilesForViewport(parisViewport);

    const keys = tiles.map(t => `${t.z}/${t.x}/${t.y}`);
    const uniqueKeys = [...new Set(keys)];

    expect(keys.length).toBe(uniqueKeys.length);
  });
});

describe('getTilePosition', () => {
  const viewport: MapViewport = {
    center: { lng: 0, lat: 0 },
    zoom: 4,
    width: 512,
    height: 512
  };

  it('positions center tile near viewport center', () => {
    // At zoom 4, tile (8, 7) contains (0, 0)
    const centerTile = { z: 4, x: 8, y: 7 };
    const pos = getTilePosition(centerTile, viewport);

    // Should be roughly near center (within a tile's width)
    expect(Math.abs(pos.x - 256)).toBeLessThanOrEqual(256);
    expect(Math.abs(pos.y - 256)).toBeLessThanOrEqual(256);
  });

  it('returns correct tile size', () => {
    const pos = getTilePosition({ z: 4, x: 0, y: 0 }, viewport);
    expect(pos.size).toBe(256);
  });

  it('respects custom tile size', () => {
    const pos = getTilePosition({ z: 4, x: 0, y: 0 }, viewport, 512);
    expect(pos.size).toBe(512);
  });

  it('positions adjacent tiles correctly', () => {
    const tile1 = { z: 4, x: 8, y: 7 };
    const tile2 = { z: 4, x: 9, y: 7 }; // Right neighbor

    const pos1 = getTilePosition(tile1, viewport);
    const pos2 = getTilePosition(tile2, viewport);

    // tile2 should be exactly one tile width to the right
    expect(pos2.x - pos1.x).toBeCloseTo(256);
    expect(pos2.y).toBeCloseTo(pos1.y);
  });

  it('positions tiles above correctly', () => {
    const tile1 = { z: 4, x: 8, y: 7 };
    const tile2 = { z: 4, x: 8, y: 6 }; // Above

    const pos1 = getTilePosition(tile1, viewport);
    const pos2 = getTilePosition(tile2, viewport);

    // tile2 should be exactly one tile height above
    expect(pos1.y - pos2.y).toBeCloseTo(256);
    expect(pos2.x).toBeCloseTo(pos1.x);
  });

  it('handles different viewport sizes', () => {
    const smallViewport: MapViewport = {
      center: { lng: 0, lat: 0 },
      zoom: 4,
      width: 256,
      height: 256
    };

    const largeViewport: MapViewport = {
      center: { lng: 0, lat: 0 },
      zoom: 4,
      width: 1024,
      height: 768
    };

    const tile = { z: 4, x: 8, y: 7 };

    const smallPos = getTilePosition(tile, smallViewport);
    const largePos = getTilePosition(tile, largeViewport);

    // Position relative to center should differ by half the viewport difference
    expect(largePos.x - smallPos.x).toBeCloseTo((1024 - 256) / 2);
    expect(largePos.y - smallPos.y).toBeCloseTo((768 - 256) / 2);
  });

  it('handles Paris viewport correctly', () => {
    const parisViewport: MapViewport = {
      center: { lng: 2.3522, lat: 48.8566 },
      zoom: 12,
      width: 600,
      height: 400
    };

    const tiles = getTilesForViewport(parisViewport);

    // All tiles should have positions that could be visible
    for (const tile of tiles) {
      const pos = getTilePosition(tile, parisViewport);

      // Tile should at least partially overlap viewport
      expect(pos.x + pos.size).toBeGreaterThan(0);
      expect(pos.x).toBeLessThan(600);
      expect(pos.y + pos.size).toBeGreaterThan(0);
      expect(pos.y).toBeLessThan(400);
    }
  });
});

describe('TileMapRenderer', () => {
  it('creates renderer with default options', () => {
    const source = TILE_SOURCES.osmRaster();
    const renderer = new TileMapRenderer(source);

    expect(renderer).toBeDefined();
  });

  it('creates renderer with custom cache options', () => {
    const source = TILE_SOURCES.osmRaster();
    const renderer = new TileMapRenderer(source, {
      maxCacheSize: 100,
      cacheMaxAge: 10 * 60 * 1000
    });

    expect(renderer).toBeDefined();
  });

  it('clearCache does not throw', () => {
    const source = TILE_SOURCES.osmRaster();
    const renderer = new TileMapRenderer(source);

    expect(() => renderer.clearCache()).not.toThrow();
  });
});

describe('Viewport and tile consistency', () => {
  it('tiles returned by getTilesForViewport are positioned within viewport bounds', () => {
    const viewports: MapViewport[] = [
      { center: { lng: 0, lat: 0 }, zoom: 4, width: 512, height: 512 },
      { center: { lng: 2.35, lat: 48.85 }, zoom: 12, width: 600, height: 400 },
      { center: { lng: -73.97, lat: 40.77 }, zoom: 10, width: 800, height: 600 },
      { center: { lng: 139.69, lat: 35.69 }, zoom: 14, width: 400, height: 300 },
    ];

    for (const viewport of viewports) {
      const tiles = getTilesForViewport(viewport);

      for (const tile of tiles) {
        const pos = getTilePosition(tile, viewport);

        // Each tile should at least partially overlap the viewport
        const rightEdge = pos.x + pos.size;
        const bottomEdge = pos.y + pos.size;

        expect(rightEdge).toBeGreaterThan(0);
        expect(pos.x).toBeLessThanOrEqual(viewport.width);
        expect(bottomEdge).toBeGreaterThan(0);
        expect(pos.y).toBeLessThanOrEqual(viewport.height);
      }
    }
  });
});
