# Connect 4 - Tsyne Canvas Port

A two-player Connect 4 game rendered using Tsyne's Cosyne canvas API, implemented three ways to illustrate the declarative spectrum.

Portions copyright Emiliano Carrillo, Angel Genis, Omar Gard, 2018
Portions copyright Paul Hammant 2026

Original authors of [github.com/EmilianoCarrillo/Connect4_Canvas](https://github.com/EmilianoCarrillo/Connect4_Canvas) (no license specified)

- [@emiliano-carrillo](https://github.com/emiliano-carrillo)
- [@AngelGenis](https://github.com/AngelGenis)
- [@OmarGard99](https://github.com/OmarGard99)

## Features

- Classic 7x6 Connect 4 board
- Two-player gameplay (Yellow vs Red)
- Win detection (horizontal, vertical, diagonal)
- Winning pieces highlighted with green border
- Clickable column indicators and board areas
- Reset game functionality

## Three Implementations

The same game is implemented three ways, sharing a common `game-logic.ts` module. Each illustrates a different point on the declarative spectrum:

| File | Style | Lines | How state reaches pixels |
|------|-------|-------|--------------------------|
| `connect4-imperative.ts` | Imperative rebuild | 223 | `window.setContent()` tears down and rebuilds entire UI on every move |
| `connect4-declarative.ts` | Custom bindings | 263 | Manual `CellBinding[]` array, `updateBindings()` loop calls `.fill()`/`.stroke()` |
| `connect4-fully-declarative.ts` | Framework bindings | 223 | `.bindFill(() => ...)` and `.bindStroke(() => ...)` on Cosyne primitives, framework re-evaluates via `refreshAllCosyneContexts()` |

## Running

```bash
# From the monorepo root — pick one:
./scripts/tsyne ported-apps/connect4/src/connect4-imperative.ts
./scripts/tsyne ported-apps/connect4/src/connect4-declarative.ts
./scripts/tsyne ported-apps/connect4/src/connect4-fully-declarative.ts
```

## Testing

26 pure game-logic tests (no GUI):

```bash
cd ported-apps/connect4
npx jest
```

## Pseudo-Declarative Scorecards

How well does each implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

The core win of pseudo-declarative UI is that code structure IS UI structure — `vbox(() => { canvasStack(() => { cosyne(...) }) })` reads as a layout spec, not a construction sequence. Unlike HTML, there's no paradigm cliff when you need a loop or a condition — a `for` inside a Cosyne draw function is still declarative. You never leave TypeScript, never switch from markup to code.

### connect4-imperative.ts — 3/10

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Clean `vbox > hbox > canvasStack > cosyne` nesting. `renderContent` reads as a layout spec |
| **Core declarative** | Fluent method chaining | 6/10 | `.withId()`, `.onClick()`, `.passthrough()` on Cosyne primitives |
| **Core declarative** | Programmatic generation | 8/10 | `for` loops generate 7 column indicators and 42 board cells |
| **State architecture** | Observable store | 0/10 | No store — local `AppState` object mutated in-place |
| **Declarative updates** | Reactive bindings | 0/10 | Zero `.bindFill()`, `.bindText()`, `.when()` |
| **Anti-declarative** | `setContent()` rebuild | -3 | Every move tears down and rebuilds the *entire window content* — the nuclear option. Worse than `removeAll()` because it destroys the root, not just a subtree |
| **Testing** | `.withId()` coverage | 5/10 | `title`, `col-0`..`col-6`, `indicator-0`..`indicator-6` — good Cosyne IDs, no Tsyne widget IDs |
| **Design** | Separation of concerns | 10/10 | `game-logic.ts` is pure functions with 26 tests — exemplary |
| | **Overall** | **3/10** | Good builder nesting and loop generation, but `setContent()` rebuild on every click is the anti-pattern at its most extreme. The framework can't diff, can't optimize, can't reason about what changed |

### connect4-declarative.ts — 5.5/10

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Same clean `vbox > canvasStack > cosyne` nesting via `buildUI()` |
| **Core declarative** | Fluent method chaining | 6/10 | `.onClick()`, `.fill()`, `.stroke()` on Cosyne primitives |
| **Core declarative** | Programmatic generation | 8/10 | `for` loops generate cells and indicators with bindings |
| **State architecture** | Custom bindings | 7/10 | `CellBinding`/`IndicatorBinding` interfaces with state-reading functions — same pattern as clock's `bindLine()`, cited in the pseudo-declarative doc as noteworthy |
| **Declarative updates** | `updateBindings()` loop | 5/10 | Iterates binding arrays, updates `.fill()`/`.stroke()` — imperative but targeted. Only changes what's needed, no teardown |
| **Declarative updates** | Reactive bindings | 1/10 | Zero framework-level bindings. Status label via `setText()` |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — updates in place |
| **Testing** | `.withId()` coverage | 2/10 | No Tsyne widget IDs, no Cosyne IDs |
| **Design** | Separation of concerns | 10/10 | `Connect4Game` class + pure `game-logic.ts` |
| | **Overall** | **5.5/10** | Builder nesting + custom binding pattern is a solid middle ground. The manual `updateBindings()` loop is the same approach the doc calls noteworthy for clock's `bindLine()`. Falls short of framework-level reactive bindings |

### connect4-fully-declarative.ts — 7/10

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Same clean `vbox > canvasStack > cosyne` nesting via `buildUI()` |
| **Core declarative** | Fluent method chaining | 9/10 | `.bindFill(() => ...)`, `.bindStroke(() => ...)`, `.onClick()` — genuine declarative bindings on Cosyne primitives. You declare the relationship between state and appearance |
| **Core declarative** | Programmatic generation | 8/10 | `for` loops generate 42 cells with bindings — compact and data-driven |
| **State architecture** | Framework bindings | 8/10 | No manual binding arrays or update loops. Framework evaluates bind functions automatically via `refreshAllCosyneContexts()` |
| **Declarative updates** | Reactive bindings | 7/10 | `.bindFill()` and `.bindStroke()` on every cell and indicator. Status label is the one `setText()` escape — could use `.bindText()` |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — updates in place |
| **Testing** | `.withId()` coverage | 2/10 | No Tsyne widget IDs, no Cosyne IDs |
| **Design** | Separation of concerns | 10/10 | `Connect4Game` class + pure `game-logic.ts` |
| | **Overall** | **7/10** | The closest to the documented ideal in this trio. Builder nesting + framework-level declarative bindings on canvas primitives. The developer declares *what* a cell looks like as a function of state; the framework handles *when* to update. One `setText()` escape prevents a higher score |

### The Progression

The three files deliberately illustrate the declarative spectrum:

1. **Imperative** (3/10) — Good layout declaration, but `setContent()` rebuild discards all structure on every interaction. The framework is a construction tool, not a reactive system.
2. **Custom bindings** (5.5/10) — Layout + hand-rolled binding system. The developer manages the binding lifecycle, but at least updates are targeted, not full rebuilds.
3. **Framework bindings** (7/10) — Layout + framework-managed bindings. The developer declares relationships; the framework evaluates them. This is what the pseudo-declarative doc recommends.

All three share the same `game-logic.ts` (249 lines, 26 tests) and produce identical gameplay. The difference is purely in how state changes propagate to the screen.

## Architecture

```
ported-apps/connect4/
├── src/
│   ├── connect4-imperative.ts         # Imperative rebuild style (223 lines)
│   ├── connect4-declarative.ts        # Custom binding style (263 lines)
│   ├── connect4-fully-declarative.ts  # Framework binding style (223 lines)
│   ├── game-logic.ts                  # Pure game logic (249 lines)
│   └── game-logic.test.ts            # 26 Jest tests
├── package.json
├── jest.config.js
└── README.md
```

## How to Play

1. Player 1 (Yellow) goes first
2. Click a column number (1-7) or anywhere on that column to drop a piece
3. Pieces fall to the lowest available slot
4. First player to get 4 in a row (horizontal, vertical, or diagonal) wins
5. Click "New Game" to start over

## License

License unknown.

Portions copyright original authors (see above) and portions copyright Paul Hammant 2026

This is a port of the Connect 4 game to Tsyne, substantially rewritten with three implementation variants.
