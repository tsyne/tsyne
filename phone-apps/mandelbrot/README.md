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
