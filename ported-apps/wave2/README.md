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

## Pseudo-Declarative Pattern

Following the patterns from `docs/pseudo-declarative-ui-composition.md`:

```typescript
// Declarative iteration - one path per wave line
for (let i = 0; i < lines.length; i++) {
  paths.push(
    a.canvasPath({
      width: W, height: H,
      path: pointsToSvgPath(lines[i].points),
      strokeColor: colors[colorIdx][1],
      strokeWidth: 6,
      lineCap: 'round',
      lineJoin: 'round',
    })
  );
}
```

This mirrors the keyboard example's programmatic row generation:
> "The logic for creating a button is written once and reused for every key in the row."
