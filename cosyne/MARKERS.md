# Line Markers Guide

**D3/SVG-style markers for directed graphs, flowcharts, and network diagrams**

Markers are small shapes drawn at line endpoints to indicate direction, flow, or relationship type. Inspired by SVG's `<marker>` element, Cosyne's markers are canvas-native, reactive, and type-safe.

## Quick Start

```typescript
import { cosyne } from 'cosyne';

a.canvasStack(() => {
  const ctx = cosyne(a, (c) => {
    // Arrow line (pointing right)
    c.line(50, 100, 200, 100)
      .stroke('#333333', 2)
      .endMarker('arrow', 10, '#FF6B6B')
      .withId('directed-line');

    // Bidirectional with double arrow
    c.line(50, 150, 200, 150)
      .stroke('#4ECDC4', 2)
      .startMarker('arrow', 8)
      .endMarker('arrow', 8)
      .withId('bidirectional');

    // Custom marker from SVG path
    const myMarker = {
      path: 'M 0,0 L -8,-3 L -8,3 Z',
      width: 8,
      height: 6,
      refX: 8,
      refY: 3,
    };

    c.line(50, 200, 200, 200)
      .stroke('#FFD93D', 2)
      .endMarker(myMarker, 10, '#FFD93D')
      .withId('custom-marker');
  });
});
```

---

## Built-In Markers

### Arrow
```
────→  (default direction indicator)
```
Solid filled triangle pointing forward. Most common for directed graphs.

```typescript
c.line(0, 0, 100, 0)
  .endMarker('arrow', 10, '#FF6B6B')
  .withId('arrow-line');
```

### Circle
```
────◉  (connection point)
```
Solid filled circle. Use for undirected edges or generic connection points.

```typescript
c.line(0, 0, 100, 0)
  .endMarker('circle', 8, '#4ECDC4')
  .withId('circle-endpoint');
```

### Square
```
────■  (block/junction)
```
Solid filled square. Good for blocking flows or state blocks.

```typescript
c.line(0, 0, 100, 0)
  .endMarker('square', 8, '#FFD93D')
  .withId('block-marker');
```

### Triangle
```
────▶  (alternative direction)
```
Solid filled triangle pointing forward (different angle than arrow).

```typescript
c.line(0, 0, 100, 0)
  .endMarker('triangle', 10, '#FF6B6B')
  .withId('triangle-marker');
```

### Diamond
```
────◆  (decision/junction)
```
Solid filled diamond shape. Use for decision points or junctions.

```typescript
c.line(0, 0, 100, 0)
  .endMarker('diamond', 10, '#FFD93D')
  .withId('decision-marker');
```

### Bar
```
────┤  (blocking/endpoint)
```
Horizontal bar. Indicates blocking flow or hard endpoint.

```typescript
c.line(0, 0, 100, 0)
  .endMarker('bar', 8, '#FF6B6B')
  .withId('blocking-marker');
```

---

## Custom Markers

Define any marker shape using SVG path syntax:

```typescript
import { CUSTOM_MARKERS } from 'cosyne';

const customArrow = {
  path: 'M 0,0 L -10,-5 L -10,5 Z',  // SVG path
  width: 10,      // Bounding box width
  height: 10,     // Bounding box height
  refX: 10,       // Attachment point (where line connects)
  refY: 5,        // Attachment point Y offset
};

c.line(50, 50, 200, 50)
  .stroke('#333333', 2)
  .endMarker(customArrow, 12, '#FF6B6B');
```

### SVG Path Reference

**Commands:**
- `M x,y` - MoveTo (start point)
- `L x,y` - LineTo (line to point)
- `Q cpx,cpy x,y` - Quadratic curve
- `A rx,ry rotation sweep x,y` - Arc
- `Z` - ClosePath (back to start)

**Examples:**

```typescript
// Simple triangle (forward arrow)
'M 0,0 L -10,-5 L -10,5 Z'

// Double-headed arrow
'M 0,0 L -8,-3 L -8,3 Z M -4,0 L -12,-3 L -12,3 Z'

// Cross (prohibition)
'M -4,-4 L 4,4 M 4,-4 L -4,4'

// Circle
'M 0,-3 A 3,3 0 1,1 0,3 A 3,3 0 1,1 0,-3'

// T-junction
'M -4,-4 L -4,4 M -8,0 L 0,0'
```

