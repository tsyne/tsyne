# Tsyne Roadmap - Remaining Fyne API Coverage

This document tracks Fyne features **not yet implemented** in Tsyne.

**Current Coverage: ~85%** of Fyne's public API

---

## Widgets Not Yet Implemented

| Widget | Fyne Type | Description | Suggested Demo App |
|--------|-----------|-------------|-------------------|
| **Icon** | `widget.Icon` | Theme icon display | `icon-gallery.ts` - Display all available theme icons |
| **FileIcon** | `widget.FileIcon` | File type icon | `file-browser.ts` - Simple file browser with icons |
| **Calendar** | `widget.Calendar` | Standalone calendar widget | `appointment-scheduler.ts` - Date selection UI |

> **Note:** `DateEntry` (date input with calendar popup) is implemented. The standalone `Calendar` widget would be useful for inline date display without an input field.

---

## Window Features Not Supported by Fyne

| Feature | Description | Status |
|---------|-------------|--------|
| **Min/Max Size** | Size constraints | **NOT IN FYNE API** - `Window.SetMinSize/SetMaxSize` do not exist in Fyne v2.7.0 |
| **Always On Top** | Keep window on top | **NOT IN FYNE API** - `Window.SetOnTop` does not exist in Fyne v2.7.0 |

> **Note:** Some window features documented in external references do not exist in the current Fyne Window interface (v2.7.0). These features may be added in future Fyne versions.

---

## Implementation Priority

### Remaining Work
1. **Icon** - Theme icon display widget
2. **FileIcon** - File type icon widget
3. **Calendar** - Standalone calendar widget (DateEntry already provides calendar popup)

---

## What's Already Implemented

### Widgets ✅
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
- Center, Max, Padded, Clip
- Card, Accordion, Form, Border
- InnerWindow, Navigation, ThemeOverride, Popup

### Dialogs ✅
- showInfo, showError, showConfirm
- showFileOpen, showFileSave, showFolderOpen
- showColorPicker, showEntryDialog
- showForm, showCustom, showCustomConfirm
- showProgress

### Canvas & Drawing ✅
- CanvasLine, CanvasCircle, CanvasRectangle
- CanvasText, CanvasRaster, CanvasLinearGradient

### System Features ✅
- System Tray
- Desktop Notifications
- Clipboard
- Drag & Drop
- Preferences/Storage
- Data Binding & Validation
- Custom Themes & Fonts

### Testing ✅
- getByText, getByExactText, getByTestId
- getByRole, getByLabel
- Visual Regression, Accessibility Audit

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

**Last Updated:** 2025-11-23
