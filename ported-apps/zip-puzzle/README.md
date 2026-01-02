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

## Credits

Portions copyright Paul Hammant 2026

## License

MIT License
