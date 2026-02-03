# Canvas 2D Guide: Vector Graphics & Interactive Controls

Welcome to the comprehensive guide for Cosyne's Canvas 2D subsystem—a declarative, reactive API for 2D vector graphics, animations, and interactive controls built on Tsyne's native canvas primitives.

> **What is Canvas 2D?** A pure TypeScript rendering path for 2D graphics that uses Tsyne's native canvas primitives wrapped in Cosyne's declarative API. Perfect for data visualization, interactive controls, animations, and 2D games.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Drawing Primitives](#drawing-primitives)
3. [Styling & Appearance](#styling--appearance)
4. [Transforms & Positioning](#transforms--positioning)
5. [Interactive Features](#interactive-features)
6. [Animations & Easing](#animations--easing)
7. [Data Visualization](#data-visualization)
8. [Advanced Features](#advanced-features)
9. [Performance Optimization](#performance-optimization)
10. [Working with Demos](#working-with-demos)

---

## Core Concepts

### The Canvas 2D Subsystem

Canvas 2D is one of three Cosyne rendering subsystems:

```
┌─────────────────────────────────────────────────────────┐
│              Tsyne Graphics Framework                    │
├──────────────┬──────────────────────────┬────────────────┤
│  Canvas 2D   │   GPU Raymarching        │  3D Cosyne3D   │
│              │   (OpenGL/WebGL)         │  (Mesh-based)  │
│              │                          │                │
│ • Vectors    │ • Shaders               │ • 3D meshes    │
│ • Primitives │ • Procedural            │ • Transforms   │
│ • Animations │ • Real-time effects     │ • Lighting     │
│ • Controls   │ • 60+ fps               │ • Materials    │
└──────────────┴──────────────────────────┴────────────────┘
```

### CosyneContext API

The `CosyneContext` is your primary interface for Canvas 2D:

```typescript
import { cosyne, CosyneContext } from 'cosyne';

// Create a Canvas 2D scene
const scene = cosyne(a, (ctx: CosyneContext) => {
  // ctx.circle(), ctx.rect(), ctx.line(), etc.
});
```

**Key Methods:**
- `rect(x, y, width, height)` - Rectangle
- `circle(x, y, radius)` - Circle
- `line(x1, y1, x2, y2)` - Line
- `polygon({ vertices })` - Polygon
- `text(text, x, y, fill, fontSize)` - Text
- `arc(x, y, radius, startAngle, endAngle)` - Arc
- `wedge(x, y, radius, startAngle, endAngle)` - Pie slice

---

## Drawing Primitives

### Basic Shapes

#### Rectangle
```typescript
ctx.rect(x, y, width, height)
  .fill('#ff6b6b')
  .stroke('#333', 2)
  .withId('my-rect');
```
**Demo:** `data-visualization-demo.ts`

#### Circle
```typescript
ctx.circle(centerX, centerY, radius)
  .fill('#4ecdc4')
  .stroke('#2c3e50', 2)
  .withId('my-circle');
```
**Demo:** `collections-demo.ts`

#### Line
```typescript
ctx.line(x1, y1, x2, y2)
  .stroke('#333', 2)
  .withId('my-line');
```
**Demo:** `markers-demo.ts`

#### Polygon
```typescript
ctx.polygon({
  vertices: [
    [x1, y1],
    [x2, y2],
    [x3, y3],
  ],
})
  .fill('#ffd93d')
  .stroke('#333', 2);
```
**Demo:** `clipping-demo.ts`

#### Arc
```typescript
ctx.arc(centerX, centerY, radius, startAngle, endAngle)
  .stroke('#45b7d1', 2)
  .withId('my-arc');
```

#### Wedge (Pie Slice)
```typescript
ctx.wedge(centerX, centerY, radius, startAngle, endAngle)
  .fill('#95e1d3')
  .withId('pie-slice');
```

#### Text
```typescript
ctx.text('Hello World', x, y, fill, fontSize)
  .withId('my-text');
```
**Demo:** `markers-demo.ts` (labels)

---

## Styling & Appearance

### Fill Colors

**Solid Color:**
```typescript
ctx.circle(100, 100, 50)
  .fill('#ff6b6b');
```

**No Fill (Stroke Only):**
```typescript
ctx.circle(100, 100, 50)
  .fill(undefined)
  .stroke('#333', 2);
```

### Gradients

**Linear Gradient:**
```typescript
ctx.rect(50, 50, 200, 100)
  .fill({
    type: 'linear',
    start: [50, 50],
    end: [250, 50],
    colorStops: ['#ff6b6b', '#feca57', '#ff9ff3'],
  });
```

**Radial Gradient:**
```typescript
ctx.circle(150, 150, 100)
  .fill({
    type: 'radial',
    center: [150, 150],
    radius: 100,
    colorStops: ['#ff6b6b', '#4ecdc4', '#2c3e50'],
  });
```
**Demo:** `gradients-demo.ts`

### Stroke Properties

```typescript
ctx.rect(50, 50, 200, 100)
  .stroke('#333', 2)      // Color and width
  .withId('stroked-rect');
```

### Opacity / Alpha

```typescript
ctx.circle(100, 100, 50)
  .fill('#ff6b6b')
  .setAlpha(0.5)           // 50% transparency
  .withId('transparent');
```

**Demo:** `particles-demo.ts` (fade effects)

### Blend Modes

```typescript
ctx.circle(100, 100, 50)
  .fill('#ff6b6b')
  .setBlendMode('additive')  // 'additive', 'multiply', 'screen', 'normal'
  .withId('blended');
```
**Demo:** `blend-mode-comparison.ts`

---

## Transforms & Positioning

### Translation (Offset)

```typescript
ctx.circle(100, 100, 50)
  .fill('#ff6b6b')
  .translate(50, 25);      // Offset by (50, 25)
```

### Rotation

```typescript
ctx.polygon({
  vertices: [
    [0, -50],
    [50, 50],
    [-50, 50],
  ],
})
  .fill('#ffd93d')
  .rotate(Math.PI / 4);    // 45 degrees
```

### Scaling

```typescript
ctx.rect(0, 0, 100, 50)
  .fill('#4ecdc4')
  .scale(1.5, 1);          // 1.5x width, 1x height
```

### Transform Stack

```typescript
ctx.transform({ translate: [100, 100], scale: [2, 2] }, (g) => {
  g.circle(0, 0, 25).fill('#ff6b6b');
  g.circle(0, 0, 15).fill('#fff');
});
```

### Group (Local Coordinate System)

The `group(x, y, builder)` method creates a local coordinate system—children draw relative to the group origin. Similar to SVG's `<g transform="translate(x,y)">`:

```typescript
// Draw a labeled button at (200, 100)
ctx.group(200, 100, (g) => {
  // Children use coordinates relative to (200, 100)
  g.rect(-40, -20, 80, 40, { fillColor: '#4ecdc4' });  // centered at group origin
  g.text(-15, 5, 'Click', { fillColor: '#fff' });      // text inside button
});

// Equivalent to drawing at absolute coordinates:
// ctx.rect(160, 80, 80, 40, { fillColor: '#4ecdc4' });
// ctx.text(185, 105, 'Click', { fillColor: '#fff' });
```

**Nested Groups:**
```typescript
ctx.group(100, 100, (outer) => {
  outer.circle(0, 0, 50, { fillColor: '#ff6b6b' });  // at (100, 100)

  outer.group(30, 30, (inner) => {
    inner.circle(0, 0, 20, { fillColor: '#fff' });  // at (130, 130)
  });
});
```

**With Rotation/Scale:**
```typescript
ctx.transform({ translate: [200, 200], rotate: Math.PI / 4 }, (g) => {
  g.rect(-25, -25, 50, 50, { fillColor: '#ffd93d' });  // rotated 45° around (200, 200)
});
```

**Demo:** `transform-group-showcase-nested-coordinates.ts`

---

## Interactive Features

### Click/Tap Detection

```typescript
ctx.circle(100, 100, 50)
  .fill('#ff6b6b')
  .onClick(() => {
    console.log('Circle clicked!');
  })
  .withId('clickable-circle');
```

### Drag & Drop

```typescript
let isDragging = false;

ctx.circle(x, y, 50)
  .fill('#4ecdc4')
  .onDragStart(() => { isDragging = true; })
  .onDrag((deltaX, deltaY) => {
    x += deltaX;
    y += deltaY;
  })
  .onDragEnd(() => { isDragging = false; })
  .withId('draggable-circle');
```
**Demo:** `zoom-pan-demo.ts`

### Mouse Enter/Leave

```typescript
ctx.rect(50, 50, 200, 100)
  .fill('#ff6b6b')
  .onMouseEnter(() => { /* highlight */ })
  .onMouseLeave(() => { /* unhighlight */ })
  .withId('interactive-rect');
```

### Hit Testing

```typescript
// Built-in: Cosyne handles hit testing for all primitives
// Shapes with .onClick(), .onDrag(), etc. participate in hit testing
// Use .passthrough(true) to exclude from hit testing
```

---

## Animations & Easing

### Property Animation

```typescript
const state = { x: 0 };

ctx.circle(state.x, 100, 50)
  .fill('#ff6b6b')
  .bindPosition(() => [state.x, 100]);

// Animate property
let targetX = 300;
const startTime = Date.now();
const animationDuration = 1000;

const animate = () => {
  const elapsed = Date.now() - startTime;
  const progress = Math.min(elapsed / animationDuration, 1);

  // Easing function (example: easeInOutQuad)
  const eased = progress < 0.5
    ? 2 * progress * progress
    : -1 + (4 - 2 * progress) * progress;

  state.x = eased * targetX;
  refreshAllCosyneContexts();

  if (progress < 1) {
    setTimeout(animate, 16);
  }
};

animate();
```
**Demo:** `cosyne-animated-shapes.ts`

### Easing Functions Available

- `linear`
- `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic`
- `easeInSine`, `easeOutSine`, `easeInOutSine`
- `easeInElastic`, `easeOutElastic`, `easeInOutElastic`
- `easeInBounce`, `easeOutBounce`, `easeInOutBounce`

### Trails & Particle Effects

```typescript
const trail = new Trail({ maxLength: 100, fadeSpeed: 0.02 });

// Add points to trail
trail.addPoint(x, y);

// Render trail
trail.forEach((point, index, alpha) => {
  ctx.circle(point.x, point.y, 4)
    .fill('#ffffff')
    .setAlpha(alpha);
});
```
**Demo:** `trails-demo.ts`

### Particle System

```typescript
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

particles.forEach((p) => {
  p.x += p.vx;
  p.y += p.vy;
  p.vy += gravity;
  p.life -= 1/60;

  const alpha = p.life / p.maxLife;
  ctx.circle(p.x, p.y, 4)
    .fill('#ff6b6b')
    .setAlpha(alpha);
});
```
**Demo:** `particles-demo.ts`

---

## Data Visualization

### Line Charts

```typescript
// Multi-series with axes
for (let x = 0; x <= 10; x += 0.5) {
  const y1 = 50 + 30 * Math.sin(x * 0.8);
  const y2 = 40 + 20 * Math.cos(x * 0.6);

  // Draw lines connecting points
  // See demo for complete implementation
}
```
**Demo:** `line-chart-demo.ts`

### Heatmaps

```typescript
// Color-mapped grid
for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    const value = (row + col) / (gridSize * 2);
    const color = getHeatmapColor(value);

    ctx.rect(x + col * cellSize, y + row * cellSize, cellSize, cellSize)
      .fill(color);
  }
}
```
**Demo:** `data-visualization-demo.ts`

### Scales & Axes

```typescript
// X-axis with labels
for (let i = 0; i <= 10; i += 2) {
  const x = margin.left + (i / 10) * chartWidth;
  ctx.line(x, chartBottom, x, chartBottom + 5).stroke('#333', 1);
  ctx.text(i.toString(), x, chartBottom + 20, '#666', 12);
}
```
**Demo:** `axes-grid-demo.ts`

---

## Advanced Features

### Clipping Regions

```typescript
// Circular clipping
ctx.circle(150, 150, 100)
  .fill(gradientFill)
  .setClip('circular');

// Rectangular clipping
ctx.rect(100, 100, 200, 150)
  .fill(gradientFill)
  .setClip('rectangular');

// Polygonal clipping
ctx.polygon({ vertices: [...] })
  .fill(gradientFill)
  .setClip('polygonal');
```
**Demo:** `clipping-demo.ts`

### Effects (Shadows, Glow, etc.)

```typescript
// Drop shadow (simulated with offset)
ctx.circle(100, 105, 50)
  .fill('rgba(0, 0, 0, 0.2)');
ctx.circle(100, 100, 50)
  .fill('#ff6b6b');

// Glow effect (outer rings)
ctx.circle(100, 110, 65)
  .fill(undefined)
  .stroke('rgba(255, 107, 107, 0.2)', 4);
ctx.circle(100, 120, 80)
  .fill(undefined)
  .stroke('rgba(255, 107, 107, 0.1)', 4);
ctx.circle(100, 100, 50)
  .fill('#ff6b6b');
```
**Demo:** `effects-demo.ts`

### Custom Markers

```typescript
// Arrow marker at line end
const angle = Math.atan2(endY - startY, endX - startX);
ctx.polygon({
  vertices: [
    [endX - 8, endY],
    [endX - 5, endY - 5],
    [endX - 5, endY + 5],
  ],
})
  .fill('#ff6b6b')
  .rotate(angle);
```
**Demo:** `markers-demo.ts`

### Projections (2D to 3D)

```typescript
// Isometric projection
function isometricProject(x, y, z) {
  const angle = Math.PI / 6;
  const px = (x - y) * Math.cos(angle);
  const py = z + (x + y) * Math.sin(angle);
  return [WIDTH / 2 + px, HEIGHT / 2 - py];
}

// Use to draw 3D cube in 2D
```
**Demo:** `projections-demo.ts`

### Collections (Efficient Rendering)

```typescript
// Render many primitives efficiently
for (let i = 0; i < 200; i++) {
  const angle = (i / 200) * Math.PI * 2;
  const x = centerX + Math.cos(angle) * radius;
  const y = centerY + Math.sin(angle) * radius;

  ctx.circle(x, y, 4)
    .fill(`hsl(${(i / 200) * 360}, 80%, 50%)`);
}
```
**Demo:** `collections-demo.ts`

---

## Performance Optimization

### Binding for Reactive Updates

Instead of recreating the entire scene, use data binding:

```typescript
const state = { count: 0 };

const scene = cosyne(a, (ctx: CosyneContext) => {
  // Bind to state - updates only when value changes
  ctx.text(`Count: ${state.count}`, 100, 100, '#333', 24)
    .bindValue(() => state.count);
});

// Update state
state.count++;
refreshAllCosyneContexts();  // Efficient update
```

### Avoid Unnecessary Redraws

```typescript
// ❌ Bad: Recreate entire scene on every update
const render = () => {
  a.vbox(() => {
    cosyne(a, (ctx) => { /* entire scene */ });
  });
};

// ✅ Good: Update state, refresh bindings
state.value++;
refreshAllCosyneContexts();
```

### Resolution Scaling

```typescript
// Draw at 0.75x resolution for performance
const WIDTH = 600 * 0.75;   // 450
const HEIGHT = 500 * 0.75;  // 375
// Browser handles upscaling
```

### Culling Offscreen Objects

```typescript
// Only draw visible objects
objects.forEach((obj) => {
  if (obj.x + obj.size > viewport.left &&
      obj.x - obj.size < viewport.right &&
      obj.y + obj.size > viewport.top &&
      obj.y - obj.size < viewport.bottom) {
    ctx.circle(obj.x, obj.y, obj.size).fill(obj.color);
  }
});
```

---

## Working with Demos

### Running Canvas 2D Demos

All Canvas 2D demos are runnable standalone:

```bash
# Basic drawing
npx tsx cosyne/demos/symmetry-demo.ts           # Geometry
npx tsx cosyne/demos/cosyne-animated-shapes.ts  # Animation
npx tsx cosyne/demos/cosyne-parametric-curves.ts # Curves

# Styling & Effects
npx tsx cosyne/demos/gradients-demo.ts          # Fills
npx tsx cosyne/demos/effects-demo.ts            # Shadows/glow
npx tsx cosyne/demos/blend-mode-comparison.ts   # Blend modes
npx tsx cosyne/demos/clipping-demo.ts           # Clipping

# Interactive
npx tsx cosyne/demos/trails-demo.ts             # Trail drawing
npx tsx cosyne/demos/zoom-pan-demo.ts           # Navigation
npx tsx cosyne/demos/markers-demo.ts            # Connectors

# Data Visualization
npx tsx cosyne/demos/line-chart-demo.ts         # Charts
npx tsx cosyne/demos/data-visualization-demo.ts # Heatmaps
npx tsx cosyne/demos/axes-grid-demo.ts          # Grids
npx tsx cosyne/demos/collections-demo.ts        # Many objects
npx tsx cosyne/demos/particles-demo.ts          # Physics

# Advanced
npx tsx cosyne/demos/projections-demo.ts        # 3D-to-2D
npx tsx cosyne/demos/foreign-objects-demo.ts    # Widgets
```

### Demo Code Structure

Each demo follows this pattern:

```typescript
import { cosyne, CosyneContext, enableEventHandling } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

function createMyDemo(a: App) {
  a.window({ title: 'My Demo', width: WIDTH + 40, height: HEIGHT + 100 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Controls (buttons, sliders, etc.)

        // Canvas area
        a.max(() => {
          const chart = cosyne(a, (ctx: CosyneContext) => {
            // Draw primitives
            ctx.circle(150, 150, 50).fill('#ff6b6b');
            ctx.rect(300, 100, 200, 150).fill('#4ecdc4');
          });

          enableEventHandling(chart);
        });
      });
    });
    win.show();
  });
}
```

---

## Common Patterns

### State Management

```typescript
interface AppState {
  selectedColor: string;
  animating: boolean;
  objects: Array<{ x: number; y: number; color: string }>;
}

const state: AppState = {
  selectedColor: '#ff6b6b',
  animating: false,
  objects: [],
};

// Use state in rendering
const scene = cosyne(a, (ctx: CosyneContext) => {
  state.objects.forEach((obj) => {
    ctx.circle(obj.x, obj.y, 30).fill(obj.color);
  });
});
```

### Event Handling

```typescript
ctx.circle(100, 100, 50)
  .fill('#ff6b6b')
  .onClick(() => {
    state.selectedColor = '#ff6b6b';
    refreshAllCosyneContexts();
  })
  .onMouseEnter(() => {
    // Highlight feedback
  })
  .onMouseLeave(() => {
    // Unhighlight
  });
```

### Dynamic Sizing

```typescript
// Responsive canvas
let canvasWidth = window.innerWidth - 40;
let canvasHeight = window.innerHeight - 200;

const scene = cosyne(a, (ctx: CosyneContext) => {
  ctx.rect(0, 0, canvasWidth, canvasHeight).fill('#f5f5f5');
  // Draw content
});
```

---

## Glossary

- **CosyneContext**: The 2D drawing context API
- **Binding**: Reactive link between data and rendering
- **Refresh**: Update bound values and redraw affected primitives
- **Easing**: Animation timing function
- **Culling**: Skipping offscreen objects for performance
- **Heatmap**: Color-mapped data grid visualization
- **Trail**: Fading path of points following motion
- **Particle**: Individual element in a physics simulation

---

## See Also

- **GPU Rendering:** [RAYMARCHING_GUIDE.md](./RAYMARCHING_GUIDE.md)
- **System Architecture:** [COSYNE_ARCHITECTURE.md](./COSYNE_ARCHITECTURE.md) (planned)
- **Backend Comparison:** [BACKEND_COMPARISON.md](./BACKEND_COMPARISON.md) (planned)

---

## Resources

- Tsyne Documentation (internal)
- Canvas API Reference (MDN)
- SVG Specification (W3C)
- D3.js Scale Documentation (reference for data mapping)

---

*Canvas 2D Documentation - Phase 3.5 Complete*
*All 12 Canvas 2D feature demos available in cosyne/demos/*
*Last updated: 2025*
