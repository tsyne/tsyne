# Canvas Sphere Widget

Generalized sphere primitive with multiple patterns, rotations, and advanced rendering options. Phase 1 focuses on pattern types; future phases add lighting, textures, interactivity, and animation.

## Overview

The `canvasSphere` widget renders a 3D sphere using fast 2D raster pixel calculations. Unlike overlapping patch approaches, all geometry renders in a single efficient raster to avoid z-order compositing issues.

## Architecture

```
CanvasSphere (TypeScript class)
    ↓
    sends createCanvasSphere message
    ↓
Go Bridge (handleCreateCanvasSphere)
    ↓
Sphere Rendering
    ├── Calculate lat/lon from screen coordinates
    ├── Apply 3D rotation to (x, y, z)
    ├── Apply pattern function
    └── Return pixel color
    ↓
Fyne Raster Widget
    ↓
    rendered on screen
```

## Phase 1: Pattern System

Phase 1 (current) supports four built-in pattern types:

### Pattern Types

```
1. SOLID: Single uniform color
┌─────────────────────┐
│        ●●●●●        │
│      ●   ●   ●      │
│     ●     ●     ●   │
│     ●     ●     ●   │
│      ●   ●   ●      │
│        ●●●●●        │
└─────────────────────┘
Color: uniform


2. CHECKERED: Alternating pattern (Boing Ball)
┌─────────────────────┐
│    ●◯◯●◯◯●●◯    │
│   ●◯◯●◯◯●●◯●     │
│   ◯●◯●◯●●◯●◯     │
│   ●◯◯●◯◯●●◯●     │
│    ●◯◯●◯◯●●◯    │
│        ●●●●●        │
└─────────────────────┘
Bands: 8 lat × 8 lon (configurable)


3. STRIPES: Horizontal or vertical bands
┌─────────────────────┐
│   ╔═══════════╗     │
│   ║ RED       ║     │
│   ╠═══════════╣     │
│   ║ GREEN     ║     │
│   ╠═══════════╣     │
│   ║ BLUE      ║     │
│   ╚═══════════╝     │
└─────────────────────┘
Horizontal (default) or Vertical


4. GRADIENT: Smooth color interpolation
┌─────────────────────┐
│        ████         │
│       ██████        │
│      ████████       │
│      ████████       │ Pole-to-pole gradient
│       ██████        │ Start → End colors
│        ████         │
└─────────────────────┘
North pole: end color
South pole: start color
```

## API Reference

### CanvasSphereOptions

```typescript
interface CanvasSphereOptions {
  // Position and size
  cx: number;                    // Center X
  cy: number;                    // Center Y
  radius: number;                // Radius in pixels

  // Pattern configuration
  pattern?: 'solid' | 'checkered' | 'stripes' | 'gradient';
  latBands?: number;             // Latitude bands (default: 8)
  lonSegments?: number;          // Longitude segments (default: 8)

  // Rotation
  rotation?: number;             // Y-axis rotation in radians

  // Pattern-specific colors
  solidColor?: string;           // Hex color for solid
  checkeredColor1?: string;      // First checkerboard color
  checkeredColor2?: string;      // Second checkerboard color
  stripeColors?: string[];       // Array of stripe colors
  stripeDirection?: 'horizontal' | 'vertical';
  gradientStart?: string;        // Start color (south pole)
  gradientEnd?: string;          // End color (north pole)
}
```

### App Methods

```typescript
// Create a solid red sphere
a.canvasSphere({
  cx: 100, cy: 100, radius: 50,
  pattern: 'solid',
  solidColor: '#ff0000'
});

// Create classic Boing Ball
a.canvasSphere({
  cx: 100, cy: 100, radius: 96,
  pattern: 'checkered',
  latBands: 8,
  lonSegments: 8,
  checkeredColor1: '#cc0000',
  checkeredColor2: '#ffffff'
});

// Create stripes (horizontal)
a.canvasSphere({
  cx: 100, cy: 100, radius: 50,
  pattern: 'stripes',
  stripeColors: ['#ff0000', '#00ff00', '#0000ff']
});

// Create gradient
a.canvasSphere({
  cx: 100, cy: 100, radius: 50,
  pattern: 'gradient',
  gradientStart: '#0000ff',
  gradientEnd: '#ff0000'
});
```

### Dynamic Updates

```typescript
const sphere = a.canvasSphere({
  cx: 100, cy: 100, radius: 50,
  pattern: 'checkered'
});

// Update position, size, or rotation
await sphere.update({
  cx: 200,           // Move right
  cy: 150,           // Move down
  radius: 75,        // Grow
  rotation: Math.PI / 4  // Rotate
});
```

## Examples

### Amiga Boing Ball (Phase 1)

```typescript
import { app, resolveTransport } from 'tsyne';

app(resolveTransport(), (a) => {
  a.window((win) => {
    win.setContent(() => {
      // Classic 8x8 checkered ball
      a.canvasSphere({
        cx: 200,
        cy: 200,
        radius: 96,
        pattern: 'checkered',
        latBands: 8,
        lonSegments: 8,
        checkeredColor1: '#cc0000',
        checkeredColor2: '#ffffff'
      });
    });
    win.show();
  });
});
```

### Multi-Pattern Comparison

```typescript
a.vbox(() => {
  a.label('All Phase 1 Patterns');

  a.canvasSphere({
    cx: 50, cy: 50, radius: 40,
    pattern: 'solid',
    solidColor: '#ff0000'
  });

  a.canvasSphere({
    cx: 150, cy: 50, radius: 40,
    pattern: 'checkered'
  });

  a.canvasSphere({
    cx: 250, cy: 50, radius: 40,
    pattern: 'stripes',
    stripeColors: ['#ff0000', '#00ff00']
  });

  a.canvasSphere({
    cx: 350, cy: 50, radius: 40,
    pattern: 'gradient',
    gradientStart: '#0000ff',
    gradientEnd: '#ff0000'
  });
});
```

