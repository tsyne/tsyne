# Porting ChrysaLisp Find Pairs to Tsyne/Cosyne — Step-by-Step Guide

This document records how the ChrysaLisp memory matching game was ported to Tsyne with Cosyne canvas rendering. Use it alongside the [Slider Puzzle PORTING_SUMMARY](../slider-puzzle/PORTING_SUMMARY.md) as a template for porting other ChrysaLisp apps.

## Source App Profile

| Property | Value |
|----------|-------|
| **Original** | ChrysaLisp `apps/pairs/app.lisp` by Chris Hinsley |
| **Repo** | https://github.com/vygr/ChrysaLisp |
| **License** | GPL-2.0 |
| **Language** | ChrysaLisp (custom Lisp dialect with native GUI) |
| **UI toolkit** | ChrysaLisp `ui-*` macros (ui-window, ui-grid, ui-button, etc.) |
| **State** | Flat arrays: `*board*` (character codes), `*state*` (hidden/revealed/matched) |
| **Events** | Enumerated event IDs dispatched through a mail-select loop |

## What the Original Does

1. Creates a 10x5 grid of buttons inside a `ui-grid`
2. Each pair of tiles shares a character from a shuffled pool (25 unique characters, 50 tiles)
3. Click a tile to reveal its character; click a second tile to check for match
4. Matching pair: both tiles stay revealed, score +10
5. Mismatching pair: both tiles hide after ~1 second delay, score -1
6. Board locked during mismatch reveal delay (no clicks accepted)
7. Scramble: shuffle the board and reset score
8. Peek: reveal all tiles at once (cheat/solve)
9. Displays "WINNER!" when all 25 pairs are found

## ChrysaLisp → TypeScript Mapping

### Language Constructs

| ChrysaLisp | TypeScript | Notes |
|------------|-----------|-------|
| `(defq *board* ...)` | `private values: string[] = []` | Class field |
| `(defq *state* (list ...))` | `private states: TileState[] = []` | Typed array |
| `(defun shuffle ...)` | `private shuffle = <T>(arr: T[]): T[]` | Generic Fisher-Yates |
| `(elem-get *board* i)` | `this.values[i]` | Direct access |
| `(elem-set *state* i val)` | `this.states[i] = 'revealed'` | String enum states |
| `(every eql *state* ...)` | `this.states.every(s => s === 'matched')` | Predicate |
| `(random (length pool))` | `Math.floor(Math.random() * pool.length)` | Random index |
| `(char ...)` | Character strings directly | Values stored as strings, not char codes |
| `(timeout delay func)` | `setTimeout(() => { ... }, REVEAL_DELAY)` | Async delay for mismatch |

### UI Constructs

| ChrysaLisp | Tsyne/Cosyne | Notes |
|------------|-------------|-------|
| `(ui-window ...)` | `a.window({ title, width, height }, ...)` | Same concept |
| `(ui-title-bar ...)` | Part of `a.window()` options | Title is a window property |
| `(ui-tool-bar ...)` with `(ui-buttons ...)` | `a.hbox(() => { a.button(...) })` | Toolbar is just an hbox with buttons |
| `(ui-grid *grid* (:grid_width 10 ...))` | `a.canvasStack()` + Cosyne rects | Canvas replaces widget grid |
| `(ui-button _ (:min_width ...))` | `c.rect(x, y, TILE_SIZE, TILE_SIZE, { ... }).onClick(...)` | Cosyne rect replaces button widget |
| `(ui-label *status* ...)` | `a.label('Score: 0').withId('statusLabel')` | Same concept, with test ID |
| `(def btn :text ...)` | `.bindText(() => ...)` | Reactive binding vs imperative set |
| `(def btn :color ...)` | `.bindFill(() => ...)` | Reactive binding vs imperative set |
| `(.-> btn (:constrain :t) :dirty)` | `refreshAllCosyneContexts()` | Framework handles repaint |

### Event Handling

| ChrysaLisp | Tsyne/Cosyne | Notes |
|------------|-------------|-------|
| `(enums +event 0 (enum close) (enum scramble peek) (enum click))` | Not needed | No event ID enum |
| `(mail-select select)` → `(dispatch-action id)` | Per-primitive `.onClick()` handlers | No central dispatch loop |
| `(>= id +event_click)` → `(- id +event_click)` | Closure captures tile index directly | `() => { game.tryClick(i); }` |
| `(= id +event_scramble)` | `a.button('New Game', { onClick: () => game.scramble() })` | Direct callback |
| Timer-based mismatch hide | `setTimeout()` + `flushMismatchTimer()` for testing | Same concept, testable |

## Key Porting Decisions

### 1. Timer Management for Testability

The original ChrysaLisp app uses a simple timeout for mismatch reveal. The port adds explicit timer management:

