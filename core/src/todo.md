# Tsyne TODO

## Hover Callbacks on Fyne Widgets

Fyne widgets that implement `desktop.Hoverable` need Tsyne* wrapper structs to support hover callbacks from TypeScript.

### Already handled:
- **Slider** → `TsyneSlider` (just implemented)
- **Button** → `TsyneButton` (already existed)

### Would need Tsyne* versions if hover callbacks are desired:
- Check (checkbox widget)
- Hyperlink
- Select (dropdown)
- List items
- Menu items
- Radio items
- Table cells
- Tree nodes

### Pattern for adding hover support:

1. Create a `Tsyne*` struct that embeds the original widget
2. Override `MouseIn`, `MouseMoved`, `MouseOut` to call the parent implementation AND dispatch callbacks
3. Update `handleSetWidgetHoverable` to detect the widget type and create/update the Tsyne* version
