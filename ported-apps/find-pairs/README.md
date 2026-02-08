# Find Pairs

A memory matching game ported to Tsyne. Find all 25 matching pairs on a 10x5 grid.

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ ? │ ? │ ? │ ? │ ? │ ? │ ? │ ? │ ? │ ? │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ ? │ ? │ ? │ A │ ? │ ? │ ? │ ? │ ? │ ? │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ ? │ ? │ ? │ ? │ ? │ A │ ? │ ? │ ? │ ? │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ ? │ ? │ ? │ ? │ ? │ ? │ ? │ ? │ ? │ ? │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ ? │ ? │ ? │ ? │ ? │ ? │ ? │ ? │ ? │ ? │
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

## How to Play

1. Click **New Game** to shuffle the tiles
2. Click any tile to reveal its character
3. Click a second tile to try to match
4. Matching pairs stay revealed (+10 points)
5. Mismatched pairs hide after 1 second (-1 point)
6. Find all 25 pairs to win!

## Run

```bash
npx tsx ported-apps/find-pairs/find-pairs.ts
```

## Tests

```bash
cd ported-apps/find-pairs
npx jest --forceExit
```

39 tests: 29 logic + 10 integration (CosyneTest).

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 8/10 | Clean `vbox > hbox + separator + canvasStack + separator + label` nesting. `buildContent()` reads as a layout spec |
| **Core declarative** | Fluent method chaining | 9/10 | `.bindFill()`, `.bindText()`, `.onClick()`, `.passthrough()`, `.withId()` on all Cosyne primitives. Buttons use `{ onClick }` options |
| **Core declarative** | Programmatic generation | 9/10 | Nested `for (row) for (col)` generates 50 tile rects + 50 text labels from grid constants. Index, position, colors, and handlers all derived from loop variables |
| **State architecture** | Callback notification | 7/10 | `setOnUpdate()` + `setOnWin()` single-subscriber callbacks. Appropriate for this game's complexity — one UI subscribes to one model |
| **Declarative updates** | Reactive bindings | 8/10 | `.bindFill()` on 50 tiles + `.bindText()` on 50 labels + `.bindFill()` on 50 text colors = 150 framework-managed bindings. One `setText()` escape for the status label |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — all updates in place via Cosyne bindings |
| **Testing** | `.withId()` coverage | 7/10 | `newGameBtn`, `peekBtn`, `statusLabel` on Tsyne widgets; `tile-0`..`tile-49` on Cosyne primitives. `getPuzzle()` accessor enables interaction testing |
| **Design** | Separation of concerns | 9/10 | `FindPairsGame` is pure game logic (no UI imports). `FindPairsUI` is purely presentational. 29 logic tests run without any UI |
| | **Overall** | **8/10** | Near the declarative ceiling for this type of game. All 150 canvas bindings use framework-level closures. State changes flow through `refreshAllCosyneContexts()`, not imperative updates. The one `setText()` on the status label is the only escape |

### What would make it 9/10?

Replace the imperative `statusLabel.setText()` with a declarative binding:

```typescript
// Current (imperative escape)
this.statusLabel = this.a.label('Score: 0').withId('statusLabel');
// ...later...
await this.statusLabel.setText(`Score: ${this.game.getScore()}`);

// Ideal (fully declarative)
this.a.label('').withId('statusLabel')
  .bindText(() => this.game.isWon()
    ? `WINNER! Score: ${this.game.getScore()}`
    : `Score: ${this.game.getScore()}`);
```

This would eliminate the `updateStatus()` method entirely and make the status label reactive like the canvas tiles.

## Credits

Ported from [ChrysaLisp](https://github.com/vygr/ChrysaLisp) pairs app by **Chris Hinsley**.
Portions copyright Chris Hinsley 2026
Portions copyright Paul Hammant 2026

Original source: https://github.com/vygr/ChrysaLisp/blob/master/apps/pairs/app.lisp

## License

GPL-2.0 - See [LICENSE](LICENSE)

This port preserves the original GPL-2.0 license from the ChrysaLisp project.
