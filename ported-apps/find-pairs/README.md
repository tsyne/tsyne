# Find Pairs

A memory matching game ported to Tsyne. Find all 25 matching pairs on a 10×5 grid.

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│   │   │   │   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │   │
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

## Credits

Ported from [ChrysaLisp](https://github.com/vygr/ChrysaLisp) pairs app by **Chris Hinsley**.
Portions copyright Chris Hinsley 2026
Portions copyright Paul Hammant 2026

Original source: https://github.com/vygr/ChrysaLisp/blob/master/apps/pairs/app.lisp

## License

GPL-2.0 - See [LICENSE](LICENSE)

This port preserves the original GPL-2.0 license from the ChrysaLisp project.
