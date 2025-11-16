# Tsyne Visual Editor

A web-based WYSIWYG interface builder for Tsyne applications.

## Features

- **Widget Tree View** - Hierarchical view of all widgets
- **Property Inspector** - Edit widget properties in real-time
- **Live Preview** - See a preview of your UI
- **Source Code Editing** - Changes are saved back to TypeScript files

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

- `POST /api/load` - Load a file and return metadata
- `POST /api/update-property` - Update a widget property
- `POST /api/save` - Save changes to .edited.ts file

## Milestone Status

✅ **Milestone 2 Features Implemented:**
- Widget tree view with hierarchical display
- Property inspector with editable fields
- Live preview panel
- Widget selection
- Property editing
- Source code save functionality

## Next Steps

- Add drag-and-drop for reordering widgets
- Add widget palette for adding new widgets
- Support for more widget types
- Monaco code editor for event handlers
- Hot reload for instant preview updates
