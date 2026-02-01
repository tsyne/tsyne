# Cosyne/Canvas Shader Fixes Plan

## Overview
This work involves fixing and completing the Cosyne library extensions and CanvasShader (GPU/GLSL) functionality that was started in commits fe05e2cb through 8ba28f27.

---

## 1. GPU Fractals Demo - FIXED
**File:** `ported-apps/script-schmiede-fractals/index-gpu.ts`

**Problem:** Shader compilation fails with "syntax error, unexpected NEW_IDENTIFIER"

**Root Causes:**
1. Uses `precision highp float;` which is OpenGL ES syntax (not desktop OpenGL GLSL 1.10)
2. Uses `uniform int u_palette` which caused silent shader failures

**Fixes Applied:**
1. Replace shader header with `#version 110` (no precision qualifiers)
2. Change `uniform int u_palette` to `uniform float u_palette`
3. Update `getPaletteColor()` to use float comparisons (`palette < 0.5` etc.)
4. Reduce loop iterations from 1000 to 256 for better compatibility

**Status:** FIXED - Screenshots verify Mandelbrot and Julia sets render correctly

**Screenshot Test:** `ported-apps/script-schmiede-fractals/index-gpu.test.ts`
**Screenshots:** `cosyne/test/screenshots/gpu-mandelbrot.png`, `gpu-julia.png`

---

## 2. Kaleidoscope Shader Demo - WORKING
**File:** `cosyne/demos/kaleidoscope-shader.ts`

**Status:** Fixed and working. True GPU kaleidoscope with mirrored segments.

**Verified:** Screenshots show proper 6-fold and 8-fold symmetry.

---

## 3. Symmetry Demo - SIMPLIFIED
**File:** `cosyne/demos/symmetry-demo.ts`

**Previous problems:**
- "Kaleidoscope" mode wasn't a true kaleidoscope (just drew radial lines)
- Mouse interaction wasn't working
- Continuous rebuild caused flickering
- Path rendering had positioning issues

**Current state:** Simplified to just Polygon and Star modes using lines (not paths). Static shapes, no mouse interaction. Buttons work to switch modes and change sides.

**Remaining issue:** The `cosyne.path()` function has coordinate/positioning bugs - paths render offset from where they should be. Works for centered shapes but not for arbitrary positioned paths.

---

## 4. Trails Demo - TESTED
**File:** `cosyne/demos/trails-demo.ts`

**Status:** Runs without errors, visual tests added

**Screenshot Test:** `cosyne/test/trails-demo.test.ts` - tests all three modes:
- Single trail mode (white spiral)
- Color trail mode (rainbow spiral)
- Multi-trail mode (3 interleaved colored spirals)

---

## 5. Path Rendering Bug
**File:** `cosyne/src/context.ts` - `path()` method

**Problem:** SVG paths with absolute coordinates render at wrong position. The PathRaster widget uses the path coordinates directly but the raster is sized to bounding box, causing offset.

**Example:** A hexagon centered at (250, 250) with path `M 250 100 L 380 200...` renders offset because the raster is only sized to fit the path bounds, not positioned correctly.

**Workaround:** Use `line()` instead of `path()` for polygons (current approach in symmetry-demo)

**Proper fix needed:** Either:
- Translate path coordinates to start at (0,0) and position the raster
- Or size the raster to full canvas and render path at absolute coords

---

## 6. Colordodge Kaleidoscope Port - WORKING
**File:** `ported-apps/colordodge-kaleidoscope/index.ts`

**Status:** WORKING - Uses Cosyne (TypeScript), not OpenGL shaders. All 24 unit tests pass.

**Test:** `pnpm -C ported-apps/colordodge-kaleidoscope test`

---

## Priority Order

1. **GPU Fractals** - Fix shader syntax (quick fix, high value demo)
2. **Trails Demo** - Verify working (just needs testing)
3. **Colordodge Kaleidoscope** - Test and fix if needed
4. **Path Rendering** - Lower priority, workaround exists

---

## Technical Notes

### GLSL Version Compatibility
- Desktop OpenGL uses GLSL 1.10/1.20 (no precision qualifiers)
- OpenGL ES uses GLSL ES (requires `precision mediump/highp float;`)
- Our bridge targets desktop OpenGL via Fyne/go-gl

### Shader Header Template
```glsl
#version 110
// No precision qualifier - desktop OpenGL only
uniform vec2 u_resolution;
uniform float u_time;
// ... other uniforms
```

### Uniform Type Compatibility
- `uniform float` - works correctly
- `uniform vec2/vec3/vec4` - works correctly
- `uniform int` - **AVOID** - causes silent shader failures, use float instead

---

## 7. CanvasShader Visual Test Suite - ADDED
**File:** `cosyne/test/canvas-shader-visual.test.ts`

**Status:** NEW - Comprehensive visual tests for CanvasShader widget

**Tests:**
- Basic patterns: horizontal gradient, radial gradient, checkerboard
- Uniform updates: float (scale), vec2 (position), vec3 (color)
- Dynamic shader source: setSource() swaps shader code
- Animation: verifies u_time causes visual changes
- Plasma effect demo

**Screenshots:** 15+ screenshots in `cosyne/test/screenshots/shader-*.png`

---

## 8. 3D Rendering via Raymarching - IN PROGRESS
**Files:** `cosyne/demos/raymarching-intro.ts`, `cosyne/demos/raymarching-car.ts`

**Status:** WORKING - GPU-accelerated 3D via GLSL raymarching

**New demos created:**
- `raymarching-intro.ts` - Sphere, box, torus, combined shapes with soft shadows
- `raymarching-car.ts` - Full 3D car with body, cabin, wheels, lights, ground

**Features implemented:**
- Signed Distance Functions (SDFs) for 3D primitives
- Smooth blending between shapes (smin)
- Diffuse lighting with configurable light direction
- Soft shadows
- Ambient occlusion
- Fresnel rim lighting
- Fake environment reflections
- Material system (matte, metallic, chrome)
- Day/night modes
- Checkerboard ground plane
- Camera controls (rotation)

**Run demos:**
```bash
npx tsx cosyne/demos/raymarching-intro.ts
npx tsx cosyne/demos/raymarching-car.ts
```

**Screenshot tests:** `cosyne/test/raymarching.test.ts`
- raymarch-sphere.png, raymarch-box.png
- raymarch-car-red.png, raymarch-car-blue.png

**Comparison:**
| Feature | Wireframe Port | Raymarching |
|---------|---------------|-------------|
| Rendering | CPU software | GPU GLSL |
| Shapes | Box outlines | Smooth SDFs |
| Lighting | None | Diffuse + shadows |
| Materials | None | Matte/metallic/chrome |
| Ground | None | Checkered |
| Sky | Solid color | Gradient |
| Performance | ~30fps | 60fps |

**Still needed for full alteredqualia parity:**
- Real car model geometry (complex SDFs or vertex buffers)
- Cubemap environment reflections
- More material presets
- Model switching (Bugatti, Lambo, etc.)

---

## 9. Cosyne3D GPU Backend - FUTURE
**Files:** `cosyne/src/context3d.ts`

**Note:** Cosyne3D has the scene graph API (primitives, materials, lights) but no GPU renderer yet. Options:

1. **Raymarching backend** - Convert scene graph to SDF functions (current approach)
2. **Vertex buffer backend** - Extend CanvasShader to accept custom vertices
3. **Hybrid** - Use raymarching for simple scenes, vertices for complex models