### Preset Custom Markers

Cosyne includes 8 pre-defined custom markers:

```typescript
import { CUSTOM_MARKERS } from 'cosyne';

// Double-headed arrow (bidirectional)
CUSTOM_MARKERS.doubleArrow

// Open/outline arrow
CUSTOM_MARKERS.openArrow

// Curved arrow (for arcs)
CUSTOM_MARKERS.curvedArrow

// Reverse arrow (backward)
CUSTOM_MARKERS.reverseArrow

// Cross mark (negation)
CUSTOM_MARKERS.cross

// Tee/T-junction
CUSTOM_MARKERS.tee

// Open circle (outline only)
CUSTOM_MARKERS.openCircle

// Filled square
CUSTOM_MARKERS.filledSquare
```

**Usage:**

```typescript
import { CUSTOM_MARKERS } from 'cosyne';

// Bidirectional line
c.line(50, 50, 200, 50)
  .stroke('#4ECDC4', 2)
  .startMarker(CUSTOM_MARKERS.doubleArrow, 12)
  .endMarker(CUSTOM_MARKERS.doubleArrow, 12)
  .withId('bidirectional');

// Feedback loop with curved arrow
c.line(100, 100, 50, 150)
  .stroke('#FF6B6B', 2)
  .endMarker(CUSTOM_MARKERS.curvedArrow, 10)
  .withId('feedback');
```

---

## API Reference

### Line Marker Methods

```typescript
c.line(x1, y1, x2, y2)
  .startMarker(
    type: MarkerType,
    size?: number,      // Default: 10
    color?: string,     // Default: inherits stroke
    alpha?: number      // Default: 1
  ): this

  .endMarker(
    type: MarkerType,
    size?: number,
    color?: string,
    alpha?: number
  ): this

  .bindStartMarker(
    fn: () => MarkerConfig | null
  ): this

  .bindEndMarker(
    fn: () => MarkerConfig | null
  ): this
```

### Path Marker Methods

Same API as Line:

```typescript
c.path(x, y, pathString)
  .startMarker(type, size, color, alpha)
  .endMarker(type, size, color, alpha)
  .bindStartMarker(fn)
  .bindEndMarker(fn)
```

### Types

```typescript
// Built-in marker types
type BuiltInMarkerType = 'arrow' | 'circle' | 'square'
                       | 'triangle' | 'diamond' | 'bar'

// Custom marker definition
interface CustomMarker {
  path: string;           // SVG path data
  width: number;
  height: number;
  refX: number;          // Attachment X offset
  refY: number;          // Attachment Y offset
}

// Union type
type MarkerType = BuiltInMarkerType | CustomMarker

// Configuration for bindings
interface MarkerConfig {
  type: MarkerType;
  size?: number;
  color?: string;
  alpha?: number;
}
```

---

## Marker Positioning

Markers are positioned at line endpoints and rotated to align with line direction:

```typescript
// Angle calculation
const dx = endX - startX;
const dy = endY - startY;
const angle = Math.atan2(dy, dx);

// Marker rendered at (endX, endY) rotated by angle
ctx.translate(endX, endY);
ctx.rotate(angle);
ctx.fill(markerPath);
```

### Reference Point (refX, refY)

The `refX` and `refY` values determine where the line connects to the marker:

```typescript
// Arrow with refX = 8, refY = 3
// Line ends at marker's left edge
const marker = {
  path: 'M 0,0 L -8,-3 L -8,3 Z',
  width: 8,
  height: 6,
  refX: 8,    // ← Line connects here
  refY: 3,    // ← Vertically centered
};
```

---

## Reactive Markers

Marker type, size, and color can change based on state:

```typescript
// Toggle between arrow and circle based on hover state
c.line(50, 50, 200, 50)
  .stroke('#4ECDC4', 2)
  .bindEndMarker(() => ({
    type: state.hovering ? 'arrow' : 'circle',
    size: state.active ? 12 : 8,
    color: state.active ? '#FF6B6B' : '#999999',
    alpha: 1
  }));

// Dynamic marker selection from array
const markerTypes = ['arrow', 'circle', 'square'];
c.line(50, 100, 200, 100)
  .stroke('#333333', 2)
  .bindEndMarker(() => ({
    type: markerTypes[state.markerIndex % markerTypes.length],
    size: 10,
    color: '#FF6B6B',
    alpha: state.active ? 1 : 0.3
  }));
```

