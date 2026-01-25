# Disk Tree App

A cross-platform utility to visually show the disk space used by folders, subfolders and files.

## Features

- **Tree-based visualization** - Display folder hierarchy with sizes
- **Real-time scanning** - Progressive results as directories are processed
- **Sorting options** - Sort by name (alphabetical) or by size (largest first)
- **Formatted output** - Sizes displayed in B, KB, MB, GB, or TB
- **Error handling** - Gracefully skips inaccessible files and directories
- **Detailed statistics** - Track files scanned, directories scanned, and total size

## How to Use

### Scanning a Folder
1. Launch the Disk Tree app
2. Click "Open Folder" to select a directory
3. The app scans the folder tree and displays results
4. Results show in a hierarchical tree with file/folder icons and sizes

### Viewing Results
- **File icon (📄)** - Indicates a file with its size
- **Folder icon (📁)** - Indicates a directory with total size (including contents)
- **Indentation** - Shows folder nesting levels

### Sorting
- Click "Sort by Size" to organize by file/folder size (largest first)
- Click "Sort by Name" to alphabetically organize by name

### Statistics
The status bar shows:
- **Files**: Total number of files scanned
- **Dirs**: Total number of directories scanned
- **Total**: Combined size of all files and directories

## Architecture

The Disk Tree app uses Tsyne's declarative MVC pattern:

- **Model**: `DiskTreeNode` tree structure with `ScanStats` for progress tracking
- **View**: Widgets display tree hierarchy, buttons for actions, labels for stats
- **Controller**: Button handlers manage folder selection and sorting

### File System Operations
- Uses Node.js `fs` module for directory traversal
- Recursive directory scanning for accurate size calculation
- Error handling for permission-denied and missing files
- Efficient path joining with `path` module

### Tree Rendering
- Hierarchical display with indentation for nesting
- Dynamic sorting (by name or size) with node reordering
- Lazy loading compatible (can be extended for very large trees)

## Code Example

```typescript
import { buildDiskTreeApp } from './disk-tree';
import { app } from './src';

app({ title: 'Disk Tree' }, (a) => {
  a.window({ title: 'Disk Tree', width: 800, height: 600 }, (win) => {
    buildDiskTreeApp(a, win);
  });
});
```

## Testing

### Jest Tests
Unit tests for tree logic, byte formatting, and sorting:
```bash
cd phone-apps
npm test -- disk-tree.test.ts
```

Coverage includes:
- Byte formatting (B, KB, MB, GB, TB)
- Tree node creation and structure
- Sorting (by name and size)
- Statistics tracking
- Path handling

### TsyneTest Tests
UI interaction tests:
```bash
cd core
npm test -- disk-tree-tsyne
```

Coverage includes:
- Initial UI rendering
- Control button functionality
- Status display
- Tree placeholder when no folder selected

## Performance Considerations

- **Large directories**: The app recursively scans all subdirectories. Very large directory trees may take time to complete.
- **Permission errors**: Files and directories the user cannot access are skipped silently.
- **Real-time updates**: The current implementation loads the full tree before display. Can be extended with progressive updates during scanning.

## Files

- `disk-tree.ts` - Main implementation (phone-apps and core/src)
- `disk-tree.test.ts` - Jest unit tests (phone-apps)
- `disk-tree-tsyne.test.ts` - Tsyne UI tests (phone-apps and core/src)

## License

MIT License

Portions copyright original team and portions copyright Paul Hammant 2025

This is a port of the Disk Tree application (https://github.com/Roemer/disk-tree) to Tsyne.
