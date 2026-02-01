# OpenGL Integration Plan for WebGL Demo Ports

## Overview

This plan outlines how to push the three WebGL demo ports to full GPU-accelerated rendering using the Fyne fork technology established in `core/bridge/setup-fyne-fork.sh`.

## Current State

### Infrastructure (via setup-fyne-fork.sh)
- ✅ `canvas.Shader` primitive for GLSL fragment shaders
- ✅ Shader painter with compilation, uniform handling, viewport management
- ✅ BlendMode support on canvas primitives (Additive, Multiply, Screen)
- ✅ GLSL 1.10 compatibility (desktop OpenGL, no precision qualifiers)
- ✅ Uniform types: float, vec2, vec3, vec4 (avoid `uniform int`)

### Demo Status

| Demo | Current | Target | Gap |
|------|---------|--------|-----|
| **GPU Fractals** | ✅ GPU shaders | ✅ Complete | None - fully working |
| **Kaleidoscope** | ✅ GPU shaders | ✅ Complete | None - fully working |
| **Colordodge Kaleidoscope** | TypeScript/Cosyne | GPU optional | Could port to GLSL for perf |
| **3D Cars** | Software wireframe | Full 3D with materials | Major - needs 3D pipeline |
| **Trails Demo** | TypeScript/Cosyne | TypeScript OK | Blend modes work |

---

## Phase 1: Verify Existing GPU Demos (DONE)

### 1.1 GPU Fractals (`ported-apps/script-schmiede-fractals/index-gpu.ts`)
- [x] Fix GLSL 1.10 compatibility (`#version 110`, no precision)
- [x] Fix `uniform int` → `uniform float` for palette selection
- [x] Screenshot tests verify Mandelbrot, Julia, Tricorn, etc.
- [x] All 8 color palettes working

**Run:** `npx tsx ported-apps/script-schmiede-fractals/index-gpu.ts`

### 1.2 GPU Kaleidoscope (`cosyne/demos/kaleidoscope-shader.ts`)
- [x] Proper kaleidoscope mirroring in GLSL
- [x] Mouse interaction for pattern offset
- [x] Segment count controls
- [x] Screenshot tests at 6 and 8 segments

**Run:** `npx tsx cosyne/demos/kaleidoscope-shader.ts`

---

## Phase 2: Enhance CanvasShader Capabilities

### 2.1 Add Texture Uniform Support
Current CanvasShader only supports scalar/vector uniforms. For advanced effects:

```go
// In shader_painter.go
case *image.RGBA:
    texID := p.uploadTexture(v)
    p.ctx.ActiveTexture(gl.TEXTURE0 + texUnit)
    p.ctx.BindTexture(gl.TEXTURE_2D, texID)
    p.ctx.Uniform1i(loc, texUnit)
```

**Use cases:**
- Environment mapping for reflections
- Image-based kaleidoscopes
- Noise textures for procedural effects

### 2.2 Add Cubemap Support (for 3D cars)
For environment reflections:

```glsl
uniform samplerCube u_envMap;
vec3 reflected = reflect(viewDir, normal);
vec3 envColor = textureCube(u_envMap, reflected).rgb;
```

### 2.3 Add Vertex Buffer Support
For 3D geometry beyond fullscreen quads:

```go
// Allow custom vertex data
type Shader struct {
    // ... existing fields
    Vertices    []float32  // Custom vertex positions
    Indices     []uint16   // Index buffer
    VertexAttribs map[string]AttribDesc
}
```

---

## Phase 3: 3D Rendering Pipeline for Cars Demo

The alteredqualia cars demo requires a proper 3D pipeline. Options:

### Option A: GLSL Raymarching (Simpler)
Render 3D shapes directly in fragment shader using signed distance functions:

```glsl
// Car body as union of SDFs
float sdCar(vec3 p) {
    float body = sdBox(p, vec3(2.0, 0.5, 1.0));
    float cabin = sdBox(p - vec3(0, 0.7, 0), vec3(1.0, 0.4, 0.8));
    float wheels = sdCylinder(p - wheelPos, 0.3, 0.1);
    return min(body, min(cabin, wheels));
}
```

