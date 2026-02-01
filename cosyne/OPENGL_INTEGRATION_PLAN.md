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

### Sprint 4: Cars Demo Upgrade
- [ ] Define car geometry as Cosyne3D primitives
- [ ] Add environment map loading
- [ ] Implement PBR-lite shading
- [ ] Add material presets (chrome, paint, glass)

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

### TypeScript/Cosyne Demos:
```bash
# Colordodge Kaleidoscope - TypeScript/Cosyne version
npx tsx ported-apps/colordodge-kaleidoscope/index.ts

# Trails Demo - interactive trail drawing
npx tsx cosyne/demos/trails-demo.ts

# Cars Demo - current wireframe version (being replaced)
npx tsx ported-apps/alteredqualia-cars/index.ts
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
