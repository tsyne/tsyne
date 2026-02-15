# SVG Tetris → CVG Port

Original: [SVGtetris.svg](https://web.archive.org/web/20201005062327id_/https://gist.githubusercontent.com/Mardeg/469581cf22ecb146e2bf1aa0ed109d28/raw/e0daf910f4f04cb4ebe637c3b11cb0f308591200/SVGtetris.svg) by alex fritze, licensed under the [Mozilla Public License](https://www.mozilla.org/en-US/MPL/)

## SVG DOM vs CVG

| Original SVG DOM | CVG Port |
|---|---|
| `document.createElementNS("rect")` | `s.rect({ ... })` |
| `cell.setAttribute("fill", color)` | `bindFill: () => engine.getCellColor(c, r)` |
| `grid._rowArray.childNodes.item(r)` | Direct `board[row][col]` array access |
| `document.addEventListener("keydown")` | `s.onKeyDown(handler)` |
| `setTimeout("tick()", tickTime)` | `setInterval(() => engine.tick(), ...)` |
| `suspendRedraw()` / `unsuspendRedraw()` | `cvgCtx.refresh()` batches all updates |
| `cell.setAttribute("occupied", "true")` | `occupied[row][col] = true` |

## Architecture

- **`tetris-engine.ts`** — Pure game logic (no UI dependencies). Board state, collision, rotation, line clearing, scoring.
- **`index.ts`** — CVG renderer. 200 board rects + 16 preview rects with `bindFill()`, keyboard handling via `onKeyDown()`.

## Running

```bash
./scripts/tsyne ported-apps/svg-tetris/index.ts
```

Controls: Arrow keys to move/rotate, Space to drop, P to pause, R to restart.
