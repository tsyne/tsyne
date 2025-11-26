# Fyles - File Browser for Tsyne

A simple file browser application ported from [FyshOS/fyles](https://github.com/FyshOS/fyles).

![Fyles Screenshot](../screenshots/fyles.png)

## Features

- **Directory Navigation**: Browse your filesystem with an intuitive interface
- **File Grid View**: View files and folders as icons with names
- **Navigation Panel**: Quick access to subdirectories
- **Toolbar**: Home button, new folder creation, hidden file toggle
- **Hidden Files**: Toggle visibility of hidden files (starting with `.`)
- **File Icons**: Visual distinction between file types using emojis
- **File Operations**: Open files with default applications
- **MVC Architecture**: Clean separation using observable store pattern
- **Context Menus**: Right-click on files/folders for Open and Copy path options
- **New Folder Dialog**: Create folders via dialog prompt
- **Clipboard Integration**: Copy file and folder paths to clipboard
- **Drag-and-Drop**: Drag files and folders to move them into other folders

## Architecture

This is an idiomatic Tsyne implementation following the MVC pattern demonstrated in the TodoMVC example:

### File Structure

```
examples/fyles/
├── fyles.ts                    # Main UI (View + Controller)
├── fyles-store.ts              # Observable store (Model)
├── file-item.ts                # File item data model
├── file-utils.ts               # Utility functions
├── fyles.test.ts               # UI integration tests
├── fyles-navigation.test.ts    # Navigation tests
└── README.md                   # This file
```

### MVC Components

**Model (fyles-store.ts)**
- `FylesStore` - Observable store with change listeners
- Manages current directory, file items, visibility settings
- Provides navigation methods (navigateToDir, navigateUp, navigateHome)
- Implements file operations (createFolder, moveItem, copyItem, refresh)

**View (fyles.ts)**
- `FylesUI` class - Builds and manages the UI
- Three main sections:
  - Toolbar (top): Home, New Folder, Toggle Hidden, Current Path
  - Navigation Panel (left): Parent folder, subdirectories
  - File Grid (center): Files and folders as clickable items

**Controller (fyles.ts)**
- Event handlers for user interactions
- Subscribes to store changes and rebuilds UI
- Handles navigation, file operations, dialogs

### Widget Hierarchy

```
Window
└── Border
    ├── Top: Toolbar (HBox)
    │   ├── Home Button (🏠)
    │   ├── New Folder Button (📁+)
    │   ├── Toggle Hidden Button (👁️)
    │   └── Current Path (Scrollable Label)
    │
    ├── Left: Navigation Panel (Scroll + VBox)
    │   ├── Parent Button (⬆️ ..)
    │   ├── Current Folder Label
    │   └── Subdirectory Buttons
    │
    └── Center: File Grid (Scroll + GridWrap)
        └── File Items (VBox: Icon + Name + Size)
```

## Usage

### Running the App

```bash
# Build Tsyne
npm run build

# Run with default directory (home)
npm start examples/fyles/fyles.ts

# Run with specific directory
npm start examples/fyles/fyles.ts /path/to/directory
```

### Running Tests

```bash
# Run all fyles tests
npm test examples/fyles/

# Run specific test file
npm test examples/fyles/fyles.test.ts
npm test examples/fyles/fyles-navigation.test.ts

# Run in headed mode (see the GUI)
TSYNE_HEADED=1 npm test examples/fyles/fyles.test.ts

# Take screenshots
TAKE_SCREENSHOTS=1 npm test examples/fyles/fyles.test.ts
```

## Differences from Original Fyles

This Tsyne port is a simplified version focusing on core functionality:

### Implemented Features
✅ Directory tree navigation
✅ File grid view with icons
✅ Toolbar (home, new folder, current path)
✅ Hidden file filtering
✅ File/folder click to navigate/open
✅ Parent directory navigation
✅ Observable store pattern (MVC)
✅ Right-click context menus (Open, Copy path) for files and folders
✅ New Folder dialog with entry prompt
✅ Clipboard support for copying file/folder paths
✅ Drag-and-drop file operations (move files by dragging to folders)

### Simplified/Omitted Features
❌ Multi-panel view (original supports multiple side-by-side panels)
❌ Custom URI schemes for favorites (tree:///)
❌ Fancy folder backgrounds (fancyfs metadata)
❌ "Open With" application picker (uses simple xdg-open)
❌ Tree expansion state persistence

These features could be added in future iterations.

## Test Coverage

The test suite demonstrates Tsyne's fluent testing style:

**fyles.test.ts** - UI and functionality tests
- Toolbar visibility
- File/folder display
- Hidden file toggle
- Directory navigation
- File size display

**fyles-navigation.test.ts** - Navigation behavior tests
- Multi-level directory navigation
- Parent directory navigation
- Home directory navigation
- Navigation panel updates
- Deep nested folder handling

## Code Examples

### Creating the App

```typescript
import { app } from '../../src';
import { createFylesApp } from './fyles';
import * as os from 'os';

app({ title: 'Fyles' }, (a) => {
  createFylesApp(a, os.homedir());
});
```

### Observable Store Pattern

```typescript
// Store subscription (in FylesUI constructor)
this.store.subscribe(() => {
  this.refreshUI();
});

// Navigation triggers store update
await this.store.navigateToDir('/some/path');
// → Store updates, notifies listeners, UI refreshes automatically
```

### Fluent Test Style

```typescript
// Using fluent assertions with timeouts
await ctx.getByText('🏠').within(2000).shouldExist();

// Click and wait for state change
await ctx.getByText('subfolder').click();
await ctx.wait(200);
await ctx.getByText(expectedPath).within(2000).shouldExist();
```

## Implementation Notes

### File Icons

Uses emoji for file type visualization:
- 📁 Folders
- 🖼️ Images (png, jpg, svg, etc.)
- 📄 Documents (pdf, doc, etc.)
- 💻 Code files (ts, js, py, etc.)
- 🎵 Audio files
- 🎬 Video files
- 📦 Archives
- 📃 Default files

### Platform Support

File opening uses platform-specific commands:
- Linux: `xdg-open`
- macOS: `open`
- Windows: `start`

### Error Handling

All file system operations are wrapped in try/catch blocks with console error logging. Failed operations don't crash the app but log errors for debugging.

## Credits

Original Fyles implementation: [FyshOS/fyles](https://github.com/FyshOS/fyles)

Ported to Tsyne as an educational example of MVC architecture and file system interaction.

## License

See original repository for license information.
