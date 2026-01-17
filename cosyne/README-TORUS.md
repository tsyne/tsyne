# Torus Visualization in Cosyne

## Overview

The Torus implementation in Cosyne demonstrates **THREE.js-like 3D-to-2D projection and rendering within a pure 2D canvas system**. It replicates key concepts from modern 3D graphics while staying true to Cosyne's declarative, composable idioms.

## Architecture

### Three.js Concepts Replicated

| THREE.js Concept | Cosyne Implementation | Location |
|--|--|--|
| **Perspective Projection** | `TorusProjection` class | `cosyne/src/projections.ts` |
| **3D Geometry** | Parametric torus equations | `cosyne/src/torus.ts` |
| **Vertex Normals** | `TorusVertex.normal` | `cosyne/src/torus.ts` |
| **Mesh Faces** | `TorusQuad` with face normals | `cosyne/src/torus.ts` |
| **Lighting Model** | Lambertian shading function | `cosyne/src/torus.ts` |
| **Rotation Matrices** | 3-axis rotation (θ, φ, ψ) | `cosyne/src/projections.ts` |
| **Depth Testing** | Alpha visibility via `getAlpha()` | `cosyne/src/projections.ts` |
| **Wireframe Rendering** | Line primitives from projections | `examples/canvas-torus-*.ts` |

### Design Decisions

**Why Wireframe Instead of Filled Mesh?**
- Wireframe rendering highlights the mathematical structure
- Pure line primitives align with Cosyne's native canvas operations
- Simpler hit testing and event handling
- Visually striking (like classic computer graphics)

**Why Projection First, Rendering Second?**
- Separation of concerns: geometry lives in 3D space
- Rotation and projection are pure functions with no side effects
- Easy to test projection math independently from rendering
- Can swap projections without changing geometry

**Why Lambertian Shading?**
- Standard in graphics: simple, physically plausible
- Works with surface normals pre-calculated on geometry
- Creates depth perception without complex shadow calculations
- Pairs naturally with wireframe (colored lines by shade)

## Core API

### Projection System

```typescript
import { TorusProjection } from 'cosyne';

// Create projection
const proj = new TorusProjection({
  focalLength: 300,
  center: { x: 400, y: 300 }
});

// Set rotation (3 axes: yaw, pitch, roll)
proj.setRotation({
  theta: 0.5,   // Yaw (Z-axis)
  phi: 0.3,     // Pitch (X-axis)
  psi: 0.1      // Roll (Y-axis)
});

// Project a 3D point to 2D
const point3D = { x: 100, y: 50, z: 80 };
const point2D = proj.project(point3D);    // { x: 450, y: 280 }
const visibility = proj.getAlpha(point3D); // 0.8 (80% visible)
```

### Geometry Generation

```typescript
import { generateTorusWireframe, generateTorusMesh } from 'cosyne';

// Wireframe (for rendering with lines)
const lines = generateTorusWireframe(
  majorRadius = 100,    // Distance to tube center
  minorRadius = 40,     // Tube radius
  segmentsU = 16,       // Around major circle
  segmentsV = 12        // Around minor circle
);

// Mesh (for physics, collisions, detailed rendering)
const mesh = generateTorusMesh({
  majorRadius: 100,
  minorRadius: 40,
  segmentsU: 16,
  segmentsV: 12
});
// Returns: { vertices, quads, edges }
// Each vertex has position and surface normal
// Each quad has 4 vertices and face normal
```

### Shading Calculations

```typescript
import { calculateLambertianShade, getDefaultLightDirection, chromostereopsisColor } from 'cosyne';

// Calculate shade factor based on surface normal and light direction
const normal = { x: 0, y: 0, z: 1 };
const lightDir = getDefaultLightDirection(); // Front-right-top
const shade = calculateLambertianShade(
  normal,
  lightDir,
  ambientIntensity = 0.3,
  diffuseIntensity = 0.7
); // Returns 0-1

// Apply shade to color
const baseRed = { r: 255, g: 0, b: 0 };
const color = colorizeShade(shade, baseRed); // "rgb(128, 0, 0)"

// Or use chromostereopsis colors (red/blue depth illusion)
const torusColor = chromostereopsisColor(shade, isBackground = false); // red with shade
const bgColor = chromostereopsisColor(shade, isBackground = true);     // blue with shade
```

