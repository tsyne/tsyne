/**
 * Tsyne Maps Module
 *
 * Map-specific utilities built on top of Tsyne's core graphics and geo modules.
 * Provides tile loading, rendering, and a lightweight map class.
 *
 * Usage:
 * ```typescript
 * import { TsyneMap, TileMapRenderer, TILE_SOURCES } from 'tsyne/maps';
 *
 * // Create a tile renderer for OSM
 * const tileRenderer = new TileMapRenderer(TILE_SOURCES.osmRaster());
 *
 * // Or use the full map class
 * const map = new TsyneMap({
 *     canvas: myTappableCanvasRaster,
 *     center: [2.3522, 48.8566], // Paris
 *     zoom: 13
 * });
 * ```
 */

// ============================================================================
// TsyneMap Class
// ============================================================================

export { TsyneMap, TsyneMapOptions, TsyneMapState } from './map';

// ============================================================================
// Tile Loading
// ============================================================================

export {
    TileCoord,
    TileBounds,
    TileSource,
    TileData,
    TILE_SOURCES,
    lngLatToTile,
    tileToLngLat,
    tileBounds,
    getTilesInBounds,
    buildTileUrl,
    fetchTile,
    fetchTiles,
    TileCache,
    TileManager
} from './tiles';

// ============================================================================
// Tile Rendering
// ============================================================================

export {
    decodePNG,
    fetchTileImage,
    getTilesForViewport,
    getTilePosition,
    TileMapRenderer,
    TileMapRendererOptions,
    ImageData,
    TileImage,
    MapViewport
} from './tileRenderer';
