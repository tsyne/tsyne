# Realtime Paris Density Simulation — Perfection Plan

## Current State

The port has **GPU-accelerated rendering with OSM map tile background, interactive zoom/pan, hover tooltips, and 60fps GPU animation**. What we have:

- **Simulation engine** (`simulation.ts`): 65 hotspots with Gaussian falloff, time-of-day and day-of-week multipliers (including `education` type), H3 hex grid support, interpolation. Feature-complete.
- **GPU heatmap** (`app.ts`): GLSL fragment shader via `CanvasShader` — 3-layer compositing (glow + main + hotspot) computed per-pixel on the GPU. Hotspot data packed into a 64×2 RGBA texture (row 0: position/weight/radius, row 1: jitter params), color gradients as 256×1 LUT textures. GPU-side organic jitter via `u_time`. 5 color presets.
- **60fps animation**: Go-side auto-animate ticker (`SetAutoAnimate`) refreshes shader at ~60fps without TS→bridge round-trips. TS simulation loop runs at 2Hz for time advancement/texture re-upload only.
- **Map tiles**: OSM raster tiles rendered via `TileMapRenderer` into a CPU `RenderTarget`, uploaded as `u_background` texture. Filesystem cache at `~/.tsyne/.../map-cache/` with 7-day TTL. Loads asynchronously on startup; app works with dark fallback if offline.
- **Zoom/pan**: Scroll-to-zoom (Z10-Z16), drag-to-pan with Mercator-correct conversion. Viewport transform uniforms for instant visual feedback, debounced tile reload.
- **Hover tooltips**: `onMouseMoved` with 50ms debounce, pixel→geo→nearest hotspot lookup, `showTooltip`/`hideTooltip` on `CanvasShader`.
- **UI**: Hamburger-collapsible dark panel with sliders, time controls, color presets, layer toggles. Responsive canvas (window resize). Status bar with zoom/coords/source.
- **Tests**: 12 pass (3 app GUI mock tests + 9 simulation unit tests).

## What the Original Has That We Don't

| Feature | Original | Port |
|---------|----------|------|
| Map tiles | Mapbox GL vector tiles (pan/zoom/rotate) | **OSM raster tiles (static viewport)** ✓ |
| Heatmap rendering | Deck.gl `HeatmapLayer` (GPU, 60fps) | **GPU CanvasShader** ✓ |
| Hotspots | 56 locations | **65 locations** ✓ |
| Color presets | 5 presets | 5 presets ✓ |
| UI | Glassmorphism sidebar, animated | Fyne dark panel, functional ✓ |
| Interactivity | Map pan/zoom/tilt, hover tooltips | **Pan/zoom/tooltips** ✓ |
| Animation | requestAnimationFrame 60fps | **60fps GPU auto-animate** ✓ |
| Viewport | Full window, responsive | **Responsive resize** ✓ |

## Completed Phases

### ~~Phase 1: GPU Heatmap via CanvasShader~~ ✓ DONE

