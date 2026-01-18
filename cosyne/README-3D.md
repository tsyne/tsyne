# Cosyne 3D: Declarative Scene Graphs

Cosyne 3D extends Tsyne's declarative 2D canvas primitives to 3D, bringing the same fluent API patterns to 3D scene composition.

## Features

- **Declarative API**: Build 3D scenes with fluent method chaining
- **Reactive Bindings**: Connect properties to state with `bindPosition()`, `bindMaterial()`, etc.
- **Hit Detection**: Ray casting with `onClick()` and `onHover()` handlers
- **Material System**: Colors, shininess, transparency, emissive properties
- **Lighting**: Ambient, directional, point, and spot lights
- **Collections**: Data-driven primitive generation with automatic diffing

## Quick Start

```typescript
import { cosyne3d, refreshAllCosyne3dContexts } from 'cosyne/index3d';

// Create a 3D scene
const scene = cosyne3d(app, (ctx) => {
  // Configure camera
  ctx.setCamera({
    fov: 60,
    position: [0, 5, 10],
    lookAt: [0, 0, 0],
  });

  // Add lights
  ctx.light({ type: 'ambient', intensity: 0.3 });
  ctx.light({ type: 'directional', direction: [0, -1, -1] });

  // Add primitives
  ctx.sphere({ radius: 1, position: [0, 1, 0] })
    .setMaterial({ color: '#ff0000', shininess: 50 })
    .onClick((hit) => console.log('Clicked at', hit.point));

  ctx.box({ size: 2, position: [3, 1, 0] })
    .setMaterial({ color: '#00ff00' });

  ctx.plane({ size: 10 })
    .setMaterial({ color: '#333333' });
});

// Animate with bindings
let angle = 0;
scene.getPrimitiveById('rotating')
  .bindRotation(() => [0, angle, 0]);

setInterval(() => {
  angle += 0.01;
  refreshAllCosyne3dContexts();
}, 16);
```

## Primitives

### Sphere

```typescript
ctx.sphere({
  radius: 1,
  position: [0, 0, 0],
  widthSegments: 32,
  heightSegments: 16,
});
```

### Box

```typescript
ctx.box({
  size: 2,                    // Uniform size
  // or
  size: [1, 2, 3],           // width, height, depth
  position: [0, 0, 0],
});
```

### Plane

```typescript
ctx.plane({
  size: 10,                   // Square plane
  // or
  size: [20, 10],            // width, height
  position: [0, 0, 0],
});
```

### Cylinder

```typescript
ctx.cylinder({
  radius: 1,                  // Both top and bottom
  // or
  radiusTop: 1,
  radiusBottom: 2,
  height: 3,
  openEnded: false,
});

// Create a cone
ctx.cylinder({
  radiusTop: 0,
  radiusBottom: 2,
  height: 4,
});
```

## Materials

```typescript
// Basic material
sphere.setMaterial({
  color: '#ff0000',
  shininess: 50,
  opacity: 1.0,
});

// Emissive (glowing) material
sphere.setMaterial({
  color: '#ffff00',
  emissive: '#ffaa00',
});

// Preset materials
import { Materials } from 'cosyne/index3d';

sphere.setMaterial(Materials.gold());
sphere.setMaterial(Materials.silver());
sphere.setMaterial(Materials.glass());
sphere.setMaterial(Materials.rubber());
```

## Lighting

```typescript
// Ambient (uniform lighting)
ctx.light({ type: 'ambient', intensity: 0.3 });

// Directional (sun-like)
ctx.light({
  type: 'directional',
  direction: [0, -1, -1],
  intensity: 0.8,
});

// Point (bulb-like)
ctx.light({
  type: 'point',
  position: [0, 5, 0],
  intensity: 1.0,
  range: 20,
});

// Spot (cone of light)
ctx.light({
  type: 'spot',
  position: [0, 5, 0],
  direction: [0, -1, 0],
  innerAngle: 0.3,
  outerAngle: 0.5,
});
```

