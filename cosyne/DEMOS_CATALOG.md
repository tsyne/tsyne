# Cosyne Demos Catalog

Complete listing of educational GPU rendering and drawing demos.

**Total: 17 demos** (6 Cosyne/TypeScript, 8 GPU Shaders, 3 Shader Scripts)

---

## Cosyne Drawing Demos (Pure TypeScript)

Interactive vector graphics using Cosyne drawing library.

| Demo | File | Concept | Run Command |
|------|------|---------|-------------|
| **Animated Shapes** | `demos/cosyne-animated-shapes.ts` | Rotating polygons, stars, spirals, waves | `npx tsx cosyne/demos/cosyne-animated-shapes.ts` |
| **Parametric Curves** | `demos/cosyne-parametric-curves.ts` | Lissajous, rose, butterfly, epitrochoid curves | `npx tsx cosyne/demos/cosyne-parametric-curves.ts` |
| **Trails Demo** | `demos/trails-demo.ts` | Single, colored, and multi-trail systems | `npx tsx cosyne/demos/trails-demo.ts` |
| **Symmetry Demo** | `demos/symmetry-demo.ts` | Polygon and star symmetry patterns | `npx tsx cosyne/demos/symmetry-demo.ts` |
| **Blend Mode Comparison** | `demos/blend-mode-comparison.ts` | Visual comparison of blend modes | `npx tsx cosyne/demos/blend-mode-comparison.ts` |
| **Colordodge Kaleidoscope** | `ported-apps/colordodge-kaleidoscope/index.ts` | Kaleidoscope in TypeScript/Cosyne | `npx tsx ported-apps/colordodge-kaleidoscope/index.ts` |

---

## 3D GPU Rendering Demos

Raymarching and advanced 3D effects via GLSL.

### Core 3D Techniques

| Demo | File | Concept | Run Command |
|------|------|---------|-------------|
| **Raymarching Intro** | `demos/raymarching-intro.ts` | Sphere, box, torus, combined shapes | `npx tsx cosyne/demos/raymarching-intro.ts` |
| **SDF Operations** | `demos/sdf-operations.ts` | Union, subtraction, intersection of shapes | `npx tsx cosyne/demos/sdf-operations.ts` |
| **Lighting Modes** | `demos/lighting-modes.ts` | Frontal, side, back, multi-light setups | `npx tsx cosyne/demos/lighting-modes.ts` |
| **Materials Showcase** | `demos/materials-showcase.ts` | Matte, metallic, chrome, glass materials | `npx tsx cosyne/demos/materials-showcase.ts` |

### Advanced 3D & Complex Geometry

| Demo | File | Concept | Run Command |
|------|------|---------|-------------|
| **Raymarching Car** | `demos/raymarching-car.ts` | Complex geometry (car body, wheels, lights) | `npx tsx cosyne/demos/raymarching-car.ts` |
| **Procedural Patterns** | `demos/procedural-patterns.ts` | Checkerboard, stripes, waves, noise patterns | `npx tsx cosyne/demos/procedural-patterns.ts` |

---

## Algorithmic Shader Demos

Procedural generation and mathematical patterns.

| Demo | File | Concept | Run Command |
|------|------|---------|-------------|
| **Perlin Noise** | `demos/shader-perlin-noise.ts` | Noise generation: simple, FBM, displacement, flow | `npx tsx cosyne/demos/shader-perlin-noise.ts` |
| **Voronoi Diagrams** | `demos/shader-voronoi.ts` | Voronoi cells, edges, distance, animated growth | `npx tsx cosyne/demos/shader-voronoi.ts` |
| **Reaction-Diffusion** | `demos/shader-reaction-diffusion.ts` | Gray-Scott patterns: spots, stripes, maze, swirl | `npx tsx cosyne/demos/shader-reaction-diffusion.ts` |

---

## Classic Shader Effects

| Demo | File | Concept | Run Command |
|------|------|---------|-------------|
| **GPU Fractals** | `ported-apps/script-schmiede-fractals/index-gpu.ts` | Mandelbrot, Julia, Tricorn, Newton, etc. | `npx tsx ported-apps/script-schmiede-fractals/index-gpu.ts` |
| **GPU Kaleidoscope** | `demos/kaleidoscope-shader.ts` | Real-time mirroring with mouse control | `npx tsx cosyne/demos/kaleidoscope-shader.ts` |

---

## Screenshot Tests

All demos have visual verification tests using CosyneTest:

### Raymarching Tests
```bash
pnpm -C cosyne test raymarching.test.ts
```
Captures: `raymarch-sphere.png`, `raymarch-box.png`, `raymarch-car-*.png`

### Materials Tests
```bash
pnpm -C cosyne test materials-showcase.test.ts
```
Captures: `material-matte-*.png`, `material-metallic-*.png`, `material-chrome.png`

### Focused Demos Tests
```bash
pnpm -C cosyne test focused-demos.test.ts
```
Captures: `demo-light-*.png`, `demo-sdf-*.png`

### Canvas Shader Tests
```bash
pnpm -C cosyne test canvas-shader-visual.test.ts
```
Captures: `shader-*.png` (gradients, checkerboard, animation, plasma)

