# Tsyne Graphics Module

Software rendering primitives for canvas-based graphics in Tsyne applications.

## Modules

### geometry.ts
2D geometry utilities:
- `Point` - 2D point with vector math (add, sub, mult, rotate, distance, etc.)
- `Vertex`, `BoundingBox` - Shape primitives
- `pointInPolygon`, `polygonArea`, `polygonCentroid` - Polygon utilities
- `lineSegmentsIntersect`, `pointToLineDistance` - Line utilities

### platform.ts
Platform abstraction for Node.js/Tsyne:
- `RenderTarget` - Pixel buffer for software rendering
- `createRenderTarget`, `clearRenderTarget`, `setPixel`, `blendPixel`
- `requestAnimationFrame`, `cancelAnimationFrame`, `frame`
- `now`, `setNow`, `restoreNow` - High-resolution timing
- `fetchResource` - Cross-platform fetch wrapper
- `isBrowser`, `isNodeJS` - Environment detection

### rasterizer.ts
Software rasterization primitives:
- `Color`, `rgba`, `rgb`, `parseColor`, `colorToHex`, `interpolateColor`
- `drawLine`, `drawCircle`, `fillRect`, `fillPolygon`
- `drawImage` - Image blitting with scaling
- `renderHeatmap` - Gaussian heatmap rendering with color stops

### dom.ts
Incomplete DOM stubs for running browser code in Node.js:
- `TsyneElement` - Minimal HTMLElement implementation
- `TsyneDocument`, `TsyneWindow` - Document/window stubs
- `document`, `window` - Global instances

## Usage

```typescript
import {
  createRenderTarget,
  clearRenderTarget,
  renderHeatmap,
  rgba,
  Point
} from '@core/src/graphics';

// Create a 800x600 pixel buffer
const target = createRenderTarget(800, 600);
clearRenderTarget(target, 0, 0, 0, 255);

// Draw a heatmap
renderHeatmap(target, points, {
  radius: 50,
  intensity: 1.0,
  colorStops: [
    { stop: 0.0, color: rgba(0, 0, 255, 0) },
    { stop: 1.0, color: rgba(255, 0, 0, 255) }
  ]
});
```

## Tests

```bash
cd core && npx jest src/graphics/
```
