# Claude Usage Bar (Tsyne Port)

A port of the Claude API usage bar to the Tsyne platform using Cosyne Vector Graphics (CVG).

## What it does

A desktop application that shows your Claude API usage at a glance.

- 5-hour and 7-day utilization with progress bars and reset timers
- Usage history chart using CVG
- Sign in with Claude via OAuth (PKCE)
- Automatic polling every 60 seconds

## Development

```sh
pnpm install
pnpm test
```

## Architecture

- `index.ts`: Main application logic and UI
- `index.test.ts`: Automated tests
- Uses `UsageStore` for observable state management
- Uses `UsageService` for API interaction and OAuth flow
- Uses `cvg` for logo and chart rendering

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 8/10 | Clean `padded > vbox > hbox + separator + cvg` nesting. `buildContent()` reads as a layout spec. Helper functions `renderUsageBucket()` and `renderChart()` compose cleanly |
| **Core declarative** | Fluent method chaining | 7/10 | `.withId()` on interactive elements (`sign-in-btn`, `code-entry`, `submit-code-btn`, `refresh-btn`, `sign-out-btn`, `error-label`). `.onClick()` via options bag on buttons. CVG primitives use `.fill()`, `.stroke()`, `.onClick()` fluently |
| **Core declarative** | Programmatic generation | 8/10 | Time range segmented control generated via `ranges.forEach()` loop — hit areas, highlights, labels all derived from loop index. Chart grid lines generated from `[0, 0.25, 0.5, 0.75, 1].forEach()`. Chart data lines built programmatically from `points.forEach()` |
| **State architecture** | Observable store | 9/10 | Full `UsageStore` with `subscribe()`/`notifyChange()` pattern matching the 7-app standard. `UsageService` only mutates store — never touches UI. PouchDB injected via constructor (Tsello pattern). Defensive copy on `getHistory()` |
| **Declarative updates** | `setContent()` rebuilds | 6/10 | All UI updates go through `winRef.setContent(buildContent)` — full rebuild on every store change. No `.bindText()`, `.bindTo()`, or `.when()` used. Conditional rendering via `if/else` inside `buildContent()`. Effective but not leveraging framework bindings |
| **Anti-declarative** | No direct DOM manipulation | 0 | No penalty — no `removeAll()` or imperative widget manipulation outside `setContent()` |
| **Testing** | `.withId()` coverage | 7/10 | 6 IDs on interactive elements. Integration tests mock `fetch`, `exec`, and PouchDB. 13 tests total (7 unit + 2 persistence + 4 integration) |
| **Design** | Separation of concerns | 9/10 | `UsageStore` is pure state (no UI). `UsageService` is pure API/OAuth logic (no UI). `buildContent()` is purely presentational. `renderUsageBucket()` and `renderChart()` are reusable CVG components. PouchDB persistence fully decoupled |
| | **Overall** | **7/10** | Clean store-driven architecture with good separation of concerns and CVG usage. The main gap is relying on full `setContent()` rebuilds rather than declarative bindings (`.bindText()`, `.when()`, `.bindTo()`). The segmented time-range picker and chart are nice examples of programmatic CVG generation. Moving conditional views to `.when()` and stats labels to `.bindText()` would push this to 9/10 |

## Original Credits

Ported from Mac/Swift implementation.
Original by Krystian, 2026 - https://github.com/Blimp-Labs/claude-usage-bar
Ported to Tsyne by Gemini CLI, 2026.
