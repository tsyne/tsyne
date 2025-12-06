# Fyne Stack Click Event Limitation

## The Problem

Fyne's Stack container doesn't propagate click events to nested layers. When creating a desktop with overlapping layers:
- Icons on bottom layer can't receive clicks when MDI layer is on top
- MDI windows can't be interacted with when icons are on top

Fyne delivers events only to the topmost layer at the click position.

## The Solution: TsyneDesktopMDI without Global Stacks

Instead of stacking two full-screen layers (icons + `container.MultipleWindows`) we now build a single widget that owns **both** the draggable icons and the `InnerWindow` instances. This avoids the Stack limitation completely because every canvas object only captures input within its own bounds.

TsyneDesktopMDI now combines:

1. **`TsyneDraggableIcon`** - Custom canvas widgets that implement drag + double-click
2. **Direct `InnerWindow` management** - We keep a slice of windows, wire up their drag/resize callbacks, and raise them manually (same logic Fyne’s `MultipleWindows` used internally, but without the large scroll overlay)
3. **Deterministic z-order** - Icons are rendered first, windows are appended after them, so windows are always visually above icons while icons remain clickable wherever a window is not covering them

### Rendering Order

```go
func (r *desktopMDIRenderer) Objects() []fyne.CanvasObject {
    var objects []fyne.CanvasObject
    objects = append(objects, r.bg) // background

    for _, icon := range r.desktop.icons {
        objects = append(objects, icon) // icons first
    }
    for _, win := range r.desktop.windows {
        objects = append(objects, win)  // windows last → always on top
    }
    return objects
}
```

Because each `InnerWindow` only receives pointer events inside its chrome, icons behind *visible* window regions still behave exactly like a traditional desktop: move or hide the window and the icon is instantly interactive again. No global “toggle layers” hack is required anymore.

### Window Behaviour

When a window is added we attach the same handlers that `container.MultipleWindows` used:

```go
win.OnDragged = func(ev *fyne.DragEvent) {
    pos := win.Position()
    win.Move(fyne.NewPos(pos.X+ev.Dragged.DX, pos.Y+ev.Dragged.DY))
}

win.OnResized = func(ev *fyne.DragEvent) {
    size := win.Size()
    min := win.MinSize()
    newSize := fyne.NewSize(
        max(size.Width+ev.Dragged.DX, min.Width),
        max(size.Height+ev.Dragged.DY, min.Height),
    )
    win.Resize(newSize)
}

win.OnTappedBar = func() {
    dm.RaiseWindow(win) // move it to the end of the slice → top-most draw order
}
```

### Working Functionality

- Desktop icons stay interactive anywhere they are visible
- Double-click launches apps into InnerWindows that float above the icons
- InnerWindows drag, resize, and raise just like they did inside `MultipleWindows`
- Closing an InnerWindow removes it from the desktop slice immediately, so icons underneath become interactive again without restarting the desktop
- Windows still open centered and respect minimum sizes

### Implementation

**Go** (`bridge/types.go`) now owns the entire desktop composition:
- `TsyneDraggableIcon` handles drag + double-click callbacks
- `TsyneDesktopMDI` stores icon + window slices, manages window callbacks, and controls render order

**TypeScript** (`src/widgets/desktop.ts`) remains a thin wrapper that issues bridge commands (`createDesktopMDI`, `desktopMDIAddIcon`, `desktopMDIAddWindow`, etc.) and listens for callbacks.

The original proof of concept for draggable icons lives in `bridge/cmd/draggable-icons/main.go`. Run the full desktop with `TSYNE_HEADED=1 npx ts-node src/desktop.ts`.
