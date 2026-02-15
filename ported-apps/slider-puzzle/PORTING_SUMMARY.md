# Porting ChrysaLisp Slider Puzzle to Tsyne/Cosyne — Step-by-Step Summary

This document records how a ChrysaLisp GUI app was ported to Tsyne with Cosyne canvas rendering. Use it as a template for porting other ChrysaLisp apps.

## Source App Profile

| Property | Value |
|----------|-------|
| **Original** | ChrysaLisp `apps/slider/app.lisp` by Chris Hinsley |
| **Repo** | https://github.com/vygr/ChrysaLisp |
| **License** | GPL-2.0 |
| **Language** | ChrysaLisp (custom Lisp dialect with native GUI) |
| **UI toolkit** | ChrysaLisp `ui-*` macros (ui-window, ui-grid, ui-button, etc.) |
| **Lines** | ~131 lines |
| **State** | Flat array `*board*` of 25 integers, global `*solved_board*` |
| **Events** | Enumerated event IDs dispatched through a mail-select loop |
| **Persistence** | Tree-serialized config file (`slider.tre`) |

## What the Original Does

1. Creates a 5x5 grid of buttons inside a `ui-grid`
2. Tiles labeled A-X (values 0-23), blank is value 24
3. Click a tile adjacent to the blank to swap them (manhattan distance = 1)
4. Scramble: 400 random valid moves from solved state (guarantees solvability)
5. Solve: reset board to `[0, 1, 2, ..., 24]`
6. Displays "SOLVED!" when board matches solved state
7. Saves/loads board to a config file on disk

## ChrysaLisp → TypeScript Mapping

### Language Constructs

| ChrysaLisp | TypeScript | Notes |
|------------|-----------|-------|
| `(defq *board* (range 0 25))` | `board: number[] = [...Array(25).keys()]` | Flat array, same structure |
| `(defun func (args) body)` | `func = (args): ReturnType => { body }` | Arrow methods on class |
| `(enums +event 0 (enum close) ...)` | Not needed | Cosyne handles events per-primitive |
| `(elem-get *board* i)` | `this.board[i]` | Direct array access |
| `(elem-set *board* i val)` | `[this.board[i1], this.board[i2]] = [this.board[i2], this.board[i1]]` | Destructuring swap |
| `(find val list)` | `this.board.indexOf(val)` | Built-in |
| `(every eql *board* *solved_board*)` | `this.board.every((v, i) => v === i)` | Predicate version |
| `(% index *grid_w*)` / `(/ index *grid_w*)` | `i % GRID_W` / `Math.floor(i / GRID_W)` | Integer division needs `Math.floor` |
| `(abs (- a b))` | `Math.abs(a - b)` | Direct |
| `(random (length list))` | `Math.floor(Math.random() * list.length)` | Random index |
| `(char (+ 65 v))` | `String.fromCharCode(65 + v)` | ASCII character |

### UI Constructs

| ChrysaLisp | Tsyne/Cosyne | Notes |
|------------|-------------|-------|
| `(ui-window ...)` | `a.window({ title, width, height }, ...)` | Same concept |
| `(ui-title-bar *title* "Slider Puzzle" ...)` | Part of `a.window()` options | Title is a window property |
| `(ui-tool-bar ...)` with `(ui-buttons ...)` | `a.hbox(() => { a.button(...) })` | Toolbar is just an hbox with buttons |
| `(ui-grid *grid* (:grid_width 5 ...))` | `a.canvasStack()` + Cosyne rects | Canvas is more flexible than widget grid |
| `(ui-button _ (:min_width 80 ...))` | `c.rect(x, y, 64, 64, { ... }).onClick(...)` | Cosyne rect replaces button widget |
| `(ui-label *status* ...)` | `a.label(' ').withId('statusLabel')` | Same concept, with test ID |
| `(def btn :text ...)` | `.bindText(() => ...)` | Reactive binding vs imperative set |
| `(def btn :color ...)` | `.bindFill(() => ...)` | Reactive binding vs imperative set |
| `(.-> btn (:constrain :t) :dirty)` | `refreshAllCosyneContexts()` | Framework handles repaint |
| `(ui-tool-tips ...)` | Not ported | Tooltips dropped (low value) |
| `(gui-add-front-rpc ...)` | Not needed | Tsyne handles window lifecycle |

