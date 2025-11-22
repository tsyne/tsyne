# Tsyne API Reference

Complete API reference for Tsyne widgets, layouts, dialogs, and utilities.

For a comprehensive guide including architecture, MVC patterns, and testing, see [reference.md](reference.md).

---

## Table of Contents

- [Application](#application)
- [Windows](#windows)
- [Layouts](#layouts)
- [Container Widgets](#container-widgets)
- [Widgets](#widgets)
  - [Basic Widgets](#basic-widgets)
  - [Input Widgets](#input-widgets)
  - [Display Widgets](#display-widgets)
  - [UI Components](#ui-components)
  - [Data Display Widgets](#data-display-widgets)
  - [Specialized Widgets](#specialized-widgets)
- [Dialogs](#dialogs)
- [Menu Bar](#menu-bar)
- [Widget Methods](#widget-methods)

---

## Application

- **`app(options, builder)`**: Create and run an application
  - `options.title`: Application title (optional)
  - `builder`: Function that defines the app structure

```typescript
import { app } from 'tsyne';

app({ title: "My App" }, (app) => {
  // Define windows and UI here
});
```

---

## Windows

- **`window(options, builder)`**: Create a window
  - `options.title`: Window title
  - `options.width`: Window width in pixels (optional)
  - `options.height`: Window height in pixels (optional)
  - `options.fixedSize`: Prevent window resizing (optional, default false)
  - `builder`: Function that defines the window content

**Window methods:**
- **`window.resize(width, height)`**: Resize the window
- **`window.centerOnScreen()`**: Center the window on screen
- **`window.setFullScreen(fullscreen)`**: Enter or exit fullscreen mode
- **`window.setMainMenu(menuDefinition)`**: Set the main menu bar (see [Menu Bar](#menu-bar) section)

```typescript
app({ title: "My App" }, (app) => {
  app.window({ title: "Main Window", width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      // Define content here
    });
    win.show();
  });
});
```

---

## Layouts

- **`vbox(builder)`**: Vertical box layout
- **`hbox(builder)`**: Horizontal box layout
- **`grid(columns, builder)`**: Grid layout with specified number of columns
  - `columns`: Number of columns in the grid
  - `builder`: Function that defines grid children
- **`scroll(builder)`**: Scrollable container for long content
  - `builder`: Function that defines scrollable content (must have exactly one child)
- **`hsplit(leadingBuilder, trailingBuilder, offset?)`**: Horizontal split container with resizable divider
  - `leadingBuilder`: Function that defines left panel content (must have exactly one child)
  - `trailingBuilder`: Function that defines right panel content (must have exactly one child)
  - `offset`: Initial divider position from 0.0 to 1.0 (optional, default 0.5)
- **`vsplit(leadingBuilder, trailingBuilder, offset?)`**: Vertical split container with resizable divider
  - `leadingBuilder`: Function that defines top panel content (must have exactly one child)
  - `trailingBuilder`: Function that defines bottom panel content (must have exactly one child)
  - `offset`: Initial divider position from 0.0 to 1.0 (optional, default 0.5)
- **`tabs(tabDefinitions, location?)`**: Tabbed container for organizing content
  - `tabDefinitions`: Array of {title: string, builder: () => void} objects
  - `location`: Tab bar position - 'top', 'bottom', 'leading', or 'trailing' (optional, default 'top')
- **`center(builder)`**: Center layout - centers content horizontally and vertically
  - `builder`: Function that defines centered content (must have exactly one child)
  - Perfect for dialogs, splash screens, and focused content
- **`border(config)`**: Border layout - positions widgets at edges and center
  - `config`: Object with optional `top`, `bottom`, `left`, `right`, `center` builder functions
  - Each builder function creates exactly one widget for that position
  - Example: `border({ top: () => label('Header'), center: () => vbox(() => { ... }) })`
- **`gridwrap(itemWidth, itemHeight, builder)`**: Grid wrap layout with fixed item sizes
  - `itemWidth`: Fixed width for each item
  - `itemHeight`: Fixed height for each item
  - `builder`: Function that defines grid items
  - Items automatically wrap to next row when horizontal space is exhausted
  - Perfect for image galleries, button grids, icon collections

---

## Container Widgets

- **`card(title, subtitle, builder)`**: Card container with title, subtitle, and content
  - `title`: Card title text
  - `subtitle`: Card subtitle text
  - `builder`: Function that defines card content (must have exactly one child)
  - Example: `card('Profile', 'User information', () => { vbox(() => { ... }) })`

- **`accordion(items)`**: Accordion widget with collapsible sections
  - `items`: Array of {title: string, builder: () => void} objects
  - Each section can be expanded/collapsed independently
  - Saves vertical space by hiding content until needed
  - Example: `accordion([{ title: 'Section 1', builder: () => { vbox(() => { ... }) } }])`

- **`form(items, onSubmit?, onCancel?)`**: Form widget with labeled fields and buttons
  - `items`: Array of {label: string, widget: any} objects defining form fields
  - `onSubmit`: Optional callback when Submit button is clicked
  - `onCancel`: Optional callback when Cancel button is clicked
  - Automatically creates Submit and Cancel buttons if callbacks provided
  - Example: `form([{ label: 'Name', widget: nameEntry }, { label: 'Email', widget: emailEntry }], () => { ... })`

---

## Widgets

### Basic Widgets

- **`button(text, onClick?)`**: Create a button
  - `text`: Button label
  - `onClick`: Click handler (optional)

- **`label(text)`**: Create a label
  - `text`: Label text

- **`entry(placeholder?)`**: Create a text input
  - `placeholder`: Placeholder text (optional)

- **`multilineentry(placeholder?, wrapping?)`**: Create a multi-line text input
  - `placeholder`: Placeholder text (optional)
  - `wrapping`: Text wrapping mode - 'off', 'word', or 'break' (optional, defaults to 'word')
  - Perfect for notes, comments, and longer text input
  - Methods: `setText(text: string)`, `getText(): Promise<string>`

- **`passwordentry(placeholder?)`**: Create a password input (masked text)
  - `placeholder`: Placeholder text (optional)
  - Characters are masked for security
  - Methods: `setText(text: string)`, `getText(): Promise<string>`

### Input Widgets

- **`checkbox(text, onChanged?)`**: Create a checkbox
  - `text`: Checkbox label
  - `onChanged`: Callback when checked state changes (optional)
  - Methods: `setChecked(checked: boolean)`, `getChecked(): Promise<boolean>`

- **`select(options, onSelected?)`**: Create a dropdown select
  - `options`: Array of string options
  - `onSelected`: Callback when selection changes (optional)
  - Methods: `setSelected(value: string)`, `getSelected(): Promise<string>`

- **`slider(min, max, initialValue?, onChanged?)`**: Create a slider
  - `min`: Minimum value
  - `max`: Maximum value
  - `initialValue`: Starting value (optional)
  - `onChanged`: Callback when value changes (optional)
  - Methods: `setValue(value: number)`, `getValue(): Promise<number>`

- **`radiogroup(options, initialSelected?, onSelected?)`**: Create a radio button group
  - `options`: Array of string options
  - `initialSelected`: Initially selected option (optional)
  - `onSelected`: Callback when selection changes (optional)
  - Methods: `setSelected(value: string)`, `getSelected(): Promise<string>`

### Display Widgets

- **`progressbar(initialValue?, infinite?)`**: Create a progress bar
  - `initialValue`: Starting progress value 0.0 to 1.0 (optional)
  - `infinite`: Set to true for indeterminate progress (optional)
  - Methods: `setProgress(value: number)`, `getProgress(): Promise<number>`

- **`separator()`**: Create a visual separator line
  - Creates a horizontal line to visually separate sections
  - Improves UI organization and readability

- **`hyperlink(text, url)`**: Create a clickable hyperlink
  - `text`: Link text to display
  - `url`: URL to open when clicked
  - Opens URL in the default browser
  - Example: `hyperlink('Visit GitHub', 'https://github.com')`

### UI Components

- **`toolbar(items)`**: Create a toolbar with actions
  - `items`: Array of toolbar items with type ('action' | 'separator' | 'spacer'), label, and onAction callback
  - Example: `toolbar([{type: 'action', label: 'Save', onAction: () => save()}, {type: 'separator'}, {type: 'spacer'}])`

### Data Display Widgets

- **`table(headers, data)`**: Create a table with headers and data rows
  - `headers`: Array of column header strings
  - `data`: 2D array of string data (rows x columns)
  - Methods: `updateData(data: string[][])` - Update table contents
  - Example: `table(['Name', 'Age', 'City'], [['John', '30', 'NYC'], ['Jane', '25', 'LA']])`

- **`list(items, onSelected?)`**: Create a scrollable list
  - `items`: Array of string items to display
  - `onSelected`: Callback when an item is selected (optional) - receives (index: number, item: string)
  - Methods: `updateItems(items: string[])` - Update list contents
  - Example: `list(['Item 1', 'Item 2', 'Item 3'], (index, item) => console.log(item))`

### Specialized Widgets

- **`tree(rootLabel)`**: Tree widget for hierarchical data
  - `rootLabel`: Label for the root node
  - Displays hierarchical structure with collapsible branches
  - Perfect for file browsers, organizational charts, nested data
  - Example: `tree('Root Node')`

- **`richtext(segments)`**: Rich text widget with formatted text
  - `segments`: Array of text segments with formatting options
  - Each segment can have `bold`, `italic`, `monospace` properties
  - Example: `richtext([{ text: 'Bold text', bold: true }, { text: ' normal ', bold: false }, { text: 'italic', italic: true }])`
  - Great for formatted documents, help text, mixed formatting

- **`image(path, fillMode?)`**: Image widget for displaying images
  - `path`: File path to the image
  - `fillMode`: How to fit the image - 'contain', 'stretch', or 'original' (optional, default 'contain')
  - Supports common image formats (PNG, JPG, GIF, etc.)
  - Example: `image('/path/to/image.png', 'contain')`

---

## Dialogs

Tsyne provides common dialog methods on the Window class for user interactions:

### Information and Error Dialogs

- **`window.showInfo(title, message)`**: Show an information dialog
  - `title`: Dialog title
  - `message`: Information message to display
  - Returns: `Promise<void>`

- **`window.showError(title, message)`**: Show an error dialog
  - `title`: Dialog title
  - `message`: Error message to display
  - Returns: `Promise<void>`

### Confirmation Dialog

- **`window.showConfirm(title, message)`**: Show a confirmation dialog
  - `title`: Dialog title
  - `message`: Confirmation message
  - Returns: `Promise<boolean>` - true if confirmed, false if cancelled

### File Dialogs

- **`window.showFileOpen()`**: Show a file open dialog
  - Returns: `Promise<string | null>` - selected file path or null if cancelled

- **`window.showFileSave(filename?)`**: Show a file save dialog
  - `filename`: Default filename (optional, defaults to 'untitled.txt')
  - Returns: `Promise<string | null>` - selected file path or null if cancelled

### Custom Dialogs

- **`window.showCustom(title, contentBuilder, options?)`**: Show a custom dialog with arbitrary content
  - `title`: Dialog title
  - `contentBuilder`: Function that builds the dialog content using the app context
  - `options.dismissText`: Text for the dismiss button (optional, default 'Close')
  - `options.onClosed`: Callback when dialog is closed (optional)
  - Returns: `Promise<void>` - resolves when dialog is closed

- **`window.showCustomConfirm(title, contentBuilder, options?)`**: Show a custom dialog with confirm/cancel buttons
  - `title`: Dialog title
  - `contentBuilder`: Function that builds the dialog content using the app context
  - `options.confirmText`: Text for the confirm button (optional, default 'OK')
  - `options.dismissText`: Text for the dismiss button (optional, default 'Cancel')
  - Returns: `Promise<boolean>` - true if confirmed, false if cancelled

### Dialog Examples

```typescript
// Information dialog
await win.showInfo('Success', 'File saved successfully!');

// Error dialog
await win.showError('Error', 'Failed to connect to server');

// Confirmation dialog
const confirmed = await win.showConfirm(
  'Delete File',
  'Are you sure you want to delete this file?'
);
if (confirmed) {
  // Delete the file
}

// File open dialog
const filePath = await win.showFileOpen();
if (filePath) {
  console.log('Selected file:', filePath);
}

// File save dialog
const savePath = await win.showFileSave('document.txt');
if (savePath) {
  console.log('Save to:', savePath);
}

// Custom dialog with arbitrary content
await win.showCustom('About', () => {
  app.vbox(() => {
    app.label('My Application v1.0');
    app.label('Built with Tsyne');
  });
}, { dismissText: 'OK' });

// Custom confirm dialog
const accepted = await win.showCustomConfirm('License Agreement', () => {
  app.vbox(() => {
    app.label('Terms and Conditions');
    app.label('Do you accept the license?');
  });
}, {
  confirmText: 'Accept',
  dismissText: 'Decline'
});
if (accepted) {
  // User accepted the license
}
```

---

## Menu Bar

Create application menus using `window.setMainMenu()`:

```typescript
await win.setMainMenu([
  {
    label: 'File',
    items: [
      {
        label: 'New',
        onSelected: () => { /* handle new */ }
      },
      {
        label: 'Open...',
        onSelected: async () => {
          const filePath = await win.showFileOpen();
          // handle open
        }
      },
      {
        isSeparator: true  // Menu separator
      },
      {
        label: 'Exit',
        onSelected: () => { /* handle exit */ }
      }
    ]
  },
  {
    label: 'Edit',
    items: [
      {
        label: 'Cut',
        onSelected: () => { /* handle cut */ }
      },
      {
        label: 'Copy',
        onSelected: () => { /* handle copy */ }
      },
      {
        label: 'Paste',
        onSelected: () => { /* handle paste */ },
        disabled: true  // Optional: disable menu item
      }
    ]
  },
  {
    label: 'View',
    items: [
      {
        label: 'Fullscreen',
        checked: false,  // Optional: checkmark indicator
        onSelected: async () => {
          await win.setFullScreen(true);
        }
      }
    ]
  }
]);
```

**Menu item properties:**
- **`label`**: Menu item text
- **`onSelected`**: Callback when item is clicked
- **`isSeparator`**: Set to true for separator line (optional)
- **`disabled`**: Disable the menu item (optional)
- **`checked`**: Show checkmark (optional)

---

## Widget Methods

### Common Methods

Common methods supported by most widgets:

- **`setText(text: string)`**: Update widget text (Button, Label, Entry)
- **`getText(): Promise<string>`**: Get widget text (Button, Label, Entry)

### Widget-Specific Methods

- **Checkbox**: `setChecked(checked: boolean)`, `getChecked(): Promise<boolean>`
- **Select**: `setSelected(value: string)`, `getSelected(): Promise<string>`
- **Slider**: `setValue(value: number)`, `getValue(): Promise<number>`
- **RadioGroup**: `setSelected(value: string)`, `getSelected(): Promise<string>`
- **ProgressBar**: `setProgress(value: number)`, `getProgress(): Promise<number>`

### Visibility Control

All widgets support:

- **`hide()`**: Hide the widget
- **`show()`**: Show the widget
- **`when(() => boolean)`**: Declarative visibility (returns `this` for chaining)
- **`refresh()`**: Re-evaluate visibility conditions

VBox/HBox containers also support:

- **`model<T>(items: T[])`**: Create ModelBoundList for smart list rendering
- **`refreshVisibility()`**: Update visibility of all children

---

## Related Documentation

- **[README.md](../README.md)** - Getting started and overview
- **[reference.md](reference.md)** - Comprehensive reference including architecture, MVC, and testing
- **[TESTING.md](TESTING.md)** - TsyneTest framework guide
- **[PATTERNS.md](PATTERNS.md)** - Architectural patterns (MVC, MVVM, MVP)
