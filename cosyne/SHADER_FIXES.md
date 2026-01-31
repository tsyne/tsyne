# Cosyne/Canvas Shader Fixes Plan

## Overview
This work involves fixing and completing the Cosyne library extensions and CanvasShader (GPU/GLSL) functionality that was started in commits fe05e2cb through 8ba28f27.

---

## 1. GPU Fractals Demo - BROKEN
**File:** `ported-apps/script-schmiede-fractals/index-gpu.ts`

**Problem:** Shader compilation fails with "syntax error, unexpected NEW_IDENTIFIER"

**Cause:** Uses `precision highp float;` which is OpenGL ES syntax, not desktop OpenGL (GLSL 1.10/1.20)

**Fix:** Remove `precision highp float;` from shader header, add `#version 110` directive

**Status:** Not started

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

## 4. Trails Demo - NEEDS TESTING
**File:** `cosyne/demos/trails-demo.ts`

**Status:** Runs without errors, needs visual verification

**To verify:**
- Single trail mode
- Color trail mode
- Multi-trail mode
- Trail aging/fading

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

## 6. Colordodge Kaleidoscope Port
**File:** `ported-apps/colordodge-kaleidoscope/index.ts`

**Status:** Unknown - needs testing. May have same shader syntax issues.

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
