# Plan: Generalize canvasCheckeredSphere to canvasSphere

## Overview

Transform the current `canvasCheckeredSphere` widget into a general-purpose `canvasSphere` that supports multiple patterns, textures, lighting, and interactivity. The Amiga Boing Ball becomes one configuration of this more flexible primitive.

---

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Patterns | ✅ COMPLETE | All patterns working: solid, checkered, stripes, gradient |
| 2. Multi-Axis Rotation | ✅ COMPLETE | rotationX, rotationY, rotationZ all working |
| 3. Lighting | ✅ COMPLETE | Implemented as part of Phase 1 bug fixes |
| 4. Textures | ✅ COMPLETE | Equirectangular texture mapping working |
| 5. Interactivity | ✅ COMPLETE | Tap events with lat/lon coordinates |
| 6. Animation Presets | ✅ COMPLETE | spin, wobble, bounce, pulse with controls |

### Notes for Next Developer

**Phase 1 & 3 Implementation Details:**
- Go code is in `core/bridge/widget_creators_canvas.go` in `handleCreateCanvasSphere()` (~line 2200)
- Lighting uses simple Lambertian shading with hardcoded light direction (front-right-top)
- Light params: `lightDirX=0.5, lightDirY=-0.3, lightDirZ=0.8`, ambient=0.3, diffuse=0.7
- All patterns (solid, stripes, gradient, checkered) apply shading via `applyShade()` helper
- Clipping fix: uses `min(w, h)` for scale to handle non-square rasters (vbox layouts)

**Bugs Fixed During Phase 1:**
1. Go switch fallthrough bug: `case "checkered":` followed by `default:` meant checkered case was empty
2. Sphere clipping in layouts: raster stretched but sphere coordinates used only width

### ⚠️ PITFALLS TO AVOID

**Go switch statement gotcha:**
```go
// WRONG - "checkered" case is EMPTY, code runs only for unknown patterns
case "checkered":
default:
    // this code does NOT run for "checkered"!
    col1 = parseColor(...)
```
```go
// CORRECT - code is inside the case
case "checkered":
    col1 = parseColor(...)
default:
    // fallback for unknown patterns
```
In Go, `case X:` followed immediately by `default:` does NOT fall through - the case is empty and does nothing.

**Debugging Go bridge:**
- Go's stdout is NOT captured by the test harness
- Use `fmt.Fprintf(os.Stderr, ...)` for debug output, not `fmt.Println`
- Remember to remove debug prints before committing

**Raster coordinate systems:**
- Fyne rasters can be stretched to non-square dimensions by layout
- The pixel function receives `(px, py, w, h)` where w and h are the ACTUAL raster size
- Always use `min(w, h)` when calculating scale to prevent clipping
- Sphere center should be `(w/2, h/2)`, not based on the requested radius

**Color defaults:**
- Always set default colors BEFORE the switch on pattern type
- If colors come through as `{0,0,0,0}` (transparent black), check that the parsing code is actually being reached

