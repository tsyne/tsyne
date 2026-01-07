# Pseudo-Declarative Spherical Snake

This document describes an alternate implementation of Spherical Snake using Cosyne's declarative canvas grammar instead of imperative pixel-buffer rendering.

## Current Implementation Summary

**File**: `spherical-snake.ts` (~900 lines)

**Approach**: Imperative game loop with full pixel buffer redraw

```typescript
// Current: Manual pixel buffer management
async function renderFrame(): Promise<void> {
  const buffer = new Uint8Array(width * height * 4);

  // Fill background
  for (let i = 0; i < buffer.length; i += 4) { ... }

  // Draw grid points
  for (const point of game.getProjectedGridPoints()) {
    drawPixel(buffer, point.x, point.y, ...);
  }

  // Draw snake nodes
  for (const node of game.getProjectedSnakeNodes()) {
    drawCircle(buffer, node.x, node.y, node.radius, ...);
  }

  // Draw pellet
  drawCircle(buffer, pellet.x, pellet.y, ...);

  // Draw horizon
  drawCircleOutline(buffer, cx, cy, radius, ...);

  await canvas.setPixelBuffer(buffer);
}

// 67 FPS game loop
setInterval(async () => {
  game.tick();
  await renderFrame();
}, 15);
```

**Pros**:
- Simple mental model
- Full control over every pixel
- No framework overhead

**Cons**:
- ~150 lines of drawing utilities (drawPixel, drawCircle, drawCircleOutline)
- Manual projection math mixed with rendering
- No declarative binding to game state
- Hard to add interactive elements (labels, tooltips)

---

## Proposed Cosyne Implementation

**File**: `pseudo-declarative-spherical-snake.ts` (estimated ~400 lines)

**Approach**: Declarative primitives with bindings and projection

```typescript
import { cosyne, sphericalProjection } from 'cosyne';

export function buildSphericalSnakeApp(a: App): void {
  const game = new SphericalSnake();

  a.window({ title: 'Spherical Snake', width: 500, height: 580 }, (win) => {
    win.setContent(() => {
      a.border({
        top: () => {
          a.hbox(() => {
            a.label('').bindText(() => `Score: ${game.getScore()}`);
            a.label('').bindText(() =>
              game.getGameState() === 'gameover' ? 'Game Over!' : 'Playing'
            );
          });
        },

        center: () => {
          a.aspectRatio(1.0, () => {
            a.canvasStack(() => {
              cosyne(a, (c) => {
                // Background
                c.rect(0, 0, '100%', '100%').fill('#E8E8E8');

                // Spherical projection context
                c.projection(sphericalProjection({
                  focalLength: 320,
                  center: () => ({ x: c.width / 2, y: c.height / 2 }),
                  rotation: () => game.getRotation()
                }), (sphere) => {

                  // Graticule (lat/lon grid)
                  sphere.graticule(40, 40)
                    .stroke('#000')
                    .bindAlpha((lat, lon) => sphere.depthAlpha(lat, lon));

                  // Horizon circle
                  sphere.horizon()
                    .stroke('#000', 1)
                    .fill('transparent');

                  // Snake body segments
                  sphere.circles().bindTo({
                    items: () => game.getSnakeNodes(),
                    render: (node, index) => sphere
                      .point(node)
                      .radius(() => game.getNodeRadius(index))
                      .fill(() => game.getNodeColor(index))
                      .bindAlpha(() => sphere.depthAlpha(node)),
                    trackBy: (_, index) => index
                  });

                  // Pellet
                  sphere.point(() => game.getPellet())
                    .radius(5)
                    .fill('#0000FF')
                    .bindAlpha(() => sphere.depthAlpha(game.getPellet()));
                });

                // Direction buttons (foreign Tsyne widgets)
                c.foreign('10%', 'bottom-20', () => {
                  a.image({ path: leftArrowSvg, ... })
                    .onClick(() => game.turnLeft());
                });

                c.foreign('right-10%', 'bottom-20', () => {
                  a.image({ path: rightArrowSvg, ... })
                    .onClick(() => game.turnRight());
                });
              });
            });
          });
        },

        bottom: () => {
          a.hbox(() => {
            a.button('New Game').onClick(() => game.reset());
            a.button('Pause').onClick(() => game.togglePause());
          });
        }
      });
    });

    // Game loop - just tick and refresh bindings
    setInterval(() => {
      game.tick();
      cosyne.refreshBindings();
    }, 15);
  });
}
```

---

## Key Differences

| Aspect | Current (Imperative) | Proposed (Cosyne) |
|--------|---------------------|-------------------|
| Rendering | Full buffer redraw each frame | Binding updates only changed properties |
| Grid points | Loop + drawPixel | `graticule(40, 40)` one-liner |
| Snake | Loop + drawCircle | `circles().bindTo({ items: ... })` |
| Pellet | drawCircle call | `point().bindPosition()` |
| Horizon | drawCircleOutline | `horizon()` primitive |
| Projection | Manual math in renderFrame | Declarative `projection()` context |
| Direction buttons | TappableCanvasRaster + pixel drawing | `foreign()` with Tsyne image widgets |
| LOC estimate | ~900 | ~400 |