### Event Handling

| ChrysaLisp | Tsyne/Cosyne | Notes |
|------------|-------------|-------|
| `(enums +event 0 (enum close) (enum scramble solve) (enum click))` | Not needed | No event ID enum |
| `(mail-select select)` → `(dispatch-action id)` | Per-primitive `.onClick()` handlers | No central dispatch loop |
| `(>= id +event_click)` → `(- id +event_click)` | Closure captures tile index directly | `(i) => { puzzle.tryMove(i); }` |
| `(= id +event_scramble)` | `a.button('Scramble', { onClick: () => puzzle.scramble() })` | Direct callback |

### Persistence

| ChrysaLisp | Tsyne | Notes |
|------------|-------|-------|
| `(file-stream *config_file*)` + `(tree-load/save)` | Not ported | Could use `app.setPreference()` / `app.getPreference()` |

## Porting Steps

### Step 1: Extract Game Logic as a Class

The ChrysaLisp original uses global state (`*board*`, `*solved_board*`, etc.) and top-level functions. Port these into a single `SliderPuzzle` class with private state and public methods.

```
ChrysaLisp globals        →  SliderPuzzle class fields
(defun try-move ...)       →  tryMove() method
(defun scramble ...)       →  scramble() method
(defun update-view ...)    →  onUpdate callback (UI layer subscribes)
```

Key decisions:
- **Mutable internal state** (unlike Connect4 which uses immutable state) — the slider puzzle is simple enough that in-place mutation with a notification callback is cleaner
- **`setOnUpdate(cb)`** decouples logic from UI — the class doesn't know about Cosyne
- **`tryMove()` returns boolean** — caller knows if move was valid

### Step 2: Build the Cosyne Canvas Grid

Replace ChrysaLisp's `ui-grid` of `ui-button` widgets with Cosyne `rect` + `text` primitives:

```typescript
for (let row = 0; row < GRID_H; row++) {
  for (let col = 0; col < GRID_W; col++) {
    const i = row * GRID_W + col;
    const x = CANVAS_PAD + col * (TILE_SIZE + TILE_GAP);
    const y = CANVAS_PAD + row * (TILE_SIZE + TILE_GAP);

    // Tile background — bindFill makes it reactive
    c.rect(x, y, TILE_SIZE, TILE_SIZE, {
      fillColor: TILE_COLOR,
      cornerRadius: TILE_RADIUS,
    })
      .bindFill(() => puzzle.getValue(i) === BLANK ? BLANK_COLOR : TILE_COLOR)
      .onClick(() => { puzzle.tryMove(i); });

    // Tile letter — bindText makes it reactive
    c.text(x + TILE_SIZE / 2 - 8, y + TILE_SIZE / 2 - 10, '', {
      fontSize: 22,
      fillColor: TEXT_COLOR,
    })
      .bindText(() => puzzle.getLabel(puzzle.getValue(i)))
      .passthrough();  // clicks pass through text to the rect behind
  }
}
```

**Why Cosyne over widgets:**
- Tiles are purely visual — no need for Fyne button semantics
- Canvas renders faster than 25 individual widget round-trips
- Rounded rects with custom colors look better than themed buttons
- `.passthrough()` on text lets clicks reach the rect underneath

### Step 3: Wire State Changes to Cosyne Refresh

The `onUpdate` callback triggers two things:
1. `refreshAllCosyneContexts()` — re-evaluates all `bindFill`/`bindText` closures
2. Status label update — "SOLVED!" or blank

```typescript
puzzle.setOnUpdate(() => {
  refreshAllCosyneContexts();  // All tile colors and labels update
  statusLabel.setText(puzzle.isSolved() ? 'SOLVED!' : ' ');
});
```

This replaces the ChrysaLisp pattern of iterating all children and calling `:constrain` + `:dirty` on each.

### Step 4: Wrap in Tsyne App Shell

