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

## Credits

Portions copyright Paul Hammant 2026

## License

MIT License