**Pros:** No vertex buffers needed, current infrastructure works
**Cons:** Performance-limited, hard to do complex car models

### Option B: Cosyne3D GPU Renderer (Full Solution)
Connect the existing Cosyne3D scene graph to CanvasShader:

1. **Scene Graph** (exists): `cosyne/src/context3d.ts`
   - Primitives: box, sphere, cylinder, cone
   - Materials: color, metalness, roughness
   - Lights: ambient, directional, point

2. **Serialization**: Convert scene to GPU format
   ```typescript
   interface GPUScene {
     vertices: Float32Array;
     normals: Float32Array;
     indices: Uint16Array;
     materials: MaterialBuffer;
     lights: LightBuffer;
   }
   ```

3. **Vertex Shader**: Transform + project
   ```glsl
   uniform mat4 u_mvp;
   attribute vec3 a_position;
   attribute vec3 a_normal;
   varying vec3 v_normal;
   void main() {
       gl_Position = u_mvp * vec4(a_position, 1.0);
       v_normal = a_normal;
   }
   ```

4. **Fragment Shader**: PBR lighting
   ```glsl
   uniform vec3 u_lightDir;
   uniform vec3 u_baseColor;
   uniform float u_metalness;
   varying vec3 v_normal;
   void main() {
       float NdotL = max(dot(v_normal, u_lightDir), 0.0);
       gl_FragColor = vec4(u_baseColor * NdotL, 1.0);
   }
   ```

### Option C: Improved Software Rasterizer (Incremental)
Enhance current CarsState to be more visually appealing:

1. **Filled polygons** instead of wireframes
2. **Flat shading** with light direction
3. **Z-buffer** for proper depth
4. **Phong shading** for smoother lighting

This keeps TypeScript but looks better.

---

## Phase 3.5: Canvas 2D Demo Coverage ✅ COMPLETE

All 12 Canvas 2D capability demos created with co-located tests. Ensure all Canvas 2D capabilities have working, well-documented demos in `cosyne/demos/`. Coverage analysis:

### Existing Canvas 2D Demos ✅
- `trails-demo.ts` - Trail effects and fade
- `symmetry-demo.ts` - Regular polygons, stars, radial symmetry
- `cosyne-animated-shapes.ts` - Animation with easing functions
- `cosyne-parametric-curves.ts` - Parametric curve rendering
- `blend-mode-comparison.ts` - Blend mode effects
- `text-contrast-test.ts` - Text rendering (testing)
- `hit-rect-test.ts` - Hit testing (testing)

### Missing Canvas 2D Demos 🚧
1. **line-chart-demo.ts** - Multi-series line charts with different interpolation types
   - Linear, step, catmull-rom, monotone interpolation
   - Axes with labels and tick marks
   - Data scales (linear, logarithmic, power)
   - Interactive legend

2. **particles-demo.ts** - Particle system physics simulation
   - Velocity, acceleration, friction simulation
   - Lifespan and fade effects
   - Emitter patterns (burst, continuous)
   - Collision detection (optional)

3. **gradients-demo.ts** - Gradient fills and transitions
   - Linear gradients (multiple angles)
   - Radial gradients (multiple radii)
   - Color stops with alpha blending
   - Gradient animation transitions

4. **clipping-demo.ts** - Clipping region demonstrations
   - Circular clipping
   - Rectangular clipping
   - Polygonal clipping paths
   - Clipping with complex shapes

5. **effects-demo.ts** - Visual effects showcase
   - Drop shadows
   - Glow effects
   - Text shadows
   - Text strokes
   - Combined effects

6. **projections-demo.ts** - 2D-to-3D projection systems
   - Isometric projection
   - Spherical projection
   - Perspective projection
   - Interactive camera control

7. **markers-demo.ts** - Custom line markers and connectors
   - Arrow markers (start, end, both)
   - Shape markers (circles, squares, diamonds, triangles)
   - Custom SVG path markers
   - Connector lines between shapes

