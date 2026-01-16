# Plan: Generalize canvasCheckeredSphere to canvasSphere

## Overview

Transform the current `canvasCheckeredSphere` widget into a general-purpose `canvasSphere` that supports multiple patterns, textures, lighting, and interactivity. The Amiga Boing Ball becomes one configuration of this more flexible primitive.

## Phase 1: Rename and Refactor Foundation

### 1.1 Rename to `canvasSphere`

- Rename `CanvasCheckeredSphere` → `CanvasSphere` in TypeScript
- Rename `handleCreateCanvasCheckeredSphere` → `handleCreateCanvasSphere` in Go
- Update bridge message types
- Keep `checkered` as default pattern for backward compatibility
- Deprecate old names with console warning

### 1.2 Add Pattern System

```typescript
interface CanvasSphereOptions {
  cx: number;
  cy: number;
  radius: number;
  pattern: 'checkered' | 'solid' | 'stripes' | 'gradient' | 'custom';
  colors: string[];  // [color1, color2, ...]
  latBands?: number;
  lonSegments?: number;
  rotation?: number;  // Y-axis (current)
}
```

**Patterns:**
- `solid` - Single color sphere
- `checkered` - Alternating colors (current Boing Ball)
- `stripes` - Horizontal or vertical bands
- `gradient` - Color gradient pole-to-pole or around equator
- `custom` - User-provided color function (lat, lon) => color

### 1.3 Tests for Phase 1

**Jest unit tests (`core/src/__tests__/canvas-sphere.test.ts`):**
```typescript
describe('CanvasSphere', () => {
  describe('patterns', () => {
    test('solid pattern uses single color');
    test('checkered pattern alternates colors');
    test('stripes pattern creates horizontal bands');
    test('gradient pattern interpolates colors');
  });

  describe('backward compatibility', () => {
    test('canvasCheckeredSphere still works with deprecation warning');
    test('default pattern is checkered');
  });
});
```

**TsyneTest integration tests (`examples/canvas-sphere.test.ts`):**
```typescript
describe('Canvas Sphere Widget', () => {
  test('should create solid sphere', async () => {
    // Verify widget type 'canvassphere' created
  });

  test('should create checkered sphere (Boing Ball style)', async () => {
    // Verify 8x8 checkered pattern
  });

  test('should create striped sphere', async () => {
    // Visual verification with screenshot
  });

  test('should render all patterns together', async () => {
    // Screenshot comparison test
  });
});
```

---

## Phase 2: Multi-Axis Rotation

### 2.1 Add X, Y, Z Rotation

```typescript
interface CanvasSphereOptions {
  // ... existing options ...
  rotationX?: number;  // Tilt forward/back
  rotationY?: number;  // Spin left/right (current 'rotation')
  rotationZ?: number;  // Roll
}
```

### 2.2 Go Implementation

Update the raster pixel function to apply rotation matrix:
```go
// Apply rotations in order: Z, X, Y
x, y, z := applyRotationMatrix(px, py, pz, rotX, rotY, rotZ)
```

### 2.3 Tests for Phase 2

**Jest tests:**
```typescript
describe('rotation', () => {
  test('rotationY spins sphere left/right');
  test('rotationX tilts sphere forward/back');
  test('rotationZ rolls sphere');
  test('combined rotations apply correctly');
});
```

**TsyneTest:**
```typescript
test('should animate sphere tumbling on all axes', async () => {
  // Create sphere, apply combined rotation, screenshot
});
```

---

## Phase 3: Lighting and Shading

### 3.1 Add Lighting Options

```typescript
interface CanvasSphereOptions {
  // ... existing options ...
  lighting?: {
    enabled: boolean;
    direction?: { x: number; y: number; z: number };  // Light source direction
    ambient?: number;   // 0-1, base illumination
    diffuse?: number;   // 0-1, directional light strength
  };
}
```

### 3.2 Go Implementation

Calculate surface normal for each pixel, dot product with light direction:
```go
// Simple Lambertian shading
normal := getSurfaceNormal(lat, lon)
intensity := ambient + diffuse * max(0, dot(normal, lightDir))
finalColor := applyIntensity(baseColor, intensity)
```

### 3.3 Tests for Phase 3

**Jest tests:**
```typescript
describe('lighting', () => {
  test('ambient only creates flat shading');
  test('diffuse creates highlight toward light source');
  test('light direction affects shading position');
});
```

**TsyneTest:**
```typescript
test('should render sphere with 3D shading effect', async () => {
  // Screenshot comparison: flat vs lit sphere
});
```

---

## Phase 4: Texture Mapping

### 4.1 Add Texture Support

```typescript
interface CanvasSphereOptions {
  // ... existing options ...
  texture?: {
    resourceName: string;  // Registered image resource
    mapping?: 'equirectangular' | 'cubemap';
  };
}
```

### 4.2 Go Implementation

Sample texture based on lat/lon:
```go
// Equirectangular mapping
u := (lon + PI) / (2 * PI)  // 0-1
v := (lat + PI/2) / PI       // 0-1
color := sampleTexture(textureImg, u, v)
```

### 4.3 Tests for Phase 4

**Jest tests:**
```typescript
describe('texture mapping', () => {
  test('equirectangular mapping samples texture correctly');
  test('texture wraps around sphere');
  test('texture respects rotation');
});
```

