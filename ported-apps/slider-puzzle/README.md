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

## Credits

Ported from [ChrysaLisp](https://github.com/vygr/ChrysaLisp) slider app by **Chris Hinsley**.

Original source: https://github.com/vygr/ChrysaLisp/blob/master/apps/slider/app.lisp

## License

GPL-2.0 - See [LICENSE](LICENSE)

This port preserves the original GPL-2.0 license from the ChrysaLisp project.
