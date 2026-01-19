# 3D Lighting Lab

A Cosyne 3D demo showcasing materials, dynamic lighting, and interactive camera controls.

## Features

- **Material Switching**: Toggle between gold, plastic (red), and matte materials
- **Dynamic Point Light**: Orbiting light source with adjustable color and height
- **Light Colors**: White, warm, cool, red, green, blue presets
- **Animation Control**: Adjust light orbit speed (slow/fast/stop)
- **Interactive Camera**: Drag to orbit, scroll to zoom

## Screenshot

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                    [Lighting Lab]   │
├──────────────────────────────────────────────┬──────────────────────┤
│                                              │ Material:            │
│         ○  (orbiting light marker)           │ [Gold] [Plastic]     │
│          \                                   │ [Matte]              │
│           \                                  │──────────────────────│
│            ●────────────────●                │ Light Color:         │
│           (central sphere)                   │ [White] [Warm]       │
│                                              │ [Cool] [Red]         │
│    ○           ○           ○                 │ [Green] [Blue]       │
│  (silver)  (plastic)    (matte)              │──────────────────────│
│  ─────────────────────────────────           │ Animation:           │
│           (ground plane)                     │ [Slow] [Fast] [Stop] │
│                                              │──────────────────────│
│                                              │ Light Height:        │
│                                              │ [Low] [Mid] [High]   │
│                                              │──────────────────────│
│                                              │ [Reset Camera]       │
│                                              │                      │
│                                              │ Drag: Rotate view    │
│                                              │ Scroll: Zoom         │
└──────────────────────────────────────────────┴──────────────────────┘
```

## Architecture

### State

- `labState`: Material selection, light properties (color, speed, height, orbit radius)
- `cameraState`: Orbital camera position (radius, theta, phi, lookAt)

### Scene Objects

1. **Ambient Light** - Base illumination (0.25 intensity)
2. **Point Light** - Orbiting light source with configurable color
3. **Light Marker** - Emissive sphere showing light position
4. **Subject Sphere** - Central object with switchable material
5. **Ground Plane** - Reference surface for lighting context
6. **Secondary Spheres** - Silver, blue plastic, and matte materials

### Rendering

Uses high-performance buffer rendering (`renderToBuffer`) for smooth animation:

```typescript
const renderFrame = async () => {
  scene.refreshBindings();
  const pixels = renderer3d.renderToBuffer(scene, renderTarget);
  await canvas.setPixelBuffer(pixels);
};
```

## Running

```bash
npx tsx phone-apps/3d-lighting-lab/index.ts
```

## Testing

```bash
cd phone-apps/3d-lighting-lab
pnpm test
```

### Test Categories

- **State Management**: Verifies initial defaults and state calculations
- **GUI Tests**: Button interactions, state changes, animation behavior

## Dependencies

- `tsyne`: Core framework
- `cosyne`: 3D rendering library
