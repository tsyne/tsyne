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

## Credits

Ported from [ChrysaLisp](https://github.com/vygr/ChrysaLisp) solitaire app by **Chris Hinsley**.
Portions copyright Chris Hinsley 2026
Portions copyright Paul Hammant 2026

Original source: https://github.com/vygr/ChrysaLisp/blob/master/apps/solitaire/app.lisp

## License

GPL-2.0 - See [LICENSE](LICENSE)

This port preserves the original GPL-2.0 license from the ChrysaLisp project.
