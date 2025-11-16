# Tsyne Visual Editor

A web-based WYSIWYG interface builder for Tsyne applications.

## Features

- **Widget Tree View** - Hierarchical view of all widgets
- **Property Inspector** - Edit widget properties in real-time
- **Live Preview** - See a preview of your UI
- **Widget Palette** - Add new widgets from a categorized palette
- **Add/Delete Widgets** - Dynamically add and remove widgets
- **Source Code Persistence** - All changes saved back to TypeScript files
- **Multi-line Widget Support** - Correctly handles complex widgets (buttons with callbacks, etc.)

## How to Run

```bash
# Start the server
node server.js

# Open your browser
open http://localhost:3000
```

## Usage

1. Click **"Load File"** to load `examples/hello.ts`
2. Click on any widget in the tree to select it
3. Edit properties in the right panel
4. Click **"Save Changes"** to save to `hello.edited.ts`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (UI)                          │
│  ┌────────────┬─────────────┬──────────────────────┐   │
│  │ Widget     │  Preview    │  Property            │   │
│  │ Tree       │  Panel      │  Inspector           │   │
│  └────────────┴─────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ HTTP API
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Node.js Server (Backend)                   │
│  - Load files in designer mode                          │
│  - Execute TypeScript with designer API                 │
│  - Capture widget metadata                              │
│  - Edit source code (text-based)                        │
│  - Save changes back to .ts files                       │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints

- `POST /api/load` - Load a TypeScript file and return widget metadata
- `POST /api/update-property` - Update a widget property value
- `POST /api/add-widget` - Add a new widget to a container
- `POST /api/delete-widget` - Remove a widget from the tree
- `POST /api/save` - Save all changes to .edited.ts file

## Testing

```bash
# Run integration tests
bash run-visual-editor-test.sh

# Run add/delete persistence test
node test-add-delete-persistence.js
```

## Screenshots

To capture screenshots for documentation:

```bash
# Automated (requires Puppeteer)
TAKE_SCREENSHOTS=1 node visual-editor/capture-screenshots.js

# Manual
# 1. Start server: node server.js
# 2. Open http://localhost:3000
# 3. Capture screenshots at 1400x900 resolution
```

See [SCREENSHOTS.md](SCREENSHOTS.md) for detailed instructions.

## Milestone Status

✅ **Milestone 3 Complete:**
- ✅ Full widget support (20+ widget types)
- ✅ Widget palette with categorized widgets
- ✅ Add widget functionality
- ✅ Delete widget functionality (including multi-line widgets)
- ✅ Source code persistence for add/delete operations
- ✅ Comprehensive test coverage

## Next Steps

- Drag-and-drop for reordering widgets
- Monaco code editor for event handlers
- Hot reload for instant preview updates
- Undo/redo functionality
