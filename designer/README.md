# Tsyne WYSIWYG Designer

A 100% self-contained WYSIWYG visual editor for Tsyne applications. This is a complete sub-project within the Tsyne repository providing design-time tooling for building Tsyne GUIs.

## Features

- **Visual Widget Tree** - Hierarchical view of all widgets in your application
- **Property Inspector** - Real-time property editing
- **Live Preview** - See your UI structure as you build
- **Widget Palette** - Add new widgets from a categorized palette
- **Source Code Persistence** - All changes saved back to TypeScript files
- **Complete Tsyne ABI Emulation** - Supports all Tsyne widget types and containers
- **Multi-line Widget Support** - Correctly handles complex widgets with callbacks

## Architecture

This designer is a complete sub-project with:
- TypeScript source code (`src/`)
- Web-based UI (`public/`)
- Unit tests (Jest)
- End-to-end tests (Jest)
- Independent build system
- Self-contained HTTP server

```
┌─────────────────────────────────────────────────────────┐
│                   Browser UI                            │
│  ┌────────────┬─────────────┬──────────────────────┐   │
│  │ Widget     │  Preview    │  Widget Palette &    │   │
│  │ Tree       │  Panel      │  Property Inspector  │   │
│  └────────────┴─────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ HTTP/JSON API
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Node.js Server (TypeScript)                │
│  - Load & execute Tsyne files in design mode            │
│  - Capture widget metadata via ABI emulation            │
│  - Edit source code programmatically                    │
│  - Save changes back to .ts files                       │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
cd designer
npm install

# Build TypeScript
npm run build

# Start the server
npm start

# Open your browser
open http://localhost:3000
```

## Usage

1. Select a file from the dropdown (hello.ts, calculator.ts, or todomvc.ts) and click **"Load"**
2. Select widgets in the tree to view/edit properties
3. Use the widget palette to add new widgets
4. Click **"Save Changes"** to save to `[filename].edited.ts`

## Testing

This project has two independent test suites:

### Unit Tests (Jest)
Tests for core functionality like metadata storage and stack trace parsing:

```bash
npm run test:unit
```

**Test files:**
- `__tests__/unit/metadata.test.ts`
- `__tests__/unit/stack-trace-parser.test.ts`

### End-to-End Tests (Jest)
Tests for API endpoints and source code persistence:

```bash
# Start the server first
npm start

# In another terminal
npm run test:e2e
```

**Test files:**
- `__tests__/e2e/designer.test.ts`

### Run All Tests

```bash
npm test
```

**Current Test Status:** ✅ 22/22 tests passing

## Project Structure

```
designer/
├── src/                    # TypeScript source code
│   ├── server.ts          # Main HTTP server with API
│   ├── metadata.ts        # Widget metadata storage
│   └── stack-trace-parser.ts  # Source location capture
├── public/                # Web UI
│   ├── index.html        # Designer UI
│   └── editor.js         # Client-side logic
├── __tests__/            # Test suites
│   ├── unit/            # Jest unit tests
│   └── e2e/             # End-to-end tests
├── dist/                 # Compiled JavaScript (generated)
├── package.json         # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── jest.config.js      # Jest configuration
```

## API Endpoints

### POST /api/load
Load a TypeScript file and return widget metadata.

**Request:**
```json
{
  "filePath": "examples/hello.ts"
}
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "widgets": [...]
  },
  "filePath": "examples/hello.ts"
}
```

### POST /api/add-widget
Add a new widget to a container.

**Request:**
```json
{
  "parentId": "widget-1",
  "widgetType": "label"
}
```

**Response:**
```json
{
  "success": true,
  "widgetId": "widget-5",
  "metadata": { ... }
}
```

### POST /api/update-property
Update a widget property value.

**Request:**
```json
{
  "widgetId": "widget-2",
  "propertyName": "text",
  "newValue": "Hello World"
}
```

### POST /api/delete-widget
Remove a widget from the tree.

**Request:**
```json
{
  "widgetId": "widget-3"
}
```

### POST /api/save
Save all pending changes to a `.edited.ts` file.

**Response:**
```json
{
  "success": true,
  "outputPath": "examples/hello.edited.ts"
}
```

## Development

### Build and Watch
```bash
npm run watch
```

### Development Server
```bash
npm run dev
```

## Supported Widgets

The designer emulates the complete Tsyne ABI and supports all widget types:

**Containers:** window, vbox, hbox, scroll, grid, gridwrap, center, border, split, tabs, card, accordion, form

**Input Widgets:** button, entry, multilineentry, passwordentry, checkbox, select, radiogroup, slider

**Display Widgets:** label, hyperlink, separator, progressbar, image, richtext, table, list, tree, toolbar

## Bug Fixes

This consolidated version includes fixes for:

1. **Widget Addition Bug** - Adding widgets to containers now correctly updates the UI without reloading the file from disk
2. **File Selector** - Provides dropdown to select from available example files (hello.ts, calculator.ts, todomvc.ts)
3. **TypeScript Transpilation** - Uses proper TypeScript compiler API instead of regex for accurate type stripping

## Design Principles

1. **100% Self-Contained** - No dependencies on parent project during runtime
2. **No Temp Files at Root** - All temporary files in `/tmp` with cleanup
3. **Idiomatic Tests** - Standard Jest test patterns
4. **Clean Separation** - Unit tests and E2E tests in separate suites
5. **Type-Safe** - Full TypeScript with strict mode

## License

MIT
