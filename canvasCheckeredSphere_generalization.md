# Plan: CanvasSphere Advanced Features

## Overview

Extend the now-complete canvasSphere widget with advanced features: configurable lighting, cubemap textures, and custom pattern functions.

**Prerequisites:** Phases 1-6 are complete (patterns, rotation, lighting, textures, interactivity, animations).

---

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| 7. Configurable Lighting | ✅ COMPLETE | Expose light direction, ambient, diffuse as options |
| 8. Cubemap Textures | ✅ COMPLETE | Six-face texture mapping for skyboxes |
| 9. Custom Pattern Function | ✅ COMPLETE | User-provided (lat, lon) => color callback |

---

## Phase 7: Configurable Lighting

### 7.1 Current State

Lighting is hardcoded in `widget_creators_canvas.go`:
```go
lightDirX := 0.5
lightDirY := -0.3
lightDirZ := 0.8
ambient := 0.3
diffuse := 0.7
```

### 7.2 Target API

```typescript
a.canvasSphere({
  cx: 200, cy: 200, radius: 100,
  pattern: 'solid',
  solidColor: '#0066cc',
  lighting: {
    enabled: true,  // default: true
    direction: { x: 1, y: -0.5, z: 0.5 },  // Light source direction (normalized)
    ambient: 0.2,   // 0-1, base illumination
    diffuse: 0.8,   // 0-1, directional light strength
  }
});

// Disable lighting entirely (flat shading)
a.canvasSphere({
  ...options,
  lighting: { enabled: false }
});
```

### 7.3 TypeScript Changes (`core/src/widgets/canvas.ts`)

```typescript
interface LightingOptions {
  enabled?: boolean;  // default: true
  direction?: { x: number; y: number; z: number };  // default: { x: 0.5, y: -0.3, z: 0.8 }
  ambient?: number;   // default: 0.3
  diffuse?: number;   // default: 0.7
}

interface CanvasSphereOptions {
  // ... existing options ...
  lighting?: LightingOptions;
}
```

### 7.4 Go Changes (`core/bridge/widget_creators_canvas.go`)

1. Add to `SphereData` struct in `types.go`:
```go
type SphereData struct {
    // ... existing fields ...
    LightingEnabled bool
    LightDirX       float64
    LightDirY       float64
    LightDirZ       float64
    Ambient         float64
    Diffuse         float64
}
```

2. Parse lighting options in `handleCreateCanvasSphere()`:
```go
if lighting, ok := payload["lighting"].(map[string]interface{}); ok {
    if enabled, ok := lighting["enabled"].(bool); ok {
        sphereData.LightingEnabled = enabled
    }
    if dir, ok := lighting["direction"].(map[string]interface{}); ok {
        sphereData.LightDirX = dir["x"].(float64)
        sphereData.LightDirY = dir["y"].(float64)
        sphereData.LightDirZ = dir["z"].(float64)
    }
    if ambient, ok := lighting["ambient"].(float64); ok {
        sphereData.Ambient = ambient
    }
    if diffuse, ok := lighting["diffuse"].(float64); ok {
        sphereData.Diffuse = diffuse
    }
}
```

3. Use in pixel function instead of hardcoded values.

### 7.5 Tests for Phase 7

**Jest tests:**
```typescript
describe('Phase 7: Configurable Lighting', () => {
  test('lighting options sent to bridge');
  test('lighting.enabled=false disables shading');
  test('custom light direction affects shading');
  test('ambient=1.0 creates flat lighting');
  test('diffuse=0 removes directional component');
  test('default lighting values when not specified');
});
```

**TsyneTest:**
```typescript
test('should render sphere with custom lighting direction', async () => {
  // Create sphere with light from left
  // Screenshot comparison
});

test('should render flat sphere with lighting disabled', async () => {
  // No 3D shading effect
});
```

---

## Phase 8: Cubemap Textures

### 8.1 Overview

Cubemap textures use 6 images (one per face of a cube) for environment mapping. Useful for:
- Skyboxes
- Reflective surfaces
- Environment maps

### 8.2 Target API

```typescript
// Register cubemap faces as resources first
app.resources.register('skybox-px', positiveXBuffer);  // +X (right)
app.resources.register('skybox-nx', negativeXBuffer);  // -X (left)
app.resources.register('skybox-py', positiveYBuffer);  // +Y (top)
app.resources.register('skybox-ny', negativeYBuffer);  // -Y (bottom)
app.resources.register('skybox-pz', positiveZBuffer);  // +Z (front)
app.resources.register('skybox-nz', negativeZBuffer);  // -Z (back)

a.canvasSphere({
  cx: 200, cy: 200, radius: 150,
  texture: {
    mapping: 'cubemap',
    cubemap: {
      positiveX: 'skybox-px',
      negativeX: 'skybox-nx',
      positiveY: 'skybox-py',
      negativeY: 'skybox-ny',
      positiveZ: 'skybox-pz',
      negativeZ: 'skybox-nz',
    }
  }
});
```

