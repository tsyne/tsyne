# Realtime Paris Density Simulation — Perfection Plan

## Current State

The port is **functional but visually basic** compared to the original. What we have:

- **Simulation engine** (`simulation.ts`): 36 hotspots with Gaussian falloff, time-of-day and day-of-week multipliers, H3 hex grid support, interpolation between hours. Solid — this is feature-complete.
- **Color presets** (`colorScale.ts`): 5 presets (vibrant, heat, cool, plasma, fire) with glow variants. Good.
- **Rendering**: CPU-side `renderHeatmap()` into a `TappableCanvasRaster` pixel buffer. Three-layer compositing (glow + main + hotspot). Works but slow and resolution-limited.
- **UI**: Hamburger-collapsible dark panel with sliders (intensity, radius, threshold, opacity, glow), time controls (hour/day ±, play/stop), color preset buttons, layer toggles. Functional.
- **Map tiles**: **Stubbed out.** `TileMapRenderer` is a placeholder class that does nothing. Background is a solid dark color. No geographic context.
- **Tests**: 12 pass (3 app GUI mock tests + 9 simulation unit tests).

## What the Original Has That We Don't

The original ([parisOG/](../../parisOG/)) uses Mapbox GL JS + Deck.gl:

| Feature | Original | Port |
|---------|----------|------|
| Map tiles | Mapbox GL vector tiles (pan/zoom/rotate) | Dark solid background |
| Heatmap rendering | Deck.gl `HeatmapLayer` (GPU, 60fps) | CPU `renderHeatmap()` (~15-30fps) |
| Hotspots | 41 locations | 36 locations (close enough) |
| Color presets | 5 presets | 5 presets (matched) |
| UI | Glassmorphism sidebar, animated | Fyne dark panel, functional |
| Interactivity | Map pan/zoom/tilt, hover tooltips | Pan only (scroll/drag), no zoom or tooltips |
| Backend | Node.js/Express serving density data | Self-contained simulation (better) |
| Animation | requestAnimationFrame 60fps | setTimeout 30fps target |
| Viewport | Full window, responsive | Fixed 800×600 |

## Path to Perfection

### Phase 1: GPU Heatmap via CanvasShader (High Impact)

Replace CPU `renderHeatmap()` with a GLSL fragment shader. This is the single biggest improvement — it'll give us GPU-accelerated rendering with smooth gradients and proper blending, matching the Deck.gl visual quality.

**Approach**: Use `CanvasShader` (already supported by tsyne) with a custom fragment shader that:
1. Takes hotspot positions + weights as uniform arrays
2. Computes Gaussian falloff per-pixel on the GPU
3. Maps accumulated density through the color gradient
4. Composites glow, main heatmap, and hotspot layers in a single pass

**Why CanvasShader, not Trine/Three.js**: CanvasShader is a 2D fragment shader canvas — perfect for this use case. Trine/Three.js adds 3D scene graph overhead we don't need. The heatmap is fundamentally a 2D screen-space effect.

```glsl
// Sketch of the core shader logic
uniform vec2 u_hotspots[64];     // xy positions (normalized)
uniform float u_weights[64];      // density weights
uniform int u_count;              // active hotspot count
uniform float u_radius;           // falloff radius
uniform float u_intensity;        // global intensity
uniform float u_time;             // for animation

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float density = 0.0;
    for (int i = 0; i < 64; i++) {
        if (i >= u_count) break;
        float d = distance(uv, u_hotspots[i]);
        density += u_weights[i] * exp(-d*d / (2.0 * u_radius * u_radius));
    }
    // Map density through color gradient...
    gl_FragColor = colorFromDensity(density * u_intensity);
}
```

**Files to change**:
- `app.ts` — replace `TappableCanvasRaster` + `renderHeatmap()` with `CanvasShader`, pass hotspot data as uniforms
- Keep `simulation.ts` for generating the hotspot weights per time step
- Remove dependency on `createRenderTarget`, `clearRenderTarget`, `renderHeatmap` from tsyne core

**Limitation**: CanvasShader currently supports `u_resolution`, `u_time`, and custom uniforms via `setUniform()`. Need to verify array uniform support (vec2[], float[]) — if not supported, pack data into a texture or use a fixed-size array.

### Phase 2: Map Tile Background

Implement the `TileMapRenderer` for real. This is the second-biggest visual gap.

**Approach**: Raster tile fetching + caching, rendered as the background layer behind the heatmap.