## Example: Rendering an Interactive Torus

```typescript
import { app } from 'tsyne';
import { cosyne, TorusProjection, generateTorusWireframe } from 'cosyne';

interface State {
  rotTheta: number;
  rotPhi: number;
  isDragging: boolean;
  lastX: number;
  lastY: number;
}

const state: State = { rotTheta: 0.5, rotPhi: 0.3, isDragging: false, lastX: 0, lastY: 0 };

app({ title: 'Torus' }, (a) => {
  a.window({ title: 'Torus', width: 900, height: 700 }, (win) => {
    win.setContent(() => {
      a.canvasStack(800, 600, (c) => {
        // Create projection
        const proj = new TorusProjection({
          focalLength: 300,
          center: { x: 400, y: 300 }
        });

        proj.setRotation({
          theta: state.rotTheta,
          phi: state.rotPhi,
          psi: 0
        });

        // Generate and render torus
        const wireframe = generateTorusWireframe(80, 30, 16, 12);

        for (const line of wireframe) {
          let prev = null;
          for (const point of line) {
            const p2d = proj.project(point);
            const alpha = proj.getAlpha(point);

            if (alpha > 0.1 && prev) {
              const prevP2d = proj.project(prev);
              c.line(prevP2d.x, prevP2d.y, p2d.x, p2d.y)
                .stroke(`rgba(255, 0, 0, ${alpha})`)
                .strokeWidth(1);
            }

            prev = point;
          }
        }
      }).withId('canvas');

      // Make it interactive
      a.label('Drag to rotate').withId('hint');
    });

    win.show();
  });
});

// Handle mouse events
let lastX = 0, lastY = 0;
canvas.onDrag((e) => {
  state.rotTheta += (e.x - lastX) * 0.01;
  state.rotPhi += (e.y - lastY) * 0.01;
  lastX = e.x;
  lastY = e.y;
});
```

## Mathematical Background

### Parametric Torus Equation

A torus surface is defined by two parameters u, v ∈ [0, 2π]:

```
x = (R + r·cos(v)) · cos(u)
y = (R + r·cos(v)) · sin(u)
z = r · sin(v)
```

Where:
- **R** = major radius (distance from center to tube center)
- **r** = minor radius (tube radius)
- **u** = angle around the major circle
- **v** = angle around the minor circle

### Surface Normals

At each point on the torus, the surface normal points outward:

```
normal = (cos(v)·cos(u), cos(v)·sin(u), sin(v))
```

This is normalized in the implementation for use in lighting calculations.

### Lambertian Shading

The brightness at a point is:

```
shade = ambient + diffuse · max(0, normal · lightDirection)
```

Where:
- **ambient** = minimum brightness (typically 0.3)
- **diffuse** = additional brightness from direct light (typically 0.7)
- **normal · lightDirection** = cosine of angle between surface and light

### Perspective Projection

A 3D point is projected to 2D via:

```
scale = focalLength / (focalLength + z_rotated)
x_2d = centerX + x_rotated · scale
y_2d = centerY - y_rotated · scale
```

This creates the illusion of depth: points closer to camera appear larger, points receding appear smaller.

## File Organization

```
cosyne/
├── src/
│   ├── projections.ts        # TorusProjection class
│   ├── torus.ts              # Geometry, shading, color functions
│   └── index.ts              # Exports
├── test/
│   └── torus.test.ts         # 50+ unit tests
└── README-TORUS.md           # This file

examples/
├── canvas-torus-simple.ts    # Basic non-interactive torus
├── canvas-torus-interactive.ts # Full interactive version
└── canvas-torus.test.ts      # TsyneTest integration tests
```

## Testing

### Unit Tests (cosyne/test/torus.test.ts)

```bash
pnpm test cosyne/test/torus.test.ts
```