### 8.3 TypeScript Changes

```typescript
interface CubemapTexture {
  positiveX: string;  // Resource name for +X face
  negativeX: string;  // Resource name for -X face
  positiveY: string;  // Resource name for +Y face
  negativeY: string;  // Resource name for -Y face
  positiveZ: string;  // Resource name for +Z face
  negativeZ: string;  // Resource name for -Z face
}

interface TextureOptions {
  resourceName?: string;  // For equirectangular
  mapping?: 'equirectangular' | 'cubemap';
  cubemap?: CubemapTexture;  // Required when mapping='cubemap'
}

interface CanvasSphereOptions {
  // ... existing options ...
  texture?: TextureOptions;
}
```

### 8.4 Go Changes

1. Add cubemap fields to `SphereData`:
```go
type SphereData struct {
    // ... existing fields ...
    TextureMapping   string  // "equirectangular" or "cubemap"
    CubemapPosX      string  // Resource names
    CubemapNegX      string
    CubemapPosY      string
    CubemapNegY      string
    CubemapPosZ      string
    CubemapNegZ      string
}
```

2. Cubemap sampling in pixel function:
```go
// Determine which face based on largest absolute component
absX, absY, absZ := math.Abs(nx), math.Abs(ny), math.Abs(nz)
var faceImg image.Image
var u, v float64

if absX >= absY && absX >= absZ {
    // +X or -X face
    if nx > 0 {
        faceImg = cubemapPosX
        u = (-nz/absX + 1) / 2
        v = (-ny/absX + 1) / 2
    } else {
        faceImg = cubemapNegX
        u = (nz/absX + 1) / 2
        v = (-ny/absX + 1) / 2
    }
} else if absY >= absX && absY >= absZ {
    // +Y or -Y face
    // ... similar logic
} else {
    // +Z or -Z face
    // ... similar logic
}

color := sampleTexture(faceImg, u, v)
```

### 8.5 Tests for Phase 8

**Jest tests:**
```typescript
describe('Phase 8: Cubemap Textures', () => {
  test('cubemap texture options sent to bridge');
  test('all six faces required for cubemap');
  test('cubemap with rotation');
  test('cubemap with lighting');
});
```

**TsyneTest:**
```typescript
test('should render sphere with cubemap texture', async () => {
  // Register 6 test textures
  // Create sphere with cubemap
  // Screenshot
});
```

---

## Phase 9: Custom Pattern Function

### 9.1 Overview

Allow users to provide a custom function that computes color for any point on the sphere surface. This enables procedural textures, mathematical patterns, and data visualization.

### 9.2 Target API

```typescript
a.canvasSphere({
  cx: 200, cy: 200, radius: 100,
  pattern: 'custom',
  customPattern: (lat: number, lon: number) => {
    // lat: -PI/2 to PI/2 (south to north pole)
    // lon: -PI to PI (west to east)

    // Example: Procedural stripes based on latitude
    const stripeCount = 10;
    const stripe = Math.floor((lat + Math.PI/2) / Math.PI * stripeCount);
    return stripe % 2 === 0 ? '#ff0000' : '#0000ff';
  }
});

// Example: Data visualization on globe
a.canvasSphere({
  cx: 200, cy: 200, radius: 150,
  pattern: 'custom',
  customPattern: (lat, lon) => {
    const value = getDataAtCoordinate(lat, lon);
    return heatmapColor(value);  // Returns color based on data
  }
});

// Example: Procedural planet texture
a.canvasSphere({
  cx: 200, cy: 200, radius: 100,
  pattern: 'custom',
  customPattern: (lat, lon) => {
    const noise = perlinNoise(lat * 5, lon * 5);
    if (noise > 0.3) return '#228B22';  // Land (green)
    return '#1E90FF';  // Ocean (blue)
  }
});
```

### 9.3 Architecture Decision: Where to Execute

**Option A: TypeScript-side (Recommended)**
- Custom function runs in TypeScript
- TypeScript generates full pixel buffer
- Send buffer to Go via `setPixelBuffer()` pattern (like tappableCanvasRaster)

**Pros:**
- Full JavaScript/TypeScript flexibility
- Access to npm libraries (noise functions, color interpolation)
- No serialization of function to Go

**Cons:**
- More data transfer (full pixel buffer)
- Recompute entire buffer on rotation change

**Option B: Go-side with expression language**
- Define limited expression syntax
- Parse and evaluate in Go

**Pros:**
- Efficient updates on rotation
- No large buffer transfer

**Cons:**
- Limited expressiveness
- Complex to implement