---

## SphericalSnake Class Changes

The game logic class needs minor additions to support declarative bindings:

```typescript
// Existing methods (keep as-is)
getProjectedGridPoints(): ProjectedPoint[]
getProjectedSnakeNodes(): ProjectedPoint[]
getProjectedPellet(): ProjectedPoint
getScore(): number
getGameState(): GameState

// New methods for Cosyne
getRotation(): { theta: number, phi: number }
getSnakeNodes(): SnakeNode[]  // Raw nodes, not projected
getPellet(): Point3D          // Raw position, not projected
getNodeRadius(index: number): number
getNodeColor(index: number): string
```

The projection math moves from the game class into Cosyne's spherical projection.

---

## Cosyne Features Required

### Must Have (Phase 1-3)

- [x] `cosyne()` entry point
- [x] `rect()` primitive with fill
- [x] `circle()` with position/radius bindings
- [x] `circles().bindTo()` for collections
- [x] `bindAlpha()` for depth-based transparency
- [x] `refreshBindings()` for game loop

### Must Have (Phase 4)

- [x] `projection(sphericalProjection(...))` context
- [x] `sphere.graticule(lat, lon)`
- [x] `sphere.horizon()`
- [x] `sphere.point(latLon)` for projected points
- [x] `sphere.depthAlpha(point)` helper

### Must Have (Phase 5)

- [x] `foreign(x, y, builder)` for Tsyne widgets
- [x] Percentage positioning (`'10%'`, `'bottom-20'`)

---

## Implementation Steps

### Step 1: Stub Cosyne

Create minimal Cosyne that wraps existing canvas primitives:

```typescript
// cosyne/src/index.ts
export function cosyne(a: App, builder: (c: CosyneContext) => void): void {
  const ctx = new CosyneContext(a);
  builder(ctx);
}
```

### Step 2: Basic Primitives

Implement rect and circle with immediate rendering:

```typescript
c.rect(0, 0, 450, 450).fill('#E8E8E8');
c.circle(100, 100, 10).fill('#FF0000');
```

### Step 3: Position Bindings

Add bindPosition that stores a function and updates on refresh:

```typescript
c.circle(0, 0, 10).bindPosition(() => ({ x: game.x, y: game.y }));
```

### Step 4: Collection Binding

Implement circles().bindTo() with trackBy diffing:

```typescript
c.circles().bindTo({
  items: () => game.getSnakeNodes(),
  render: (node) => c.circle(node.x, node.y, 5),
  trackBy: (node, i) => i
});
```

### Step 5: Spherical Projection

Implement projection context that transforms coordinates:

```typescript
c.projection(sphericalProjection({ focalLength: 320 }), (p) => {
  p.point({ lat: 0, lon: 0 }); // Renders at projected screen coords
});
```

### Step 6: Graticule and Horizon

Add convenience methods for common sphere elements:

```typescript
sphere.graticule(40, 40);  // 40x40 lat/lon grid
sphere.horizon();          // Circle at sphere edge
```

### Step 7: Foreign Objects

Implement widget embedding at canvas coordinates:

```typescript
c.foreign(10, 500, () => {
  a.button('Left').onClick(() => game.turnLeft());
});
```

### Step 8: Integration

Wire up game loop with refreshBindings:

```typescript
setInterval(() => {
  game.tick();
  cosyne.refreshBindings();
}, 15);
```

---

## Test Cases for Spherical Snake Cosyne

```
TC-SS-001: Game renders with graticule visible
TC-SS-002: Snake head appears at starting position
TC-SS-003: Snake body follows head (bindTo updates)
TC-SS-004: Pellet appears at random position
TC-SS-005: Sphere rotates as snake moves (projection binding)
TC-SS-006: Depth alpha makes back-side elements transparent
TC-SS-007: Left button click turns snake left
TC-SS-008: Right button click turns snake right
TC-SS-009: Eating pellet increases score (label binding)
TC-SS-010: Collision ends game (state binding)
TC-SS-011: New Game button resets all bindings
TC-SS-012: Pause button stops game loop
TC-SS-013: Window resize updates projection center
TC-SS-014: 60 FPS maintained with all bindings
```

---

## Success Criteria

1. **Functionality**: All gameplay identical to imperative version
2. **Code reduction**: At least 50% fewer lines (~450 vs ~900)
3. **Readability**: UI structure visible in code hierarchy
4. **Performance**: Maintains 60 FPS
5. **Testability**: Individual bindings testable in isolation

---

## Future Enhancements

Once Cosyne spherical-snake works:

1. **Labels on snake**: Use `foreign()` to show segment numbers
2. **Particle effects**: Spawn circles on pellet eat
3. **Trails**: Fading circles behind snake
4. **Minimap**: Second smaller projection showing full sphere
5. **Touch gestures**: Swipe detection via Cosyne events

---

## References

- Current implementation: `spherical-snake.ts`
- Cosyne plan: `docs/cosyne_plan.md`
- Original game: https://github.com/kevinAlbs/SphericalSnake