8. **axes-grid-demo.ts** - Coordinate systems and grids
   - X/Y axis with labels
   - Grid lines (minor and major)
   - Tick marks and labels
   - Axis labels and title

9. **zoom-pan-demo.ts** - Interactive navigation
   - Mouse drag-to-pan
   - Scroll wheel zoom
   - Keyboard shortcuts (arrow keys, +/-)
   - Zoom constraints and snapping

10. **foreign-objects-demo.ts** - Embedding Tsyne widgets in canvas
    - Buttons on canvas
    - Sliders overlaid
    - Text input within canvas area
    - Widget event handling

11. **collections-demo.ts** - Efficient rendering of many primitives
    - Dynamic circle collection (thousands)
    - Dynamic rectangle collection
    - Collection diffing and updates
    - Performance comparison with individual primitives

12. **data-visualization-demo.ts** - Comprehensive data viz showcase
    - Heatmaps with color scales
    - Multiple chart types
    - Real-time data updates
    - Legend and annotations

### Demo Creation Sprint ✅ COMPLETE

Each demo includes:
- ✅ Clear, well-commented code
- ✅ Interactive controls (sliders, buttons, dropdowns)
- ✅ Performance display where applicable
- ✅ Visual regression tests (co-located)
- ✅ Running as standalone: `npx tsx cosyne/demos/*-demo.ts`
- ✅ Code examples for reuse

**Demos created: 12/12** ✅
**Priority: High** - Enables comprehensive Canvas 2D documentation
**Test Status:** API migration in progress (CosyneTest pattern)

---

## Phase 4: Implementation Roadmap

### Sprint 1: Texture Uniforms
- [ ] Add texture upload to shader_painter.go
- [ ] Add sampler2D uniform type handling
- [ ] Test with image-based kaleidoscope
- [ ] Update setup-fyne-fork.sh with new patches

### Sprint 2: Vertex Buffer Support
- [ ] Extend canvas.Shader to accept custom vertices
- [ ] Add index buffer support
- [ ] Add attribute binding (position, normal, texcoord)
- [ ] Test with simple 3D cube

### Sprint 3: Cosyne3D GPU Backend
- [ ] Create scene serializer in TypeScript
- [ ] Implement GPU scene format
- [ ] Basic vertex + fragment shaders for primitives
- [ ] Add material uniform buffer

### Sprint 3.5: Canvas 2D Demo Coverage
- [ ] Create 12 missing Canvas 2D demos (line-chart, particles, gradients, clipping, effects, projections, markers, axes, zoom-pan, foreign, collections, data-viz)
- [ ] Add interactive controls to each demo
- [ ] Create visual regression tests for each
- [ ] Document feature usage in demo code

### Sprint 4: Cars Demo Upgrade
- [ ] Define car geometry as Cosyne3D primitives
- [ ] Add environment map loading
- [ ] Implement PBR-lite shading
- [ ] Add material presets (chrome, paint, glass)

---

## Phase 5: Procedural Terrain Generation (Future)

A comprehensive procedural terrain generator system with three rendering approaches, demonstrating noise functions, real-time generation, and interactive exploration.

### Option A: GPU Raymarched Terrain (Recommended) 🏔️

**Status:** Ready to implement
**Difficulty:** Medium
**Performance:** 60+ fps

Uses GLSL fragment shaders with Perlin/Simplex noise to generate terrain procedurally via raymarching.

**Implementation:**
```glsl
// Terrain SDF using fractional Brownian motion (FBM)
float terrainHeight(vec2 pos) {
    float height = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;

    for (int i = 0; i < 5; i++) {
        height += amplitude * perlinNoise(pos * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return height * 50.0;
}

float sdTerrain(vec3 p) {
    return p.y - terrainHeight(p.xz);
}
```

