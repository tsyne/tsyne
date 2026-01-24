# Tsyne Roadmap - Remaining Fyne API Coverage

This document tracks Fyne features **not yet implemented** in Tsyne.

**Current Coverage: ~95%** of Fyne's public API

---

## Dialogs Not Yet Implemented

| Dialog | Fyne Function | Description | Suggested Demo App |
|--------|---------------|-------------|-------------------|
| **showCustomWithoutButtons** | `dialog.NewCustomWithoutButtons` | Custom dialog without dismiss/confirm buttons | `modal-overlay.ts` - Non-dismissable loading overlay |

---

## Canvas Animations Not Yet Implemented

| Animation | Fyne Function | Description | Suggested Demo App |
|-----------|---------------|-------------|-------------------|
| **ColorAnimation** | `canvas.NewColorRGBAAnimation` | Animate color transitions | `animated-ui.ts` - Smooth color transitions |
| **PositionAnimation** | `canvas.NewPositionAnimation` | Animate object movement | `animated-ui.ts` - Moving objects |
| **SizeAnimation** | `canvas.NewSizeAnimation` | Animate size changes | `animated-ui.ts` - Growing/shrinking elements |

---

## Data Binding (Partial Implementation)

Tsyne has `ModelBoundList` for reactive list rendering. Fyne's `data/binding` package offers additional capabilities:

| Feature | Fyne Package | Status | Notes |
|---------|--------------|--------|-------|
| **Scalar Bindings** | `binding.Bool/Int/Float/String` | Not implemented | Type-safe observable values |
| **Type Conversion** | `binding.StringToInt`, etc. | Not implemented | Automatic type conversion |
| **Boolean Logic** | `binding.Not/And/Or` | Not implemented | Combine boolean bindings |
| **Preference Binding** | `binding.BindPreference*` | Not implemented | Auto-persist to preferences |
| **Struct Binding** | `binding.Struct` | Not implemented | Bind to object properties |

> **Note:** Full data binding may not be necessary for Tsyne's pseudo-declarative approach. The `when()` method and `ModelBoundList` cover most reactive UI needs.

---

## Window Features Not Supported by Fyne

| Feature | Description | Status |
|---------|-------------|--------|
| **Min/Max Size** | Size constraints | **NOT IN FYNE API** - `Window.SetMinSize/SetMaxSize` do not exist in Fyne v2.7.0 |
| **Always On Top** | Keep window on top | **NOT IN FYNE API** - `Window.SetOnTop` does not exist in Fyne v2.7.0 |

> **Note:** Some window features documented in external references do not exist in the current Fyne Window interface (v2.7.0). These features may be added in future Fyne versions.

---

## Implementation Priority

### Medium Priority
1. **Canvas Animations** - Smooth UI transitions (ColorAnimation, PositionAnimation, SizeAnimation)
2. **showCustomWithoutButtons** - Modal overlays without dismiss buttons

### Low Priority (Consider on demand)
3. **Full Data Binding** - Tsyne's `when()` and `ModelBoundList` may be sufficient

### Minor (Polish items)

**Widget Property Gaps:**
- Label: Alignment, Wrapping, TextStyle properties
- RichText: Wrapping, Scroll, ParseMarkdown
- Select: Alignment, SetOptions method
- RadioGroup: Horizontal property, SetOptions method

**Widget Method Gaps:**
- Table: OnSelected event, SetColumnWidths, UnselectAll
- Tree: OnSelected event, OpenAllBranches, CloseAllBranches
- Accordion: Open/Close individual items, OnOpen/OnClose events
- Menu: SetMainMenu method

**Event Gaps:**
- Entry: onDoubleClick (Go bridge)
- Image: onDrag/onDragEnd (Go bridge)
- Various widgets: onFocus/onBlur events (Select, Checkbox, Slider, RadioGroup)

---

## What's Already Implemented

### Widgets ✅
- Icon (theme icon display)
- FileIcon (file type icon)
- Calendar (standalone calendar widget)
- Activity (loading spinner)
- SelectEntry (searchable dropdown)
- CheckGroup (multiple checkboxes)
- ProgressBarInfinite (`a.progressbarInfinite()`)
- DateEntry (date input with calendar)
- TextGrid (monospace text grid)
- Popup (floating overlay)
- Menu (standalone menu widget)
- All input widgets (Button, Entry, Checkbox, Select, Slider, RadioGroup, etc.)
- All display widgets (Label, Image, Table, List, Tree, RichText, Toolbar, etc.)

### Containers ✅
- VBox, HBox, Grid, GridWrap, AdaptiveGrid
- Scroll, Split, Tabs, DocTabs
- Center, Max, Padded, Clip, Stack
- Card, Accordion, Form, Border
- InnerWindow, MultipleWindows, Navigation, ThemeOverride, Popup

### Dialogs ✅
- showInfo, showError, showConfirm
- showFileOpen, showFileSave, showFolderOpen
- showColorPicker, showEntryDialog
- showForm, showCustom, showCustomConfirm
- showProgress

### Canvas & Drawing ✅
- CanvasLine, CanvasCircle, CanvasRectangle
- CanvasText, CanvasRaster, CanvasLinearGradient
- CanvasArc, CanvasPolygon, CanvasRadialGradient

### System Features ✅
- System Tray
- Desktop Notifications
- Clipboard
- Drag & Drop
- Preferences/Storage
- Custom Themes & Fonts

### Reactive Patterns ✅
- `when(() => boolean)` - Declarative visibility
- `ModelBoundList` - Smart list rendering with diffing
- Store pattern with change listeners

### Testing ✅
- `getById()` (preferred), `getByText()`, `getByExactText()`
- `within(timeout).shouldBe()` - Polling assertions
- Screenshot capture

---

## Contributing

Each new feature should include:

1. **Go bridge handler** in `bridge/`
2. **TypeScript class** in `src/widgets/`
3. **Factory method** in `src/app.ts`
4. **Export** in `src/widgets/index.ts`
5. **Demo app** in `examples/`
6. **Test** in `examples/*.test.ts`

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

---

## References

- [Fyne Widget Docs](https://docs.fyne.io/explore/widgets.html)
- [Fyne API Reference](https://pkg.go.dev/fyne.io/fyne/v2)
- [Fyne Container Package](https://pkg.go.dev/fyne.io/fyne/v2/container)
- [Fyne Dialog Package](https://pkg.go.dev/fyne.io/fyne/v2/dialog)

---

**Last Updated:** 2025-12-03
