# Peg Solitaire

English Cross peg solitaire ported to Tsyne. Jump pegs over each other to remove them.

```
        ┌───┬───┬───┐
        │ O │ O │ O │
        ├───┼───┼───┤
        │ O │ O │ O │
┌───┬───┼───┼───┼───┼───┬───┐
│ O │ O │ O │ O │ O │ O │ O │
├───┼───┼───┼───┼───┼───┼───┤
│ O │ O │ O │   │ O │ O │ O │
├───┼───┼───┼───┼───┼───┼───┤
│ O │ O │ O │ O │ O │ O │ O │
└───┴───┼───┼───┼───┼───┴───┘
        │ O │ O │ O │
        ├───┼───┼───┤
        │ O │ O │ O │
        └───┴───┴───┘
```

## How to Play

1. Click a peg to select it (turns yellow)
2. Click an empty space 2 positions away to jump
3. The jumped peg is removed
4. Goal: Leave only one peg, ideally in the center

## Scoring

- Start with 32 pegs
- **Perfect game**: End with 1 peg in center
- **Win**: End with 1 peg anywhere

## Run

```bash
npx tsx ported-apps/peg-solitaire/peg-solitaire.ts
```

## Tests

```bash
cd ported-apps/peg-solitaire
npx jest --forceExit
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Clean `vbox > hbox(buttons) + separator + grid(7x7 board) + separator + label(status)` nesting. Cross-shaped board with invalid positions filtered |
| **Core declarative** | Fluent method chaining | 5/10 | `.withId()` on resetBtn, undoBtn, cell-*, statusLabel. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 8/10 | Nested loop generating 49 cells, filtering invalid positions for cross shape. Cell appearance driven by game state |
| **State architecture** | Observable store | 5/10 | Game callbacks (`onUpdate`/`onWin`) rather than full Observable store. Board state managed in game class |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No `.when()`, `.bindTo()`, or `.bindText()`. 1 `setText()` call. Cell color updates via direct widget mutation |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 6/10 | IDs on buttons, per-cell elements, status label |
| **Design** | Separation of concerns | 7/10 | Game logic (board state, move validation, undo) separated from UI. Builder is presentational |
| | **Overall** | **5/10** | Good programmatic grid generation with cross-shape filtering. Clean layout. But no Observable store or reactive bindings |

## Credits

Ported from [ChrysaLisp](https://github.com/vygr/ChrysaLisp) solitaire app by **Chris Hinsley**.
Portions copyright Chris Hinsley 2026
Portions copyright Paul Hammant 2026

Original source: https://github.com/vygr/ChrysaLisp/blob/master/apps/solitaire/app.lisp

## License

GPL-2.0 - See [LICENSE](LICENSE)

This port preserves the original GPL-2.0 license from the ChrysaLisp project.
