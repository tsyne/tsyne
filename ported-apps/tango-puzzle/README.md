# Tango Puzzle

A binary puzzle game with suns ☀ and moons ☽. Fill the grid following simple rules.

```
┌─────┬─────┬─────┬─────┐
│  ☀  │     │  ☽  │     │
├─────┼─────┼─────┼─────┤
│     │  ☽  │     │  ☀  │
├─────┼─────┼─────┼─────┤
│  ☽  │     │  ☀  │     │
├─────┼─────┼─────┼─────┤
│     │  ☀  │     │  ☽  │
└─────┴─────┴─────┴─────┘
```

## Rules

1. Each cell must contain either a **sun** ☀ or a **moon** ☽
2. No more than **2 consecutive** suns or moons in any row/column
3. Each row and column must have **equal** numbers of suns and moons

## How to Play

1. Click an empty cell to place a sun
2. Click again to change to moon
3. Click again to clear
4. Fill all cells following the rules to win!

## Features

- 5 puzzle levels (4x4 and 6x6 grids)
- Real-time rule violation highlighting
- Undo support
- Level navigation

## Run

```bash
npx tsx ported-apps/tango-puzzle/tango-puzzle.ts
```

## Tests

```bash
cd ported-apps/tango-puzzle
npx jest --forceExit
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | `vbox > hbox(nav buttons) + separator + grid(NxN) + separator + label(status)` nesting. Grid size adapts to level |
| **Core declarative** | Fluent method chaining | 6/10 | `.withId()` on resetBtn, undoBtn, prevBtn, levelLabel, nextBtn, cell-*. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 8/10 | Loop generating NxN grid cells with constraint-driven styling |
| **State architecture** | Observable store | 5/10 | Game callbacks (`onUpdate`/`onWin`) rather than full Observable store |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. `setText()` for status updates |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 6/10 | IDs on nav buttons, per-cell elements, level label |
| **Design** | Separation of concerns | 7/10 | Game logic separated from UI builder |
| | **Overall** | **5/10** | Clean programmatic grid generation. Same pattern as other grid puzzles — strong loop-based UI but no Observable store or reactive bindings |

## Credits

Portions copyright Paul Hammant 2026

## License

MIT License
