# Porting Connect4_Canvas to Tsyne — Step-by-Step Summary

This document records how a vanilla HTML5 Canvas game was ported to Tsyne's Cosyne canvas API. Use it as a template for similar ports.

## Source App Profile

| Property | Value |
|----------|-------|
| **Original repo** | `Connect4_Canvas/` (Emiliano Carrillo, Angel Genis, Omar Gard, 2018) |
| **Tech** | Single HTML page, vanilla JS, HTML5 Canvas 2D |
| **Files** | `index.html`, `css/estilos.css`, `scripts/master.js` (214 lines) |
| **Rendering** | Two overlapping `<canvas>` elements (board + animation layer) |
| **State** | Global mutable `matriz[7][6]` array, global `turno` variable |
| **Events** | `addEventListener('click')` on canvas, `onmousemove` for hover |
| **Animation** | Recursive `setTimeout` falling-piece animation |
| **Reset** | `location.reload()` |

## What the Original Does

1. Draws a blue board with 42 circular holes (composite `destination-out` trick)
2. Detects column clicks by dividing mouseX by cell size
3. Drops piece to lowest empty row, toggles turn
4. Recursive win check in 8 directions (4 axis pairs)
5. Highlights winning 4 pieces with green stroke
6. Animates falling piece on a second canvas layer
7. Hover preview of current player's piece above hovered column

## Porting Strategy

### Step 1: Extract Pure Game Logic into a Separate Module

**This is the most important step.** Before touching any UI code, extract all game rules into a pure TypeScript module with no DOM/Tsyne/Cosyne dependencies.

**What went into `game-logic.ts` (249 lines):**

| Original (master.js) | Extracted (game-logic.ts) | Notes |
|----------------------|---------------------------|-------|
| `matriz[7][6]` global array | `GameState` interface with typed `Cell[][]` board | Immutable — `makeMove()` clones before mutating |
| `turno` global | `GameState.currentPlayer: Player` (union `1 \| 2`) | Part of state object, not global |
| `llenarColumna(numCol)` | `findEmptyRow()` + `dropPiece()` | Split into query + mutation |
| `yaGanoAlguien()` + `fCount()` | `checkWin()` + `countInDirection()` + `collectPositions()` | Returns `WinResult` with positions instead of using global `posWinners` |
| `cambiarTurno()` | Built into `makeMove()` return value | State transition, not side effect |
| `color` assignment | `getPlayerColor(player)` pure function | No globals |
| `posWinners` global | `GameState.winningPositions` | Part of state |

**Key decisions:**
- All functions are **pure** — they take state in and return new state out
- `makeMove()` is the single entry point for game transitions: validates → drops → checks win → checks draw → switches player
- Board is cloned on every move (`board.map(col => [...col])`) — no shared mutable state
- Types are narrow: `Player = 1 | 2`, `Cell = Player | null`

**Write tests immediately.** The 26 tests in `game-logic.test.ts` cover:
- Board creation and initial state
- Column drop mechanics (bottom-fill, stacking, full-column rejection)
- Win detection in all 4 axis directions
- Draw detection
- Move validation (game-over blocking, full-column blocking)
- Player alternation
- Integration scenarios (full game sequences)

Having comprehensive logic tests means you can refactor the UI freely without fear.

### Step 2: Map Canvas Primitives to Cosyne Equivalents

| HTML5 Canvas | Cosyne | Notes |
|-------------|--------|-------|
| `ctx.fillRect(x, y, w, h)` | `c.rect(x, y, w, h, { fillColor })` | Direct mapping |
| `ctx.arc(x, y, r, 0, 2π)` + `fill()` | `c.circle(x, y, r, { fillColor })` | Cosyne circle takes center + radius |
| `ctx.fillText(text, x, y)` | `c.text(x, y, text, { fillColor, fontSize })` | Note: x,y is top-left in Cosyne, not baseline |
| `ctx.strokeStyle` + `ctx.lineWidth` + `ctx.stroke()` | `.stroke(color, width)` fluent method | Or `{ strokeColor, strokeWidth }` in constructor |
| `destination-out` composite holes | Not needed — Cosyne circles are filled shapes | The original used compositing to punch holes in the blue rect; Cosyne just draws colored circles on top |
| Two canvas layers | Single `canvasStack` with Cosyne z-order | Cosyne handles layering within one context |
| `canvas.addEventListener('click')` | `.onClick(() => ...)` fluent method on primitives | Per-primitive handlers, not coordinate math |
| `getMousePos()` coordinate math | Automatic — Cosyne does hit testing | No manual `mouseX / cellSize` division |

