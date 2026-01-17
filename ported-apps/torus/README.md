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
} from '../../cosyne/src';

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

## License

MIT
