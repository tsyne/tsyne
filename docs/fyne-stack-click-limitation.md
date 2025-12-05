# Fyne Stack Click Event Limitation

## The Problem

Fyne's Stack container doesn't propagate click events to nested layers. When creating a desktop with overlapping layers:
- Icons on bottom layer can't receive clicks when MDI layer is on top
- MDI windows can't be interacted with when icons are on top

Fyne delivers events only to the topmost layer at the click position.

## The Solution: TsyneDesktopMDI with Dynamic Z-Order

For a full desktop environment with both draggable icons AND MDI windows, we use `TsyneDesktopMDI` which combines:

1. **`container.MultipleWindows`** - Fyne's built-in MDI container that handles window dragging, resizing, z-ordering, and centering
2. **`TsyneDraggableIcon`** - Custom icons with drag + double-click support
3. **Dynamic z-order** - Icons toggle between front/back based on user interaction

### How It Works

The `Objects()` method in the renderer returns items in different order based on an `iconsOnTop` flag:

```go
func (r *desktopMDIRenderer) Objects() []fyne.CanvasObject {
    var objects []fyne.CanvasObject
    objects = append(objects, r.bg) // Background first

    if r.desktop.iconsOnTop {
        // Icons on top - they can be dragged/clicked
        objects = append(objects, r.desktop.mdiWindows)
        for _, icon := range r.desktop.icons {
            objects = append(objects, icon)
        }
    } else {
        // Windows on top - icons behind
        for _, icon := range r.desktop.icons {
            objects = append(objects, icon)
        }
        objects = append(objects, r.desktop.mdiWindows)
    }
    return objects
}
```

### State Transitions

1. **Initial state**: `iconsOnTop = true` - icons can be dragged and double-clicked
2. **Window opens** (`AddWindow`): `iconsOnTop = false` - windows come to front
3. **Click desktop background** (`Tapped`): `iconsOnTop = true` - icons come to front

The widget implements `fyne.Tappable` to detect clicks on the desktop background:

```go
func (dm *TsyneDesktopMDI) Tapped(e *fyne.PointEvent) {
    // Click reached us = not captured by a window
    dm.iconsOnTop = true
    dm.Refresh()
}
```

### Working Functionality

- Desktop icons can be dragged to reposition them
- Double-click on icons launches apps in InnerWindows
- InnerWindows can be dragged/moved (via MultipleWindows)
- InnerWindows can be closed
- Windows open centered (MultipleWindows handles this)
- Click desktop background to bring icons to front for interaction

### Implementation

**Go** (`bridge/types.go`) - ~500 lines:
- `TsyneDraggableIcon` (~338 lines) - Fyne widget with drag, double-click, rendering
- `TsyneDesktopMDI` (~161 lines) - container, z-order logic, `Objects()`, `Tapped()`

**TypeScript** (`src/widgets/desktop.ts`) - ~396 lines:
- `DesktopMDIIcon`, `DesktopMDI` - thin wrappers sending bridge messages (`createDesktopMDI`, `desktopMDIAddIcon`, etc.) and registering callbacks

The original proof of concept is in `bridge/cmd/draggable-icons/main.go` - a standalone Go+Fyne demo showing draggable icons with absolute positioning. Run with `cd bridge && go run ./cmd/draggable-icons`.

Run desktop: `TSYNE_HEADED=1 npx ts-node src/desktop.ts`