### Step 3: Replace Coordinate-Based Click Detection with Primitive Hit Testing

The original calculates which column was clicked by dividing mouse position by cell size:
```javascript
// Original — manual coordinate math
for (var i = 0; i < tablero.width; i += celda) {
  if (mousePos.x > i && mousePos.x < i + celda) {
    // handle column i/100
  }
}
```

In Cosyne, attach click handlers directly to primitives:
```typescript
// Tsyne — click handlers on invisible column rects
for (let col = 0; col < COLS; col++) {
  c.rect(col * CELL_SIZE, 0, CELL_SIZE, BOARD_HEIGHT, { fillColor: 'transparent' })
    .onClick(() => handleColumnClick(col));
}
```

The transparent rects serve as click targets. Cosyne's `EventRouter` does hit testing automatically via `enableEventHandling()`.

**Important:** The `const colNum = col` capture or direct `col` usage in the closure is critical — without it, all handlers share the loop variable's final value.

### Step 4: Choose a State-to-Pixel Strategy

This port was implemented three ways to illustrate the tradeoffs. **For new ports, use the fully declarative approach** (option 3) unless you have a reason not to.

#### Option 1: Imperative Rebuild (`connect4-imperative.ts`)
```typescript
function refreshUI() {
  currentWindow.setContent(renderContent);  // Rebuilds everything
}
```
- Simplest to write — just re-render the whole UI when state changes
- Worst performance — tears down and recreates all widgets and canvas primitives
- Appropriate for: prototyping, very simple apps, apps where rebuild cost is negligible

#### Option 2: Custom Binding Objects (`connect4-declarative.ts`)
```typescript
interface CellBinding {
  circle: CosyneCircle;
  getState: () => Player | null;
  isWinning: () => boolean;
}
// On state change:
for (const binding of this.cellBindings) {
  binding.circle.fill(getPlayerColor(binding.getState()));
}
```
- Manual binding arrays + update loop
- Developer manages the binding lifecycle
- Appropriate for: cases where you need fine-grained control over which primitives update

#### Option 3: Framework Bindings (`connect4-fully-declarative.ts`) — RECOMMENDED
```typescript
c.circle(x, y, PIECE_RADIUS)
  .bindFill(() => {
    const state = this.game.board[col][row];
    return state === null ? HOLE_COLOR : getPlayerColor(state);
  })
  .bindStroke(() => {
    return this.isWinning(col, row) ? WIN_HIGHLIGHT_COLOR : '#ffffff';
  });

// On state change:
this.game = newState;
refreshAllCosyneContexts();  // Framework re-evaluates all bindings
```
- Cleanest code — declare the relationship between state and appearance
- Framework handles re-evaluation
- Appropriate for: most ports, especially games and data visualizations

### Step 5: Wire Up the Tsyne App Shell

Every ported app follows this boilerplate:

```typescript
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

function createMyApp(a: App): void {
  a.window({ title: 'My App', width: W, height: H }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Tsyne widgets (labels, buttons) go here
        a.canvasStack(() => {
          const ctx = cosyne(a, (c) => {
            // Cosyne primitives go here
          });
          enableEventHandling(ctx, a, { width: W, height: H });
        });
      });
    });
    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'My App' }, createMyApp);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

export { createMyApp };
```

**Key structural rules:**
- Canvas primitives live inside `cosyne(a, (c) => { ... })` inside `a.canvasStack()`
- `enableEventHandling()` must be called after `cosyne()` to activate click/hover
- Tsyne widgets (labels, buttons) and Cosyne canvases can be mixed in the same layout
- Export the builder function so it works in desktop/phone launcher modes too

### Step 6: Handle What You Can't Port

Some web features don't have direct Cosyne equivalents:

