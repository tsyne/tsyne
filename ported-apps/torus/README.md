# Torus Demo

Interactive 3D torus visualization demonstrating THREE.js-like 3D-to-2D projection within Cosyne's declarative canvas system.

## Features

- **Parametric torus wireframe rendering** - Mathematical torus surface
- **3D to 2D perspective projection** - Proper depth perception
- **Interactive rotation** - Drag to rotate manually
- **Auto-animation** - Continuous rotation when enabled
- **Lambertian shading** - Realistic lighting model
- **Depth-based alpha** - Back faces fade for clarity

## Running

```bash
npx tsx ported-apps/torus/torus.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       TorusStore                            │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │  Rotation   │  │ AutoRotate │  │    BaseColor         │  │
│  │ θ, φ, ψ     │  │   boolean  │  │  { r, g, b }         │  │
│  └─────────────┘  └────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TorusProjection                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  3D Point → Rotate → Perspective → 2D Point         │    │
│  │  (x,y,z)    matrix    focalLength   (x,y)           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Canvas Rendering                          │
│  ┌────────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ Wireframe      │→ │ Line Segments │→ │ c.line(...)   │   │
│  │ generateTorus  │  │ with colors   │  │ .stroke(color)│   │
│  └────────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
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

### Perspective Projection

3D point projected to 2D:

```
scale = focalLength / (focalLength + z_rotated)
x_2d = centerX + x_rotated · scale
y_2d = centerY - y_rotated · scale
```

### Lambertian Shading

Brightness at a point:

```
shade = ambient + diffuse · max(0, normal · lightDirection)
```

## API

### TorusStore

Observable store managing rotation state:

```typescript
const store = new TorusStore();

store.setRotation(theta, phi, psi);
store.incrementRotation(dTheta, dPhi, dPsi);
store.toggleAutoRotate();
store.resetView();

store.subscribe(() => {
  // Re-render on state change
});
```

### Cosyne Integration

Uses Cosyne primitives from `cosyne/src`:

```typescript
import {
  TorusProjection,
  generateTorusWireframe,
  calculateLambertianShade,
  getDefaultLightDirection,
} from 'cosyne';

// Create projection
const proj = new TorusProjection({
  focalLength: 300,
  center: { x: 400, y: 300 },
});

proj.setRotation({ theta: 0.5, phi: 0.3, psi: 0 });

// Generate geometry
const wireframe = generateTorusWireframe(80, 30, 20, 15);

// Render
for (const line of wireframe) {
  for (const point of line) {
    const p2d = proj.project(point);
    const alpha = proj.getAlpha(point);
    // Draw with c.line(...)
  }
}
```

## Tests

```bash
# Run unit tests
pnpm test ported-apps/torus/torus.test.ts
```

## THREE.js Concepts Replicated

| THREE.js Concept | Cosyne Implementation |
|------------------|----------------------|
| Perspective Projection | `TorusProjection` class |
| 3D Geometry | Parametric torus equations |
| Vertex Normals | `TorusVertex.normal` |
| Mesh Faces | `TorusQuad` with face normals |
| Lighting Model | Lambertian shading function |
| Rotation Matrices | 3-axis rotation (θ, φ, ψ) |
| Depth Testing | Alpha visibility via `getAlpha()` |
| Wireframe Rendering | Line primitives from projections |

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Clean `border(center: aspectRatio(canvasRaster), bottom: hbox(buttons + spacer + label))` nesting. `buildContent()` reads as a compact layout spec. `aspectRatio()` wrapper maintains 4:3 ratio |
| **Core declarative** | Fluent method chaining | 5/10 | `.withId()` on autoRotateBtn, resetBtn, hintLabel. No `.when()` or `.bindTo()`. Limited widget IDs for a simple app |
| **Core declarative** | Programmatic generation | 3/10 | No loop-based UI generation. Buttons manually listed. Torus mesh generated procedurally but that's rendering, not UI |
| **State architecture** | Observable store | 6/10 | `TorusStore` with `subscribe()`/`notifyChange()`. 1 data type (`TorusState`). Defensive copies via `getState()`. `incrementRotation()` skips notification (optimized for animation loop) |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No `.when()`, no `.bindTo()`, no `.bindText()`. All updates happen in the animation loop via `raster.setPixelBuffer()`. Store subscription exists but no UI elements are bound to it |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — `win.setContent(buildContent)` called once. All subsequent updates via `setPixelBuffer()` |
| **Testing** | `.withId()` coverage | 4/10 | IDs on 3 controls (autoRotateBtn, resetBtn, hintLabel). No per-item IDs needed (no lists). Canvas identified by variable reference |
| **Design** | Separation of concerns | 7/10 | `TorusStore` manages rotation state. `TorusProjection` handles 3D math. `renderTorusToBuffer()` is pure rendering. `createTorusApp()` wires UI. Clean split but store is thin |
| | **Overall** | **4/10** | Minimal pseudo-declarative usage — this is fundamentally a raster rendering app. The `border()` layout is clean and the Observable store exists, but all visual updates go through the imperative `setPixelBuffer()` pipeline. No `.when()`, `.bindTo()`, or reactive bindings. Appropriate for a GPU-style rendering app where the canvas IS the entire UI |

## License

MIT
