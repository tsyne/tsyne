# Fyne ABI Audit for Tsyne

## Missing Widgets and APIs

The following is a list of Fyne widgets and APIs that are not yet implemented in Tsyne.

### Missing Widgets
- **Stack Container:** A container that stacks widgets on top of each other. This is useful for creating overlapping UI elements.

### Missing Widget Properties and Events

The following is a list of missing properties and events for existing widgets, as documented in `MISSING_FEATURES.md`.

- **Button:**
    - `Importance` property should be a dedicated property, not handled via `classNames`.
- **Entry:**
    - `OnDoubleClick` event is not implemented in the Go bridge.
    - `OnSubmitted` event in the Go bridge does not pass the entry text to the callback.
    - `OnChanged` and `OnCursorChanged` events are missing.
- **Image:**
    - `onDrag` and `onDragEnd` events are not implemented in the Go bridge.
- **Label:**
    - `Alignment` property is missing.
    - `Wrapping` property is missing.
    - `TextStyle` property is missing.
- **RichText:**
    - `Wrapping` property is missing.
    - `Scroll` property is missing.
    - `ParseMarkdown` functionality is missing.
- **Select:**
    - `Alignment` property is missing.
    - `SetOptions` method is missing.
    - `OnFocus` and `OnBlur` events are missing.
- **PasswordEntry:**
    - `OnSubmitted` event is missing.
- **Checkbox:**
    - `OnFocus` and `OnBlur` events are missing.
- **Slider:**
    - `OnFocus` and `OnBlur` events are missing.
- **RadioGroup:**
    - `Horizontal` property is missing.
    - `SetOptions` method is missing.
    - `OnFocus` and `OnBlur` events are missing.
- **List:**
    - `OnUnselected` event is missing.
    - `UnselectAll` method is missing.
- **Table:**
    - `OnSelected` event is missing.
    - `SetColumnWidths` method is missing.
    - `UnselectAll` method is missing.
- **Tree:**
    - `OnSelected` event is missing.
    - `OpenAllBranches` method is missing.
    - `CloseAllBranches` method is missing.
- **Accordion:**
    - `Open` and `Close` methods for individual items are missing.
    - `OnOpen` and `OnClose` events are missing.
- **Menu:**
    - `SetMainMenu` method is missing.
