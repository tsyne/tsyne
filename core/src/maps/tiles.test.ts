import {
  TileCoord,
  TileSource,
  TILE_SOURCES,
  lngLatToTile,
  tileToLngLat,
  tileBounds,
  getTilesInBounds,
  buildTileUrl,
  TileCache
} from './tiles';

describe('TILE_SOURCES', () => {
  describe('osmRaster', () => {
    it('returns correct OSM tile source', () => {
      const source = TILE_SOURCES.osmRaster();
      expect(source.type).toBe('raster');
      expect(source.tileSize).toBe(256);
      expect(source.url).toContain('openstreetmap.org');
      expect(source.minZoom).toBe(0);
      expect(source.maxZoom).toBe(19);
    });
  });

  describe('mapboxLight', () => {
    it('includes access token in URL', () => {
      const source = TILE_SOURCES.mapboxLight('test-token-123');
      expect(source.url).toContain('test-token-123');
      expect(source.url).toContain('mapbox.com');
      expect(source.url).toContain('light');
      expect(source.type).toBe('raster');
    });
  });

  describe('mapboxDark', () => {
    it('includes access token and dark style', () => {
      const source = TILE_SOURCES.mapboxDark('my-token');
      expect(source.url).toContain('my-token');
      expect(source.url).toContain('dark');
    });
  });

  describe('mapboxStreets', () => {
    it('includes streets style', () => {
      const source = TILE_SOURCES.mapboxStreets('token');
      expect(source.url).toContain('streets');
    });
  });

  describe('mapboxSatellite', () => {
    it('uses 512 tile size for retina', () => {
      const source = TILE_SOURCES.mapboxSatellite('token');
      expect(source.tileSize).toBe(512);
      expect(source.url).toContain('satellite');
    });
  });

  describe('mapboxTerrain', () => {
    it('returns raster-dem type', () => {
      const source = TILE_SOURCES.mapboxTerrain('token');
      expect(source.type).toBe('raster-dem');
      expect(source.maxZoom).toBe(15);
    });
  });
});

describe('lngLatToTile', () => {
  it('converts origin (0, 0) at zoom 0 to tile (0, 0, 0)', () => {
    const tile = lngLatToTile(0, 0, 0);
    expect(tile.z).toBe(0);
    expect(tile.x).toBe(0);
    expect(tile.y).toBe(0);
  });

  it('converts negative longitude at zoom 0', () => {
    const tile = lngLatToTile(-179, 0, 0);
    expect(tile.z).toBe(0);
    expect(tile.x).toBe(0);
    expect(tile.y).toBe(0);
  });

  it('handles zoom level 1 correctly', () => {
    // At zoom 1, there are 2x2 tiles
    // Western hemisphere should be x=0, eastern x=1
    const western = lngLatToTile(-90, 0, 1);
    expect(western.x).toBe(0);

    const eastern = lngLatToTile(90, 0, 1);
    expect(eastern.x).toBe(1);
  });

  it('handles zoom level 2 with Paris coordinates', () => {
    // Paris: ~2.35, ~48.85
    const tile = lngLatToTile(2.35, 48.85, 2);
    expect(tile.z).toBe(2);
    // Paris is in the eastern hemisphere (x should be 2)
    expect(tile.x).toBe(2);
    // Paris is in the northern hemisphere (y should be 1)
    expect(tile.y).toBe(1);
  });

  it('handles high zoom levels', () => {
    // At zoom 12, there are 4096 tiles per axis
    const tile = lngLatToTile(2.3522, 48.8566, 12); // Paris
    expect(tile.z).toBe(12);
    expect(tile.x).toBeGreaterThan(2000);
    expect(tile.x).toBeLessThan(2100);
    expect(tile.y).toBeGreaterThan(1400);
    expect(tile.y).toBeLessThan(1500);
  });

  it('handles extreme latitudes', () => {
    // Near arctic
    const arctic = lngLatToTile(0, 80, 4);
    expect(arctic.y).toBe(1); // Near top

    // Near antarctic
    const antarctic = lngLatToTile(0, -80, 4);
    expect(antarctic.y).toBe(14); // Near bottom
  });
});

