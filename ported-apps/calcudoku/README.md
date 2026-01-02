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

## Credits

Portions copyright Paul Hammant 2026

## License

MIT License