### Fine-Grain Checkered

```typescript
// More bands = more detailed pattern
a.canvasSphere({
  cx: 100, cy: 100, radius: 80,
  pattern: 'checkered',
  latBands: 16,           // Double resolution
  lonSegments: 16,
  checkeredColor1: '#000000',
  checkeredColor2: '#ffffff'
});
```

### Rainbow Stripes

```typescript
a.canvasSphere({
  cx: 100, cy: 100, radius: 80,
  pattern: 'stripes',
  stripeColors: [
    '#ff0000', // Red
    '#ffff00', // Yellow
    '#00ff00', // Green
    '#00ffff', // Cyan
    '#0000ff', // Blue
    '#ff00ff'  // Magenta
  ],
  stripeDirection: 'horizontal'
});
```

### Rotated Sphere

```typescript
a.canvasSphere({
  cx: 100, cy: 100, radius: 80,
  pattern: 'checkered',
  rotation: Math.PI / 4  // 45 degrees
});
```

## Backward Compatibility

The legacy `canvasCheckeredSphere` widget still works but is deprecated:

```typescript
// ❌ Deprecated - still works but logs warning
a.canvasCheckeredSphere({
  cx: 100, cy: 100, radius: 50,
  latBands: 8, lonSegments: 8
});

// ✅ Recommended - use canvasSphere instead
a.canvasSphere({
  cx: 100, cy: 100, radius: 50,
  pattern: 'checkered',
  latBands: 8, lonSegments: 8
});
```

## Implementation Details

### Coordinate System

```
Screen coordinates:
  (0,0) ──→ x (right)
    ↓
    y (down)

Sphere coordinate system:
  Front hemisphere visible
  Center: (cx, cy)
  Radius: r

  For each pixel (px, py):
    1. Convert to sphere coords: (x, y) = ((px-cx)/scale, (py-cy)/scale)
    2. Check if within circle: x² + y² ≤ r²
    3. Calculate z: z = √(r² - x² - y²)
    4. Apply rotation: rotate (x, y, z) around Y-axis
    5. Calculate lat/lon from (x, y, z)
    6. Apply pattern function(lat, lon) → color
```

### Rotation Mechanics

Y-axis rotation (spinning):

```
Before rotation:
  ●   Front sphere at z=0
 /|\
  |
  |
  z (toward camera)

After rotation by angle θ:
  Transform: x' = x*cos(θ) + z*sin(θ)
             z' = -x*sin(θ) + z*cos(θ)
```

### Pattern Functions

#### Checkered

```go
latIdx = int((lat + π/2) / (π / latBands))
lonIdx = int(lon / (2π / lonSegments))
color = (latIdx + lonIdx) % 2 == 0 ? color1 : color2
```

#### Stripes (Horizontal)

```go
stripeIdx = int((lat + π/2) / (π / numStripes))
color = stripeColors[stripeIdx]
```

#### Gradient

```go
t = (lat + π/2) / π  // 0 = south pole, 1 = north pole
color = interpolate(startColor, endColor, t)
```

## Testing

### Jest Unit Tests

```bash
pnpm test -- core/src/__tests__/canvas-sphere.test.ts
```

Tests cover:
- All pattern types
- Default values
- Color handling
- Update method
- Backward compatibility

### TsyneTest Integration Tests

```bash
pnpm test -- examples/canvas-sphere.test.ts
```

Tests cover:
- Widget creation for each pattern
- Position and size updates
- Rotation updates
- Multiple spheres on screen
- Visual demo app

### Visual Demo

```bash
npx tsx examples/canvas-sphere-demo.ts
```

Shows all patterns and variations side-by-side.

## Performance

All rendering happens in a single Fyne Raster:
- No z-order compositing
- No overlapping widget issues
- O(1) per-pixel calculation
- ~2-4ms render time for 200×200 sphere on modern hardware

## Roadmap

### Phase 2: Multi-Axis Rotation

```typescript
a.canvasSphere({
  rotationX: -23.5 * Math.PI / 180,  // Tilt (Earth's axial tilt)
  rotationY: Math.PI / 4,             // Spin
  rotationZ: 0                        // Roll
});
```

### Phase 3: Lighting & Shading

```typescript
a.canvasSphere({
  lighting: {
    enabled: true,
    direction: { x: 1, y: 0.5, z: 0.5 },
    ambient: 0.3,
    diffuse: 0.7
  }
});
```

### Phase 4: Texture Mapping

```typescript
a.canvasSphere({
  texture: {
    resourceName: 'earth-texture',
    mapping: 'equirectangular'
  }
});
```

### Phase 5: Interactivity

```typescript
a.canvasSphere({
  onTap: (lat, lon, x, y) => {
    console.log(`Tapped at lat=${lat}, lon=${lon}`);
  }
});
```

### Phase 6: Animation Presets

```typescript
const sphere = a.canvasSphere({ /* ... */ });

sphere.animate({
  type: 'spin',
  speed: 0.05,
  axis: 'y'
});

sphere.stopAnimation();
```

## See Also

- `LLM.md` - Cosyne canvas library overview
- `examples/canvas-sphere-demo.ts` - Visual demo
- `core/src/__tests__/canvas-sphere.test.ts` - Jest tests
- `examples/canvas-sphere.test.ts` - TsyneTest integration tests
- `phone-apps/bouncing-ball/amiga-boing.ts` - Boing Ball animation using Phase 1