```typescript
// Production: setTimeout hides tiles after REVEAL_DELAY
this.mismatchTimer = setTimeout(() => {
  this.mismatchTimer = null;
  this.hideMismatched();
}, REVEAL_DELAY);

// Testing: flushMismatchTimer() resolves immediately
flushMismatchTimer = (): void => {
  if (this.mismatchTimer !== null) {
    this.clearTimer();
    this.hideMismatched();
  }
};
```

This avoids `jest.useFakeTimers()` which can interfere with other async operations in integration tests.

### 2. Three Tile States as String Union

The original uses numeric flags. The port uses a TypeScript string union for clarity:

```typescript
type TileState = 'hidden' | 'revealed' | 'matched';
```

This makes test assertions readable: `expect(game.getState(i)).toBe('matched')` vs `expect(game.getState(i)).toBe(2)`.

### 3. Three Reactive Bindings Per Tile

Each tile needs three dynamic properties. Each gets its own Cosyne binding:

```typescript
// Background color: gray → white → green
c.rect(...).bindFill(() => this.tileFill(i))

// Text content: "?" → character → character
c.text(...).bindText(() => this.tileText(i))

// Text color: gray → black → white
c.text(...).bindFill(() => this.tileTextColor(i))
```

50 tiles × 3 bindings = 150 framework-managed reactive bindings, all evaluated on each `refreshAllCosyneContexts()` call.

### 4. Click Passthrough on Text Overlays

Text labels sit on top of tile rects. Without `.passthrough()`, clicks would be captured by the text and never reach the rect's `.onClick()`:

```typescript
c.text(x, y, '?', { fontSize: 20, fillColor: HIDDEN_TEXT_COLOR })
  .bindText(() => this.tileText(i))
  .bindFill(() => this.tileTextColor(i))
  .passthrough();  // Clicks pass through to the rect behind
```

## Porting Steps

### Step 1: Extract Game Logic as a Class

Map ChrysaLisp globals and functions to a `FindPairsGame` class:

```
ChrysaLisp globals        →  FindPairsGame class fields
*board* (values)           →  private values: string[]
*state* (tile states)      →  private states: TileState[]
*score*                    →  private score: number
*first_pick*               →  private firstPick: number | null
*locked*                   →  private locked: boolean
(defun try-click ...)      →  tryClick() method
(defun scramble ...)       →  scramble() method
(defun peek ...)           →  peek() method
(defun update-view ...)    →  onUpdate callback (UI layer subscribes)
```

Key decisions:
- **`setOnUpdate(cb)`** decouples logic from UI — the class doesn't know about Cosyne
- **`setOnWin(cb)`** separate callback for win dialog
- **`flushMismatchTimer()`** enables synchronous testing of async behavior
- **`cleanup()`** clears pending timers to prevent test leaks

### Step 2: Build the Cosyne Canvas Grid

Replace ChrysaLisp's `ui-grid` of `ui-button` widgets with Cosyne `rect` + `text` primitives:

```typescript
for (let row = 0; row < GRID_H; row++) {
  for (let col = 0; col < GRID_W; col++) {
    const i = row * GRID_W + col;
    const x = CANVAS_PAD + col * (TILE_SIZE + TILE_GAP);
    const y = CANVAS_PAD + row * (TILE_SIZE + TILE_GAP);

    c.rect(x, y, TILE_SIZE, TILE_SIZE, {
      fillColor: HIDDEN_COLOR, cornerRadius: TILE_RADIUS,
    })
      .withId(`tile-${i}`)
      .bindFill(() => this.tileFill(i))
      .onClick(() => { this.game.tryClick(i); });

    c.text(x + TILE_SIZE / 2 - 7, y + TILE_SIZE / 2 - 9, '?', {
      fontSize: 20, fillColor: HIDDEN_TEXT_COLOR,
    })
      .bindText(() => this.tileText(i))
      .bindFill(() => this.tileTextColor(i))
      .passthrough();
  }
}
```

### Step 3: Wire State Changes to Cosyne Refresh

The `onUpdate` callback triggers two things:
1. `refreshAllCosyneContexts()` — re-evaluates all 150 bindings
2. Status label update — "Score: N" or "WINNER! Score: N"

```typescript
this.game.setOnUpdate(() => {
  refreshAllCosyneContexts();  // All tile colors, text, and text colors update
  this.updateStatus();          // Status label (the one imperative escape)
});
```

### Step 4: Wrap in Tsyne App Shell

```typescript
a.vbox(() => {
  a.hbox(() => {
    a.button('New Game', { onClick: () => game.scramble() }).withId('newGameBtn');
    a.button('Peek', { onClick: () => game.peek() }).withId('peekBtn');
  });
  a.separator();
  a.canvasStack(() => {
    const ctx = cosyne(a, (c) => { buildGrid(c); });
    enableEventHandling(ctx, a, { width: CANVAS_W, height: CANVAS_H });
  });
  a.separator();
  a.label('Score: 0').withId('statusLabel');
});
```

