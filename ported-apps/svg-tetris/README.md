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

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 5/10 | `vbox > cosyne(board + preview) + label(status)`. CVG canvas dominates |
| **Core declarative** | Fluent method chaining | 3/10 | `.withId()` on 1 element. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 9/10 | Nested loops creating 200 board rects + 16 preview rects — each with `bindFill()`. Textbook loop-based generation |
| **State architecture** | Observable store | 5/10 | Clean separation: `tetris-engine.ts` manages all game state. UI queries engine for cell colors |
| **Declarative updates** | `.when()` + `.bindTo()` | 6/10 | **216 `bindFill()` bindings** — every cell's color is a reactive callback querying the engine. `refreshAllCosyneContexts()` triggers re-evaluation |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -1 | 1 `setContent()` call |
| **Testing** | `.withId()` coverage | 2/10 | Only 1 ID. Cell interaction via keyboard, not widget IDs |
| **Design** | Separation of concerns | 8/10 | Engine (pure game logic, no UI deps) cleanly separated from renderer. Engine is independently testable |
| | **Overall** | **5/10** | Strong programmatic generation (216 rects with `bindFill()`) and excellent engine/UI separation. The `bindFill()` pattern is a showcase for reactive CVG updates. Limited `.withId()` coverage since interaction is keyboard-driven |

## Running

```bash
./scripts/tsyne ported-apps/svg-tetris/index.ts
```

Controls: Arrow keys to move/rotate, Space to drop, P to pause, R to restart.