```typescript
a.vbox(() => {
  a.hbox(() => {
    a.button('Scramble', { onClick: () => puzzle.scramble() });
    a.button('Solve', { onClick: () => puzzle.solve() });
  });
  a.separator();
  a.canvasStack(() => {
    const ctx = cosyne(a, (c) => { buildGrid(c); });
    enableEventHandling(ctx, a, { width: CANVAS_W, height: CANVAS_H });
  });
  a.separator();
  a.label(' ').withId('statusLabel');
});
```

### Step 5: Write Tests

Two test files:

**Logic tests** (`slider-puzzle.logic.test.ts`, 30 tests):
- Test `SliderPuzzle` class in isolation — no UI, no Cosyne
- Covers: init, getLabel, tryMove (valid/invalid/diagonal), scramble, solve, isSolved, edge cases

**Integration tests** (`slider-puzzle.test.ts`, 11 tests):
- Uses `CosyneTest` (extends `TsyneTest`) for app lifecycle
- Tests widget interactions: scramble/solve buttons → status label
- Tests game interactions via `ui.getPuzzle()`: move sequences, undo, scramble/solve round-trips
- Verifies status label reflects game state after each interaction

**Note:** Cosyne primitives can't be clicked via `ctx.getById()` — they're canvas primitives, not Tsyne widgets. Tile interactions are tested through the exposed `getPuzzle()` method, which is actually better coverage since it tests the game logic + UI update pipeline together.

## What Was Dropped

| ChrysaLisp Feature | Why Dropped |
|---------------------|-------------|
| Config file persistence (`slider.tre`) | Low value for a puzzle game. Could add via `app.setPreference()` if needed |
| Tooltips on toolbar buttons | Low value, would add complexity |
| Font specification (`OpenSans-Bold.ctf` at 58pt) | Tsyne/Cosyne handles fonts via the theme |
| Mail-select event loop | Replaced by per-primitive callbacks |

## What Was Added

| Feature | Why |
|---------|-----|
| Rounded corner tiles with gap spacing | Looks better than flat grid |
| Dark canvas background | Visual contrast |
| `.withId()` on buttons and label | Enables testing |
| `getPuzzle()` accessor | Enables integration testing |
| `CosyneTest` integration tests | Verifies UI pipeline end-to-end |
| `standaloneShutdownStrategy` | Clean process exit |
| Window menu (Game → Scramble/Solve/Exit) | Desktop convention |

## File Inventory

```
ported-apps/slider-puzzle/
├── slider-puzzle.ts              # Game logic + Cosyne UI (265 lines)
├── slider-puzzle.logic.test.ts   # 30 pure logic tests
├── slider-puzzle.test.ts         # 11 CosyneTest integration tests
├── package.json                  # Dependencies: tsyne, cosyne
├── jest.config.js
├── README.md
├── LICENSE                       # GPL-2.0
└── PORTING_SUMMARY.md           # This file
```

## Checklist for Porting Other ChrysaLisp Apps

- [ ] Read the `.lisp` source — identify state variables (`defq`), UI macros (`ui-*`), event dispatch (`dispatch-action`)
- [ ] Map `defq` globals to class fields, `defun` functions to methods
- [ ] Extract game/app logic into a class with `setOnUpdate()` callback
- [ ] Write logic tests first (aim for 20+ covering happy path + edges)
- [ ] Map `ui-grid`/`ui-button` to Cosyne `rect` + `text` with `bindFill`/`bindText`
- [ ] Map `ui-label` to Tsyne `a.label()` with `.withId()` for testing
- [ ] Map toolbar buttons to `a.button()` with `onClick` callbacks
- [ ] Replace event enum dispatch with per-primitive `.onClick()` handlers
- [ ] Use `.passthrough()` on text overlays so clicks reach the shape behind
- [ ] Call `refreshAllCosyneContexts()` in the `onUpdate` callback
- [ ] Don't forget `enableEventHandling(ctx, a, { width, height })`
- [ ] Decide what to drop (tooltips, persistence, animations) vs keep
- [ ] Add `CosyneTest` integration tests with `getPuzzle()` pattern
- [ ] Credit original author and preserve license (GPL-2.0)

## Credits

Portions copyright Chris Hinsley.
Portions copyright Paul Hammant, 2026.
License: GPL-2.0