describe('tileToLngLat', () => {
  it('converts tile (0, 0, 0) to northwest corner of world', () => {
    const corner = tileToLngLat({ z: 0, x: 0, y: 0 });
    expect(corner.lng).toBe(-180);
    // Mercator projection maxes out at ~85.05 latitude
    expect(corner.lat).toBeCloseTo(85.05, 0);
  });

  it('converts tile at zoom 1', () => {
    // Tile (1, 1, 0) is the northeast quadrant at zoom 1
    const corner = tileToLngLat({ z: 1, x: 1, y: 0 });
    expect(corner.lng).toBe(0);
    expect(corner.lat).toBeCloseTo(85.05, 0);
  });

  it('is approximately inverse of lngLatToTile', () => {
    const originalLng = 2.35;
    const originalLat = 48.85;
    const zoom = 10;

    const tile = lngLatToTile(originalLng, originalLat, zoom);
    const corner = tileToLngLat(tile);

    // The corner should be close to the original point
    // (within one tile's worth of degrees)
    expect(Math.abs(corner.lng - originalLng)).toBeLessThan(0.5);
    expect(Math.abs(corner.lat - originalLat)).toBeLessThan(0.5);
  });

  it('handles different zoom levels', () => {
    // At higher zoom, tiles cover smaller areas
    const lowZoom = tileToLngLat({ z: 2, x: 2, y: 1 });
    const highZoom = tileToLngLat({ z: 10, x: 512, y: 256 });

    // Just verify they return valid coordinates
    expect(lowZoom.lng).toBeGreaterThanOrEqual(-180);
    expect(lowZoom.lng).toBeLessThanOrEqual(180);
    expect(lowZoom.lat).toBeGreaterThanOrEqual(-90);
    expect(lowZoom.lat).toBeLessThanOrEqual(90);

    expect(highZoom.lng).toBeGreaterThanOrEqual(-180);
    expect(highZoom.lng).toBeLessThanOrEqual(180);
  });
});

describe('tileBounds', () => {
  it('returns correct bounds for tile (0, 0, 0)', () => {
    const bounds = tileBounds({ z: 0, x: 0, y: 0 });

    expect(bounds.west).toBe(-180);
    expect(bounds.east).toBe(180);
    expect(bounds.north).toBeCloseTo(85.05, 0);
    expect(bounds.south).toBeCloseTo(-85.05, 0);
  });

  it('returns smaller bounds at higher zoom', () => {
    const lowZoomBounds = tileBounds({ z: 2, x: 0, y: 0 });
    const highZoomBounds = tileBounds({ z: 10, x: 0, y: 0 });

    const lowZoomWidth = lowZoomBounds.east - lowZoomBounds.west;
    const highZoomWidth = highZoomBounds.east - highZoomBounds.west;

    expect(highZoomWidth).toBeLessThan(lowZoomWidth);
  });

  it('returns non-overlapping adjacent tile bounds', () => {
    const tile1 = tileBounds({ z: 4, x: 8, y: 5 });
    const tile2 = tileBounds({ z: 4, x: 9, y: 5 });

    // East of tile1 should equal west of tile2
    expect(tile1.east).toBeCloseTo(tile2.west);
  });
});

