# Fyles - File Browser for Tsyne

A simple file browser application ported from [FyshOS/fyles](https://github.com/FyshOS/fyles).

![Fyles Screenshot](../screenshots/fyles.png)

## Features

- **Directory Navigation**: Browse your filesystem with an intuitive interface
- **File Grid View**: View files and folders as icons with names
- **Navigation Panel**: Expandable tree view of subdirectories with state persistence
- **Toolbar**: Home button, new folder creation, hidden file toggle
- **Hidden Files**: Toggle visibility of hidden files (starting with `.`)
- **File Icons**: Visual distinction between file types using emojis
- **File Operations**: Open files with default applications
- **MVC Architecture**: Clean separation using observable store pattern
- **Context Menus**: Right-click on files/folders for Open and Copy path options
- **New Folder Dialog**: Create folders via dialog prompt
- **Clipboard Integration**: Copy file and folder paths to clipboard
- **Drag-and-Drop**: Drag files and folders to move them into other folders
- **Multi-Panel View**: Open multiple panels side-by-side for easy file operations
- **Cross-Panel Operations**: Drag files from one panel to another

## Architecture

This is an idiomatic Tsyne implementation following the MVC pattern demonstrated in the TodoMVC example:

### File Structure

```
examples/fyles/
├── fyles.ts                         # Main UI (View + Controller)
├── fyles-store.ts                   # Observable store (Model)
├── file-item.ts                     # File item data model
├── file-utils.ts                    # Utility functions
├── fyles.test.ts                    # UI integration tests
├── fyles-navigation.test.ts         # Navigation tests
├── fyles-tree-persistence.test.ts   # Tree expansion & persistence tests
├── fyles-multipanel.test.ts         # Multi-panel integration tests
└── README.md                        # This file
```

### MVC Components

**Model (fyles-store.ts)**
- `FylesStore` - Observable store with change listeners
- Manages current directory, file items, visibility settings, expanded tree state
- Provides navigation methods (navigateToDir, navigateUp, navigateHome)
- Implements file operations (createFolder, moveItem, copyItem, refresh)
- Persists state to `~/.tsyne/fyles-state.json`

**View (fyles.ts)**
- `FylesMultiPanel` class - Manages multiple panels using hsplit
- `FylesPanel` class - Builds and manages a single panel
- `FylesUI` class - Backwards-compatible single-panel wrapper
- Three main sections per panel:
  - Toolbar (top): Home, New Folder, Toggle Hidden, Split (⊞), Close (✕), Current Path
  - Navigation Panel (left): Parent folder, expandable tree of subdirectories
  - File Grid (center): Files and folders as clickable items

**Controller (fyles.ts)**
- Event handlers for user interactions
- Subscribes to store changes and rebuilds UI
- Handles navigation, file operations, dialogs
- Multi-panel coordination (split, close, cross-panel operations)

### Widget Hierarchy

```
Window
└── HSplit (for multiple panels)
    ├── Panel 1 (Border)
    │   ├── Top: Toolbar (HBox)
    │   │   ├── Home Button (🏠)
    │   │   ├── New Folder Button (📁+)
    │   │   ├── Toggle Hidden Button (👁️)
    │   │   ├── Split Button (⊞)
    │   │   ├── Close Button (✕) - only with multiple panels
    │   │   └── Current Path (Scrollable Label)
    │   │
    │   ├── Left: Navigation Panel (Scroll + VBox)
    │   │   ├── Parent Button (⬆️ ..)
    │   │   ├── Current Folder Label + Collapse All Button (⏫)
    │   │   └── Tree Nodes (HBox: Expand Toggle + Folder Button)
    │   │       └── Child Tree Nodes (recursive, indented)
    │   │
    │   └── Center: File Grid (Scroll + VBox)
    │       └── File Items (HBox: Icon + Name + Size)
    │
    └── Panel 2, 3, ... (same structure)
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

# Run with multiple panels (specify multiple directories)
npm start examples/fyles/fyles.ts /path/one /path/two

# Split into three panels
npm start examples/fyles/fyles.ts ~/Documents ~/Downloads ~/Pictures
```

### Multi-Panel Usage

- Click the **Split button (⊞)** in any panel's toolbar to create a new panel
- The new panel opens showing the same directory as the source panel
- Click the **Close button (✕)** to close a panel (only visible with multiple panels)
- **Drag files** from one panel and drop into folders in another panel

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
✅ Toolbar (home, new folder, split, close, current path)
✅ Hidden file filtering
✅ File/folder click to navigate/open
✅ Parent directory navigation
✅ Observable store pattern (MVC)
✅ Right-click context menus (Open, Copy path) for files and folders
✅ New Folder dialog with entry prompt
✅ Clipboard support for copying file/folder paths
✅ Drag-and-drop file operations (move files by dragging to folders)
✅ Tree expansion state persistence (expand/collapse folders, survives restart)
✅ Multi-panel view (multiple side-by-side panels with hsplit)
✅ Cross-panel drag-and-drop (move files between panels)

### Simplified/Omitted Features
❌ Custom URI schemes for favorites (tree:///)
❌ Fancy folder backgrounds (fancyfs metadata)
❌ "Open With" application picker (uses simple xdg-open)

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

**fyles-tree-persistence.test.ts** - Tree expansion and persistence tests
- Expand/collapse folder state management
- Subdirectory retrieval
- State persistence to file
- State restoration on app restart
- Corrupted/missing state file handling
- Change notification on expansion changes
- File move/copy operations
- Multi-panel independent state

**fyles-multipanel.test.ts** - Multi-panel integration tests
- Two-panel initial layout
- Split button functionality
- Close button functionality
- Independent panel navigation
- Cross-panel file display

## Code Examples

### Creating the App

```typescript
import { app } from '../../src';
import { createFylesApp, createMultiPanelFylesApp } from './fyles';
import * as os from 'os';

// Single panel
app({ title: 'Fyles' }, (a) => {
  createFylesApp(a, os.homedir());
});

// Multiple panels
app({ title: 'Fyles' }, (a) => {
  createMultiPanelFylesApp(a, ['/path/one', '/path/two']);
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

### Tree Expansion State Persistence

```typescript
// Expand/collapse folders in navigation panel
await this.store.toggleExpanded('/path/to/folder');

// Check if folder is expanded
if (this.store.isExpanded('/path/to/folder')) {
  // Show child folders
  const children = this.store.getSubdirectories('/path/to/folder');
}

// Collapse all expanded folders
await this.store.collapseAll();

// State is automatically persisted to ~/.tsyne/fyles-state.json
// and restored on next app launch
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