| Web Feature | What We Did | Why |
|-------------|-------------|-----|
| Falling-piece animation | Dropped | Cosyne has animation support but it wasn't needed for core gameplay |
| Hover preview | Dropped | Could be added with `.onMouseMove()` but adds complexity without gameplay value |
| Two canvas layers | Single Cosyne context | Cosyne handles z-order internally |
| `destination-out` compositing | Not needed | Cosyne draws filled shapes directly — no need to punch holes |
| `location.reload()` reset | `createGameState()` + `refreshAllCosyneContexts()` | Clean state reset without page reload |
| Responsive `vw` sizing | Fixed pixel dimensions | Tsyne handles window sizing; Cosyne uses fixed coordinates |
| CSS hover effects on button | Tsyne button handles its own styling | Native widget theming |

## What Changed in Each File Category

### Deleted (not needed in Tsyne)
- `index.html` — Tsyne builds the window programmatically
- `css/estilos.css` — Tsyne widgets have native OS styling
- Canvas setup code (getContext, composite operations) — Cosyne handles this

### Extracted from master.js → game-logic.ts
- Board data structure and initialization
- Piece drop mechanics
- Win detection algorithm
- Draw detection
- Player switching
- Color/name mappings

### New in Tsyne (not in original)
- TypeScript types (`Player`, `Cell`, `GameState`, `WinResult`)
- Immutable state transitions (`makeMove()` clones board)
- 26 unit tests (`game-logic.test.ts`)
- Three implementation variants showing the declarative spectrum
- Export for launcher integration

## Common Pitfalls When Porting Canvas Apps

1. **Don't port animation frame-by-frame.** Canvas apps often use `requestAnimationFrame` or `setTimeout` loops. In Cosyne, use `.bindFill()` / `.bindPosition()` with `refreshAllCosyneContexts()` instead of manual frame management.

2. **Don't translate coordinate math for hit testing.** If the original calculates `mouseX / cellWidth` to determine which element was clicked, use Cosyne's `.onClick()` on the primitive instead.

3. **Don't replicate two-canvas layering.** Cosyne handles z-order by draw order within a single context. Later primitives are on top.

4. **Watch out for closure captures in loops.** `for (let col = 0; ...)` with `let` is safe. `for (var col = 0; ...)` would capture the final value — the original JS used `var` extensively.

5. **Keep game logic pure.** The biggest win of this port was extracting `game-logic.ts`. It made the three UI variants trivial to write and enabled 26 tests with zero UI dependency.

6. **Don't forget `enableEventHandling()`.** Cosyne click handlers are silent without it. Call it after `cosyne()` inside `canvasStack()`.

7. **Use `refreshAllCosyneContexts()` after state changes.** This is the equivalent of "re-render" — it re-evaluates all `.bindFill()`, `.bindStroke()`, `.bindPosition()` etc.

## File Inventory

```
ported-apps/connect4/
├── src/
│   ├── game-logic.ts                   # Pure game rules (249 lines)
│   ├── game-logic.test.ts              # 26 Jest tests
│   ├── connect4-imperative.ts          # Rebuild-on-change (223 lines)
│   ├── connect4-declarative.ts         # Custom bindings (263 lines)
│   └── connect4-fully-declarative.ts   # Framework bindings (223 lines)
├── package.json
├── jest.config.js
├── README.md
└── PORTING_SUMMARY.md                  # This file
```

## Checklist for Future Ports

- [ ] Read the original source and identify: state, rendering, events, animations
- [ ] Extract pure game/app logic into a standalone `.ts` module with types
- [ ] Write tests for the logic module (aim for 20+ tests covering happy path + edge cases)
- [ ] Map canvas drawing calls to Cosyne primitives (rect, circle, text, line, arc, polygon)
- [ ] Replace coordinate-based click detection with `.onClick()` on primitives
- [ ] Use `.bindFill()` / `.bindStroke()` / `.bindPosition()` for state-dependent appearance
- [ ] Call `refreshAllCosyneContexts()` after state mutations
- [ ] Wrap in Tsyne app shell: `app()` → `a.window()` → `a.vbox()` → `a.canvasStack()` → `cosyne()`
- [ ] Don't forget `enableEventHandling(ctx, a, { width, height })`
- [ ] Export the builder function for launcher integration
- [ ] Decide what to drop (animations, hover effects) vs. what to keep
- [ ] Add `standaloneShutdownStrategy` for clean exit
