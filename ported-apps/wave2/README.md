# Wave2

Ported from a CodePen by Hakim El Hattab. https://codepen.io/hakimel/pen/jrvaWM

Animated sine wave lines with click-to-toggle color scheme (dark/light).

## Features

- Smooth animated wave lines with true quadratic Bezier curves
- Click to toggle between dark and light color schemes
- Uses `CanvasPath` for first-class SVG path rendering
- Pseudo-declarative composition with extracted utility functions

## Running

```bash
pnpm start
```

## Elegance Comparison

| Metric | Original JS | Tsyne (Pseudo-Declarative) |
|--------|-------------|---------------------------|
| **Total lines** | 93 | 203 |
| **Core logic** | 93 | ~100 |
| **Utility functions** | 0 | 55 (reusable) |
| **Entry points/boilerplate** | 0 | ~50 |
| **Points per line** | 20 | 20 |
| **Curves** | `quadraticCurveTo` | True Bezier via `CanvasPath` |

### Where the lines go

| Category | Original | Tsyne | Notes |
|----------|----------|-------|-------|
| Imports/types | 0 | 15 | TypeScript overhead |
| Utility functions | 0 | 55 | `createWaveLines`, `pointsToSvgPath`, `updateWavePoints` |
| Core composition | 60 | 60 | Near parity |
| Entry points | 8 | 35 | ITsyneWindow, standalone support |
| Event setup | 2 | 8 | Cosyne event handling |

### The key insight

The **core composition** (lines 107-170) is nearly identical in size to the original.
The difference is:

1. **Extracted utilities** (55 lines) - reusable for any wave-like effect
2. **Framework integration** (35 lines) - ITsyneWindow, standalone, PhoneTop support
3. **Type safety** (15 lines) - interfaces, imports

## Code Structure

```
wave2.ts
├── Utility functions (reusable)
│   ├── createWaveLines()      - Wave geometry generator
│   ├── pointsToSvgPath()      - SVG path with Q commands
│   └── updateWavePoints()     - Sine wave animation
│
├── Pseudo-declarative composition
│   └── buildWave2App()        - Main app builder
│       ├── Cosyne background  - Click-to-toggle colors
│       └── CanvasPath loop    - One path per wave line
│
└── Entry points
    ├── Standalone             - Direct execution
    └── PhoneTop embedded      - ITsyneWindow support
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 4/10 | `vbox > canvasStack(wave paths)` — minimal widget chrome around canvas |
| **Core declarative** | Fluent method chaining | 2/10 | No `.withId()`. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 7/10 | Loop generating one `canvasPath` per wave line — mirrors keyboard row generation pattern |
| **State architecture** | Observable store | 2/10 | No Observable store. Wave state managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 2/10 | 1 `.bindFill()` for background color toggle. Otherwise imperative `.update()` per frame |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -1 | 1 `setContent()` call |
| **Testing** | `.withId()` coverage | 1/10 | No IDs |
| **Design** | Separation of concerns | 4/10 | Wave physics and rendering mixed in single file |
| | **Overall** | **3/10** | Good loop-based path generation but predominantly imperative animation with per-frame `.update()` calls. One `.bindFill()` for color toggle |