## Bindings

Bindings allow properties to react to state changes:

```typescript
let x = 0;
let selected = false;

const sphere = ctx.sphere({ id: 'ball' })
  .bindPosition(() => [x, 0, 0])
  .bindScale(() => selected ? 1.2 : 1.0)
  .bindMaterial(() => ({
    color: selected ? '#00ff00' : '#ff0000',
  }))
  .bindVisible(() => !hidden);

// Update state and refresh
x = 5;
selected = true;
refreshAllCosyne3dContexts();
```

## Collections

Generate primitives from data arrays:

```typescript
interface Planet {
  name: string;
  radius: number;
  distance: number;
}

const planets: Planet[] = [
  { name: 'Mercury', radius: 0.3, distance: 4 },
  { name: 'Venus', radius: 0.5, distance: 6 },
  { name: 'Earth', radius: 0.5, distance: 8 },
];

ctx.spheres<Planet>()
  .bindTo({
    items: () => planets,
    render: (planet) => new Sphere3D({
      id: planet.name,
      radius: planet.radius,
      position: [planet.distance, 0, 0],
    }),
    trackBy: (planet) => planet.name,
  })
  .evaluate();
```

## Event Handling

```typescript
sphere
  .onClick((hit) => {
    console.log('Clicked at', hit.point);
    console.log('Normal:', hit.normal);
    console.log('Distance:', hit.distance);
  })
  .onHover((hit) => {
    if (hit) {
      console.log('Hovering at', hit.point);
    } else {
      console.log('Hover ended');
    }
  });
```

## Transforms

Nested transforms for grouping:

```typescript
ctx.transform({ translate: [10, 0, 0], scale: 2 }, (c) => {
  c.sphere({ position: [0, 0, 0] });  // World pos: [10, 0, 0]
  c.sphere({ position: [1, 0, 0] });  // World pos: [11, 0, 0]

  c.transform({ translate: [5, 0, 0] }, (c2) => {
    c2.sphere({ position: [0, 0, 0] });  // World pos: [15, 0, 0]
  });
});
```

## Camera

```typescript
// Set camera
ctx.setCamera({
  fov: 60,
  position: [0, 10, 20],
  lookAt: [0, 0, 0],
  near: 0.1,
  far: 1000,
});

// Animate camera
ctx.getCamera()
  .bindPosition(() => [Math.sin(time) * 10, 5, Math.cos(time) * 10])
  .bindLookAt(() => [0, 0, 0]);
```

## Ray Casting

```typescript
// Cast from screen coordinates
const hits = scene.raycastFromPixel(mouseX, mouseY);

// Cast custom ray
import { Ray, Vector3 } from 'cosyne/math3d';

const ray = new Ray(
  new Vector3(0, 10, 0),   // origin
  new Vector3(0, -1, 0)    // direction
);
const hits = scene.raycast(ray);

// Get closest hit
const closest = scene.raycastClosest(ray);
```

## Math Utilities

```typescript
import { Vector3, Matrix4, Quaternion, Ray, Box3 } from 'cosyne/math3d';

// Vectors
const v = new Vector3(1, 2, 3);
const sum = v.add(new Vector3(4, 5, 6));
const length = v.length();
const normalized = v.normalize();

// Matrices
const translation = Matrix4.translation(10, 0, 0);
const rotation = Matrix4.rotationY(Math.PI / 4);
const combined = translation.multiply(rotation);

// Quaternions
const quat = Quaternion.fromAxisAngle(Vector3.up(), Math.PI / 2);
const rotated = v.applyQuaternion(quat);

// Bounding boxes
const box = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
const contains = box.containsPoint(v);
```

## API Reference

See [COSYNE_3D.md](../docs/COSYNE_3D.md) for the complete API reference.

## Testing

```bash
# Run unit tests (317 tests)
cd cosyne && pnpm test -- --testPathPatterns="cosyne3d"

# Run integration tests (24 tests)
cd examples && npx jest cosyne3d.test.ts
```
