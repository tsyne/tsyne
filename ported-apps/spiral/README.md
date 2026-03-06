# Spiral

Ported from https://codepen.io/hakimel/pen/QdWpRv by Hakim El Hattab.

A mesmerizing animated spiral rendered on canvas with drag-to-rotate interaction.

## Features

- Smooth spiral animation with easing
- Drag interaction to control rotation speed
- Cosyne-based pseudo-declarative rendering

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 4/10 | Single `canvasStack` with spiral line segments. Minimal widget chrome |
| **Core declarative** | Fluent method chaining | 4/10 | `.withId()` on 4 elements. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 7/10 | Loop generating spiral line segments from parametric data |
| **State architecture** | Observable store | 2/10 | No Observable store. Animation state managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 4/10 | Uses Cosyne `.bindEndpoint()` and `.bindAlpha()` for reactive animation — genuine reactive bindings |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -1 | 1 `setContent()` call |
| **Testing** | `.withId()` coverage | 3/10 | Minimal IDs |
| **Design** | Separation of concerns | 5/10 | Animation math and rendering in single file |
| | **Overall** | **4/10** | Notable for using Cosyne reactive bindings (`.bindEndpoint()`, `.bindAlpha()`). Loop-based spiral generation but minimal widget structure |

## Running

```bash
pnpm start
```
