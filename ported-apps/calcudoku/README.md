# Calcudoku (KenKen)

A mathematical puzzle combining arithmetic with Sudoku-like logic.

```
┌───────┬───────┬───────┐
│ 4+    │       │ 2=    │
│   1   │   3   │   2   │
├───────┼───────┼───────┤
│ 2−    │ 2÷    │       │
│   3   │   2   │   1   │
├───────┼───────┼───────┤
│       │ 5+    │       │
│   2   │   1   │   3   │
└───────┴───────┴───────┘
```

## Rules

1. Fill the N×N grid with numbers 1 to N
2. Each row contains each number exactly once
3. Each column contains each number exactly once
4. Each cage (outlined group) shows a target and operation
5. Numbers in a cage must produce the target using the operation

## Operations

- **+** Addition: cells sum to target
- **−** Subtraction: larger minus smaller(s) equals target
- **×** Multiplication: cells multiply to target
- **÷** Division: larger divided by smaller equals target
- **=** Equals: single cell equals target

## How to Play

1. Click a cell to select it
2. Click a number (1-N) to fill the cell
3. Click C to clear the selected cell
4. Fill all cells correctly to win!

## Features

- 5 puzzle levels (3×3 to 5×5 grids)
- Real-time error highlighting
- Level navigation

## Run

```bash
npx tsx ported-apps/calcudoku/calcudoku.ts
```

## Tests

```bash
cd ported-apps/calcudoku
npx jest --forceExit
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Clean `vbox > hbox(header buttons) + separator + grid(NxN cells) + separator + hbox(number buttons)` nesting. Grid size adapts to puzzle level |
| **Core declarative** | Fluent method chaining | 6/10 | `.withId()` on resetBtn, solveBtn, prevBtn, levelLabel, nextBtn, cell-*, numBtn*, clearBtn. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 8/10 | Nested loops generating NxN grid cells with dynamic styling. Number buttons generated from array. Grid size driven by puzzle data |
| **State architecture** | Observable store | 5/10 | Game callbacks (`onUpdate`/`onWin`) rather than full Observable store. No `subscribe()`/`notifyChange()` pattern. Game state managed in separate class |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No `.when()`, `.bindTo()`, or `.bindText()`. 2+ `setText()` calls. Cell updates via direct widget reference mutation |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — initial setup only |
| **Testing** | `.withId()` coverage | 7/10 | IDs on all buttons, level label, and per-cell elements (`cell-*`). Good for testing grid interactions |
| **Design** | Separation of concerns | 7/10 | Game logic separated from UI. Puzzle generation, validation, and solving in game class. UI builder is presentational |
| | **Overall** | **5/10** | Strong programmatic grid generation from puzzle data. Good `.withId()` coverage. But uses callback pattern instead of Observable store, and no reactive bindings (`.when()`, `.bindTo()`, `.bindText()`). The grid puzzle paradigm naturally suits loop-based generation but misses declarative update patterns |

## Credits

Portions copyright Paul Hammant 2026

## License

MIT License
