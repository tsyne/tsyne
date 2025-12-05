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

## Workaround

Use Border layout with a toolbar/dock instead of overlapping layers:
- Top: HBox with app launcher buttons
- Center: MDI container for app windows