### Step 5: Write Tests

Two test files:

**Logic tests** (`find-pairs.logic.test.ts`, 29 tests):
- Test `FindPairsGame` class in isolation — no UI, no Cosyne
- Covers: init, tryClick (first pick, match, mismatch), scramble, peek, win condition, score tracking, edge cases
- Uses `flushMismatchTimer()` instead of `jest.useFakeTimers()`

**Integration tests** (`find-pairs.test.ts`, 10 tests):
- Uses `CosyneTest` (extends `TsyneTest`) for app lifecycle
- Tests widget interactions: New Game/Peek buttons → status label
- Tests game interactions via `ui.getPuzzle()`: matching, mismatching, scoring, winning
- Verifies status label reflects game state after each interaction

**Note:** Cosyne primitives can't be clicked via `ctx.getById()` — they're canvas-internal, not Tsyne widgets. Tile interactions are tested through the exposed `getPuzzle()` method.

## What Was Dropped

| ChrysaLisp Feature | Why Dropped |
|---------------------|-------------|
| Config file persistence | Low value for a memory game |
| Tooltips on toolbar buttons | Low value, would add complexity |
| Font specification | Tsyne/Cosyne handles fonts via the theme |
| Mail-select event loop | Replaced by per-primitive callbacks |

## What Was Added

| Feature | Why |
|---------|-----|
| Rounded corner tiles with gap spacing | Looks better than flat grid |
| Dark canvas background (`#1a1a2e`) | Visual contrast |
| Three-color tile states (gray/white/green) | Clearer visual feedback |
| `.withId()` on buttons and label | Enables testing |
| `getPuzzle()` accessor | Enables integration testing |
| `flushMismatchTimer()` | Synchronous testing of async behavior |
| `cleanup()` on game and UI | Prevents timer leaks in tests |
| `CosyneTest` integration tests | Verifies UI pipeline end-to-end |
| `a.registerCleanup()` | Clean resource release |
| Window menu (Game → New Game/Peek/Exit) | Desktop convention |

## Differences from Slider Puzzle Port

| Aspect | Slider Puzzle | Find Pairs |
|--------|--------------|------------|
| Grid size | 5x5 (25 tiles) | 10x5 (50 tiles) |
| Bindings per tile | 2 (fill + text) | 3 (fill + text + text color) |
| Total bindings | 50 | 150 |
| Async behavior | None | Mismatch timer (1s delay) |
| Test timer strategy | N/A | `flushMismatchTimer()` |
| Game callbacks | `setOnUpdate()` | `setOnUpdate()` + `setOnWin()` |
| Win detection | `isSolved()` (position check) | `isWon()` (all states === matched) |
| Lock state | None | `locked` during mismatch reveal |

## File Inventory

```
ported-apps/find-pairs/
├── find-pairs.ts              # Game logic + Cosyne UI (339 lines)
├── find-pairs.logic.test.ts   # 29 pure logic tests
├── find-pairs.test.ts         # 10 CosyneTest integration tests
├── package.json               # Dependencies: tsyne, cosyne
├── jest.config.js
├── README.md                  # With pseudo-declarative scorecard
├── LICENSE                    # GPL-2.0
└── PORTING_GUIDE.md           # This file
```

## Checklist for Porting Other ChrysaLisp Apps

- [ ] Read the `.lisp` source — identify state variables (`defq`), UI macros (`ui-*`), event dispatch (`dispatch-action`)
- [ ] Map `defq` globals to class fields, `defun` functions to methods
- [ ] Extract game/app logic into a class with `setOnUpdate()` callback
- [ ] If the app has async behavior (timers, delays), add a `flush*()` method for testing
- [ ] Add `cleanup()` method to clear timers and resources
- [ ] Write logic tests first (aim for 20+ covering happy path + edges)
- [ ] Map `ui-grid`/`ui-button` to Cosyne `rect` + `text` with `bindFill`/`bindText`
- [ ] Map `ui-label` to Tsyne `a.label()` with `.withId()` for testing
- [ ] Map toolbar buttons to `a.button()` with `onClick` callbacks
- [ ] Replace event enum dispatch with per-primitive `.onClick()` handlers
- [ ] Use `.passthrough()` on text overlays so clicks reach the shape behind
- [ ] Call `refreshAllCosyneContexts()` in the `onUpdate` callback
- [ ] Don't forget `enableEventHandling(ctx, a, { width, height })`
- [ ] Add `getPuzzle()` accessor on the UI class for integration testing
- [ ] Add `CosyneTest` integration tests (10+ covering widgets + game interactions)
- [ ] Use `a.registerCleanup()` for resource management
- [ ] Credit original author and preserve license (GPL-2.0)

## Credits

Portions copyright Chris Hinsley.
Portions copyright Paul Hammant, 2026.
License: GPL-2.0
