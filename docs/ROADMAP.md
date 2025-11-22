# Tsyne Roadmap - Remaining Fyne API Coverage

This document tracks Fyne features **not yet implemented** in Tsyne, with suggested demo apps to prove completion.

**Current Coverage: ~50%** of Fyne's public API

---

## Widgets Not Yet Implemented

### High Priority

| Widget | Fyne Type | Description | Suggested Demo App |
|--------|-----------|-------------|-------------------|
| **Activity** | `widget.Activity` | Loading/busy spinner | `loading-states.ts` - Show spinners during async operations |
| **Icon** | `widget.Icon` | Theme icon display | `icon-gallery.ts` - Display all available theme icons |
| **FileIcon** | `widget.FileIcon` | File type icon | `file-browser.ts` - Simple file browser with icons |
| **SelectEntry** | `widget.SelectEntry` | Searchable dropdown | `country-picker.ts` - Searchable country selector |
| **CheckGroup** | `widget.CheckGroup` | Multiple checkboxes | `preferences.ts` - Settings panel with grouped options |
| **ProgressBarInfinite** | `widget.ProgressBarInfinite` | Indeterminate progress | Note: May already work via `progressbar(0, true)` - verify |

### Medium Priority

| Widget | Fyne Type | Description | Suggested Demo App |
|--------|-----------|-------------|-------------------|
| **Calendar** | `widget.Calendar` | Date picker widget | `appointment-scheduler.ts` - Date selection UI |
| **DateEntry** | `widget.DateEntry` | Date input field | `event-form.ts` - Event creation with date fields |
| **TextGrid** | `widget.TextGrid` | Monospace text grid | `terminal-emulator.ts` - Simple terminal display |
| **PopUp** | `widget.PopUp` | Floating overlay | `tooltip-demo.ts` - Custom tooltips and popovers |
| **PopUpMenu** | `widget.PopUpMenu` | Floating menu | Already have context menus - verify coverage |
| **Menu** | `widget.Menu` | Standalone menu widget | `command-palette.ts` - Searchable command menu |

---

## Containers Not Yet Implemented

| Container | Fyne Type | Description | Suggested Demo App |
|-----------|-----------|-------------|-------------------|
| **Padded** | `container.NewPadded` | Inset padding | Add as option to existing containers |
| **Stack** | `container.NewStack` | Layered/stacked objects | `card-stack.ts` - Overlapping card UI |
| **DocTabs** | `container.DocTabs` | Tabs with close buttons | `text-editor.ts` - Multi-document editor |
| **InnerWindow** | `container.InnerWindow` | Window within canvas | `mdi-demo.ts` - Multiple document interface |
| **Navigation** | `container.Navigation` | Stack-based navigation | `wizard.ts` - Multi-step wizard with back/forward |
| **AdaptiveGrid** | `container.NewAdaptiveGrid` | Responsive grid | `photo-gallery.ts` - Responsive image grid |
| **Clip** | `container.Clip` | Clipping region | Utility for other widgets |
| **ThemeOverride** | `container.ThemeOverride` | Scoped theming | `theme-zones.ts` - Different themes in regions |

---

## Dialogs Not Yet Implemented

| Dialog | Fyne Function | Description | Suggested Demo App |
|--------|---------------|-------------|-------------------|
| **FolderOpen** | `dialog.ShowFolderOpen` | Folder picker | `project-opener.ts` - Select project directory |
| **ColorPicker** | `dialog.ShowColorPicker` | Color selection | `drawing-app.ts` - Simple paint program |
| **EntryDialog** | `dialog.ShowEntryDialog` | Quick text input | `rename-dialog.ts` - Rename file/item |
| **FormDialog** | `dialog.ShowForm` | Form in dialog | `new-contact.ts` - Add contact form dialog |
| ~~**CustomDialog**~~ | ~~`dialog.NewCustom`~~ | ~~Custom dialog content~~ | ~~`about-dialog.ts` - Custom about box~~ | **IMPLEMENTED** |
| **ProgressDialog** | `dialog.ShowProgress` | Progress in dialog | `download-manager.ts` - Download with progress |

---

## System Features Not Yet Implemented

### Platform Integration

| Feature | Fyne Package | Description | Suggested Demo App |
|---------|--------------|-------------|-------------------|
| **System Tray** | `fyne.Driver.SystemTray` | Tray icon with menu | `background-app.ts` - App that minimizes to tray |
| **Notifications** | `fyne.App.SendNotification` | Desktop notifications | `reminder-app.ts` - Send system notifications |
| **Clipboard** | `fyne.Clipboard` | Copy/paste support | `clipboard-manager.ts` - Clipboard history |
| **Drag & Drop** | Widget `Draggable`/`Droppable` | File/widget drag | `kanban-board.ts` - Drag cards between columns |
| **Preferences** | `fyne.App.Preferences` | Persistent settings | `settings-app.ts` - Save/load user preferences |

