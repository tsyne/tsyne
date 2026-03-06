# Zip Puzzle

A path-drawing puzzle game. Connect numbered dots in order while filling every cell.

```
┌───┬───┬───┬───┬───┐
│ 1 │   │   │   │ 2 │
├───┼───┼───┼───┼───┤
│   │   │   │   │   │
├───┼───┼───┼───┼───┤
│   │   │   │   │   │
├───┼───┼───┼───┼───┤
│   │   │   │   │   │
├───┼───┼───┼───┼───┤
│   │   │   │   │ 3 │
└───┴───┴───┴───┴───┘
```

## How to Play

1. Path starts at waypoint **1**
2. Click adjacent cells to extend the path
3. Visit waypoints in numerical order (1→2→3→...)
4. Fill every cell to complete the puzzle
5. Click a previous cell to undo back to that point

## Features

- 5 puzzle levels of increasing difficulty
- Undo by clicking previous path cells
- Level navigation with ◀ ▶ buttons

## Run

```bash
npx tsx ported-apps/zip-puzzle/zip-puzzle.ts
```

## Tests

```bash
cd ported-apps/zip-puzzle
npx jest --forceExit
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | `vbox > hbox(nav buttons) + separator + grid(NxN) + separator + label(status)` nesting |
| **Core declarative** | Fluent method chaining | 6/10 | `.withId()` on resetBtn, prevBtn, levelLabel, nextBtn, cell-*. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 8/10 | Loop generating NxN grid cells with path-driven styling |
| **State architecture** | Observable store | 5/10 | Game callbacks rather than full Observable store |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. `setText()` for status |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 6/10 | IDs on nav buttons, per-cell elements |
| **Design** | Separation of concerns | 7/10 | Game logic separated from UI builder |
| | **Overall** | **5/10** | Same grid puzzle pattern — strong programmatic generation, clean layout, but no Observable store or reactive bindings |

## Credits

Portions copyright Paul Hammant 2026

## License

MIT License
