# Missing Features and Discrepancies

This document lists the missing features and discrepancies between the Go and TypeScript layers of the Tsyne framework.

## Discrepancies

### Button

*   **Importance Property:** The `Importance` property is handled via `classNames` in TypeScript, which is a workaround. It would be better to have a dedicated `importance` property in the TypeScript `Button` class that maps directly to the Fyne `Importance` property.

### Entry

*   **OnDoubleClick Event:** The `onDoubleClick` event is available in the TypeScript `Entry` class, but it is not implemented in the Go bridge.
*   **OnSubmit Event:** The `OnSubmitted` event in the Go bridge sends the text of the entry as part of the event data. The `onSubmit` callback in the TypeScript `Entry` class does not receive this data.

### Image

*   **Drag and Drop Events:** The `onDrag` and `onDragEnd` events are available in the TypeScript `Image` class, but they are not implemented in the Go bridge.

### Events

*   **Event System:** The Go bridge uses a more robust event system with `callbackId`s, which allows for more flexibility and control over event handling. The TypeScript code uses simple callbacks, which might not be as flexible in all cases. It would be beneficial to expose the `callbackId` system to the TypeScript layer to allow for more advanced event handling.
*   **Missing Event Handlers:**
    *   **PasswordEntry:** `OnSubmitted`
    *   **Entry:** `OnChanged`, `OnCursorChanged`
    *   **Select:** `OnFocus`, `OnBlur`
    *   **Checkbox:** `OnFocus`, `OnBlur`
    *   **Slider:** `OnFocus`, `OnBlur`
    *   **RadioGroup:** `OnFocus`, `OnBlur`

### Other

*   **Label:**
    *   Missing `Alignment` property.
    *   Missing `Wrapping` property.
    *   Missing `TextStyle` property.
*   **RichText:**
    *   Missing `Wrapping` property.
    *   Missing `Scroll` property.
    *   Missing `ParseMarkdown` functionality.
*   **Select:**
    *   Missing `Alignment` property.
    *   Missing `SetOptions` method.
*   **RadioGroup:**
    *   Missing `Horizontal` property.
    *   Missing `SetOptions` method.
*   **List:**
    *   Missing `OnUnselected` event.
    *   Missing `UnselectAll` method.
*   **Table:**
    *   Missing `OnSelected` event.
    *   Missing `SetColumnWidths` method.
    *   Missing `UnselectAll` method.
*   **Tree:**
    *   Missing `OnSelected` event.
    *   Missing `OpenAllBranches` method.
    *   Missing `CloseAllBranches` method.
*   **Accordion:**
    *   Missing `Open` and `Close` methods for individual items.
    *   Missing `OnOpen` and `OnClose` events.
*   **Menu:**
    *   Missing `SetMainMenu` method.

## Suggestions for Improvement

*   **Add a dedicated `importance` property to the TypeScript `Button` class.** This would make the code more readable and easier to maintain.
*   **Implement the `onDoubleClick` event in the Go bridge for the `Entry` widget.** This would bring the Go and TypeScript layers into alignment.
*   **Pass the entry text to the `onSubmit` callback in the TypeScript `Entry` class.** This would provide more context to the event handler.
*   **Implement the `onDrag` and `onDragEnd` events in the Go bridge for the `Image` widget.** This would enable drag-and-drop functionality for images.
*   **Expose the `callbackId` system to the TypeScript layer.** This would allow for more advanced event handling, such as removing event listeners.
*   **Add the missing event handlers to the appropriate widgets.** This would provide more control over widget behavior.
*   **Add the missing properties and methods to the appropriate widgets.** This would provide more control over widget appearance and behavior.