**Features:**
- Real-time noise generation (Perlin/Simplex/FBM)
- Interactive height/scale controls
- Material presets (grass, sand, rock, snow)
- Lighting with normal calculation from terrain
- Camera flythrough controls
- Performance FPS display
- Erosion/weathering shader effects (optional)

**Demo:** `procedural-terrain-gpu.ts`
**Run:** `npx tsx cosyne/demos/procedural-terrain-gpu.ts`

**Building blocks already exist:**
- ✅ `shader-perlin-noise.ts` - Perlin noise implementation
- ✅ `procedural-patterns.ts` - Procedural generation patterns
- ✅ Raymarching infrastructure with SDF support
- ✅ Material system for terrain types

---

### Option B: Canvas 2D Heightmap Visualization 🗺️

**Status:** Ready to implement
**Difficulty:** Easy
**Performance:** 30+ fps

Uses Canvas 2D to render procedurally generated terrain as a colored heightmap with contour lines.

**Implementation:**
```typescript
// Generate terrain height data
const terrainData: number[][] = [];
for (let y = 0; y < gridHeight; y++) {
  for (let x = 0; x < gridWidth; x++) {
    const height = perlinNoise(x * scale, y * scale);
    terrainData[y][x] = height;
  }
}

// Render as heatmap with color scale
const color = getTerrainColor(height);
ctx.rectangle({
  size: [cellSize, cellSize],
  position: [x * cellSize, y * cellSize],
})
  .setFill(color);
```

**Features:**
- Height-based color mapping (blue→green→brown→white)
- Contour line overlays
- Interactive noise parameter adjustments
- Real-time regeneration
- Zoom/pan to explore
- Statistics display (min/max/avg height)
- Export heightmap as CSV/image

**Demo:** `procedural-terrain-canvas.ts`
**Run:** `npx tsx cosyne/demos/procedural-terrain-canvas.ts`

**Extends existing:**
- ✅ Canvas 2D data-visualization-demo patterns
- ✅ Heatmap rendering infrastructure
- ✅ Gradient color mapping system

---

### Option C: 3D Cosyne3D Terrain Mesh 🎲

**Status:** Ready to implement (requires Cosyne3D enhancements)
**Difficulty:** Hard
**Performance:** 30-45 fps depending on LOD

Generates terrain as 3D mesh geometry using Cosyne3D with level-of-detail (LOD) optimization.

**Implementation:**
```typescript
// Generate terrain mesh vertices
const vertices: [number, number, number][] = [];
const indices: number[] = [];

for (let y = 0; y < gridHeight; y++) {
  for (let x = 0; x < gridWidth; x++) {
    const height = perlinNoise(x * scale, y * scale) * heightScale;
    vertices.push([x * spacing, height, y * spacing]);
  }
}

// Create triangle indices
for (let y = 0; y < gridHeight - 1; y++) {
  for (let x = 0; x < gridWidth - 1; x++) {
    const i = y * gridWidth + x;
    indices.push(i, i + 1, i + gridWidth);
    indices.push(i + 1, i + gridWidth + 1, i + gridWidth);
  }
}

// Render with Cosyne3D
cosyne3d(ctx, (c) => {
  c.mesh({
    vertices,
    indices,
    material: { color: '#8B7355' }, // Brown
  });
});
```

**Features:**
- Procedural mesh generation with LOD
- Multiple material types (grass shader, rock shader, water shader)
- Interactive camera controls (orbit/flythrough)
- Lighting with calculated normals
- Optional features:
  - Water plane with reflection
  - Vegetation placement (trees as instanced meshes)
  - Weather effects (fog, clouds)
  - Day/night cycle
  - Erosion simulation

**Demo:** `procedural-terrain-3d.ts`
**Run:** `npx tsx cosyne/demos/procedural-terrain-3d.ts`

**Requires:**
- ✅ Cosyne3D context with mesh support
- ✅ Vertex buffer support (Phase 2.3 complete)
- ✅ Material system
- ⚠️ Optional: Instance rendering for vegetation

---

### Comparison Matrix

