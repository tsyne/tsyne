# Cosyne: Declarative Canvas Grammar for Tsyne

> **Document Status**: This was the original planning document. Implementation is now substantially complete and has expanded well beyond the original scope. See [Implementation Status](#implementation-status-updated) below.

Cosyne is an optional library that provides d3/p5-style declarative canvas primitives for Tsyne applications. It lives outside core Tsyne but integrates seamlessly with the builder pattern.

## Overview

**Name**: Cosyne (cosine - continuing the trig theme from Tsyne)

**Location**: `/cosyne/` in repository root

**Purpose**: Enable pseudo-declarative canvas visualizations with data binding, projections, and transforms - without bloating core Tsyne.

---

## Key Architectural Insights

These emerged during implementation and represent the "smartest" decisions made:

### 1. Separate 2D and 3D Entry Points
The original plan assumed 2D only. During implementation, a full 3D system emerged. Rather than overloading `cosyne()`, we created `cosyne3d()` with a separate `Context3D`. This keeps 2D apps lightweight while enabling sophisticated 3D scenes.

```typescript
// 2D (simple, fast)
cosyne(a, (c) => { c.circle(100, 100, 20).fill('red'); });

// 3D (full scene graph)
cosyne3d(a, (c3d) => {
  c3d.camera({ position: [0, 0, 5] });
  c3d.ambientLight(0.3);
  c3d.sphere3d(0, 0, 0, 1).material('phong', { color: 'red' });
});
```

### 2. Explicit Refresh Model
Bindings do NOT auto-update on a timer. Apps call `refreshAllCosyneContexts()` when they want updates. This:
- Avoids unnecessary recomputation
- Lets apps control timing precisely
- Works with any animation loop strategy
- Plays well with Tsyne's event-driven model

### 3. Collection Binding with trackBy
The `bindTo()` pattern with `trackBy` for stable identity was critical for performance. Without it, every collection update would recreate all primitives. With it, Cosyne diffs and only updates changed items.

```typescript
c.circles().bindTo({
  items: () => particles,
  render: (p) => c.circle(p.x, p.y, p.r).fill(p.color),
  trackBy: (p) => p.id  // Stable identity
});
```

### 4. Primitives as Fluent Builders
Every primitive returns `this` from methods, enabling clean chaining:
```typescript
c.circle(100, 100, 20)
  .fill('#ff0000')
  .stroke('#000', 2)
  .bindAlpha(() => fadeValue)
  .withId('my-circle');
```

### 5. Shader Integration
For GPU-intensive effects, Cosyne supports canvas shaders. This enables effects impossible with pure primitives (raymarching, reaction-diffusion) while maintaining the declarative API.

### 6. Hybrid Pixel Buffer Support
For pixel-intensive apps (fractals, image processing), Cosyne can wrap raw pixel buffers. The mandelbrot app demonstrates this - Cosyne handles UI/overlays while the fractal computation uses direct pixel access.

### 7. Symmetry as First-Class Feature
The symmetry system (`symmetry.ts`) enables kaleidoscope and rotational patterns with minimal code. This was discovered during demo development and elevated to a core feature.

### 8. 3D Rendering Strategy
Rather than forcing a single 3D renderer, Cosyne provides multiple backends:
- `renderer3d-canvas.ts` - Uses Tsyne canvas primitives
- `renderer3d-buffer.ts` - Direct pixel buffer for performance

Apps choose based on their needs.

---

## Implementation Status (Updated)

### What's Complete ✅

The Cosyne implementation is **substantially complete** with 61 source files, 35 test files, and 18 demos.

#### 2D Primitives ✅
| Primitive | Status | File |
|-----------|--------|------|
| circle | ✅ Complete | `primitives/circle.ts` |
| rect | ✅ Complete | `primitives/rect.ts` |
| line | ✅ Complete | `primitives/line.ts` |
| polygon | ✅ Complete | `primitives/polygon.ts` |
| arc | ✅ Complete | `primitives/arc.ts` |
| wedge | ✅ Complete | `primitives/wedge.ts` |
| star | ✅ Complete | `primitives/star.ts` |
| path | ✅ Complete | `primitives/path.ts` |
| text | ✅ Complete | `primitives/text.ts` |
| sprite | ✅ Complete | `primitives/sprite.ts` |
| grid | ✅ Complete | `primitives/grid.ts` |
| heatmap | ✅ Complete | `primitives/heatmap.ts` |
| gauge | ✅ Complete | `primitives/gauge.ts` |
| dial | ✅ Complete | `primitives/dial.ts` |
| spherical-patch | ✅ Complete | `primitives/spherical-patch.ts` |

#### 3D System ✅ (Beyond Original Plan!)
| Feature | Status | File |
|---------|--------|------|
| sphere3d | ✅ Complete | `primitives3d/sphere3d.ts` |
| box3d | ✅ Complete | `primitives3d/box3d.ts` |
| plane3d | ✅ Complete | `primitives3d/plane3d.ts` |
| cylinder3d | ✅ Complete | `primitives3d/cylinder3d.ts` |
| camera | ✅ Complete | `camera.ts` |
| lights | ✅ Complete | `light.ts` |
| materials | ✅ Complete | `material.ts` |
| raycaster | ✅ Complete | `raycaster.ts` |
| renderer3d | ✅ Complete | `renderer3d.ts`, `renderer3d-canvas.ts`, `renderer3d-buffer.ts` |
| math3d | ✅ Complete | `math3d.ts`, `math3d-core.ts`, `math3d-geometry.ts`, `math3d-utils.ts` |
| context3d | ✅ Complete | `context3d.ts`, `index3d.ts` |

#### Bindings & Animation ✅
| Feature | Status | File |
|---------|--------|------|
| bindPosition | ✅ Complete | `binding.ts` |
| bindFill/Stroke | ✅ Complete | `binding.ts` |
| bindVisible/Alpha | ✅ Complete | `binding.ts` |
| collections/bindTo | ✅ Complete | `collections.ts` |
| animation | ✅ Complete | `animation.ts`, `animation-manager.ts` |
| easing | ✅ Complete | `easing.ts` |

#### Advanced Features ✅
| Feature | Status | File |
|---------|--------|------|
| projections | ✅ Complete | `projections.ts` |
| transforms | ✅ Complete | `transforms.ts` |
| foreign objects | ✅ Complete | `foreign.ts` |
| events | ✅ Complete | `events.ts`, `event-router-integration.ts` |
| zoom-pan | ✅ Complete | `zoom-pan.ts` |
| scales | ✅ Complete | `scales.ts` |
| axes | ✅ Complete | `axes.ts` |
| symmetry | ✅ Complete | `symmetry.ts` |
| trails | ✅ Complete | `trails.ts` |
| clipping | ✅ Complete | `clipping.ts` |
| gradients | ✅ Complete | `gradients.ts` |
| effects | ✅ Complete | `effects.ts` |
| markers | ✅ Complete | `markers.ts` |
| particle-system | ✅ Complete | `particle-system.ts` |
| line-chart | ✅ Complete | `line-chart.ts` |

#### Demos (18 total)
- `cosyne-animated-shapes.ts` - Basic shape animation
- `cosyne-parametric-curves.ts` - Mathematical curve rendering
- `kaleidoscope-shader.ts` - GPU shader kaleidoscope
- `symmetry-demo.ts` - Rotational symmetry patterns
- `blend-mode-comparison.ts` - Blend mode showcase
- `procedural-patterns.ts` - Generative patterns
- `shader-perlin-noise.ts` - Perlin noise visualization
- `shader-voronoi.ts` - Voronoi diagram shader
- `shader-reaction-diffusion.ts` - Reaction-diffusion simulation
- `lighting-modes.ts` - 3D lighting comparison
- `materials-showcase.ts` - 3D material system
- `raymarching-intro.ts` - SDF raymarching basics
- `raymarching-car.ts` - Advanced raymarched scene
- `sdf-operations.ts` - SDF boolean operations
- `trails-demo.ts` - Motion trails
- `text-contrast-test.ts` - Text rendering
- `hit-rect-test.ts` - Hit detection

#### Tests (35 files)
Core: `primitives.test.ts`, `bindings.test.ts`, `transforms.test.ts`, `projections.test.ts`, `events.test.ts`, `animation.test.ts`, `advanced.test.ts`

3D: `camera.test.ts`, `light.test.ts`, `material.test.ts`, `context3d.test.ts`, `primitives.test.ts`, `math3d.test.ts`, `raycaster.test.ts`, `camera-binding.test.ts`

Advanced: `scales.test.ts`, `markers.test.ts`, `zoom-pan.test.ts`, `particle-system.test.ts`, `effects-gradients-clipping.test.ts`, `dial.test.ts`, `blend-modes.test.ts`

Visual: `symmetry-demo.test.ts`, `trails-demo.test.ts`, `kaleidoscope-shader-screenshot.test.ts`, `materials-showcase.test.ts`, `raymarching.test.ts`

---

## Core Concepts

### 1. Canvas Grammar

Cosyne wraps Tsyne's canvas primitives with a fluent, chainable API:

```typescript
import { cosyne } from 'cosyne';

a.canvasStack(() => {
  cosyne(a, (c) => {
    c.circle(100, 100, 20).fill('#ff0000').stroke('#000', 2);
    c.line(0, 0, 200, 200).stroke('#333', 1);
    c.rect(50, 50, 100, 80).fill('#blue').cornerRadius(8);
  });
});
```

### 2. Property Bindings

Primitives support reactive bindings for position, color, visibility:

```typescript
c.circle(0, 0, 10)
  .bindPosition(() => getCoords())
  .bindFill(() => isActive ? '#green' : '#gray')
  .bindRadius(() => scale * baseRadius)
  .bindVisible(() => shouldShow);
```

### 3. Collection Binding

Render dynamic collections with automatic diffing:

```typescript
c.circles().bindTo({
  items: () => dataPoints,
  render: (point) => c.circle(point.x, point.y, 5).fill(point.color),
  trackBy: (point) => point.id
});
```

### 4. Projections

Pluggable coordinate transformations:

```typescript
c.projection(sphericalProjection({ focalLength: 320 }), (p) => {
  p.point(lat, lon);  // Automatically projected to screen coords
  p.graticule(40, 40);
});
```

### 5. Foreign Objects

Embed Tsyne widgets within canvas at specific coordinates:

```typescript
c.foreign(x, y, () => {
  a.button('Click').onClick(handler);
  a.label('Info').bindText(() => statusText);
});
```

### 6. Transform Stacks

Nested coordinate transforms (like canvas save/restore):

```typescript
c.transform({ translate: [100, 100], rotate: Math.PI/4 }, () => {
  c.rect(0, 0, 50, 50);  // Drawn rotated at offset
});
```

## Module Structure

> **Note**: This was the planned structure. See [Actual File Structure](#actual-file-structure) below for the implemented layout.

```
# Original planned structure (superseded)
cosyne/
  src/
    index.ts           # Main entry, cosyne() function
    context.ts         # CosyneContext builder
    primitives/
      circle.ts
      line.ts
      rect.ts
      text.ts
      path.ts
    bindings/
      position.ts
      property.ts
      collection.ts
    projections/
      base.ts
      spherical.ts
      mercator.ts
    transforms.ts
    foreign.ts
  test/
    primitives.test.ts
    bindings.test.ts
    projections.test.ts
    foreign.test.ts
    integration.test.ts
  package.json
  README.md
```

### Actual File Structure

```
cosyne/
├── src/
│   ├── index.ts                    # Main 2D entry: cosyne(), refreshAllCosyneContexts()
│   ├── index3d.ts                  # 3D entry: cosyne3d()
│   ├── context.ts                  # CosyneContext builder
│   ├── context3d.ts                # 3D context
│   │
│   ├── primitives/                 # 2D primitives
│   │   ├── base.ts                 # BasePrimitive class
│   │   ├── circle.ts, rect.ts, line.ts, polygon.ts
│   │   ├── arc.ts, wedge.ts, star.ts
│   │   ├── path.ts, text.ts, sprite.ts
│   │   ├── grid.ts, heatmap.ts, gauge.ts, dial.ts
│   │   └── spherical-patch.ts
│   │
│   ├── primitives3d/               # 3D primitives
│   │   ├── base3d.ts               # Base3DPrimitive class
│   │   ├── sphere3d.ts, box3d.ts, plane3d.ts, cylinder3d.ts
│   │   └── index.ts
│   │
│   ├── binding.ts                  # Reactive binding system
│   ├── collections.ts              # Collection binding with diffing
│   ├── animation.ts                # Animation primitives
│   ├── animation-manager.ts        # Animation orchestration
│   ├── easing.ts                   # Easing functions
│   │
│   ├── projections.ts              # 2D projections (spherical, mercator)
│   ├── transforms.ts               # Transform stacks
│   ├── foreign.ts                  # Embed Tsyne widgets
│   │
│   ├── camera.ts                   # 3D camera system
│   ├── light.ts                    # 3D lighting
│   ├── material.ts                 # 3D materials (Phong, Lambert)
│   ├── raycaster.ts                # 3D hit detection
│   ├── renderer3d.ts               # 3D rendering core
│   ├── renderer3d-canvas.ts        # Canvas-based 3D renderer
│   ├── renderer3d-buffer.ts        # Buffer-based 3D renderer
│   ├── renderer3d-types.ts         # 3D type definitions
│   │
│   ├── math3d.ts                   # 3D math (vectors, matrices)
│   ├── math3d-core.ts              # Core math utilities
│   ├── math3d-geometry.ts          # Geometry helpers
│   ├── math3d-utils.ts             # Math utilities
│   │
│   ├── events.ts                   # Event handling
│   ├── event-router-integration.ts # Integration with Tsyne events
│   ├── zoom-pan.ts                 # Zoom/pan interactions
│   ├── scales.ts                   # D3-style scales
│   ├── axes.ts                     # Chart axes
│   ├── markers.ts                  # Line markers/arrowheads
│   │
│   ├── symmetry.ts                 # Rotational symmetry
│   ├── trails.ts                   # Motion trails
│   ├── particle-system.ts          # Particle effects
│   ├── line-chart.ts               # Line chart component
│   │
│   ├── clipping.ts                 # Clipping masks
│   ├── gradients.ts                # Gradient fills
│   ├── effects.ts                  # Visual effects
│   │
│   └── cosyne-test.ts              # Test utilities
│
├── demos/                          # 18 demonstration apps
│   ├── cosyne-animated-shapes.ts
│   ├── cosyne-parametric-curves.ts
│   ├── kaleidoscope-shader.ts
│   ├── symmetry-demo.ts
│   └── ... (14 more)
│
├── test/                           # 35 test files
│   ├── primitives.test.ts
│   ├── bindings.test.ts
│   ├── cosyne3d/                   # 3D-specific tests
│   │   ├── camera.test.ts
│   │   ├── light.test.ts
│   │   └── ...
│   └── ... (28 more)
│
├── package.json
└── README.md
```

## API Reference

### cosyne(app, builder)

Main entry point. Creates a Cosyne context within a Tsyne canvas.

```typescript
cosyne(a: App, builder: (c: CosyneContext) => void): void
```

### CosyneContext Methods

| Method | Description |
|--------|-------------|
| `circle(x, y, r)` | Create circle primitive |
| `line(x1, y1, x2, y2)` | Create line primitive |
| `rect(x, y, w, h)` | Create rectangle primitive |
| `text(x, y, str)` | Create text primitive |
| `path(d)` | Create path from SVG path string |
| `circles()` | Collection builder for circles |
| `lines()` | Collection builder for lines |
| `projection(proj, builder)` | Apply projection to nested content |
| `transform(opts, builder)` | Apply transform to nested content |
| `foreign(x, y, builder)` | Embed Tsyne widgets |
| `graticule(latLines, lonLines)` | Create lat/lon grid (in projection context) |

### Primitive Methods (Chainable)

| Method | Description |
|--------|-------------|
| `.fill(color)` | Set fill color |
| `.stroke(color, width)` | Set stroke |
| `.bindPosition(fn)` | Bind x,y to function |
| `.bindFill(fn)` | Bind fill color to function |
| `.bindVisible(fn)` | Bind visibility to function |
| `.bindRadius(fn)` | Bind radius (circles) |
| `.bindAlpha(fn)` | Bind opacity |

---

## Test Cases

### Primitives (primitives.test.ts)

```
TC-PRIM-001: Circle renders at correct position
TC-PRIM-002: Circle respects fill and stroke
TC-PRIM-003: Line renders between two points
TC-PRIM-004: Line respects stroke width and color
TC-PRIM-005: Rect renders with correct dimensions
TC-PRIM-006: Rect cornerRadius creates rounded corners
TC-PRIM-007: Text renders at position with correct content
TC-PRIM-008: Path parses SVG path string correctly
TC-PRIM-009: Multiple primitives render in order (z-index)
TC-PRIM-010: Primitives outside canvas bounds are clipped
```

### Bindings (bindings.test.ts)

```
TC-BIND-001: bindPosition updates circle position on refresh
TC-BIND-002: bindPosition updates line endpoints on refresh
TC-BIND-003: bindFill changes color dynamically
TC-BIND-004: bindVisible hides/shows primitive
TC-BIND-005: bindRadius changes circle size
TC-BIND-006: bindAlpha changes opacity
TC-BIND-007: Multiple bindings on same primitive work together
TC-BIND-008: Binding function receives current state
TC-BIND-009: refreshBindings() updates all bound primitives
TC-BIND-010: Bindings survive primitive updates
```

### Collection Binding (collection.test.ts)

```
TC-COLL-001: bindTo renders initial items
TC-COLL-002: bindTo adds new items on update
TC-COLL-003: bindTo removes deleted items on update
TC-COLL-004: bindTo updates existing items (trackBy match)
TC-COLL-005: trackBy uses correct identity function
TC-COLL-006: Nested bindings in render function work
TC-COLL-007: Empty collection renders nothing
TC-COLL-008: Collection update is efficient (no full redraw)
TC-COLL-009: Order changes are handled correctly
TC-COLL-010: Large collection (1000+ items) performs acceptably
```

### Projections (projections.test.ts)

```
TC-PROJ-001: Spherical projection converts lat/lon to screen xy
TC-PROJ-002: Spherical projection respects focalLength
TC-PROJ-003: Points behind sphere have low/zero alpha
TC-PROJ-004: Graticule generates correct number of lines
TC-PROJ-005: Graticule respects projection
TC-PROJ-006: Projection center offset works
TC-PROJ-007: Multiple projections can coexist
TC-PROJ-008: Projection bindings update on rotation change
TC-PROJ-009: Custom projection function can be provided
TC-PROJ-010: Mercator projection (if implemented) works correctly
```

### Transforms (transforms.test.ts)

```
TC-TRANS-001: translate moves primitives
TC-TRANS-002: rotate rotates primitives around origin
TC-TRANS-003: scale scales primitives
TC-TRANS-004: Nested transforms compose correctly
TC-TRANS-005: Transform applies to all nested content
TC-TRANS-006: Transform does not affect siblings
TC-TRANS-007: bindTransform updates dynamically
```

### Foreign Objects (foreign.test.ts)

```
TC-FOR-001: foreign() embeds Tsyne button at coords
TC-FOR-002: foreign() embeds Tsyne label at coords
TC-FOR-003: Embedded widget receives click events
TC-FOR-004: Embedded widget bindings work (bindText)
TC-FOR-005: Multiple foreign objects at different positions
TC-FOR-006: Foreign object respects transforms
TC-FOR-007: Foreign object z-index is above canvas primitives
TC-FOR-008: Foreign object with vbox/hbox layout works
```

### Integration (integration.test.ts)

```
TC-INT-001: Full visualization with primitives + bindings + projection
TC-INT-002: Animation loop updates bindings smoothly
TC-INT-003: User interaction (click) on foreign button affects visualization
TC-INT-004: Window resize recalculates projection
TC-INT-005: Cleanup disposes all bindings and intervals
```

---

## Test Applications

### 1. cosyne-circles-demo

**Purpose**: Basic primitives and bindings demo

**Features**:
- Grid of circles with random colors
- Click circle to toggle selection (bindFill)
- Slider to change all radii (bindRadius)
- Shows primitive count and render time

**File**: `cosyne/examples/circles-demo.ts`

---

### 2. cosyne-live-chart

**Purpose**: Dynamic data visualization

**Features**:
- Line chart with live-updating data
- X-axis scrolls as new points added
- Y-axis auto-scales
- Tooltip on hover (foreign object with label)
- Legend using foreign vbox

**File**: `cosyne/examples/live-chart.ts`

---

### 3. cosyne-globe

**Purpose**: Spherical projection showcase

**Features**:
- Rotating Earth with graticule
- Country borders (path primitives)
- Click to place markers
- Markers use foreign() for labels
- Zoom slider affects focalLength

**File**: `cosyne/examples/globe.ts`

---

### 4. cosyne-particle-system

**Purpose**: Performance test with many primitives

**Features**:
- 1000+ particles with physics
- bindPosition on each particle
- Color based on velocity (bindFill)
- FPS counter
- Toggle between cosyne and raw pixel buffer for comparison

**File**: `cosyne/examples/particle-system.ts`

---

### 5. cosyne-transform-playground

**Purpose**: Transform and nesting demo

**Features**:
- Nested rotating squares
- Sliders control rotation/scale at each level
- Shows transform matrix at each level
- Reset button

**File**: `cosyne/examples/transform-playground.ts`

---

### 6. spherical-snake-cosyne

**Purpose**: Port of spherical-snake using Cosyne

**Features**:
- Full game functionality
- Declarative sphere/snake/pellet rendering
- Direction buttons as foreign() Tsyne widgets
- Demonstrates real-world Cosyne usage
- Side-by-side LOC comparison with imperative version

**File**: `ported-apps/spherical-snake/pseudo-declarative-spherical-snake.ts`

**Spec**: `ported-apps/spherical-snake/pseudo_declarative_alternate.md`

---

### 7. boing-cosyne

**Purpose**: Port of classic Amiga Boing Ball using Cosyne

**Current implementation**: `ported-apps/boing/boing.ts` (~585 lines)
- Pre-renders 12 ball frame sprites as PNGs
- Uses dirty-rectangle sprite system (createSprite, moveSprite, flush)
- Manual physics in BallPhysics class
- PerformanceMonitor for FPS tracking

**Cosyne version** (~150 lines estimated):

```typescript
cosyne(a, (c) => {
  // Background grid
  c.rect(0, 0, '100%', '100%').fill('#000');
  for (let y = 0; y < height; y += 64) {
    c.line(0, y, width, y).stroke('#646464', 1);
  }
  for (let x = 0; x < width; x += 64) {
    c.line(x, 0, x, height).stroke('#646464', 1);
  }

  // Shadow (ellipse that follows ball)
  c.ellipse(0, 0, SHADOW_WIDTH, SHADOW_HEIGHT)
    .fill('rgba(0,0,0,0.5)')
    .bindPosition(() => ({
      x: physics.x + 8,
      y: physics.y + 64
    }));

  // Ball (checkered sphere)
  c.checkerSphere(BALL_RADIUS, 12, 8)
    .fill('#CC0000', '#FFFFFF')
    .bindPosition(() => ({ x: physics.x, y: physics.y }))
    .bindRotation(() => physics.frameIndex * (Math.PI / 6));

  // FPS counter as foreign widget
  c.foreign(10, 10, () => {
    a.label('').bindText(() => `FPS: ${fps}`);
  });
});

// Animation loop
setInterval(() => {
  physics.update();
  cosyne.refreshBindings();
}, 1000 / 30);
```

**Key simplifications**:
- No sprite pre-rendering - `checkerSphere()` primitive handles it
- No dirty rectangles - Cosyne manages updates
- No manual PNG encoding
- Physics stays the same, rendering becomes declarative

**New primitive needed**: `checkerSphere(radius, latSegments, lonSegments)` - renders a lat/lon checkered sphere with rotation binding

**File**: `ported-apps/boing/boing-cosyne.ts`

**Spec**: `ported-apps/boing/pseudo_declarative_alternate.md`

---

### 8. game-of-life-cosyne

**Purpose**: Port of Conway's Game of Life using Cosyne

**Current implementation**: `ported-apps/game-of-life/game-of-life.ts` (~1100 lines)
- Uses canvasRaster with manual setPixels() calls
- Delta-update optimization (only sends changed cells)
- 50x40 grid = 2000 cells, each 14x14 pixels
- Complex batching logic for protocol limits

**Cosyne version** (~200 lines estimated):

```typescript
cosyne(a, (c) => {
  // Grid primitive handles cell rendering and dirty tracking
  c.grid(50, 40, { cellSize: 14 })
    .bindCells(() => game.getBoardData())
    .cellColor((alive) => alive ? '#FFFFFF' : '#000000')
    .onClick((x, y) => game.toggleCell(x, y));

  // Generation counter as foreign widget
  c.foreign(10, 10, () => {
    a.label('').bindText(() => `Gen: ${game.getGeneration()} | Cells: ${game.getLiveCellCount()}`);
  });
});

// Game loop
setInterval(() => {
  game.tick();
  cosyne.refreshBindings();
}, game.getSpeed());
```

**Key simplifications**:
- No manual pixel rendering - `grid()` primitive handles it
- No delta-update logic - Cosyne diffs cell states automatically
- No batching - framework handles protocol efficiently
- Grid click handling built-in

**New primitive needed**: `grid(cols, rows, opts)` - renders a cell grid with:
- `bindCells(fn)` - bind 2D boolean/value array
- `cellColor(fn)` - map cell value to color
- `onClick(fn)` - cell click handler with (x, y) coords
- Automatic dirty-rectangle optimization

**File**: `ported-apps/game-of-life/game-of-life-cosyne.ts`

---

### 9. falling-blocks-cosyne

**Purpose**: Port of Tetris-style falling blocks game using Cosyne

**Current implementation**: `ported-apps/falling-blocks/falling-blocks.ts` (~760 lines)
- Uses TappableCanvasRaster with pixel buffer
- Manual block rendering with drawBlockToBuffer()
- Separate next-piece preview canvas
- 10x20 grid = 200 cells, each 20x20 pixels

**Cosyne version** (~250 lines estimated):

```typescript
cosyne(a, (c) => {
  // Background
  c.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).fill('#282828');

  // Locked blocks on board
  c.grid(10, 20, { cellSize: 20 })
    .bindCells(() => game.getBoard())
    .cellColor((value) => value !== null ? SHAPE_COLORS[value] : 'transparent')
    .cellBorder((value) => value !== null ? darken(SHAPE_COLORS[value], 0.6) : null);

  // Current falling piece (overlay)
  c.blocks().bindTo({
    items: () => game.getCurrentPieceBlocks(),
    render: (block) => c.rect(block.x * 20, block.y * 20, 20, 20)
      .fill(SHAPE_COLORS[block.shape])
      .stroke(darken(SHAPE_COLORS[block.shape], 0.6), 1),
    trackBy: (_, i) => i
  });
});

// Next piece preview (separate canvas)
cosyne(a, (c) => {
  c.rect(0, 0, 80, 80).fill('#282828');
  c.blocks().bindTo({
    items: () => game.getNextPieceBlocks(),
    render: (block) => c.rect(block.col * 20, block.row * 20, 20, 20)
      .fill(SHAPE_COLORS[game.getNextPiece()])
      .stroke(darken(SHAPE_COLORS[game.getNextPiece()], 0.6), 1),
    trackBy: (_, i) => i
  });
});
```

**Key simplifications**:
- No manual pixel buffer management
- `grid()` primitive handles locked blocks
- `blocks().bindTo()` handles falling piece overlay
- Border darkening built into cell styling

**File**: `ported-apps/falling-blocks/falling-blocks-cosyne.ts`

---

### 10. 3d-cube-cosyne

**Purpose**: Port of 3D Rubik's Cube using Cosyne with isometric projection

**Current implementation**: `ported-apps/3d-cube/3d-cube.ts` (~1640 lines)
- Uses TappableCanvasRaster with pixel buffer
- Manual isometric projection math
- fillQuad() for each cell face
- drawLine() for grid edges
- Complex tap detection with pointInPolygon

**Cosyne version** (~400 lines estimated):

```typescript
cosyne(a, (c) => {
  c.rect(0, 0, '100%', '100%').fill('#1e1e1e');

  // Isometric projection context
  c.projection(isometricProjection({ angle: Math.PI / 6 }), (iso) => {
    const HALF = cubeSize / 2;

    // Up face (top) - 3x3 grid of quads
    iso.quads().bindTo({
      items: () => cube.getFaceGrid(Side.Up),
      render: (cell) => iso.quad(
        { x: cell.x0, y: HALF, z: cell.z0 },
        { x: cell.x1, y: HALF, z: cell.z0 },
        { x: cell.x1, y: HALF, z: cell.z1 },
        { x: cell.x0, y: HALF, z: cell.z1 }
      ).fill(SIDE_COLORS[cell.color]).stroke('#000', 1),
      trackBy: (cell) => `up-${cell.row}-${cell.col}`
    });

    // Front face - 3x3 grid of quads
    iso.quads().bindTo({
      items: () => cube.getFaceGrid(Side.Front),
      render: (cell) => iso.quad(
        { x: cell.x0, y: cell.y0, z: HALF },
        { x: cell.x1, y: cell.y0, z: HALF },
        { x: cell.x1, y: cell.y1, z: HALF },
        { x: cell.x0, y: cell.y1, z: HALF }
      ).fill(SIDE_COLORS[cell.color]).stroke('#000', 1),
      trackBy: (cell) => `front-${cell.row}-${cell.col}`
    });

    // Right face - 3x3 grid of quads
    iso.quads().bindTo({
      items: () => cube.getFaceGrid(Side.Right),
      render: (cell) => iso.quad(
        { x: HALF, y: cell.y0, z: cell.z0 },
        { x: HALF, y: cell.y0, z: cell.z1 },
        { x: HALF, y: cell.y1, z: cell.z1 },
        { x: HALF, y: cell.y1, z: cell.z0 }
      ).fill(SIDE_COLORS[cell.color]).stroke('#000', 1),
      trackBy: (cell) => `right-${cell.row}-${cell.col}`
    });

    // Highlight selected cell
    iso.quad()
      .bindPoints(() => cube.getSelectedCellQuad())
      .bindVisible(() => cube.hasSelection())
      .stroke('#ffff00', 2);
  });

  // Cell labels (optional, foreign objects)
  c.foreign(10, 10, () => {
    a.label('').bindText(() => `Moves: ${cube.getMoveCount()}`);
  });
});
```

**Key simplifications**:
- `isometricProjection()` handles all 3D→2D math
- `quads().bindTo()` renders cell grids declaratively
- No manual fillQuad/drawLine functions
- Hit detection handled by projection context
- Selection highlight is just another bound primitive

**New primitive needed**: `isometricProjection({ angle })` - isometric 3D to 2D projection
**New primitive needed**: `quad(p1, p2, p3, p4)` - 4-point polygon

**File**: `ported-apps/3d-cube/3d-cube-cosyne.ts`

---

### 11. prime-grid-visualizer-cosyne

**Purpose**: Port of prime number grid visualizer using Cosyne

**Current implementation**: `ported-apps/prime-grid-visualizer/prime-grid-visualizer.ts` (~350 lines)
- Uses CanvasRaster with fillRect() calls
- Sieve of Eratosthenes for prime calculation
- Manual cell-by-cell rendering loop
- Fixed 800x800 canvas

**Cosyne version** (~120 lines estimated):

```typescript
cosyne(a, (c) => {
  // Background
  c.rect(0, 0, 800, 800).fill('#ffffff');

  // Prime grid - each cell colored by primality
  c.grid(state.columns, getRows(), { cellSize: state.cellSize })
    .bindCells(() => {
      // Map cell number to primality
      const cells: (boolean | 'one')[][] = [];
      let num = 1;
      for (let row = 0; row < getRows(); row++) {
        cells[row] = [];
        for (let col = 0; col < state.columns; col++) {
          if (num > state.n) cells[row][col] = false;
          else if (num === 1) cells[row][col] = 'one';
          else cells[row][col] = isPrimes[num];
          num++;
        }
      }
      return cells;
    })
    .cellColor((value) => {
      if (value === 'one') return '#3b82f6';  // Blue
      if (value === true) return '#22c55e';   // Green (prime)
      return '#ef4444';                         // Red (composite)
    })
    .cellBorder('#333', 1);

  // Stats overlay
  c.foreign(10, 10, () => {
    a.label('').bindText(() =>
      `Primes: ${primeCount} | Composites: ${state.n - 1 - primeCount} | ${percentage}% prime`
    );
  });
});
```

**Key simplifications**:
- No manual fillRect loops
- `grid().bindCells()` handles entire rendering
- Cell coloring is a simple mapping function
- Stats use foreign object

**File**: `ported-apps/prime-grid-visualizer/prime-grid-visualizer-cosyne.ts`

---

### 12. eyes-cosyne

**Purpose**: Port of animated eyes app using Cosyne - simple circles demo

**Current implementation**: `phone-apps/eyes/eyes.ts` (~320 lines)
- Uses TappableCanvasRaster with pixel buffer
- Manual fillCircle/strokeCircle rendering functions
- Mouse tracking updates iris positions
- Multiple overlapping circles per eye (sclera, iris, pupil, highlight)

**Cosyne version** (~80 lines estimated):

```typescript
cosyne(a, (c) => {
  c.rect(0, 0, '100%', '100%').fill('#87ceeb');  // Sky blue background

  // Render each eye as layered circles
  for (const eyeName of ['left', 'right']) {
    const eye = eyeName === 'left' ? eyes.getLeftEye() : eyes.getRightEye();
    const offset = eyeName === 'left' ? eyes.getLeftIrisOffset() : eyes.getRightIrisOffset();

    // Sclera (white)
    c.circle(eye.x, eye.y, eye.radius)
      .fill('#ffffff')
      .stroke('#333333', 2);

    // Iris (green)
    c.circle(0, 0, irisRadius)
      .bindPosition(() => ({
        x: eye.x + offset.x,
        y: eye.y + offset.y
      }))
      .fill('#4caf50')
      .stroke('#2e7d32', 1);

    // Pupil (black)
    c.circle(0, 0, pupilRadius)
      .bindPosition(() => ({
        x: eye.x + offset.x,
        y: eye.y + offset.y
      }))
      .fill('#000000');

    // Highlight (white)
    c.circle(0, 0, highlightRadius)
      .bindPosition(() => ({
        x: eye.x + offset.x - pupilRadius * 0.3,
        y: eye.y + offset.y - pupilRadius * 0.3
      }))
      .fill('#ffffff');
  }
});

// Mouse tracking
onMouseMove((x, y) => {
  eyes.setMousePosition(x, y);
  cosyne.refreshBindings();
});
```

**Key simplifications**:
- No manual fillCircle/strokeCircle functions
- Layered circles with bindPosition for tracking
- Same logic, declarative rendering

**File**: `phone-apps/eyes/eyes-cosyne.ts`

---

### 13. clock-cosyne

**Purpose**: Validation that clock.ts already uses near-Cosyne patterns

**Current implementation**: `phone-apps/clock/clock.ts` (~240 lines)
- Already uses declarative `bindLine()` pattern for clock hands!
- Uses `canvasStack`, `canvasCircle`, `canvasLine` primitives
- Custom binding system with `HandBinding` interface

**Cosyne version** (~120 lines estimated):

```typescript
cosyne(a, (c) => {
  // Clock face
  c.circle(CLOCK_CENTER, CLOCK_CENTER, CLOCK_RADIUS)
    .fill('#f5f5f5')
    .stroke('#333333', 3);

  // Hour markers
  for (let i = 0; i < 12; i++) {
    const marker = calcHourMarkerLine(i);
    c.line(marker.x1, marker.y1, marker.x2, marker.y2)
      .stroke('#333333', i % 3 === 0 ? 3 : 1);
  }

  // Hour hand
  c.line(CLOCK_CENTER, CLOCK_CENTER, 0, 0)
    .bindEndPoint(() => calcHandEndpoint(hourRotation(), CLOCK_RADIUS * 0.5))
    .stroke('#333333', 4);

  // Minute hand
  c.line(CLOCK_CENTER, CLOCK_CENTER, 0, 0)
    .bindEndPoint(() => calcHandEndpoint(minuteRotation(), CLOCK_RADIUS * 0.75))
    .stroke('#333333', 3);

  // Second hand
  c.line(CLOCK_CENTER, CLOCK_CENTER, 0, 0)
    .bindEndPoint(() => calcHandEndpoint(secondRotation(), CLOCK_RADIUS * 0.85))
    .stroke('#e74c3c', 1);

  // Center dot
  c.circle(CLOCK_CENTER, CLOCK_CENTER, 5).fill('#333333');
});

setInterval(() => cosyne.refreshBindings(), 1000);
```

**Key insight**: clock.ts already validates the Cosyne API design! The `bindLine()` pattern maps directly to `line().bindEndPoint()`.

**File**: `phone-apps/clock/clock-cosyne.ts`

---

### 14. paris-density-cosyne

**Purpose**: Port of d3-style data visualization with heatmaps

**Current implementation**: `larger-apps/realtime-paris-density-simulation/app.ts` (~845 lines)
- Multi-layer heatmap rendering (glow, main, hotspots)
- Tile map background with panning
- Animated point interpolation
- Color presets with gradient stops
- Complex render pipeline with render targets

**Cosyne version** (~350 lines estimated):

```typescript
cosyne(a, (c) => {
  // Background map tiles (wrapped in Cosyne layer)
  c.tileMap(mapViewport)
    .source(tileSource)
    .onPan((dx, dy) => updateViewport(dx, dy));

  // Heatmap layers
  c.heatmap()
    .bindPoints(() => toHeatmapPoints(displayData))
    .colorStops(COLOR_PRESETS[settings.colorPreset])
    .radius(settings.radiusPixels)
    .intensity(settings.intensity)
    .bindVisible(() => true);

  // Glow layer
  c.heatmap()
    .bindPoints(() => toHeatmapPoints(displayData))
    .colorStops(GLOW_PRESETS[settings.colorPreset])
    .radius(settings.glowRadius)
    .intensity(settings.glowIntensity)
    .bindVisible(() => settings.showGlow);

  // Hotspot layer
  c.heatmap()
    .bindPoints(() => toHeatmapPoints(displayData).filter(p => p.weight > 0.45))
    .colorStops(HOTSPOT_COLORS)
    .radius(settings.hotspotRadius)
    .intensity(settings.hotspotIntensity)
    .bindVisible(() => settings.showHotspots);

  // Control panel as foreign overlay
  c.foreign(10, 10, () => {
    a.vbox(() => {
      a.label('').bindText(() => `${currentFps} FPS`);
      a.label('').bindText(() => timeLabel);
      a.slider(0.1, 2, settings.intensity, (v) => {
        settings.intensity = v;
        cosyne.refreshBindings();
      });
      // ... more controls
    });
  });
});

// Animation loop
setInterval(async () => {
  updateDisplayData();
  cosyne.refreshBindings();
}, 33);
```

**Key simplifications**:
- `heatmap()` primitive handles multi-layer rendering
- `tileMap()` wraps map tile fetching
- Foreign objects embed control panel
- Animation is just data update + refreshBindings

**New primitives needed**:
- `heatmap()` - renders Gaussian heatmap from weighted points
- `tileMap()` - renders slippy map tiles with pan/zoom

**File**: `larger-apps/realtime-paris-density-simulation/app-cosyne.ts`

---

### 15. mandelbrot-cosyne (partial)

**Purpose**: Demonstrate Cosyne for UI controls around pixel-intensive rendering

**Current implementation**: `phone-apps/mandelbrot/mandelbrot.ts` (~375 lines)
- Uses TappableCanvasRaster for pixel-by-pixel fractal
- Heavy computation per pixel (must stay pixel-buffer based)
- UI controls for zoom, pan, palette

**Note**: Fractals must stay pixel-buffer based for performance. Cosyne can wrap the overall structure but the inner rendering stays imperative. This is a "hybrid" example.

**Cosyne wrapper** (~200 lines):

```typescript
cosyne(a, (c) => {
  // Fractal canvas (pixel buffer inside Cosyne context)
  c.pixelCanvas(canvasWidth, canvasHeight, {
    render: (buffer) => renderMandelbrot(buffer, view),
    onTap: (x, y) => zoomToPoint(x, y),
    onScroll: (dx, dy, x, y) => handleScroll(dx, dy, x, y)
  });

  // Overlay controls as foreign objects
  c.foreign(10, 10, () => {
    a.label('').bindText(() => statusText);
  });

  c.foreign('bottom', 10, () => {
    a.hbox(() => {
      a.button('Zoom In').onClick(() => zoomIn());
      a.button('Zoom Out').onClick(() => zoomOut());
      a.button('Next Palette').onClick(() => nextPalette());
    });
  });
});
```

**Key insight**: `pixelCanvas()` primitive allows imperative pixel rendering inside Cosyne for performance-critical visualizations.

**File**: `phone-apps/mandelbrot/mandelbrot-cosyne.ts`

---

## Implementation Phases

### Phase 1: Core Primitives ✅ COMPLETE
- [x] cosyne() entry point
- [x] CosyneContext
- [x] circle, ellipse, line, rect primitives
- [x] fill, stroke styling
- [x] Basic tests

### Phase 1.5: Specialty Primitives ✅ COMPLETE
- [x] spherical-patch for 3D sphere surfaces
- [x] arc, wedge (for pie charts)
- [x] path (SVG path syntax)
- [x] text primitive
- [x] star primitive
- [x] polygon primitive
- [x] grid, heatmap, gauge, dial

### Phase 2: Bindings ✅ COMPLETE
- [x] bindPosition
- [x] bindFill, bindStroke
- [x] bindVisible, bindAlpha
- [x] refreshBindings() / refreshAllCosyneContexts()
- [x] Binding tests
- [x] Animation system with easing

### Phase 3: Collections ✅ COMPLETE
- [x] circles(), lines() collection builders
- [x] bindTo with render/trackBy
- [x] Efficient diffing
- [x] Collection tests

### Phase 4: Projections ✅ COMPLETE
- [x] Projection interface
- [x] Spherical projection
- [x] graticule()
- [x] bindRotation
- [x] Projection tests

### Phase 5: Transforms & Foreign ✅ COMPLETE
- [x] transform() with translate/rotate/scale
- [x] Transform composition
- [x] foreign() for Tsyne widgets
- [x] Transform and foreign tests
- [x] Clipping, gradients, effects

### Phase 6: Test Applications ✅ COMPLETE
- [x] circles-demo (phone-apps/circles-demo/)
- [x] animated shapes demo
- [x] particle-system (phone-apps/particles/)
- [x] 18 comprehensive demos in cosyne/demos/
- [x] Multiple app ports (eyes, spinner, bar-chart, etc.)

### Phase 7: 3D System ✅ COMPLETE (Beyond Original Plan!)
- [x] Full 3D primitives (sphere, box, plane, cylinder)
- [x] Camera system with bindings
- [x] Lighting system (ambient, directional, point)
- [x] Material system (Phong, Lambert, etc.)
- [x] Raycaster for 3D hit detection
- [x] Multiple renderers (canvas, buffer)
- [x] Complete 3D math library

### Phase 8: Advanced Features ✅ COMPLETE (Beyond Original Plan!)
- [x] Zoom-pan interactions
- [x] Scales and axes for data viz
- [x] Symmetry (kaleidoscope, rotational)
- [x] Motion trails
- [x] Particle systems
- [x] GPU shaders (Perlin noise, Voronoi, raymarching)
- [x] Blend modes
- [x] Markers (arrowheads, etc.)

---

## Testing Strategy

### 1. Jest Unit Tests (Internal)

Pure TypeScript tests for Cosyne internals - binding evaluation, diffing, coordinate math:

```
cosyne/test/
  primitives.test.ts      # Shape creation and property setting
  bindings.test.ts        # Binding registration and refresh
  collection.test.ts      # Collection diffing with trackBy
  projections.test.ts     # Coordinate transformation math
  transforms.test.ts      # Transform composition
```

These tests don't need a running Fyne bridge - they test Cosyne's internal logic in isolation.

### 2. TsyneTest Integration Tests

Full integration tests using TsyneTest that render Cosyne visualizations and verify results:

```typescript
// cosyne/test/integration.test.ts
import { TsyneTest } from 'tsyne';
import { cosyne } from '../src';

describe('Cosyne circle rendering', () => {
  const test = new TsyneTest();

  beforeEach(async () => {
    await test.createApp((a) => {
      a.window({ title: 'Test' }, (win) => {
        win.setContent(() => {
          a.canvasStack(() => {
            cosyne(a, (c) => {
              c.circle(100, 100, 20).fill('#ff0000').withId('redCircle');
              c.circle(200, 100, 15).fill('#00ff00').withId('greenCircle');
            });
          });
        });
      });
    });
  });

  afterEach(() => test.cleanup());

  it('renders circles at correct positions', async () => {
    const ctx = test.getContext();

    // Navigate into Cosyne tree and assert
    await ctx.cosyne().circle('redCircle').shouldHavePosition(100, 100);
    await ctx.cosyne().circle('redCircle').shouldHaveRadius(20);
    await ctx.cosyne().circle('greenCircle').shouldHaveFill('#00ff00');
  });
});
```

### 3. TsyneTest Enhancements for Cosyne

New `TestContext` methods to navigate and assert on Cosyne element trees:

#### Navigation API

```typescript
// Access Cosyne context within a canvas
ctx.cosyne()                           // Returns CosyneLocator for first cosyne context
ctx.cosyne('canvasId')                 // Returns CosyneLocator for specific canvas

// Navigate to specific primitives
ctx.cosyne().circle('id')              // Circle by ID
ctx.cosyne().circle(0)                 // Circle by index
ctx.cosyne().circles()                 // All circles
ctx.cosyne().line('id')                // Line by ID
ctx.cosyne().rect('id')                // Rectangle by ID
ctx.cosyne().text('id')                // Text by ID
ctx.cosyne().foreign('id')             // Foreign object by ID
ctx.cosyne().primitive('id')           // Any primitive by ID

// Navigate into projections
ctx.cosyne().projection('spherical').point('id')
ctx.cosyne().projection('isometric').quad('id')
```

#### Assertion API

```typescript
// Position assertions
await ctx.cosyne().circle('ball').shouldHavePosition(100, 200);
await ctx.cosyne().circle('ball').shouldHavePosition({ x: 100, y: 200, tolerance: 5 });

// Property assertions
await ctx.cosyne().circle('ball').shouldHaveRadius(20);
await ctx.cosyne().circle('ball').shouldHaveFill('#ff0000');
await ctx.cosyne().circle('ball').shouldHaveStroke('#000', 2);
await ctx.cosyne().circle('ball').shouldHaveAlpha(0.5);
await ctx.cosyne().circle('ball').shouldBeVisible();
await ctx.cosyne().circle('ball').shouldNotBeVisible();

// Line assertions
await ctx.cosyne().line('hourHand').shouldHaveEndpoint(150, 75);
await ctx.cosyne().line('hourHand').shouldHaveStrokeWidth(4);

// Collection assertions
await ctx.cosyne().circles().shouldHaveCount(10);
await ctx.cosyne().circles().nth(0).shouldHaveFill('#ff0000');

// Grid assertions (for game-of-life style apps)
await ctx.cosyne().grid('board').shouldHaveCell(5, 3, true);
await ctx.cosyne().grid('board').shouldHaveLiveCellCount(42);

// Projection assertions
await ctx.cosyne().projection('spherical').point('pellet').shouldBeVisible();
await ctx.cosyne().projection('spherical').rotation().shouldBe({ theta: 0.5, phi: 0.2 });

// Foreign object assertions
await ctx.cosyne().foreign('scoreLabel').shouldContainText('Score: 100');
```

#### Interaction API

```typescript
// Click on Cosyne elements (if they have onClick handlers)
await ctx.cosyne().circle('startBtn').click();
await ctx.cosyne().grid('board').clickCell(5, 3);

// Hover (if onHover is bound)
await ctx.cosyne().circle('tooltip').hover();

// Drag (if onDrag is bound)
await ctx.cosyne().circle('handle').drag(50, 0);

// Foreign object interaction (delegated to TsyneTest widget locators)
await ctx.cosyne().foreign('controls').getById('resetBtn').click();
```

#### Polling with within()

```typescript
// Wait for binding updates
await ctx.cosyne().circle('ball')
  .within(2000)
  .shouldHavePosition(300, 400);

// Wait for collection to populate
await ctx.cosyne().circles()
  .within(500)
  .shouldHaveCount(100);
```

### 4. Implementation: CosyneLocator Class

New class in `core/src/test.ts`:

```typescript
/**
 * Locator for navigating and asserting on Cosyne element trees
 */
export class CosyneLocator {
  private withinTimeout?: number;

  constructor(
    private bridge: BridgeInterface,
    private canvasId?: string
  ) {}

  within(timeoutMs: number): CosyneLocator {
    this.withinTimeout = timeoutMs;
    return this;
  }

  circle(idOrIndex: string | number): CosynePrimitiveLocator {
    return new CosynePrimitiveLocator(this.bridge, this.canvasId, 'circle', idOrIndex);
  }

  circles(): CosyneCollectionLocator {
    return new CosyneCollectionLocator(this.bridge, this.canvasId, 'circle');
  }

  line(idOrIndex: string | number): CosynePrimitiveLocator {
    return new CosynePrimitiveLocator(this.bridge, this.canvasId, 'line', idOrIndex);
  }

  // ... rect, text, path, etc.

  projection(name: string): CosyneProjectionLocator {
    return new CosyneProjectionLocator(this.bridge, this.canvasId, name);
  }

  foreign(id: string): ForeignObjectLocator {
    return new ForeignObjectLocator(this.bridge, this.canvasId, id);
  }

  grid(id: string): CosyneGridLocator {
    return new CosyneGridLocator(this.bridge, this.canvasId, id);
  }
}

/**
 * Locator for a single Cosyne primitive
 */
export class CosynePrimitiveLocator {
  async shouldHavePosition(x: number, y: number, tolerance?: number): Promise<this>;
  async shouldHaveRadius(r: number): Promise<this>;
  async shouldHaveFill(color: string): Promise<this>;
  async shouldHaveStroke(color: string, width?: number): Promise<this>;
  async shouldHaveAlpha(alpha: number): Promise<this>;
  async shouldBeVisible(): Promise<this>;
  async shouldNotBeVisible(): Promise<this>;
  async click(): Promise<void>;
  async hover(): Promise<void>;
  async drag(deltaX: number, deltaY: number): Promise<void>;
}

/**
 * Locator for Cosyne collections
 */
export class CosyneCollectionLocator {
  async shouldHaveCount(count: number): Promise<this>;
  nth(index: number): CosynePrimitiveLocator;
  async forEach(fn: (locator: CosynePrimitiveLocator, index: number) => Promise<void>): Promise<void>;
}

/**
 * Locator for grid primitives
 */
export class CosyneGridLocator {
  async shouldHaveCell(x: number, y: number, expected: unknown): Promise<this>;
  async shouldHaveDimensions(cols: number, rows: number): Promise<this>;
  async clickCell(x: number, y: number): Promise<void>;
}
```

### 5. Bridge Protocol Extensions

New messages for Cosyne element inspection:

```typescript
// Request: get Cosyne element info
{
  type: 'getCosyneElement',
  payload: {
    canvasId?: string,      // Optional - first canvas if omitted
    primitiveType: string,  // 'circle', 'line', 'rect', etc.
    selector: string | number  // ID or index
  }
}

// Response
{
  id: 'msg_123',
  success: true,
  result: {
    type: 'circle',
    id: 'ball',
    x: 100,
    y: 200,
    radius: 20,
    fill: '#ff0000',
    stroke: null,
    alpha: 1.0,
    visible: true
  }
}

// Request: get all Cosyne primitives of type
{
  type: 'getCosynePrimitives',
  payload: {
    canvasId?: string,
    primitiveType: string
  }
}

// Response
{
  id: 'msg_124',
  success: true,
  result: {
    primitives: [
      { id: 'ball1', type: 'circle', x: 100, y: 100, ... },
      { id: 'ball2', type: 'circle', x: 200, y: 100, ... }
    ]
  }
}

// Request: get grid cell state
{
  type: 'getCosyneGridCell',
  payload: {
    canvasId?: string,
    gridId: string,
    col: number,
    row: number
  }
}

// Request: click on Cosyne element
{
  type: 'clickCosyneElement',
  payload: {
    canvasId?: string,
    primitiveId: string
  }
}
```

### 6. Test Cases for TsyneTest Cosyne Support

```
TC-TT-COS-001: ctx.cosyne().circle('id') finds circle by ID
TC-TT-COS-002: ctx.cosyne().circle(0) finds circle by index
TC-TT-COS-003: shouldHavePosition() asserts x,y correctly
TC-TT-COS-004: shouldHavePosition() with tolerance allows fuzzy match
TC-TT-COS-005: shouldHaveFill() asserts fill color
TC-TT-COS-006: shouldHaveRadius() asserts circle radius
TC-TT-COS-007: shouldHaveStroke() asserts stroke color and width
TC-TT-COS-008: shouldBeVisible() passes for visible elements
TC-TT-COS-009: shouldNotBeVisible() passes for hidden elements
TC-TT-COS-010: circles().shouldHaveCount() verifies collection size
TC-TT-COS-011: circles().nth(i) navigates to specific item
TC-TT-COS-012: within() polls until assertion passes
TC-TT-COS-013: within() times out with clear error
TC-TT-COS-014: click() triggers onClick handler
TC-TT-COS-015: grid().shouldHaveCell() verifies cell state
TC-TT-COS-016: grid().clickCell() triggers cell click
TC-TT-COS-017: foreign().getById() chains to widget locator
TC-TT-COS-018: projection().point() navigates into projection
TC-TT-COS-019: Multiple cosyne contexts on same page work
TC-TT-COS-020: Error messages include element path for debugging
```

---

## File Structure

> **Note**: See [Actual File Structure](#actual-file-structure) above for the complete implemented layout with 61 source files, 18 demos, and 35 tests.

---

## MVP Definition (Phase 1 Goal) ✅ COMPLETE

The minimum viable Cosyne that proves the concept:

**Works as designed:**
```typescript
cosyne(a, (c) => {
  c.rect(0, 0, 400, 400).fill('#E8E8E8');
  c.circle(100, 100, 20).fill('#ff0000').withId('ball');
  c.circle(0, 0, 10)
    .bindPosition(() => ({ x: state.x, y: state.y }))
    .fill('#0000ff');
});

setInterval(() => {
  state.x += 1;
  refreshAllCosyneContexts();  // Note: actual API
}, 16);
```

**MVP acceptance criteria:** ✅ All met
1. ✅ `cosyne()` creates a context that renders to canvasStack
2. ✅ `rect()` and `circle()` create Fyne canvas primitives
3. ✅ `fill()` and `stroke()` set colors
4. ✅ `withId()` assigns IDs for TsyneTest lookup
5. ✅ `bindPosition()` stores a function and updates on refresh
6. ✅ `refreshAllCosyneContexts()` re-evaluates all bindings
7. ✅ Basic tests in `cosyne/test/primitives.test.ts`

**Originally not in MVP, now complete:**
- ✅ Collections (bindTo)
- ✅ Projections
- ✅ Specialty primitives (grid, heatmap, gauge, dial)
- ✅ Foreign objects
- ✅ Full 3D system
- ✅ Animation with easing
- ✅ GPU shaders

---

## Build & Test Commands

```bash
# From cosyne/ directory
npm install
npm run build          # Compile TypeScript
npm test               # Run Jest unit tests
npm run test:integration  # Run TsyneTest integration tests (requires bridge)

# From project root, run specific cosyne test
npx jest cosyne/test/primitives.test.ts
```

---

## Integration with Existing Canvas

Cosyne wraps the existing Tsyne canvas primitives:

| Cosyne | Tsyne Primitive | Notes |
|--------|-----------------|-------|
| `c.circle(x, y, r)` | `a.canvasCircle(x, y, r)` | Returns wrapped primitive |
| `c.rect(x, y, w, h)` | `a.canvasRectangle(x, y, w, h)` | |
| `c.line(x1, y1, x2, y2)` | `a.canvasLine(x1, y1, x2, y2)` | |
| `c.text(x, y, str)` | `a.canvasText(x, y, str)` | |

Cosyne adds:
- Fluent `.fill()`, `.stroke()` instead of separate calls
- `.bindPosition()`, `.bindFill()` etc. for reactive updates
- `.withId()` for test lookup
- Collection management with `circles().bindTo()`

---

## Handoff Notes for Implementation

1. **Start with `cosyne/src/context.ts`** - The CosyneContext that wraps App and tracks primitives

2. **Primitives are thin wrappers** - They delegate to existing `a.canvasCircle()` etc., but return a fluent builder

3. **Bindings are stored, not evaluated immediately** - `bindPosition(() => ...)` stores the function; `refreshBindings()` calls it

4. **The refresh loop is external** - User calls `setInterval(() => cosyne.refreshBindings(), 16)` - Cosyne doesn't own the loop

5. **TsyneTest integration requires bridge messages** - The `getCosyneElement` message needs Go-side implementation to query canvas children

6. **Test incrementally** - Get `rect()` and `circle()` working first, then add bindings, then collections

7. **Reference existing canvas code** - Look at `phone-apps/clock/clock.ts` for the bindLine pattern that Cosyne formalizes

8. **The cosyne/ directory is a new package** - It will have its own package.json and be imported as `import { cosyne } from 'cosyne'`

---

## Open Questions (Resolved)

1. **Performance threshold**: At what primitive count should we recommend raw pixel buffer instead?
   - **Resolved**: Cosyne handles hundreds of primitives well. For pixel-intensive work (fractals, image processing), hybrid approach with `pixelCanvas()` embedding works. Apps like mandelbrot use raw pixel buffers inside Cosyne contexts.

2. **Projection library**: Build our own or wrap d3-geo?
   - **Resolved**: Built our own in `projections.ts`. Simpler, no external dependency, integrates cleanly with binding system.

3. **Animation**: Built-in easing/tweening or leave to user?
   - **Resolved**: Built-in! `animation.ts` and `animation-manager.ts` provide animation primitives. `easing.ts` provides standard easing functions (linear, easeIn, easeOut, easeInOut, bounce, elastic, etc.).

4. **Persistence**: Should bindings auto-refresh on interval or require explicit refresh call?
   - **Resolved**: Explicit refresh via `refreshAllCosyneContexts()`. Apps control their own timing (animation loops, event handlers). This is more flexible and avoids unnecessary updates.

---

## Influences & Examples to Port

### p5.js (Creative Coding)

Source: https://p5js.org/examples/

**Fundamentals** (Phase 1-2):
- [Shape Primitives](https://p5js.org/examples/hello-p5-simple-shapes.html) - circles, rects, lines
- [Color](https://p5js.org/examples/color-color-variables.html) - fill, stroke, alpha
- [Typography](https://p5js.org/examples/typography-letters.html) - text rendering

**Animation** (Phase 2-3):
- [Bouncing Ball](https://p5js.org/examples/motion-bounce.html) - bindPosition basics
- [Linear Motion](https://p5js.org/examples/motion-linear.html) - simple animation loop
- [Easing](https://p5js.org/examples/motion-easing.html) - smooth transitions

**Interaction** (Phase 5):
- [Mouse Press](https://p5js.org/examples/input-mouse-press.html) - click handling
- [Mouse Signals](https://p5js.org/examples/input-mouse-signals.html) - drag/hover

**Simulation** (Phase 3):
- [Particle System](https://p5js.org/examples/simulate-particle-system.html) - collection binding stress test
- [Flocking](https://p5js.org/examples/simulate-flocking.html) - many objects with behavior
- [Snowflakes](https://p5js.org/examples/simulate-snowflakes.html) - spawning/despawning

**Transforms** (Phase 5):
- [Translate](https://p5js.org/examples/transform-translate.html) - coordinate offset
- [Rotate](https://p5js.org/examples/transform-rotate.html) - rotation transforms
- [Scale](https://p5js.org/examples/transform-scale.html) - scaling
- [Arm](https://p5js.org/examples/transform-arm.html) - nested transforms (robot arm)

**Generative** (stretch):
- [Recursive Tree](https://p5js.org/examples/repetition-recursive-tree.html) - recursive structures
- [L-System](https://p5js.org/examples/simulate-l-systems.html) - grammar-based drawing
- [Spirograph](https://p5js.org/examples/repetition-spirograph.html) - parametric curves

---

### d3.js (Data Visualization)

Source: https://observablehq.com/@d3/gallery

**Charts** (Phase 2-3):
- [Bar Chart](https://observablehq.com/@d3/bar-chart) - rect primitives + data binding
- [Line Chart](https://observablehq.com/@d3/line-chart) - path primitive + time series
- [Scatterplot](https://observablehq.com/@d3/scatterplot) - circles + axes
- [Pie Chart](https://observablehq.com/@d3/pie-chart) - arc primitives

**Hierarchical** (Phase 3):
- [Treemap](https://observablehq.com/@d3/treemap) - nested rects
- [Sunburst](https://observablehq.com/@d3/sunburst) - radial hierarchy
- [Circle Packing](https://observablehq.com/@d3/circle-packing) - nested circles

**Network** (Phase 3-4):
- [Force-Directed Graph](https://observablehq.com/@d3/force-directed-graph) - nodes + links with physics
- [Arc Diagram](https://observablehq.com/@d3/arc-diagram) - curved connections

**Geographic** (Phase 4):
- [World Map](https://observablehq.com/@d3/world-map) - projections + paths
- [Choropleth](https://observablehq.com/@d3/choropleth) - colored regions
- [Orthographic](https://observablehq.com/@d3/orthographic) - globe projection (like spherical-snake)

**Transitions** (stretch):
- [Animated Treemap](https://observablehq.com/@d3/animated-treemap) - smooth layout changes
- [Stacked-to-Grouped](https://observablehq.com/@d3/stacked-to-grouped-bars) - morphing visualizations

---

### SVG Concepts to Adopt

- **viewBox**: Virtual coordinate system independent of pixel size
- **preserveAspectRatio**: How content scales to fit container
- **foreignObject**: Embed HTML/widgets in canvas (our `foreign()`)
- **Path syntax**: `M`, `L`, `C`, `A` commands for complex shapes
- **Markers**: Arrowheads on lines
- **Patterns**: Repeating fills
- **ClipPath**: Masking regions
- **Filters**: Blur, drop-shadow, etc. (stretch goal)

---

### Other Influences

**Paper.js** - http://paperjs.org/
- Path operations (union, intersect, subtract)
- Hit testing on shapes
- Smooth curves with bezier handles
- Examples: [Nyan Rainbow](http://paperjs.org/examples/nyan-rainbow/), [Chain](http://paperjs.org/examples/chain/)

**Konva.js** - https://konvajs.org/
- Event system on canvas objects (not just coordinates)
- Drag-and-drop built-in
- Layer management
- Examples: [Free Drawing](https://konvajs.org/docs/sandbox/Free_Drawing.html), [Drag and Drop](https://konvajs.org/docs/drag_and_drop/Drag_and_Drop.html)

**Two.js** - https://two.js.org/
- Renderer-agnostic (SVG, Canvas, WebGL)
- Scene graph model
- Animation timeline
- Examples: [Motion Trails](https://two.js.org/examples/motion-trail.html)

**Vega-Lite** - https://vega.github.io/vega-lite/
- Declarative JSON grammar for charts
- Automatic axis/legend generation
- Faceting (small multiples)
- Key insight: separate data, encoding, and mark specifications

**Observable Plot** - https://observablehq.com/plot/
- Modern, concise API built on d3
- Automatic scales and axes
- Marks-based (dot, line, bar, area, rule)

**Flutter CustomPainter** - https://api.flutter.dev/flutter/rendering/CustomPainter-class.html
- `paint()` method with Canvas
- `shouldRepaint()` for optimization
- Relevant since Tsyne targets Fyne (similar to Flutter)

**SwiftUI Canvas** - https://developer.apple.com/documentation/swiftui/canvas
- GraphicsContext with draw commands
- Integrates with SwiftUI views
- Symbols (reusable shapes)

---

### Processing (Original)

p5.js is based on Processing. Some classic Processing examples worth porting:

- **Clock** - Analog clock with hands (we have this!)
- **Pulses** - Expanding/contracting circles
- **Reflection** - Mirror drawing
- **Kaleidoscope** - Rotational symmetry
- **Noise Wave** - Perlin noise visualization
- **Game of Life** - Cellular automata grid

---

## Porting Priority (Status Updated)

### Tier 1 (Core Validation) ✅ COMPLETE
These prove the basic API works:
1. ✅ Bouncing Ball - `phone-apps/bouncing-ball/bouncing-ball-cosyne.ts`
2. ✅ Bar Chart - `phone-apps/bar-chart/bar-chart-cosyne.ts`
3. ✅ Mouse interaction - `phone-apps/interactive-shapes/interactive-shapes-cosyne.ts`
4. ✅ Animated shapes - `cosyne/demos/cosyne-animated-shapes.ts`

**Cosyne-ported apps**:
- ✅ `phone-apps/eyes/eyes-cosyne.ts` - Eyes following mouse
- ✅ `phone-apps/spinner/spinner-cosyne.ts` - Loading spinner
- ✅ `phone-apps/particles/particles-cosyne.ts` - Particle system
- ✅ `phone-apps/bar-chart/bar-chart-cosyne.ts` - Animated bar chart
- ✅ `phone-apps/clock/clock-cosyne.ts` - Analog clock
- ✅ `phone-apps/circles-demo/circles-cosyne.ts` - Circle grid demo
- ✅ `phone-apps/bouncing-ball/bouncing-ball-cosyne.ts` - Physics ball
- ✅ `phone-apps/dial-dashboard/dial-cosyne.ts` - Dial gauges
- ✅ `phone-apps/gauge-dashboard/gauge-cosyne.ts` - Gauge display
- ✅ `phone-apps/fractal-tree/fractal-tree-cosyne.ts` - Recursive tree
- ✅ `phone-apps/foreign-objects/foreign-objects-cosyne.ts` - Widget embedding
- ✅ `phone-apps/heatmap-demo/heatmap-cosyne.ts` - Heatmap visualization
- ✅ `phone-apps/interactive-shapes/interactive-shapes-cosyne.ts` - Click handling
- ✅ `phone-apps/projections/projections-cosyne.ts` - Map projections
- ✅ `phone-apps/transforms/transforms-cosyne.ts` - Transform stacks

### Tier 2 (Binding Stress Test) ✅ COMPLETE
5. ✅ Particle System - `phone-apps/particles-advanced-demo/particles-advanced-demo.ts`
6. ✅ Many objects - `cosyne/demos/cosyne-animated-shapes.ts`

### Tier 3 (Projection/Transform) ✅ COMPLETE
7. ✅ Spherical projections - `phone-apps/projections/projections-cosyne.ts`
8. ✅ Nested transforms - `phone-apps/transforms/transforms-cosyne.ts`

### Tier 4 (Foreign Objects) ✅ COMPLETE
9. ✅ Widget embedding - `phone-apps/foreign-objects/foreign-objects-cosyne.ts`
10. ✅ Interactive demos with sliders - Multiple demos

### Tier 5 (Advanced) ✅ COMPLETE
11. ✅ Symmetry/Kaleidoscope - `cosyne/demos/symmetry-demo.ts`, `kaleidoscope-shader.ts`
12. ✅ GPU shaders - `cosyne/demos/shader-*.ts`
13. ✅ Raymarching - `cosyne/demos/raymarching-*.ts`
14. ✅ 3D scenes - `examples/cosyne3d-interactive-cubes.ts`

### Future Porting Opportunities
Some original apps not yet ported to Cosyne (opportunity for further simplification):
- `ported-apps/spherical-snake/spherical-snake.ts` - Could leverage Cosyne 3D
- `ported-apps/game-of-life/game-of-life.ts` - grid() primitive fits well
- `ported-apps/falling-blocks/falling-blocks.ts` - grid() for board
- `ported-apps/3d-cube/3d-cube.ts` - Cosyne3D could simplify
- `larger-apps/realtime-paris-density-simulation/app.ts` - heatmap() primitive

---

## References

- [p5.js](https://p5js.org/) - Creative coding canvas API
- [p5.js Examples](https://p5js.org/examples/) - Comprehensive example gallery
- [d3.js](https://d3js.org/) - Data-driven documents
- [Observable D3 Gallery](https://observablehq.com/@d3/gallery) - Modern d3 examples
- [Vega-Lite](https://vega.github.io/vega-lite/) - Declarative visualization grammar
- [Paper.js](http://paperjs.org/) - Vector graphics scripting
- [Konva.js](https://konvajs.org/) - Canvas framework with events
- [Two.js](https://two.js.org/) - 2D drawing API
- [Observable Plot](https://observablehq.com/plot/) - Modern plotting library
- [SVG Specification](https://www.w3.org/TR/SVG2/) - SVG concepts
- [Processing](https://processing.org/) - Original creative coding environment
- [Flutter CustomPainter](https://api.flutter.dev/flutter/rendering/CustomPainter-class.html) - Flutter's canvas API
- [SwiftUI Canvas](https://developer.apple.com/documentation/swiftui/canvas) - Apple's declarative canvas
