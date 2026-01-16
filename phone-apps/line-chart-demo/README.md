# Line Chart & Zoom/Pan Demo

**Interactive line charts with multiple interpolation methods and zoom/pan controls**

Demonstrates D3-style line charts with various interpolation curves, zoom, and pan interactions.

## Features

- 4 interpolation types (linear, step, Catmull-Rom, monotone)
- Single and multi-series charting
- Interactive zoom/pan with mouse wheel and drag
- Grid lines and axes with auto-scaling
- Real-time interaction feedback

## Interpolation Methods

### Linear
```
   │    *
   │   /│
   │  / │
   │ /  │
   │/   *
───┴────────
```
Straight lines. Fast, direct.

### Step
```
   │    *
   │    │
   │  ┌─┘
   │  │
   │──* *
───┴────────
```
Right angles at each point. Good for discrete data.

### Catmull-Rom
```
   │    ╱─╲
   │   ╱   ╲
   │  ╱     ╲
   │ ╱       ╲
   │╱         ╲
───┴────────────
```
Smooth cubic splines. Passes through all points.

### Monotone
```
   │    ╱╲
   │   ╱  ╲
   │  ╱    ╲
   │ ╱      ╲
   │╱        ╲
───┴──────────
```
Smooth, monotone-preserving. No overshoot.

## Multi-Series Example

```
          Series 1 ───●───●───●
          Series 2 ───■───■───■
          Series 3 ───▲───▲───▲
```

When "Show multiple series" is enabled, three data series are rendered:
- Series 1 in red (#FF6B6B)
- Series 2 in teal (#4ECDC4)
- Series 3 in blue (#45B7D1)

## Zoom/Pan Controls

| Action | Effect |
|--------|--------|
| Scroll wheel up | Zoom in (up to 5x) |
| Scroll wheel down | Zoom out (down to 0.5x) |
| Click + drag | Pan around |
| "Reset Zoom" button | Back to original view |

## Usage

Run the demo:

```bash
npx tsx phone-apps/line-chart-demo/line-chart-demo.ts
```

## Controls

1. **Interpolation buttons**: Switch curve style
   - Linear
   - Step
   - Catmull-Rom (recommended for smooth data)
   - Monotone (recommended for monotonic data)

2. **"Show multiple series" checkbox**: Toggle single/multi-chart mode

3. **"Reset Zoom" button**: Return to original scale

4. **Mouse interactions**:
   - Scroll wheel: zoom in/out at mouse position
   - Drag: pan the chart
   - Hover: see data points

## Files

- `line-chart-demo.ts` - Main application
- `README.md` - This file

## API Used

```typescript
import { LineChart, MultiLineChart } from 'cosyne';
import { Axis, GridLines } from 'cosyne';
import { ZoomPan } from 'cosyne';

// Single series
const chart = new LineChart(xScale, yScale)
  .setPoints(data)
  .setInterpolation('catmull-rom')
  .setStrokeWidth(2)
  .setPointRadius(3)
  .render(ctx, x, y);

// Multiple series
const multiChart = new MultiLineChart(xScale, yScale)
  .addSeries('Series 1', data1, '#FF6B6B')
  .addSeries('Series 2', data2, '#4ECDC4')
  .setInterpolation('monotone')
  .render(ctx, x, y);

// Zoom/Pan
const zoomPan = new ZoomPan({
  minScale: 0.5,
  maxScale: 5,
  scaleSpeed: 0.15,
});

zoomPan.handleWheel(deltaY, mouseX, mouseY);
zoomPan.handleMouseDown(x, y);
```

## Test

```bash
TAKE_SCREENSHOTS=1 pnpm test -- phone-apps/line-chart-demo/__tests__/index.test.ts
```

## Performance Notes

- Each series: O(n) where n = data points
- Interpolation: O(n log n) for smooth rendering
- Zoom/Pan: O(1) transform updates
- Typical: 1000+ points at 60fps

## See Also

- [D3/P5 Components Guide](../../cosyne/D3_P5_COMPONENTS.md)
- [LineChart Documentation](../../cosyne/D3_P5_COMPONENTS.md#line-charts)
- [Zoom/Pan Documentation](../../cosyne/D3_P5_COMPONENTS.md#zoompan--brush)
- [Scales Documentation](../../cosyne/D3_P5_COMPONENTS.md#scales)