Coverage:
- ✅ TorusProjection (rotation, projection, depth testing)
- ✅ Geometry generation (mesh, wireframe)
- ✅ Parametric equations (torus shape validation)
- ✅ Shading calculations (Lambertian model)
- ✅ Color functions (chromostereopsis)
- ✅ Integration scenarios

### Integration Tests (examples/canvas-torus.test.ts)

```bash
pnpm test examples/canvas-torus.test.ts
```

Tests interactive rendering and different geometries.

## Performance Characteristics

### Geometry Generation
- **Time Complexity**: O(segmentsU × segmentsV)
- **Space Complexity**: O(segmentsU × segmentsV)
- For typical 16×12 segments: ~200 lines, ~1600 points (negligible overhead)

### Projection
- **Per-point**: O(1) - rotate 3D point (9 multiplications) + project (2 divisions)
- For 1600 points: ~1.6ms on modern hardware

### Rendering
- **Canvas line drawing**: O(segmentsU × segmentsV)
- Bottleneck is DOM/canvas, not geometry

### Recommended Settings
- **Smooth animation**: 16-20 segments (16 FPS on low-end)
- **HD display**: 20-24 segments (smooth 60 FPS)
- **4K or analysis**: 32+ segments

## Comparison with THREE.js

| Aspect | THREE.js | Cosyne |
|--|--|--|
| **Setup** | Renderer, Scene, Camera | TorusProjection |
| **Geometry** | Mesh, Geometry buffers | generateTorusMesh(), arrays |
| **Rendering** | WebGL shaders | Canvas line primitives |
| **Interactivity** | Event listeners | Cosyne event system |
| **Lighting** | Complex material system | Lambertian shade factor |
| **Performance** | GPU accelerated | CPU (acceptable for small meshes) |
| **Bundle Size** | ~600KB | 0 (built into Cosyne) |
| **Learning Curve** | Steep | Shallow (pure functions) |

## Pseudo-Declarative Idioms

The torus implementation follows Tsyne's pseudo-declarative style:

### ✅ Pure Functions
- `generateTorusWireframe()` - no side effects
- `calculateLambertianShade()` - returns computed value
- `TorusProjection.project()` - deterministic projection

### ✅ Fluent Canvas API
```typescript
c.line(x1, y1, x2, y2)
  .stroke(color)
  .strokeWidth(2)
  .alpha(0.8);
```

### ✅ Reactive Updates
```typescript
store.subscribe(async () => {
  await canvas.refresh();
  // Torus rotates as state changes
});
```

### ✅ Declarative Visibility
```typescript
canvas.when(() => state.showTorus);
```

## Future Enhancements

Possible directions for extension:

1. **Surface Shading** - Fill polygons with interpolated shading
2. **Texture Mapping** - Project images onto torus surface
3. **Multiple Primitives** - Sphere, cube, knot, klein bottle
4. **Shadow Casting** - Depth-based shadows on background
5. **Animation Library** - Smooth parameter interpolation
6. **Physics Integration** - Mass, velocity, collision detection
7. **Custom Geometries** - User-defined parametric surfaces
8. **Rendering Modes** - Flat, Gouraud, Phong, PBR

## References

- **Parametric Surfaces**: https://en.wikipedia.org/wiki/Torus#Geometry
- **Lambertian Reflectance**: https://en.wikipedia.org/wiki/Lambertian_reflectance
- **3D Graphics Fundamentals**: Real-time Rendering (Akenine-Möller et al.)
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

## Design Philosophy

The torus implementation embodies Tsyne's core principles:

1. **Declarative Over Imperative** - Describe what to draw, not how to draw it
2. **Composable** - Mix torus with other Cosyne primitives seamlessly
3. **Testable** - Pure functions with clear inputs/outputs
4. **Observable** - Integrate with Tsyne's reactive store pattern
5. **Accessible** - Works in any browser or environment without WebGL
6. **Minimal** - ~500 lines of code achieves sophisticated 3D visualization

## See Also

- `docs/pseudo-declarative-ui-composition.md` - Tsyne idioms guide
- `examples/canvas-sphere-demo.ts` - Related 3D rendering (sphere)
- `cosyne/README.md` - Cosyne canvas library overview
