# Tricorn (Mandelbar) Fractal Explorer

The conjugate of the Mandelbrot set, creating distinctive horn-like shapes.

![Tricorn Screenshot](screenshots/tricorn-zoomed.png)

## Features

- Multiple color palettes (classic, fire, ice, rainbow, ocean, psychedelic, grayscale, copper)
- Click/tap to zoom and recenter
- Scroll wheel zoom centered on cursor
- Keyboard controls for navigation

## Controls

- **Click/Tap**: Zoom in at clicked point
- **Scroll**: Zoom in/out centered on cursor
- **+/-**: Zoom in/out
- **Arrow keys**: Pan
- **P/Space**: Cycle palette
- **R**: Reset view

## Algorithm

The Tricorn uses `z = conj(z)² + c` where conj() is the complex conjugate. This creates different symmetry than the Mandelbrot set, with three-fold rotational symmetry and distinctive "horns" at the top.

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > hbox(controls) + center(canvasRaster)` nesting |
| **Core declarative** | Fluent method chaining | 5/10 | `.withId()` on 8 elements. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 2/10 | No loop-based widget generation. Fractal rendered via GPU shader |
| **State architecture** | Observable store | 3/10 | No Observable store. Fractal parameters managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 2 `setText()` calls |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 5/10 | IDs on controls |
| **Design** | Separation of concerns | 5/10 | Shared fractal utilities via `fractal-utils.ts` |
| | **Overall** | **4/10** | Same fractal app pattern — control panel wrapping GPU shader |
