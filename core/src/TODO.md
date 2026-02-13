# Core TODO

## Slider: support pixel width

The Fyne `widget.Slider` can be constrained to a specific width by wrapping it in a sized container (e.g. `container.NewGridWrap(fyne.NewSize(width, height), slider)`). The Tsyne TypeScript API (`Slider` class in `widgets/inputs_range.ts`) has no `width` parameter, so sliders always expand to fill their layout container.

**Proposed change:** Accept an optional `width` in the `Slider` constructor and `a.slider()` factory. On the Go side (`widget_creators_inputs.go`), wrap the slider in a fixed-width container when `width` is provided.

This is a general pattern — other widgets (entries, buttons) could also benefit from optional sizing — but slider is the most common pain point since it often shares a row with labels.