| Feature | GPU Raymarched | Canvas 2D | 3D Mesh |
|---------|-----------------|-----------|---------|
| **Performance** | ⭐⭐⭐⭐⭐ (60+ fps) | ⭐⭐⭐ (30+ fps) | ⭐⭐⭐⭐ (30-45 fps) |
| **Visual Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Ease of Impl.** | Medium | Easy | Hard |
| **Interactivity** | High | Medium | Very High |
| **Memory Usage** | Low (shader-based) | High (vertex data) | Medium (mesh LOD) |
| **Best For** | Speed/aesthetics | Exploration/analysis | Realistic terrain |
| **Can add water** | ✅ (surface) | ✅ (overlay) | ✅ (mesh + physics) |
| **Can add objects** | ⚠️ (limited) | ✅ (easy) | ✅ (instanced) |

---

### Implementation Roadmap for Phase 5

**Sprint 1: GPU Raymarched Terrain**
- [ ] Implement multi-octave FBM noise in shader
- [ ] Add terrain SDF to raymarching pipeline
- [ ] Implement normal calculation for lighting
- [ ] Create material presets (grass, sand, rock, snow)
- [ ] Add interactive controls (height, scale, detail)
- [ ] Create `procedural-terrain-gpu.ts` demo with test
- [ ] Benchmark performance across resolutions

**Sprint 2: Canvas 2D Heightmap**
- [ ] Implement heightmap generation algorithm
- [ ] Create color scale for height visualization
- [ ] Add contour line rendering
- [ ] Implement zoom/pan navigation
- [ ] Create `procedural-terrain-canvas.ts` demo with test
- [ ] Add statistics display (min/max/variance)

**Sprint 3: 3D Cosyne3D Terrain**
- [ ] Verify Cosyne3D mesh support (Phase 2.3)
- [ ] Implement LOD algorithm for mesh optimization
- [ ] Generate terrain mesh with normal calculation
- [ ] Implement material shaders for terrain types
- [ ] Add camera flythrough controls
- [ ] Create `procedural-terrain-3d.ts` demo with test

**Sprint 4: Advanced Features (Optional)**
- [ ] Water plane with reflection
- [ ] Vegetation placement and rendering
- [ ] Weather effects (fog, clouds, rain)
- [ ] Day/night cycle
- [ ] Terrain export (heightmap/OBJ)
- [ ] Performance profiling tools

---

## Runnable Demos (Human-Friendly)

### GPU 3D Demos (NEW):
```bash
# Raymarching Intro - sphere, box, torus, combined shapes
# Soft shadows, ambient occlusion, diffuse lighting
npx tsx cosyne/demos/raymarching-intro.ts

# Raymarching Car - full 3D car with wheels, lights, ground
# Color presets, matte/metallic/chrome materials, day/night mode
npx tsx cosyne/demos/raymarching-car.ts

# Materials Showcase - matte, metallic, chrome, glass, emissive
# Compare different material types side by side
npx tsx cosyne/demos/materials-showcase.ts
```

### GPU Shader Demos:
```bash
# GPU Fractals - 7 fractal types, 8 palettes, zoom/pan
npx tsx ported-apps/script-schmiede-fractals/index-gpu.ts

# GPU Kaleidoscope - drag to shift, adjust segments
npx tsx cosyne/demos/kaleidoscope-shader.ts
```

### TypeScript/Cosyne Demos (Existing):
```bash
# Colordodge Kaleidoscope - TypeScript/Cosyne version
npx tsx ported-apps/colordodge-kaleidoscope/index.ts

# Trails Demo - interactive trail drawing
npx tsx cosyne/demos/trails-demo.ts

# Symmetry Demo - regular polygons and stars
npx tsx cosyne/demos/symmetry-demo.ts

# Animated Shapes - animation with easing
npx tsx cosyne/demos/cosyne-animated-shapes.ts

# Parametric Curves - curve rendering
npx tsx cosyne/demos/cosyne-parametric-curves.ts

# Blend Modes - comparison of blend mode effects
npx tsx cosyne/demos/blend-mode-comparison.ts

# Cars Demo - current wireframe version (being replaced)
npx tsx ported-apps/alteredqualia-cars/index.ts
```