1. **Tile fetching**: HTTP GET to OSM/Mapbox tile URLs (`{z}/{x}/{y}.png`), decode PNG to pixel buffer
2. **Tile cache**: Disk cache at `~/.tsyne/realtime-paris-density-simulation/map-cache/` with 7-day TTL (OSM policy)
3. **Tile compositing**: For a given viewport (center, zoom), calculate which tiles are needed, fetch/cache them, blit them into the render target before the heatmap layer
4. **Projection**: Web Mercator (already implemented in `toHeatmapPoints()`) — reuse for tile positioning

**Option A — Implement in core as a reusable `TileMapRenderer`**:
- New file `core/src/widgets/tilemap.ts`
- Uses Node.js `https` module for tile fetching (or bridge command for remote mode)
- Returns pixel buffer that can be composited with the heatmap
- Other apps can reuse it

**Option B — Implement locally in the app**:
- Simpler, fewer moving parts
- Less reusable but faster to ship

**Recommendation**: Option A (core), since map tiles are useful for other geo apps.

**For the shader approach (Phase 1)**: The map tiles become the clear-color / background texture. The shader composites the heatmap on top with alpha blending. This means tiles are rendered to a pixel buffer, uploaded as a texture uniform (`u_background`), and the shader alpha-blends the heatmap over it.

### Phase 3: Zoom and Improved Pan

Currently the app supports pan (drag/scroll) but not zoom. The original has full Mapbox pan/zoom/tilt.

1. **Scroll-wheel zoom**: Map mouse scroll to zoom level changes (integer zoom 10-16)
2. **Pinch zoom** (for phone/tablet): If touch events are available
3. **Zoom-dependent tile loading**: Different zoom levels load different tile z-levels
4. **Zoom-dependent heatmap radius**: Hotspot visual radius should scale with zoom

**Implementation**: Update `mapViewport.zoom` on scroll events. Recalculate tile set. Scale shader `u_radius` uniform proportionally.

### Phase 4: Visual Polish

**4a. Responsive canvas size**: Currently fixed at 800×600. Make it fill the window, responding to resize events.

**4b. Smoother animation**: Replace `setTimeout(fn, 33)` with proper requestAnimationFrame-equivalent. Target 60fps with the GPU shader path (should be trivial once Phase 1 is done).

**4c. UI glassmorphism**: The original has a beautiful frosted-glass sidebar. In Fyne/tsyne this could be approximated with:
- Semi-transparent dark background (already done)
- Rounded corners on the panel container
- Subtle border/glow effect

**4d. Hover tooltips**: When hovering over a hotspot, show name + current density. Requires:
- Hit-testing against hotspot positions on pointer move
- Showing a floating label near the cursor

**4e. Status bar**: Show current tile source, zoom level, center coordinates at the bottom.

### Phase 5: Additional Hotspots

Add the 5 missing locations from the original (it has 41, we have 36):
- CDG Airport area
- Orly Airport area
- Saint-Denis / Stade de France
- La Villette (may overlap with existing Parc de la Villette)
- Bercy / AccorHotels Arena

These are straightforward additions to the `HOTSPOTS` array in `simulation.ts`.

### Phase 6: Test Coverage

**6a. Screenshot tests**: Add headed TsyneTest that renders specific time/day combinations and compares screenshots. This catches visual regressions in the shader output.

**6b. Shader compilation test**: Verify the GLSL compiles without errors on the Go bridge's GL context.

**6c. Tile cache tests**: Mock HTTP responses, verify cache hit/miss behavior, TTL expiration.

## Priority Order

1. **Phase 1** (GPU shader) — transforms visual quality, biggest bang for effort
2. **Phase 2** (map tiles) — adds geographic context, second biggest visual gap
3. **Phase 5** (hotspots) — trivial, do it alongside Phase 1
4. **Phase 3** (zoom) — meaningful UX improvement
5. **Phase 4** (polish) — incremental improvements
6. **Phase 6** (tests) — do incrementally alongside each phase

## Risk Assessment

- **CanvasShader uniform arrays**: If `setUniform()` doesn't support `vec2[]` / `float[]`, we'll need to either extend the bridge GL uniform handling or pack data into a 1D texture. The GL bridge already handles `uniform1fv`, `uniform2fv` etc. for Three.js, so this should work.
- **Tile fetching from Go bridge**: In remote bridge mode, tiles need to be fetched on the Go side (the TS side may not have network access). This aligns with the bridge audio pattern — detect mode and route accordingly.
- **OSM tile usage policy**: Max 2 requests/second, proper User-Agent, disk caching required. Must respect this.
- **Shader hotspot limit**: GLSL `for` loops with uniform bounds have driver-specific limits. 64 hotspots should be safe on all Mesa/desktop drivers. If we need more, use a texture lookup.