### Trails Tests
```bash
pnpm -C cosyne test trails-demo.test.ts
```
Captures: `trails-*.png` (single, color, multi-trail modes)

### GPU Fractals Tests
```bash
pnpm -C ported-apps/script-schmiede-fractals test index-gpu.test.ts
```
Captures: `gpu-mandelbrot.png`, `gpu-julia.png`

---

## Key Concepts Demonstrated

### Lighting
- Diffuse shading
- Soft shadows (sphere tracing)
- Ambient occlusion
- Fresnel reflections
- Rim lighting
- Multiple light sources

### Materials
- Matte (diffuse only)
- Metallic (partially reflective)
- Chrome (highly reflective)
- Glass (refractive appearance)
- Emissive (glowing)

### Geometry
- Signed Distance Functions (SDFs)
- Primitive shapes (sphere, box, torus, cylinder, capsule)
- Shape operations (union, subtraction, intersection, blending)
- Complex composite shapes

### Effects
- Soft shadows with distance field
- Ambient occlusion sampling
- Environment mapping (fake reflections)
- Procedural patterns (checkerboard, waves, noise)
- Animation via u_time
- Color variation and palettes

---

## Learning Path

### Level 1: Basics (Drawing & Interaction)
1. **Animated Shapes** - Learn Cosyne drawing with rotation and animation
2. **Parametric Curves** - Mathematical beauty via TypeScript drawing
3. **Trails Demo** - Interactive drawing and particle effects

### Level 2: Introduction to GPU (Shaders)
4. **GPU Fractals** - Mathematical rendering via shaders
5. **GPU Kaleidoscope** - Interactive real-time shader effects
6. **Perlin Noise** - Procedural pattern generation

### Level 3: 3D Rendering (Raymarching)
7. **Raymarching Intro** - Understand sphere tracing basics
8. **Lighting Modes** - See how light direction affects appearance
9. **SDF Operations** - Learn to combine 3D shapes

### Level 4: Advanced Effects
10. **Materials Showcase** - Compare material types (matte, metallic, chrome)
11. **Procedural Patterns** - Animated textures on 3D surfaces
12. **Raymarching Car** - Complex geometry example

### Level 5: Algorithmic Art
13. **Voronoi Diagrams** - Cellular patterns and growth
14. **Reaction-Diffusion** - Organic-looking emergent patterns
15. **Symmetry Demo** - Geometric symmetry and mirroring

---

## Quick Start Examples

### Run a Cosyne (TypeScript) Demo
```bash
npx tsx cosyne/demos/cosyne-animated-shapes.ts
npx tsx cosyne/demos/cosyne-parametric-curves.ts
```

### Run a GPU Shader Demo
```bash
npx tsx cosyne/demos/shader-perlin-noise.ts
npx tsx cosyne/demos/shader-voronoi.ts
npx tsx cosyne/demos/shader-reaction-diffusion.ts
```

### Run 3D Raymarching Demos
```bash
npx tsx cosyne/demos/raymarching-intro.ts      # Basic shapes
npx tsx cosyne/demos/raymarching-car.ts         # Complex geometry
npx tsx cosyne/demos/materials-showcase.ts      # Material types
```

### Run All Tests
```bash
# Raymarching tests
pnpm -C cosyne test raymarching.test.ts

# Materials tests
pnpm -C cosyne test materials-showcase.test.ts

# Focused demo tests
pnpm -C cosyne test focused-demos.test.ts

# Canvas shader comprehensive tests
pnpm -C cosyne test canvas-shader-visual.test.ts

# Trails demo tests
pnpm -C cosyne test trails-demo.test.ts

# GPU fractals
pnpm -C ported-apps/script-schmiede-fractals test index-gpu.test.ts
```

---

## Architecture Notes

### Framework
- **CanvasShader**: Fyne canvas primitive for GPU shaders
- **Shader Painter**: Renders shaders with u_time, u_resolution uniforms
- **Viewport**: Each shader has own viewport for positioning
- **Blend Modes**: Additive, multiply, screen compositing

### GLSL Version
- **Desktop OpenGL**: GLSL 1.10 (no precision qualifiers)
- **Vertex Shader**: Fixed fullscreen quad for all demos
- **Fragment Shader**: Core logic (raymarching, patterns)
- **Uniforms**: Floats, vec2/3/4 (avoid int type)

### Raymarching Algorithm
1. Cast ray from camera through pixel
2. Sphere trace along ray (advance by SDF distance each step)
3. When distance < threshold, hit surface
4. Calculate normal via gradient
5. Apply lighting model
6. Return final color

### Performance
- GPU-accelerated: 60 fps on modern hardware
- ~64-100 iterations per ray (adaptable)
- Soft shadows: 24 shadow ray steps
- Ambient occlusion: 5 samples

---

## Future Enhancements

- [ ] Vertex buffer support (for complex models)
- [ ] Texture support (for cubemaps, noise)
- [ ] Advanced materials (anisotropic, iridescence)
- [ ] Post-processing (bloom, tone mapping)
- [ ] Higher iteration counts for quality
- [ ] Sound visualization integration
- [ ] Multi-pass rendering
- [ ] Instancing for repeated geometry