### Data Binding

| Feature | Fyne Package | Description | Suggested Demo App |
|---------|--------------|-------------|-------------------|
| **Data Binding** | `data/binding` | Reactive data binding | `reactive-form.ts` - Auto-syncing form fields |
| **Validation** | `data/validation` | Input validation | `registration-form.ts` - Validated sign-up form |

---

## Canvas & Drawing API

| Feature | Fyne Type | Description | Suggested Demo App |
|---------|-----------|-------------|-------------------|
| **Canvas** | `canvas.*` | Drawing primitives | `whiteboard.ts` - Freehand drawing |
| **Line** | `canvas.Line` | Line drawing | Part of whiteboard |
| **Circle** | `canvas.Circle` | Circle/ellipse | `diagram-editor.ts` - Shape diagrams |
| **Rectangle** | `canvas.Rectangle` | Rectangle drawing | Part of diagram editor |
| **Text** | `canvas.Text` | Canvas text | Part of diagram editor |
| **Raster** | `canvas.Raster` | Pixel drawing | `pixel-art.ts` - Pixel art editor |
| **LinearGradient** | `canvas.LinearGradient` | Gradient fills | `gradient-picker.ts` - Gradient editor |

---

## Advanced Theming

| Feature | Description | Suggested Demo App |
|---------|-------------|-------------------|
| ~~**Custom Themes**~~ | ~~Define custom color schemes~~ | ~~`theme-creator.ts` - Build custom themes~~ | **IMPLEMENTED** |
| ~~**Per-Widget Colors**~~ | ~~Override widget colors~~ | ~~Requires Fyne theme customization~~ | **IMPLEMENTED** |
| ~~**Custom Fonts**~~ | ~~Load custom font files~~ | ~~`font-preview.ts` - Font selector~~ | **IMPLEMENTED** |

---

## Window Features Not Yet Implemented

| Feature | Fyne Method | Description | Suggested Demo App |
|---------|-------------|-------------|-------------------|
| **Min/Max Size** | `Window.SetMinSize/SetMaxSize` | Size constraints | Add to window options |
| **Always On Top** | `Window.SetOnTop` | Keep window on top | `sticky-notes.ts` - Floating notes |
| **Window Icon** | `Window.SetIcon` | Custom window icon | Add to window options |
| **Close Intercept** | `Window.SetCloseIntercept` | Confirm before close | `unsaved-changes.ts` - Prompt on close |
| **Multiple Windows** | Multiple `Window` instances | Multi-window apps | `multi-window.ts` - Secondary windows |
| **Fullscreen Toggle** | Already implemented | Verify working | - |

---

## Testing Enhancements

| Feature | Description | Suggested Demo |
|---------|-------------|----------------|
| **getByTestId** | Select by data-testid | Add testId option to widgets |
| **getByRole** | Select by ARIA role | Accessibility selectors |
| **getByLabel** | Select by form label | Form testing |
| **Visual Regression** | Screenshot comparison | `visual-regression.test.ts` |
| **Accessibility Audit** | a11y validation | `accessibility.test.ts` |

---

## Implementation Priority

### Phase 1: Complete Widget Coverage
1. Activity (loading spinner)
2. Icon & FileIcon
3. SelectEntry (searchable dropdown)
4. CheckGroup
5. Calendar & DateEntry

### Phase 2: Missing Dialogs
1. FolderOpen
2. ColorPicker
3. EntryDialog
4. FormDialog

### Phase 3: System Integration
1. Clipboard
2. Notifications
3. Preferences/Storage
4. System Tray

### Phase 4: Advanced Features
1. Canvas/Drawing API
2. Drag & Drop
3. Data Binding
4. Custom Themes

---

## Contributing

Each new feature should include:

1. **Go bridge handler** in `bridge/`
2. **TypeScript class** in `src/widgets.ts`
3. **Export** in `src/index.ts`
4. **Demo app** in `examples/`
5. **Test** in `examples/*.test.ts`
6. **README update** with API docs

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

---

## References

- [Fyne Widget Docs](https://docs.fyne.io/explore/widgets.html)
- [Fyne API Reference](https://pkg.go.dev/fyne.io/fyne/v2)
- [Fyne Container Package](https://pkg.go.dev/fyne.io/fyne/v2/container)
- [Fyne Dialog Package](https://pkg.go.dev/fyne.io/fyne/v2/dialog)

---

**Last Updated:** 2025-11-22
