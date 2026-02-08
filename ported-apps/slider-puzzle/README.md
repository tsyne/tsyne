# Slider Puzzle

A 5×5 sliding tile puzzle ported to Tsyne.

```
┌───┬───┬───┬───┬───┐
│ A │ B │ C │ D │ E │
├───┼───┼───┼───┼───┤
│ F │ G │ H │ I │ J │
├───┼───┼───┼───┼───┤
│ K │ L │ M │ N │ O │
├───┼───┼───┼───┼───┤
│ P │ Q │ R │ S │ T │
├───┼───┼───┼───┼───┤
│ U │ V │ W │ X │   │
└───┴───┴───┴───┴───┘
```

## How to Play

1. Click **Scramble** to shuffle the tiles
2. Click any tile adjacent to the blank space to swap them
3. Arrange tiles A-X in order to solve the puzzle
4. Status shows "SOLVED!" when complete

## Run

```bash
npx tsx ported-apps/slider-puzzle/slider-puzzle.ts
```

## Tests

```bash
cd ported-apps/slider-puzzle
npx jest --forceExit
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 8/10 | Clean `vbox > hbox + separator + canvasStack + separator + label` nesting. `buildContent()` reads as a layout spec |
| **Core declarative** | Fluent method chaining | 9/10 | `.bindFill()`, `.bindText()`, `.onClick()`, `.passthrough()`, `.withId()` on all Cosyne primitives. Buttons use `{ onClick }` options |
| **Core declarative** | Programmatic generation | 9/10 | Nested `for (row) for (col)` generates 25 tile rects + 25 text labels from grid constants. Tile index, position, and handlers all derived from loop variables |
| **State architecture** | Callback notification | 7/10 | `setOnUpdate()` single-subscriber callback, not full Observable store. Appropriate for this game's complexity — one UI subscribes to one model |
| **Declarative updates** | Reactive bindings | 8/10 | `.bindFill()` on all 25 tiles and `.bindText()` on all 25 labels — 50 framework-managed bindings. One `setText()` escape for the status label (could be `.bindText()`) |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — all updates in place via Cosyne bindings |
| **Testing** | `.withId()` coverage | 7/10 | `scrambleBtn`, `solveBtn`, `statusLabel` on Tsyne widgets; `tile-0`..`tile-24` on Cosyne primitives. `getPuzzle()` accessor enables interaction testing |
| **Design** | Separation of concerns | 9/10 | `SliderPuzzle` is pure game logic (no UI imports). `SliderPuzzleUI` is purely presentational. 30 logic tests run without any UI |
| | **Overall** | **8/10** | Near the declarative ceiling for this type of game. All 50 canvas primitives use framework-level bindings. State changes flow through `refreshAllCosyneContexts()`, not imperative updates. The one `setText()` on the status label is the only escape — a minor blemish on an otherwise fully declarative implementation |

### What would make it 9/10?

Replace the imperative `statusLabel.setText()` with a declarative binding:

```typescript
// Current (imperative escape)
this.statusLabel = this.a.label(' ').withId('statusLabel');
// ...later...
await this.statusLabel.setText(this.puzzle.isSolved() ? 'SOLVED!' : ' ');

// Ideal (fully declarative)
this.a.label('').withId('statusLabel')
  .bindText(() => this.puzzle.isSolved() ? 'SOLVED!' : ' ');
```

This would eliminate the `updateStatus()` method entirely and make the status label reactive like the canvas tiles.

## Credits

Ported from [ChrysaLisp](https://github.com/vygr/ChrysaLisp) slider app by **Chris Hinsley**.
Portions copyright Chris Hinsley 2026
Portions copyright Paul Hammant 2026

Original source: https://github.com/vygr/ChrysaLisp/blob/master/apps/slider/app.lisp

## License

GPL-2.0 - See [LICENSE](LICENSE)

This port preserves the original GPL-2.0 license from the ChrysaLisp project.