**TsyneTest:**
```typescript
test('should render Earth globe from texture', async () => {
  // Load earth texture, render sphere, screenshot
});

test('should render basketball texture', async () => {
  // Sports ball pattern
});
```

---

## Phase 5: Interactivity

### 5.1 Add Click/Tap Handler

```typescript
interface CanvasSphereOptions {
  // ... existing options ...
  onTap?: (lat: number, lon: number, x: number, y: number) => void;
}
```

### 5.2 Go Implementation

On tap event, reverse-project screen coordinates to lat/lon:
```go
func (s *Sphere) handleTap(screenX, screenY int) {
  lat, lon := screenToLatLon(screenX, screenY, s.cx, s.cy, s.radius, s.rotation)
  // Emit event with lat, lon, screenX, screenY
}
```

### 5.3 Tests for Phase 5

**Jest tests:**
```typescript
describe('interactivity', () => {
  test('tap converts screen coords to lat/lon');
  test('tap respects current rotation');
  test('tap outside sphere radius is ignored');
});
```

**TsyneTest:**
```typescript
test('should fire onTap with lat/lon coordinates', async () => {
  let tappedCoords: { lat: number; lon: number } | null = null;

  // Create sphere with onTap handler
  // Simulate tap at center
  // Verify lat=0, lon=0 (equator, prime meridian)
});

test('should handle tap on rotated sphere', async () => {
  // Rotate sphere 90 degrees
  // Tap center
  // Verify lon is offset by rotation
});
```

---

## Phase 6: Animation Presets

### 6.1 Built-in Animations

```typescript
interface CanvasSphereOptions {
  // ... existing options ...
  animation?: {
    type: 'spin' | 'wobble' | 'bounce' | 'pulse';
    speed?: number;
    axis?: 'x' | 'y' | 'z';
  };
}

// Or fluent API:
sphere.animate({ type: 'spin', speed: 0.05 });
sphere.stopAnimation();
```

### 6.2 Tests for Phase 6

**TsyneTest:**
```typescript
test('should spin continuously with animation preset', async () => {
  // Create sphere with spin animation
  // Wait 500ms
  // Verify rotation changed
});

test('should stop animation when requested', async () => {
  // Start animation, stop it, verify rotation stable
});
```

---

## Use Case Examples

### Earth Globe
```typescript
a.canvasSphere({
  cx: 200, cy: 200, radius: 150,
  texture: { resourceName: 'earth-equirectangular' },
  lighting: { enabled: true, direction: { x: 1, y: 0.5, z: 0.5 } },
  rotationX: -23.5 * Math.PI / 180,  // Earth's axial tilt
  onTap: (lat, lon) => showCountryInfo(lat, lon)
});
```

### Basketball
```typescript
a.canvasSphere({
  cx: 100, cy: 100, radius: 80,
  pattern: 'custom',
  customPattern: (lat, lon) => basketballPattern(lat, lon),
  lighting: { enabled: true, ambient: 0.3, diffuse: 0.7 }
});
```

### Amiga Boing Ball (current)
```typescript
a.canvasSphere({
  cx: x, cy: y, radius: 96,
  pattern: 'checkered',
  colors: ['#cc0000', '#ffffff'],
  latBands: 8,
  lonSegments: 8,
  rotationY: rotation
});
```

### Pool Ball
```typescript
a.canvasSphere({
  cx: 50, cy: 50, radius: 40,
  pattern: 'solid',
  colors: ['#FFD700'],  // Yellow (1 ball)
  lighting: { enabled: true },
  // Add number decal via texture overlay
});
```

---

## Test Summary

| Phase | Jest Unit Tests | TsyneTest Integration |
|-------|-----------------|----------------------|
| 1. Patterns | 6 tests | 4 tests |
| 2. Rotation | 4 tests | 2 tests |
| 3. Lighting | 3 tests | 2 tests |
| 4. Textures | 3 tests | 3 tests |
| 5. Interactivity | 3 tests | 3 tests |
| 6. Animation | 2 tests | 3 tests |
| **Total** | **21 tests** | **17 tests** |

---

## Migration Path

1. **Phase 1 release**: Rename with backward compat, add basic patterns
2. **Phase 2 release**: Multi-axis rotation
3. **Phase 3 release**: Lighting (major visual upgrade)
4. **Phase 4 release**: Textures (enables globes, realistic balls)
5. **Phase 5 release**: Interactivity (enables globe apps)
6. **Phase 6 release**: Animation presets (convenience)

Each phase is independently useful and testable. The Amiga Boing demo continues working throughout.

---

## Files to Modify

**Go (core/bridge/):**
- `widget_creators_canvas.go` - Main renderer, add all new features
- `types.go` - SphereData struct expansion
- `main.go` - Handler registration

**TypeScript (core/src/):**
- `widgets/canvas.ts` - CanvasSphere class, options interface
- `widgets/index.ts` - Exports
- `app.ts` - App.canvasSphere() method

**Tests:**
- `core/src/__tests__/canvas-sphere.test.ts` - Jest unit tests
- `examples/canvas-sphere.test.ts` - TsyneTest integration tests
- `examples/canvas-sphere-demo.ts` - Visual demo app

**Docs:**
- Update `docs/pseudo-declarative-ui-composition.md` with sphere examples