---

## Use Cases

### 1. Flowcharts

```typescript
// Process → Decision → Result
c.line(100, 50, 100, 100)
  .stroke('#333333', 2)
  .endMarker('arrow', 10)  // Down
  .withId('start-to-process');

// Decision branches
c.line(100, 140, 200, 140)
  .stroke('#4ECDC4', 2)
  .endMarker('arrow', 8)   // Right
  .withId('yes-branch');

c.line(100, 140, 0, 140)
  .stroke('#FF6B6B', 2)
  .endMarker('arrow', 8)   // Left
  .withId('no-branch');
```

### 2. Directed Graphs / DAG

```typescript
const edges = [
  {from: {x:50, y:50}, to: {x:150, y:50}},
  {from: {x:50, y:50}, to: {x:100, y:150}},
  {from: {x:150, y:50}, to: {x:100, y:150}},
];

edges.forEach((edge) => {
  c.line(edge.from.x, edge.from.y, edge.to.x, edge.to.y)
    .stroke('#999999', 1)
    .endMarker('arrow', 8, '#666666')
    .withId(`edge-${edges.indexOf(edge)}`);
});
```

### 3. State Machines

```typescript
// Self-loop (Idle state)
c.line(100, 50, 100, 30)    // Up
  .stroke('#999999', 1.5)
  .endMarker('arrow', 8)
  .withId('self-loop');

// Transition (Running → Done)
c.line(200, 100, 300, 100)
  .stroke('#6BCB77', 2)
  .endMarker('arrow', 10, '#6BCB77')
  .withId('complete');

// Bidirectional (Paused ↔ Running)
c.line(250, 80, 250, 120)
  .stroke('#FFD93D', 2)
  .startMarker('arrow', 8)  // Up
  .endMarker('arrow', 8)    // Down
  .withId('toggle-pause');
```

### 4. Network Topology

```typescript
// Server → Client (request)
c.line(200, 100, 100, 50)
  .stroke('#FF6B6B', 1.5)
  .endMarker('arrow', 7)
  .withId('request');

// Client → Server (response, use custom marker)
c.line(100, 70, 200, 120)
  .stroke('#4ECDC4', 1.5)
  .endMarker(CUSTOM_MARKERS.reverseArrow, 7)
  .withId('response');
```

### 5. Dependency Graphs

```typescript
// A → B (A depends on B, or A provides to B)
c.line(50, 50, 150, 50)
  .stroke('#333333', 1)
  .endMarker('arrow', 8)
  .withId('dependency-a-b');

// B → C → D (chain)
c.line(150, 50, 250, 50)
  .stroke('#333333', 1)
  .endMarker('arrow', 8)
  .withId('dependency-b-c');

c.line(250, 50, 350, 50)
  .stroke('#333333', 1)
  .endMarker('arrow', 8)
  .withId('dependency-c-d');
```

### 6. UML Class Relationships

```typescript
// Inheritance (open arrow, use custom)
c.line(100, 150, 200, 50)
  .stroke('#333333', 2)
  .endMarker(CUSTOM_MARKERS.openArrow, 12)
  .withId('inheritance');

// Association (both ends, use circles)
c.line(100, 200, 300, 200)
  .stroke('#333333', 2)
  .startMarker('circle', 6)
  .endMarker('circle', 6)
  .withId('association');

// Composition (filled diamond)
c.line(100, 250, 300, 250)
  .stroke('#333333', 2)
  .startMarker('diamond', 8)
  .endMarker('arrow', 8)
  .withId('composition');
```

---

## Performance

| Metric | Value |
|--------|-------|
| Marker render time | ~0.1ms per marker |
| Memory per marker | ~100 bytes |
| Complex diagram (50 lines) | <6ms render time |
| Typical frame rate | 60 fps with 100+ lines |

**Optimization tips:**
1. Use built-in markers when possible (faster than custom)
2. Cache custom marker definitions
3. Use `.alpha(0)` instead of hiding lines (still renders, but invisible)
4. For 1000+ lines, consider grouping/clustering

---

## Migration from SVG

If coming from SVG `<marker>` elements:

**SVG:**
```xml
<defs>
  <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L0,6 L9,3 z" fill="#f00" />
  </marker>
</defs>

<line x1="50" y1="50" x2="200" y2="50" stroke="#333" marker-end="url(#arrow)" />
```