Replaced CPU `renderHeatmap()` with a GLSL fragment shader. Per-pixel Gaussian computation on GPU with 3-layer compositing in a single pass. Hotspot data passed via texture (not array uniforms, which CanvasShader doesn't support beyond vec4). Color gradients via 256×1 LUT textures. Higher default settings matching OG visual quality.

**Files changed**: `app.ts` (rewritten), `simulation.ts` (exported HOTSPOTS + multiplier functions), `app.test.ts` (updated mocks), `core/src/widgets/canvas.ts` (added `setTextureData()` method).

### ~~Phase 2: Map Tile Background~~ ✓ DONE

Added OSM raster tile background behind the heatmap using core's `TileMapRenderer`. Tiles rendered into a CPU `RenderTarget`, uploaded as `u_background` texture. Shader composites heatmap layers over the map with proper Y-flip. Opacity now scales per-layer alpha (so map stays visible). Filesystem cache for tiles.

**Files changed**: `core/src/index.ts` (exported maps module), `app.ts` (tile integration + shader `u_background`/`u_hasBackground` uniforms).

### ~~Phase 3: Additional Hotspots~~ ✓ DONE

Added 29 new hotspot entries from the OG (total now 65, exceeding OG's 56). Added `education` type with time/day multipliers (peaks during weekday school hours). All major OG locations covered plus extras (Odéon, Ménilmontant, Batignolles, Alésia, Convention, Denfert-Rochereau).

**Files changed**: `simulation.ts` (29 new HOTSPOTS entries + `education` multipliers in TIME_MULTIPLIERS and DAY_MULTIPLIERS).

## Completed Phases (continued)

### ~~Phase 4: Zoom and Improved Pan~~ ✓ DONE

Added interactive zoom/pan via `CanvasShader` `onScroll`/`onDrag` events (using the new `InteractiveShader` framework feature). Integer zoom levels 10-16 with scroll wheel, drag-to-pan with Mercator-correct pixel-to-geo conversion. Viewport transform uniforms (`u_viewScale`, `u_viewOffset`) map viewport UV to PARIS_BOUNDS reference UV in the shader — hotspot positions stay fixed in reference frame, no texture re-encoding on pan. Tile background reloads with 250ms debounce. Zoom +/- buttons in UI panel. 12 tests pass.

**Files changed**: `app.ts` (viewport helpers, event handlers, shader uniforms, zoom UI), `app.test.ts` (updated mock assertion).

### ~~Phase 5: Visual Polish~~ ✓ DONE

Added two framework features (`CanvasShader` tooltip support + shader auto-animate mode) and five app improvements:

- **5a. Responsive canvas**: Removed `fixedSize`, added `win.onResize()` with 100ms throttle → shader resize + viewport update + tile reload.
- **5b. 60fps GPU animation**: Go-side `SetAutoAnimate` ticker (16ms). Hotspot texture expanded to 64×2 (row 1 = jitter params). GPU-side jitter via `sin(u_time * speed + phase)`. TS animation loop reduced to 2Hz simulation-only ticks.
- **5c. UI label improvements**: `Intensity: 1.5x`, `Threshold: 3%` formatting.
- **5d. Hover tooltips**: `onMouseMoved`/`onMouseOut` on shader, `pixelToGeo()` → `findNearestHotspot()` → `showTooltip(name + type + density%)`, 50ms debounce.
- **5e. Status bar**: Replaced fpsLabel + zoomLabel with statusLabel: `Z12 | 48.8566N, 2.3522E | OSM`. Updated on zoom/pan/drag.

**Framework files**: `core/bridge/interactive_shader.go` (tooltip methods), `core/bridge/widget_creators_canvas_tappable_raster.go` (type switch), `core/bridge/fyne-patches/shader.go.txt` (auto-animate), `core/bridge/widget_creators_canvas_shader.go` + `main.go` (handler), `core/src/widgets/canvas.ts` (TS methods).
**App files**: `app.ts` (all 5a-5e changes), `app.test.ts` (updated mocks + assertions).
**New test files**: `core/src/__tests__/canvas-shader-tooltip.test.ts` (6 unit + 2 integration), `core/src/__tests__/canvas-shader-animate.test.ts` (4 unit + 3 integration).

## Completed Phases (continued)

### ~~Phase 6: Test Coverage~~ ✓ DONE

Added 14 new tests across 2 new test files (26 total tests now passing):

- **6a: Screenshot tests** (`shader-visual.test.ts`): 4 deterministic screenshot tests at specific time/day combos (Friday 14h, Tuesday 03h, Saturday 22h, Monday 08h). Uses `TsyneTest({ headed: true })` with `u_jitterAmplitude: 0.0` for reproducibility. Screenshots saved to `screenshots/` directory.
- **6b: Shader compilation test** (`shader-visual.test.ts`): Verifies GLSL heatmap shader compiles on real GL context — if the shader creates and renders without error, it compiled.
- **6c: Tile cache tests** (`tile-cache.test.ts`): 9 unit tests with mocked HTTP (`fetchResource`) and filesystem (`fs`). Verifies: in-memory cache hit/miss, LRU eviction, TTL expiry, filesystem cache path structure, fs cache read (fresh + expired), concurrent request deduplication, `clearCache()`.

**New test files**: `shader-visual.test.ts`, `tile-cache.test.ts`.

## Priority Order

1. ~~Phase 1~~ ✓ (GPU shader)
2. ~~Phase 2~~ ✓ (map tiles)
3. ~~Phase 3~~ ✓ (hotspots)
4. ~~Phase 4~~ ✓ (zoom/pan)
5. ~~Phase 5~~ ✓ (polish)
6. ~~Phase 6~~ ✓ (tests)
