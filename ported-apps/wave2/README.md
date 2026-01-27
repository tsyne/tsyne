# Wave2

Ported from a CodePen by Hakim El Hattab.

Animated sine wave lines with click-to-toggle color scheme (dark/light).

## Features

- Smooth animated wave lines
- Click to toggle between dark and light color schemes
- Cosyne-based pseudo-declarative rendering

## Running

```bash
pnpm start
```

## Elegance Comparison

| Aspect | Original | This Port |
|--------|----------|-----------|
| Lines of code | ~100 | ~250 |
| Curves | Native `quadraticCurveTo` | Line segment approximation (2x points) |
| Animation | `requestAnimationFrame` | `setInterval` + `refreshAllCosyneContexts` |
| State | Loose variables | Clean `Wave2State` class |
| Reusability | Single-use | ITsyneWindow, standalone, embeddable |
| Type safety | None | Full TypeScript |

The original is more concise for its purpose (a CodePen demo). This port trades brevity for structure, type safety, and framework integration.

The main limitation is Cosyne lacks `bindPath()` for animating SVG path strings. With that, the rendering could be:

```typescript
c.path(state.getSvgPath(i), { strokeWidth: 6 })
  .bindPath(() => state.getSvgPath(i))
  .bindStroke(() => state.getForegroundColor())
```

Instead we use individual line segments with bindings for each, requiring more points to approximate the original's smooth quadratic curves.