**Cosyne:**
```typescript
const arrow = {
  path: 'M 0,0 L 0,6 L 9,3 Z',
  width: 9,
  height: 6,
  refX: 9,
  refY: 3,
};

c.line(50, 50, 200, 50)
  .stroke('#333333', 2)
  .endMarker(arrow, 10, '#FF0000');
```

**Key differences:**
- No ID needed (markers are inline)
- `markerWidth/markerHeight` → implicit sizing
- `orient="auto"` → automatic (always rotates to line direction)
- `markerUnits` → implicit pixel-based
- Direct color specification (no CSS styling needed)

---

## Examples

### Complete Flowchart

```typescript
a.canvasStack(() => {
  const ctx = cosyne(a, (c) => {
    // Start
    c.circle(100, 50, 15)
      .fill('#4ECDC4')
      .stroke('#333333', 2)
      .withId('start');

    // Start → Process
    c.line(100, 65, 100, 100)
      .stroke('#333333', 2)
      .endMarker('arrow', 8)
      .withId('to-process');

    // Process box
    c.rect(50, 100, 100, 60)
      .fill('#FF6B6B')
      .stroke('#333333', 2)
      .withId('process');

    c.text(100, 135, 'Process')
      .fill('#FFFFFF')
      .withId('process-label');

    // Process → Decision
    c.line(100, 160, 100, 200)
      .stroke('#333333', 2)
      .endMarker('arrow', 8)
      .withId('to-decision');

    // Decision diamond
    c.polygon(100, 240, [
      {x: 100, y: 200},
      {x: 130, y: 240},
      {x: 100, y: 280},
      {x: 70, y: 240}
    ])
      .fill('#FFD93D')
      .stroke('#333333', 2)
      .withId('decision');

    c.text(100, 245, 'OK?')
      .fill('#333333')
      .withId('decision-label');

    // Yes branch
    c.line(130, 240, 200, 240)
      .stroke('#6BCB77', 2)
      .endMarker('arrow', 8)
      .withId('yes-path');

    c.text(155, 230, 'Yes')
      .fill('#6BCB77')
      .withId('yes-label');

    // Success
    c.rect(200, 210, 80, 60)
      .fill('#6BCB77')
      .stroke('#333333', 2)
      .withId('success');

    c.text(240, 245, 'Success')
      .fill('#FFFFFF')
      .withId('success-label');

    // No branch (feedback)
    c.line(100, 280, 100, 350)
      .stroke('#FF6B6B', 2)
      .endMarker('arrow', 8)
      .withId('no-path');

    c.text(115, 315, 'No')
      .fill('#FF6B6B')
      .withId('no-label');

    // Retry box
    c.rect(50, 350, 100, 60)
      .fill('#FF6B6B')
      .stroke('#333333', 2)
      .withId('retry');

    c.text(100, 385, 'Retry')
      .fill('#FFFFFF')
      .withId('retry-label');

    // Feedback loop back to process
    c.line(50, 370, 20, 370)
      .stroke('#FF6B6B', 2)
      .withId('feedback-out');

    c.line(20, 370, 20, 130)
      .stroke('#FF6B6B', 2)
      .withId('feedback-up');

    c.line(20, 130, 50, 130)
      .stroke('#FF6B6B', 2)
      .endMarker('arrow', 8)
      .withId('feedback-in');
  });
});
```

---

## Troubleshooting

**Marker not showing:**
- Check if marker `size` is greater than 0
- Verify `color` is valid hex/RGB
- Ensure line `stroke` is set (marker inherits color if not specified)

**Marker rotated wrong:**
- This is automatic based on line direction
- If you want a specific angle, rotate the line endpoints

**Custom marker looks wrong:**
- Verify SVG path syntax
- Check `refX`/`refY` match where line should connect
- Test path in SVG viewer first

**Performance issues:**
- Reduce number of markers
- Use built-in markers instead of custom
- Consider CanvasRenderingContext2D caching for custom paths

---

## See Also

- [Line Chart Documentation](./D3_P5_COMPONENTS.md#line-charts)
- [Demo App](../phone-apps/markers-demo/)
- [Jest Tests](./test/markers.test.ts)
- [SVG Marker Spec](https://www.w3.org/TR/SVG2/painting.html#MarkerElement)
- [D3 Path Documentation](https://github.com/d3/d3-path)