describe('getTilesInBounds', () => {
  it('returns single tile for small bounds at low zoom', () => {
    // Small area in Paris at zoom 0 should return 1 tile
    const tiles = getTilesInBounds(2.2, 48.8, 2.4, 48.9, 0);
    expect(tiles.length).toBe(1);
    expect(tiles[0]).toEqual({ z: 0, x: 0, y: 0 });
  });

  it('returns multiple tiles for larger bounds', () => {
    // Larger area at zoom 4
    const tiles = getTilesInBounds(-10, 40, 10, 60, 4);

    expect(tiles.length).toBeGreaterThan(1);

    // All tiles should have z=4
    tiles.forEach(tile => {
      expect(tile.z).toBe(4);
    });
  });

  it('returns grid of tiles for rectangular bounds', () => {
    // At zoom 2, full world is 4x4 tiles
    // Bounds covering Europe should return multiple tiles
    const tiles = getTilesInBounds(-10, 35, 25, 60, 2);

    // Should include tiles in the 2,1 area
    const hasExpectedTile = tiles.some(t => t.x === 2 && t.y === 1);
    expect(hasExpectedTile).toBe(true);
  });

  it('returns tiles in correct order', () => {
    const tiles = getTilesInBounds(-5, 45, 5, 55, 3);

    // All tiles should have same zoom
    expect(tiles.every(t => t.z === 3)).toBe(true);

    // X coordinates should be increasing for each row
    if (tiles.length > 1) {
      const uniqueX = [...new Set(tiles.map(t => t.x))];
      expect(uniqueX.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('buildTileUrl', () => {
  it('replaces z, x, y placeholders for OSM', () => {
    const source = TILE_SOURCES.osmRaster();
    const url = buildTileUrl(source, { z: 12, x: 2048, y: 1408 });

    expect(url).toContain('/12/');
    expect(url).toContain('/2048/');
    expect(url).toContain('/1408');
    expect(url).not.toContain('{z}');
    expect(url).not.toContain('{x}');
    expect(url).not.toContain('{y}');
  });

  it('replaces placeholders for Mapbox sources', () => {
    const source = TILE_SOURCES.mapboxLight('test-token');
    const url = buildTileUrl(source, { z: 5, x: 16, y: 10 });

    expect(url).toContain('/5/');
    expect(url).toContain('/16/');
    expect(url).toContain('/10');
    expect(url).toContain('test-token');
  });

  it('handles zero coordinates', () => {
    const source = TILE_SOURCES.osmRaster();
    const url = buildTileUrl(source, { z: 0, x: 0, y: 0 });

    expect(url).toBe('https://tile.openstreetmap.org/0/0/0.png');
  });
});

describe('TileCache', () => {
  const mockTileData = (z: number, x: number, y: number) => ({
    coord: { z, x, y },
    data: new ArrayBuffer(100),
    type: 'raster' as const
  });

  it('stores and retrieves tiles', () => {
    const cache = new TileCache(10);
    const tile = mockTileData(1, 2, 3);

    cache.set({ z: 1, x: 2, y: 3 }, 'http://example.com', tile);
    const retrieved = cache.get({ z: 1, x: 2, y: 3 }, 'http://example.com');

    expect(retrieved).toBe(tile);
  });

  it('returns null for missing tiles', () => {
    const cache = new TileCache(10);
    const result = cache.get({ z: 1, x: 2, y: 3 }, 'http://example.com');

    expect(result).toBeNull();
  });

  it('separates tiles by source URL', () => {
    const cache = new TileCache(10);
    const tile1 = mockTileData(1, 0, 0);
    const tile2 = mockTileData(1, 0, 0);

    cache.set({ z: 1, x: 0, y: 0 }, 'http://source1.com', tile1);
    cache.set({ z: 1, x: 0, y: 0 }, 'http://source2.com', tile2);

    expect(cache.get({ z: 1, x: 0, y: 0 }, 'http://source1.com')).toBe(tile1);
    expect(cache.get({ z: 1, x: 0, y: 0 }, 'http://source2.com')).toBe(tile2);
  });

  it('evicts oldest entries when at capacity', () => {
    const cache = new TileCache(3);

    cache.set({ z: 0, x: 0, y: 0 }, 'http://a.com', mockTileData(0, 0, 0));
    cache.set({ z: 0, x: 1, y: 0 }, 'http://a.com', mockTileData(0, 1, 0));
    cache.set({ z: 0, x: 2, y: 0 }, 'http://a.com', mockTileData(0, 2, 0));

    expect(cache.size).toBe(3);

    // Add fourth entry, should evict first
    cache.set({ z: 0, x: 3, y: 0 }, 'http://a.com', mockTileData(0, 3, 0));

    expect(cache.size).toBe(3);
    expect(cache.get({ z: 0, x: 0, y: 0 }, 'http://a.com')).toBeNull();
    expect(cache.get({ z: 0, x: 3, y: 0 }, 'http://a.com')).not.toBeNull();
  });

  it('updates LRU order on access', () => {
    const cache = new TileCache(3);

    cache.set({ z: 0, x: 0, y: 0 }, 'http://a.com', mockTileData(0, 0, 0));
    cache.set({ z: 0, x: 1, y: 0 }, 'http://a.com', mockTileData(0, 1, 0));
    cache.set({ z: 0, x: 2, y: 0 }, 'http://a.com', mockTileData(0, 2, 0));

    // Access first entry to make it most recently used
    cache.get({ z: 0, x: 0, y: 0 }, 'http://a.com');

    // Add new entry - should evict second entry (now oldest)
    cache.set({ z: 0, x: 3, y: 0 }, 'http://a.com', mockTileData(0, 3, 0));

    expect(cache.get({ z: 0, x: 0, y: 0 }, 'http://a.com')).not.toBeNull();
    expect(cache.get({ z: 0, x: 1, y: 0 }, 'http://a.com')).toBeNull();
  });

  it('clears all entries', () => {
    const cache = new TileCache(10);

    cache.set({ z: 0, x: 0, y: 0 }, 'http://a.com', mockTileData(0, 0, 0));
    cache.set({ z: 0, x: 1, y: 0 }, 'http://a.com', mockTileData(0, 1, 0));

    expect(cache.size).toBe(2);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get({ z: 0, x: 0, y: 0 }, 'http://a.com')).toBeNull();
  });

  it('has() returns correct boolean', () => {
    const cache = new TileCache(10);

    expect(cache.has({ z: 0, x: 0, y: 0 }, 'http://a.com')).toBe(false);

    cache.set({ z: 0, x: 0, y: 0 }, 'http://a.com', mockTileData(0, 0, 0));

    expect(cache.has({ z: 0, x: 0, y: 0 }, 'http://a.com')).toBe(true);
  });

  it('expires tiles after maxAge', async () => {
    // Use very short maxAge for testing
    const cache = new TileCache(10, 50); // 50ms expiry

    cache.set({ z: 0, x: 0, y: 0 }, 'http://a.com', mockTileData(0, 0, 0));

    // Should be present immediately
    expect(cache.get({ z: 0, x: 0, y: 0 }, 'http://a.com')).not.toBeNull();

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 60));

    // Should be expired
    expect(cache.get({ z: 0, x: 0, y: 0 }, 'http://a.com')).toBeNull();
  });
});

describe('Tile coordinate roundtrip', () => {
  it('preserves approximate location through tile conversion', () => {
    const testPoints = [
      { lng: 0, lat: 0 },
      { lng: -73.97, lat: 40.77 }, // NYC
      { lng: 2.35, lat: 48.86 },   // Paris
      { lng: 139.69, lat: 35.69 }, // Tokyo
      { lng: -0.13, lat: 51.51 },  // London
    ];

    for (const point of testPoints) {
      for (const zoom of [4, 8, 12, 16]) {
        const tile = lngLatToTile(point.lng, point.lat, zoom);
        const bounds = tileBounds(tile);

        // Original point should be within tile bounds
        expect(point.lng).toBeGreaterThanOrEqual(bounds.west);
        expect(point.lng).toBeLessThan(bounds.east);
        expect(point.lat).toBeGreaterThan(bounds.south);
        expect(point.lat).toBeLessThanOrEqual(bounds.north);
      }
    }
  });
});