**TappableCanvasObject positioning pitfalls:**
- When wrapped in TappableCanvasObject, the raster must be at position (0,0) relative to the wrapper
- The wrapper handles layout positioning; the wrapped object stays at origin
- Resize() must keep wrapped object at MinSize to prevent coordinate system mismatch
- Implementing `fyne.Draggable` interface prevents scroll containers from intercepting taps (Fyne issue #3906)

**Key Files:**
- `core/bridge/widget_creators_canvas.go` - Go renderer with SphereData struct and pixel function
- `core/src/widgets/canvas.ts` - TypeScript CanvasSphere class
- `examples/canvas-sphere-demo.ts` - Visual demo of all patterns
- `examples/canvas-sphere.test.ts` - Integration tests
- `phone-apps/bouncing-ball/amiga-boing.ts` - Uses checkered pattern

**Phase 2 (Multi-Axis Rotation) - COMPLETE:**
- Added `RotationX`, `RotationY`, `RotationZ` to SphereData struct in `types.go`
- Full 3D rotation matrix applied in pixel function
- TypeScript interface has `rotationX?`, `rotationY?`, `rotationZ?` options
- Demo at `examples/canvas-sphere-demo.ts` shows all rotation combinations
- Note: These are STATIC rotations (orientation), not animations. For spinning spheres, use a timer to update rotation values (see `phone-apps/bouncing-ball/amiga-boing.ts`)

**For Phase 4 (Textures):**
- Need to implement equirectangular texture mapping
- Add `texture?: { resourceName: string; mapping?: 'equirectangular' | 'cubemap' }` to options
- Sample texture based on lat/lon: `u = (lon + PI) / (2*PI)`, `v = (lat + PI/2) / PI`
- Consider how to load/register texture resources in Go bridge

**For Phase 5 (Interactivity):**
- Add `onTap?: (lat: number, lon: number, x: number, y: number) => void` callback
- Reverse-project screen coordinates to lat/lon using inverse rotation matrix
- Register tap handler on the raster widget

**Phase 6 (Animation Presets) - COMPLETE:**
- Implemented `sphere.animate({ type, speed?, axis?, amplitude?, loop?, onComplete? })`
- Returns `SphereAnimationHandle` with `stop()`, `pause()`, `resume()`, `isRunning()`, `isPaused()`
- Four animation types: `spin`, `wobble`, `bounce`, `pulse`
- Timer-based animation runs on TypeScript side (~60fps)
- Each animation type has sensible defaults for speed and amplitude
- Animation demo: `examples/canvas-sphere-animations.ts` with interactive controls
- 25+ Jest tests covering all animation features
- 7 TsyneTest integration tests

**For Phase 3 (if extending lighting to be configurable):**
- Currently hardcoded in the pixel function
- To make configurable, add `LightDir`, `Ambient`, `Diffuse` to SphereData struct
- Parse from message payload similar to other options

---

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

**Phase 5 Implementation Complete:**
- ✅ TypeScript: `CanvasSphereOptions.onTap` callback added
- ✅ Event routing: `ctx.bridge.on('sphereTapped:${id}', ...)` pattern
- ✅ Jest tests: 7 tests covering tap events, coordinates, rotation interaction
- ✅ Demo: `examples/canvas-sphere-interactive.ts` showcasing all tap scenarios
- ✅ Backward compatibility: No breaking changes
- ✅ Works with: All patterns, textures, rotations (X/Y/Z), all sphere configurations

**Callback Signature:**
```typescript
onTap?: (lat: number, lon: number, screenX: number, screenY: number) => void
```

**Coordinate System:**
- Latitude: -π/2 (south pole) to π/2 (north pole)
- Longitude: -π (west) to π (east)
- Returns: Geographic coordinates for tapped point on sphere

**Go Bridge Implementation (COMPLETE):**
- `core/bridge/types.go`: Added `HasTapHandler` and `WidgetID` to `SphereData`
- `core/bridge/tappable_canvas_object.go`: Generic tappable wrapper (NEW)
- `core/bridge/widget_creators_canvas.go`: Full tap handling with reverse projection
- Event format: `Event{Type: "sphereTapped:{id}", Data: {lat, lon, screenX, screenY}}`

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

**Phase 6 Implementation Complete:**
- ✅ TypeScript: `SphereAnimationOptions` and `SphereAnimationHandle` interfaces
- ✅ Fluent API: `sphere.animate()` / `sphere.stopAnimation()` / `sphere.isAnimating()`
- ✅ Animation handle: `stop()`, `pause()`, `resume()`, `isRunning()`, `isPaused()`
- ✅ Jest tests: 25+ tests covering all animation types and control methods
- ✅ TsyneTest: 7 integration tests with real sphere widgets
- ✅ Demo: `examples/canvas-sphere-demo.ts` updated with auto-starting animations
- ✅ Interactive demo: `examples/canvas-sphere-animations.ts` with UI controls
- ✅ All animations work with all patterns, textures, and rotations

**Animation Types:**
| Type | Description | Default Amplitude | Default Speed |
|------|-------------|-------------------|---------------|
| `spin` | Continuous rotation around axis | N/A | 1.0 rad/s |
| `wobble` | Oscillating rotation back/forth | π/6 (30°) | 1.0 |
| `bounce` | Size oscillation (elastic) | 0.15 (15%) | 1.0 |
| `pulse` | Smooth size oscillation (breathing) | 0.08 (8%) | 1.0 |

**API Summary:**
```typescript
// Start animation
const handle = sphere.animate({
  type: 'spin' | 'wobble' | 'bounce' | 'pulse',
  speed?: number,      // Speed multiplier (default: 1.0)
  axis?: 'x' | 'y' | 'z',  // For spin/wobble (default: 'y')
  amplitude?: number,  // For wobble/bounce/pulse
  loop?: boolean,      // Default: true
  onComplete?: () => void,  // Called when non-looping animation ends
});

// Control animation
handle.stop();     // Stop animation
handle.pause();    // Pause (preserves state)
handle.resume();   // Resume paused animation
handle.isRunning();  // Check if running
handle.isPaused();   // Check if paused

// Sphere methods
sphere.isAnimating();        // Check if any animation is running
sphere.getCurrentAnimation(); // Get current animation options
sphere.stopAnimation();       // Stop any running animation
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
| 1. Patterns | 12 tests | 10 tests |
| 2. Rotation | 10 tests | 6 tests |
| 3. Lighting | (built-in) | (built-in) |
| 4. Textures | 8 tests | 5 tests |
| 5. Interactivity | 7 tests | 0 tests |
| 6. Animation | 24 tests | 7 tests |
| **Total** | **61 tests** | **28+ tests** |

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
