# Fyne Stack Click Event Limitation

The issue was Fyne's Stack container doesn't propagate click events to nested layers.

We tried to create a desktop with:
- Stack layer 1 (bottom): Scrollable grid of draggable icons
- Stack layer 2 (top): MDI container for app windows

But clicks on icons weren't registering. We tried:
- Reversing Stack order
- Removing Scroll wrapper
- Wrapping in Max container

None worked. Fyne's Stack seems to only deliver events to the topmost layer, not letting them pass through to layers beneath.

## Workaround 1: Border Layout

Use Border layout with a toolbar/dock instead of overlapping layers:
- Top: HBox with app launcher buttons
- Center: MDI container for app windows

## Workaround 2: Custom Widget with Absolute Positioning (Recommended)

The Stack limitation occurs when using **multiple containers** layered on top of each other.
The solution is to use a **single custom widget** that manages children with absolute positioning.

See: `bridge/cmd/draggable-icons/main.go`

Key insight: Instead of:
```
Stack [
  Layer1: Container with icons (events blocked)
  Layer2: MDI container (captures all events)
]
```

Use:
```
CustomDesktopWidget [
  - Renders background
  - Contains icons as child widgets at absolute positions
  - Each icon implements Draggable + Tappable interfaces
  - Single Objects() slice - no layer blocking
]
```

This approach:
- Allows icons to be dragged freely (dx, dy positioning)
- Supports double-click detection
- Icons can overlap each other
- All events properly delivered to the widget under the cursor

Run example: `cd bridge && go run ./cmd/draggable-icons`