**Recommendation:** Option A (TypeScript-side) because:
1. Aligns with existing `tappableCanvasRaster.setPixelBuffer()` pattern
2. Full JavaScript power for complex patterns
3. Simpler implementation
4. Users can use any npm package for procedural generation

### 9.4 TypeScript Implementation

```typescript
interface CanvasSphereOptions {
  // ... existing options ...
  pattern: 'checkered' | 'solid' | 'stripes' | 'gradient' | 'custom';
  customPattern?: (lat: number, lon: number) => string;  // Returns hex color
}

class CanvasSphere {
  private async renderCustomPattern(): Promise<void> {
    if (this.options.pattern !== 'custom' || !this.options.customPattern) return;

    const width = this.options.radius * 2;
    const height = this.options.radius * 2;
    const buffer = new Uint8Array(width * height * 4);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const { lat, lon, onSphere } = this.screenToLatLon(px, py);

        if (!onSphere) {
          // Transparent pixel outside sphere
          const offset = (py * width + px) * 4;
          buffer[offset + 3] = 0;  // Alpha = 0
          continue;
        }

        const color = this.options.customPattern(lat, lon);
        const { r, g, b } = parseHexColor(color);

        // Apply lighting if enabled
        const intensity = this.calculateLighting(lat, lon);

        const offset = (py * width + px) * 4;
        buffer[offset] = Math.round(r * intensity);
        buffer[offset + 1] = Math.round(g * intensity);
        buffer[offset + 2] = Math.round(b * intensity);
        buffer[offset + 3] = 255;
      }
    }

    await this.setPixelBuffer(buffer);
  }
}
```

### 9.5 Go Changes

For custom pattern, the Go side receives a pre-rendered pixel buffer rather than pattern parameters. This uses the existing `setPixelBuffer` infrastructure.

Add message handler:
```go
case "updateCanvasSphereBuffer":
    widgetId := payload["widgetId"].(string)
    buffer := payload["buffer"].([]byte)  // RGBA pixel data
    // Update raster with new buffer
```

### 9.6 Tests for Phase 9

**Jest tests:**
```typescript
describe('Phase 9: Custom Pattern Function', () => {
  test('custom pattern function called for each pixel');
  test('lat ranges from -PI/2 to PI/2');
  test('lon ranges from -PI to PI');
  test('custom pattern with lighting applied');
  test('custom pattern respects rotation');
  test('custom pattern re-renders on update()');
});
```

**TsyneTest:**
```typescript
test('should render sphere with custom stripe pattern', async () => {
  // Custom function that creates stripes
  // Verify rendering
});

test('should render procedural planet texture', async () => {
  // Noise-based land/ocean pattern
  // Screenshot
});
```

---

## Key Files

**Go (core/bridge/):**
- `widget_creators_canvas.go` - Sphere renderer
- `types.go` - SphereData struct

**TypeScript (core/src/):**
- `widgets/canvas.ts` - CanvasSphere class

**Tests:**
- `core/src/__tests__/canvas-sphere.test.ts` - Jest unit tests
- `examples/canvas-sphere.test.ts` - TsyneTest integration tests

**Demos:**
- `examples/canvas-sphere-lighting.ts` - Configurable lighting demo
- `examples/canvas-sphere-cubemap.ts` - Cubemap texture demo
- `examples/canvas-sphere-custom.ts` - Custom pattern demo

---

## Test Summary

| Phase | Jest Unit Tests | TsyneTest Integration |
|-------|-----------------|----------------------|
| 7. Configurable Lighting | ~6 tests | ~2 tests |
| 8. Cubemap Textures | ~4 tests | ~2 tests |
| 9. Custom Pattern | ~6 tests | ~2 tests |
| **Total** | **~16 tests** | **~6 tests** |

---

## Pitfalls to Avoid

**From previous phases (still relevant):**

- Go switch statement gotcha: `case X:` followed by `default:` means empty case
- Use `fmt.Fprintf(os.Stderr, ...)` for debug output, not `fmt.Println`
- Raster coordinate systems: use `min(w, h)` for scale to prevent clipping
- TappableCanvasObject: wrapped object at (0,0), implement `fyne.Draggable`

**New for these phases:**

- **Light direction normalization**: Normalize the direction vector in Go before using
- **Cubemap seams**: Watch for UV coordinate edge cases at face boundaries
- **Custom pattern performance**: Large spheres = many customPattern() calls, consider caching
- **Buffer size**: Custom pattern buffer is `radius*2 * radius*2 * 4` bytes

---

## Dependencies

These phases can be implemented independently:
- Phase 7 (Lighting) - No dependencies
- Phase 8 (Cubemap) - No dependencies
- Phase 9 (Custom Pattern) - No dependencies

Recommended order: 7 → 9 → 8 (lighting is simplest, cubemap is most complex)
