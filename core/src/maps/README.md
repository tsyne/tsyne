# Tsyne Maps Module

Map tile loading, caching, and rendering utilities for Tsyne applications.

## Modules

### tiles.ts
Tile coordinate math, URL building, and caching:
- `TileCoord` - Tile coordinate (z, x, y)
- `TileSource` - Tile server configuration
- `TILE_SOURCES` - Presets for OSM, Mapbox styles
- `lngLatToTile`, `tileToLngLat`, `tileBounds`, `getTilesInBounds`
- `buildTileUrl`, `fetchTile`, `fetchTiles`
- `TileCache` - LRU in-memory cache with TTL
- `TileManager` - Tile loading with deduplication

### tileRenderer.ts
PNG decoding and viewport rendering:
- `decodePNG` - Decode PNG to RGBA pixels (uses pngjs)
- `getTilesForViewport`, `getTilePosition` - Viewport tile math
- `TileMapRenderer` - Full tile renderer with memory + filesystem caching
- `MapViewport` - Viewport state (center, zoom, dimensions)

### map.ts
Lightweight map class/api
- `TsyneMap` - Software-rendered map to pixel buffer
- `project`, `unproject` - Coordinate projection
- `drawLine`, `drawCircle`, `drawPolygon`, `drawMarker`, `drawHeatmap`
- Event handling: `on('move')`, `on('zoom')`, `on('load')`

## Usage

### Tile Rendering
```typescript
import { TileMapRenderer, TILE_SOURCES, MapViewport } from '@core/src/maps';

const renderer = new TileMapRenderer(TILE_SOURCES.osmRaster(), {
  maxCacheSize: 50,
  fsCachePath: '~/.cache/tiles'  // Optional disk cache (7-day TTL)
});

const viewport: MapViewport = {
  center: { lng: 2.3522, lat: 48.8566 },
  zoom: 12,
  width: 800,
  height: 600
};

await renderer.render(renderTarget, viewport);
```

### TsyneMap
```typescript
import { TsyneMap } from '@core/src/maps';

const map = new TsyneMap({
  canvas: myTappableCanvasRaster,
  center: [2.3522, 48.8566],
  zoom: 12
});

map.clear();
map.drawMarker([2.2945, 48.8584], 8, '#FF0000');
await map.render();
```

## Tile Sources

```typescript
TILE_SOURCES.osmRaster()           // OpenStreetMap (no token needed)
TILE_SOURCES.mapboxLight(token)    // Mapbox Light style
TILE_SOURCES.mapboxDark(token)     // Mapbox Dark style
TILE_SOURCES.mapboxStreets(token)  // Mapbox Streets
TILE_SOURCES.mapboxSatellite(token) // Mapbox Satellite
```

## Caching

Tiles are cached at two levels:
1. **Memory** - LRU cache with configurable size and TTL
2. **Filesystem** - Optional disk cache with 7-day TTL (per OSM tile usage policy)

```typescript
new TileMapRenderer(source, {
  maxCacheSize: 100,        // Max tiles in memory
  cacheMaxAge: 5 * 60000,   // Memory TTL (5 min)
  fsCachePath: '/path/to/cache',
  fsCacheMaxAge: 7 * 86400000  // Disk TTL (7 days, OSM requirement)
});
```

## Note

Some tile functions (`lngLatToTile`, `tileToLngLat`) also exist in `core/src/geo`.
The maps module versions use `TileCoord` interface for consistency with other tile APIs.

## Tests

```bash
cd core && npx jest src/maps/
```
