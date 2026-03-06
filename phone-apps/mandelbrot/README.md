# Mandelbrot Explorer

Interactive Mandelbrot set fractal viewer with zoom, pan, and color palette cycling.

## Controls

| Input | Action |
|-------|--------|
| Click/tap | Zoom in centered on click point |
| Two-finger scroll | Zoom in/out (scroll up = zoom in) |
| Keyboard +/- | Zoom in/out |
| Arrow keys | Pan |
| P or Space | Cycle color palette |
| R | Reset view |
| Buttons | All actions available via UI |

## Limitations

### Pinch-to-zoom not supported on desktop

Two-finger **scroll** gestures work for zooming, but two-finger **pinch** gestures (pinch in/out to zoom) do not work on desktop platforms.

**Root cause:** Fyne uses [GLFW](https://www.glfw.org/) for windowing on desktop. GLFW does not expose pinch/zoom gestures from the OS. See [GLFW issue #90](https://github.com/glfw/glfw/issues/90) (open since 2013), but with some pull-requests happening in 2025

| Platform | Pinch gesture API | GLFW support |
|----------|-------------------|--------------|
| macOS | `magnifyWithEvent:` | No |
| Linux/Wayland | libinput `GESTURE_PINCH_*` | No |
| Windows | Touch gestures | No |

Two-finger scroll works because it's reported as mouse wheel events, which GLFW does support.

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > hbox(controls) + center(canvasRaster)` nesting |
| **Core declarative** | Fluent method chaining | 6/10 | `.withId()` on 10 elements: zoom buttons, iteration controls, coordinate labels. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 2/10 | No loop-based widget generation. Fractal rendered via GPU shader |
| **State architecture** | Observable store | 3/10 | No Observable store. Fractal parameters managed directly |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 2 `setText()` calls for coordinate display |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty |
| **Testing** | `.withId()` coverage | 6/10 | IDs on zoom and iteration controls |
| **Design** | Separation of concerns | 5/10 | Shared fractal utilities via `fractal-utils.ts` |
| | **Overall** | **4/10** | Control panel wrapping GPU shader fractal. Same pattern as other fractal apps — good `.withId()` coverage but no reactive bindings |
