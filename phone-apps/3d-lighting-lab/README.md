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

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | `hbox > vbox(control panel with sliders) + tappableCanvasRaster(3d scene)` nesting. Rich control panel |
| **Core declarative** | Fluent method chaining | 7/10 | `.withId()` on 14 elements: light controls, material selectors, sliders. No `.when()` |
| **Core declarative** | Programmatic generation | 4/10 | No significant loop-based generation. Static control panel |
| **State architecture** | Observable store | 3/10 | No Observable store. Light/material parameters managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 6/10 | **3 `bindPosition()` + `bindMaterial()`** for reactive 3D transforms and material updates. `refreshBindings()` triggers updates |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 7/10 | Good coverage on light and material controls |
| **Design** | Separation of concerns | 6/10 | 3D scene construction separated from control handlers |
| | **Overall** | **5/10** | Good `.withId()` coverage and reactive 3D bindings (`bindPosition`, `bindMaterial`). Rich control panel for experimenting with lighting parameters |