### Canvas 2D Demos (Phase 3.5 Complete):
```bash
# Line Charts - multi-series data visualization
npx tsx cosyne/demos/line-chart-demo.ts

# Particles - physics simulation with emitters
npx tsx cosyne/demos/particles-demo.ts

# Gradients - fill types and color transitions
npx tsx cosyne/demos/gradients-demo.ts

# Clipping - region clipping and masking
npx tsx cosyne/demos/clipping-demo.ts

# Effects - shadows, glow, text effects
npx tsx cosyne/demos/effects-demo.ts

# Projections - isometric and spherical projections
npx tsx cosyne/demos/projections-demo.ts

# Markers - line markers and connector lines
npx tsx cosyne/demos/markers-demo.ts

# Axes & Grid - coordinate systems
npx tsx cosyne/demos/axes-grid-demo.ts

# Zoom & Pan - interactive navigation
npx tsx cosyne/demos/zoom-pan-demo.ts

# Foreign Objects - embedded Tsyne widgets
npx tsx cosyne/demos/foreign-objects-demo.ts

# Collections - efficient large-scale rendering
npx tsx cosyne/demos/collections-demo.ts

# Data Visualization - heatmaps and comprehensive viz
npx tsx cosyne/demos/data-visualization-demo.ts
```

### Procedural Terrain Demos (Planned Phase 5):
```bash
# GPU Raymarched Terrain - real-time noise-based terrain (RECOMMENDED)
npx tsx cosyne/demos/procedural-terrain-gpu.ts  # TODO

# Canvas 2D Heightmap - procedural terrain visualization
npx tsx cosyne/demos/procedural-terrain-canvas.ts  # TODO

# 3D Cosyne3D Terrain - mesh-based procedural terrain
npx tsx cosyne/demos/procedural-terrain-3d.ts  # TODO
```

### Run Tests with Screenshots:
```bash
# GPU fractals visual test
pnpm -C ported-apps/script-schmiede-fractals test index-gpu.test.ts

# CanvasShader comprehensive tests
pnpm -C cosyne test canvas-shader-visual.test.ts

# Trails demo visual test
pnpm -C cosyne test trails-demo.test.ts
```

---

## Technical Notes

### GLSL 1.10 Compatibility
```glsl
// DO:
#version 110
uniform float u_value;  // Use float for integers
uniform vec2 u_pos;

// DON'T:
precision highp float;  // OpenGL ES only
uniform int u_value;    // Causes silent failures
```

### Uniform Type Mapping (TypeScript → GLSL)
| TypeScript | GLSL |
|------------|------|
| `number` | `float` |
| `[n, n]` | `vec2` |
| `[n, n, n]` | `vec3` |
| `[n, n, n, n]` | `vec4` |

### Viewport Handling
The shader painter sets viewport to the shader's screen area, so `gl_FragCoord` is relative to the shader quad (not window). This simplifies UV calculations:
```glsl
vec2 uv = gl_FragCoord.xy / u_resolution;  // 0-1 range within shader
```

---

## Success Metrics

1. **GPU Fractals**: ✅ Renders at 60fps, all fractal types work
2. **Kaleidoscope**: ✅ Real-time interaction, proper mirroring
3. **3D Cars**: 🎯 Target - rendered 3D models with reflections
4. **Visual Tests**: All screenshots pass, no regressions

---

## Files to Modify

| File | Changes |
|------|---------|
| `core/bridge/setup-fyne-fork.sh` | Add texture/vertex patches |
| `core/bridge/fyne-fork/canvas/shader.go` | Extend Shader struct |
| `core/bridge/fyne-fork/internal/painter/gl/shader_painter.go` | Texture/vertex rendering |
| `cosyne/src/context3d.ts` | GPU scene export |
| `ported-apps/alteredqualia-cars/index.ts` | Use Cosyne3D + GPU |
