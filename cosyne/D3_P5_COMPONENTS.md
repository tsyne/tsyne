# D3/P5 Inspired Components for Cosyne

Cosyne now includes powerful D3.js and P5.js inspired components for data visualization, interactive transforms, and physics simulation. These components follow Tsyne's pseudo-declarative patterns and integrate seamlessly with the existing canvas library.

## Table of Contents

1. [Scales](#scales) - Data value transformations
2. [Axes](#axes) - Visual axes with ticks and labels
3. [Line Charts](#line-charts) - Connect data points with various interpolations
4. [Zoom/Pan & Brush](#zoompan--brush) - Interactive transforms and selection
5. [Particle System](#particle-system) - P5-style physics simulation

---

## Scales

**D3-style data transforms** convert data ranges to visual ranges for visualization.

### Quick Start

```typescript
import { LinearScale, LogScale, scale } from 'cosyne';

// Linear scale: y = a*x + b
const linearScale = new LinearScale()
  .domain(0, 100)          // Data range
  .range(0, 500);          // Visual range

const visualValue = linearScale.scale(50);  // → 250
const dataValue = linearScale.invert(250);  // → 50

// Logarithmic scale (useful for exponential data)
const logScale = new LogScale()
  .domain(1, 1000)
  .range(0, 500)
  .setBase(10);

const logVisual = logScale.scale(100);  // Non-linear mapping
```

### Scale Types

#### LinearScale
- **Use for**: Most data (temperature, distance, price)
- **Formula**: `y = (x - domainMin) / (domainMax - domainMin) * (rangeMax - rangeMin) + rangeMin`

```typescript
const s = new LinearScale()
  .domain(0, 100)
  .range(0, 500)
  .setClamp(true);  // Clamp output to range

const ticks = s.ticks(5);  // [0, 25, 50, 75, 100]
```

#### LogScale
- **Use for**: Exponential data (populations, earthquake magnitudes, decibels)
- **Requires**: Positive domain values
- **Configurable base**: Default is 10

```typescript
const s = new LogScale()
  .domain(1, 10000)
  .range(0, 400)
  .setBase(2);  // Binary log

// Linear spacing in log space
const ticks = s.ticks(5);  // [1, ~31.6, ~1000, ~31623, ~10000]
```

#### SqrtScale
- **Use for**: Area-based visualizations (bubble charts)
- **Formula**: `y = sqrt(x)`

```typescript
const s = new SqrtScale()
  .domain(0, 100)
  .range(0, 500);

// For circle areas: radius = sqrt(value)
const radius = s.scale(25);  // Circle with area ∝ 25
```

#### PowerScale
- **Use for**: Custom power functions (emphasis/de-emphasis)
- **Configurable exponent**: `y = x^n`

```typescript
const s = new PowerScale()
  .domain(0, 10)
  .range(0, 100)
  .setExponent(2);  // Quadratic scaling

// Can also use setExponent(0.5) for sqrt-like behavior
```

#### OrdinalScale
- **Use for**: Categorical data (bar charts, discrete categories)
- **Features**: Bandwidth calculation, padding support

```typescript
const s = new OrdinalScale()
  .setDomain(['Jan', 'Feb', 'Mar', 'Apr', 'May'])
  .range(0, 500)
  .setPadding(0.1);  // 10% space around/between

const xPos = s.scale('Mar');        // → center of 'Mar' band
const width = s.bandwidth();        // → width for bars
```

### Scale API

All scales support:
- `.domain(min, max)` - Set input range
- `.range(min, max)` - Set output range
- `.scale(value)` - Transform value
- `.invert(value)` - Reverse transform (not available for OrdinalScale)
- `.ticks(count)` - Generate suggested tick values

Optional methods:
- `.setClamp(true)` - Clamp output to range (LinearScale, SqrtScale)
- `.setBase(10)` - Log base (LogScale)
- `.setExponent(2)` - Power function (PowerScale)
- `.setPadding(0.1)` - Band padding (OrdinalScale)

### Factory Function

```typescript
import { scale } from 'cosyne';

const s = scale('linear');  // Returns LinearScale
```

---

## Axes

**Visual axes** with ticks, labels, and grid lines for data-driven charts.

### Quick Start

```typescript
import { Axis, GridLines } from 'cosyne';
import { LinearScale } from 'cosyne';

a.canvasStack(() => {
  const ctx = cosyne(a, (c) => {
    const xScale = new LinearScale().domain(0, 100).range(0, 500);
    const yScale = new LinearScale().domain(0, 100).range(400, 0);

    // Draw grid lines
    const gridH = new GridLines(xScale, { x: 50, y: 50 }, 400);
    gridH.setOrientation('horizontal').render(ctx);

    // Draw axes
    const xAxis = new Axis(xScale, { x: 50, y: 450 }, 500);
    xAxis.setOrientation('bottom').render(ctx);

    const yAxis = new Axis(yScale, { x: 50, y: 50 }, 400);
    yAxis.setOrientation('left').render(ctx);
  });
});
```

### Axis Orientations

- `'bottom'` - Horizontal axis with ticks below
- `'top'` - Horizontal axis with ticks above
- `'left'` - Vertical axis with ticks to the left
- `'right'` - Vertical axis with ticks to the right

### Axis API

```typescript
const axis = new Axis(scale, position, length)
  .setOrientation('bottom')           // 'top' | 'bottom' | 'left' | 'right'
  .setTickSize(6)                     // Tick line length
  .setTickPadding(3)                  // Space between tick and label
  .setLabelFormat((v) => v.toFixed(1))  // Custom label formatting
  .setLabelAngle(45)                  // Rotation for labels (degrees)
  .setShowLabel(true)                 // Toggle label visibility
  .setStrokeColor('#000000')          // Axis line color
  .setStrokeWidth(2)                  // Axis line width
  .render(ctx);                       // Draw to canvas
```

### GridLines API

```typescript
const grid = new GridLines(scale, position, length)
  .setOrientation('horizontal')       // 'horizontal' | 'vertical'
  .setStrokeColor('#e0e0e0')         // Grid line color
  .setStrokeWidth(1)                 // Grid line width
  .render(ctx);
```

---

## Line Charts

**Connect data points** with various interpolation methods for smooth or stepped visualizations.

### Quick Start

```typescript
import { LineChart, LinearScale } from 'cosyne';

a.canvasStack(() => {
  const ctx = cosyne(a, (c) => {
    const xScale = new LinearScale().domain(0, 100).range(0, 500);
    const yScale = new LinearScale().domain(0, 100).range(400, 0);

    const chart = new LineChart(xScale, yScale)
      .setPoints([
        { x: 0, y: 50 },
        { x: 50, y: 75 },
        { x: 100, y: 60 },
      ])
      .setStrokeColor('#4ECDC4')
      .setStrokeWidth(2)
      .setPointRadius(4)              // Show data points
      .setInterpolation('catmull-rom');  // Smooth curves

    chart.render(ctx, 50, 50);
  });
});
```

### Interpolation Types

#### `'linear'` (default)
Straight lines between points. Fast, predictable.

```typescript
chart.setInterpolation('linear');
// Point: (0,0) → (10,10) → (20,0)
// Result: Angular lines
```

#### `'step'`
Right-angle turns at each point. Good for discrete data.

```typescript
chart.setInterpolation('step');
// Point: (0,0) → (10,10) → (20,0)
// Result: (0,0) → (10,0) → (10,10) → (20,10) → (20,0)
```

#### `'catmull-rom'`
Smooth cubic splines through all points. Natural-looking curves.

```typescript
chart.setInterpolation('catmull-rom');
// Passes through all data points with smooth control handles
```

#### `'monotone'`
Monotone preserving curves. No overshooting, maintains data monotonicity.

```typescript
chart.setInterpolation('monotone');
// Smooth curves that respect monotonicity of data
```

### LineChart API

```typescript
const chart = new LineChart(xScale, yScale)
  .setPoints(points)                        // Array of {x, y}
  .setStrokeColor('#4ECDC4')               // Line color
  .setStrokeWidth(2)                       // Line width
  .setFill(true, '#4ECDC4', 0.3)          // Enable fill with color/alpha
  .setPointRadius(4)                       // Show points (0 = hidden)
  .setPointColor('#FF6B6B')                // Point color
  .setInterpolation('catmull-rom')         // Interpolation method
  .render(ctx, x, y);                      // Draw to canvas
```

### MultiLineChart

Plot multiple series on same axes:

```typescript
import { MultiLineChart } from 'cosyne';

const multiChart = new MultiLineChart(xScale, yScale)
  .addSeries('Sales', salesData, '#FF6B6B')
  .addSeries('Expenses', expenseData, '#4ECDC4')
  .addSeries('Profit', profitData, '#95E1D3')
  .setStrokeWidth(2)
  .setInterpolation('monotone')
  .render(ctx, 50, 50);
```

---

## Zoom/Pan & Brush

### Zoom/Pan

**Interactive transforms** with mouse wheel zooming and drag panning.

#### Quick Start

```typescript
import { ZoomPan } from 'cosyne';

const zoomPan = new ZoomPan({
  minScale: 0.5,
  maxScale: 5,
  scaleSpeed: 0.1,
  enablePan: true,
  enableZoom: true,
});

// Subscribe to state changes
zoomPan.subscribe((state) => {
  console.log(`Scale: ${state.scale}, Translate: (${state.translateX}, ${state.translateY})`);
  // Update canvas transform
});

// Handle mouse events
element.addEventListener('mousedown', (e) => zoomPan.handleMouseDown(e.clientX, e.clientY));
element.addEventListener('mousemove', (e) => zoomPan.handleMouseMove(e.clientX, e.clientY));
element.addEventListener('mouseup', () => zoomPan.handleMouseUp());
element.addEventListener('wheel', (e) => zoomPan.handleWheel(e.deltaY, e.clientX, e.clientY));
```

#### ZoomPan API

```typescript
const zp = new ZoomPan(options);

// Manual transforms
zp.translate(dx, dy)                 // Pan by distance
  .zoom(scaleFactor, centerX, centerY) // Zoom with optional center point
  .reset()                           // Reset to initial state
  .getState()                        // Get current state {translateX, translateY, scale}
  .setState({scale: 2})              // Set state
  .fitBounds(x0, y0, x1, y1, padding) // Fit rect to view

// Get transform for rendering
const matrix = zp.getTransformMatrix();  // [a, b, c, d, e, f]
const string = zp.getTransformString();  // "translate(x,y) scale(s)"

// Listeners
const unsub = zp.subscribe((state) => {
  // Re-render with new transform
});
```

#### ZoomPan Options

```typescript
{
  minScale?: number;        // Minimum zoom level (default: 0.1)
  maxScale?: number;        // Maximum zoom level (default: 10)
  scaleSpeed?: number;      // Wheel scroll multiplier (default: 0.1)
  enablePan?: boolean;      // Allow panning (default: true)
  enableZoom?: boolean;     // Allow zooming (default: true)
}
```

### Brush

**Interactive selection area** for data filtering and analysis.

#### Quick Start

```typescript
import { Brush } from 'cosyne';

const brush = new Brush({
  dimension: 'xy',    // 'x' | 'y' | 'xy'
  strokeColor: '#1f77b4',
  fillColor: '#1f77b4',
  fillAlpha: 0.1,
});

// Listen for selection changes
brush.subscribe((extent) => {
  if (extent) {
    console.log(`Selected: x [${extent.x0}, ${extent.x1}], y [${extent.y0}, ${extent.y1}]`);
    filterDataInRange(extent);
  }
});

// Listen for drag updates
brush.onMove((extent) => {
  // Update selection in real-time
});

// Handle mouse events
element.addEventListener('mousedown', (e) => brush.handleMouseDown(e.clientX, e.clientY));
element.addEventListener('mousemove', (e) => brush.handleMouseMove(e.clientX, e.clientY));
element.addEventListener('mouseup', () => brush.handleMouseUp());
```

#### Brush Dimensions

- `'x'` - Select horizontal range only
- `'y'` - Select vertical range only
- `'xy'` - Select rectangular area (default)

#### Brush API

```typescript
const brush = new Brush(options);

brush.getExtent()                    // Get current selection or null
  .setDimension('x')                // Set selection dimension
  .clear()                          // Clear selection
  .getStrokeColor()                 // Get stroke color
  .getFillColor()                   // Get fill color
  .getFillAlpha()                   // Get fill alpha
  .subscribe((extent) => {})        // Listen for changes
  .onMove((extent) => {});          // Listen for drag updates
```

---

## Particle System

**P5.js inspired physics simulation** with emitters, gravity, friction, and lifecycle management.

### Quick Start

```typescript
import { ParticleSystem, Emitter } from 'cosyne';

const ps = new ParticleSystem()
  .setGravity(0, 9.8);  // Add gravity

const emitter = new Emitter(250, 250, {
  rate: 50,                          // Particles per second
  life: 2000,                        // Lifetime in ms
  radius: 3,
  color: '#4ECDC4',
  velocity: { x: 0, y: -100 },     // Initial velocity
  acceleration: { x: 0, y: 200 },  // Acceleration
  friction: 0.98,                   // Velocity damping
  spreadAngle: 45,                  // Emission angle spread (degrees)
  speedVariation: 0.3,              // Speed variation (0-1)
});

ps.addEmitter(emitter);
ps.start();

// Render in canvas
a.canvasStack(() => {
  const ctx = cosyne(a, (c) => {
    ps.render(ctx);  // Draws all particles
  });
});

// Update and listen
ps.subscribe(() => {
  refreshAllCosyneContexts();
});

// Clean up
ps.stop();
```

### Emitter Types

#### Fountain
Classic water fountain effect.

```typescript
new Emitter(x, y, {
  rate: 50,
  life: 2000,
  velocity: { x: 0, y: -100 },
  acceleration: { x: 0, y: 200 },
  friction: 0.98,
  spreadAngle: 45,
})
```

#### Fireworks
Explosive burst in all directions.

```typescript
new Emitter(x, y, {
  rate: 200,
  life: 1500,
  velocity: { x: 0, y: 0 },
  acceleration: { x: 0, y: 100 },
  friction: 0.95,
  spreadAngle: 360,
  speedVariation: 0.5,
})
```

#### Smoke
Rising, fading effect.

```typescript
new Emitter(x, y, {
  rate: 30,
  life: 3000,
  velocity: { x: 0, y: -50 },
  acceleration: { x: 0, y: 0 },
  friction: 0.99,
  alpha: 0.5,
})
```

### Particle API

```typescript
const particle = new Particle(x, y, {
  velocity?: {x, y};
  acceleration?: {x, y};
  life?: number;          // Lifetime in ms
  radius?: number;
  color?: string;
  alpha?: number;
  friction?: number;      // Damping (0-1, where 1 = no damping)
});

particle.update(deltaTime);         // Update physics
particle.isAlive();                 // Check if alive
particle.getAlpha();                // Get fade-based alpha
```

### Emitter API

```typescript
const emitter = new Emitter(x, y, options);

emitter.update(deltaTime)           // Update all particles
  .setPosition(x, y)               // Reposition emitter
  .setRate(particlesPerSecond)     // Change emission rate
  .getParticleCount()              // Get active particle count
  .particles;                      // Direct access to particles
```

### ParticleSystem API

```typescript
const ps = new ParticleSystem();

ps.addEmitter(emitter)              // Add emitter
  .removeEmitter(emitter)           // Remove emitter
  .setGravity(gx, gy)              // Set global gravity
  .start()                         // Start simulation
  .stop()                          // Pause simulation
  .clear()                         // Remove all emitters
  .getTotalParticleCount()         // Get total active particles
  .render(ctx)                     // Draw all particles to canvas
  .subscribe(() => {})             // Listen for updates
```

---

## Complete Example: Interactive Dashboard

```typescript
import { cosyne, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';
import { LinearScale } from 'cosyne';
import { Axis, GridLines } from 'cosyne';
import { LineChart, MultiLineChart } from 'cosyne';
import { ZoomPan, Brush } from 'cosyne';

a.canvasStack(() => {
  const ctx = cosyne(a, (c) => {
    const padding = 60;
    const width = 700;
    const height = 400;

    // Create scales
    const xScale = new LinearScale().domain(0, 365).range(0, width);
    const yScale = new LinearScale().domain(0, 100).range(height, 0);

    // Draw grid
    new GridLines(xScale, { x: padding, y: padding }, height)
      .setOrientation('horizontal')
      .render(ctx);

    // Draw axes
    new Axis(xScale, { x: padding, y: padding + height }, width)
      .setOrientation('bottom')
      .render(ctx);

    new Axis(yScale, { x: padding, y: padding }, height)
      .setOrientation('left')
      .render(ctx);

    // Draw data
    const chart = new LineChart(xScale, yScale)
      .setPoints(generateData())
      .setStrokeColor('#4ECDC4')
      .setStrokeWidth(2)
      .setPointRadius(3)
      .setInterpolation('catmull-rom');

    chart.render(ctx, padding, padding);
  });

  // Enable zoom/pan
  const zoomPan = new ZoomPan();
  const brush = new Brush({ dimension: 'x' });

  enableEventHandling(ctx, a, { width: 800, height: 500 });
});
```

---

## Testing

All components have comprehensive Jest tests:

```bash
cd cosyne
pnpm test scales.test.ts         # Scale transformations
pnpm test zoom-pan.test.ts       # Zoom/Pan and Brush
pnpm test particle-system.test.ts # Particle system physics
```

---

## Performance Considerations

- **Scales**: O(1) per scale operation
- **Axes**: O(n) where n = number of ticks
- **Line Charts**: O(n) where n = number of points
- **Zoom/Pan**: O(1) state updates
- **Particle System**: O(n) where n = active particles
  - Typical: 1000 particles at 60fps
  - Gravity/friction applied per-particle per-frame

---

## Comparison with D3.js

| Feature | D3.js | Cosyne |
|---------|-------|--------|
| Scales | ✅ Full suite | ✅ Linear, Log, Sqrt, Power, Ordinal |
| Axes | ✅ Full featured | ✅ Core functionality |
| Selections | ✅ Complex | ✅ Basic brush |
| Zoom/Pan | ✅ Full gesture support | ✅ Mouse wheel + drag |
| Transitions | ✅ Built-in | ✅ Via cosyne animations |
| Layouts | ✅ 20+ types | 🚧 Custom implementation |
| SVG/Canvas | ✅ Both | ✅ Canvas only |
| Bundle size | ~300KB | ~50KB (cosyne) |
| Learning curve | Steep | Gentle (TypeScript/Tsyne native) |

---

## Comparison with P5.js

| Feature | P5.js | Cosyne |
|---------|-------|--------|
| Particles | ✅ Manual (simple) | ✅ Built-in system |
| Physics | ✅ Via libraries | ✅ Gravity, friction, velocity |
| 3D | ✅ Full WebGL | 🚧 Projections only |
| Audio | ✅ Yes | ❌ No |
| Canvas abstraction | ✅ Yes | ✅ Tsyne canvas |
| Desktop GUI | ❌ No | ✅ Full Tsyne integration |

---

## See Also

- [Cosyne Main README](./README.md)
- [LLM.md - Full API Reference](../LLM.md)
- [Demo Apps](../phone-apps/) - Working examples
- [Jest Tests](./test/) - Comprehensive test coverage
