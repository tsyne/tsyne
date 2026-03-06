# Edlin Text Editor

A line-oriented text editor for Tsyne, ported from the original Go/Fyne application.

![Edlin Screenshot](../screenshots/edlin.png)

## Origin

Ported from [edlin](https://github.com/bshofner/edlin) by Bob Shofner.

**Original License:** MIT License - https://opensource.org/license/mit/

## Features

- **Multi-tab editing** - Open and edit multiple documents simultaneously
- **File operations** - New, Open, Save with native file dialogs
- **Edit operations** - Undo, Redo, Cut, Copy, Paste, Select All
- **Search/Replace** - Find text with case-insensitive option, replace one or all
- **Unicode support** - Full Unicode text including CJK characters
- **Help system** - Context-sensitive help for all features

## Running

### Standalone

```bash
npx tsx ported-apps/edlin/edlin.ts
```

### In PhoneTop

The app is automatically discovered by PhoneTop and appears in the Utilities folder.

## Architecture

```
edlin/
  edlin.ts           # Main app with UI and menus
  edlin-store.ts     # Document state management
  edlin-store.test.ts    # Jest unit tests for store
  edlin.test.ts      # TsyneTest integration tests
  README.md          # This file
```

### Store Pattern

The app follows the MVC pattern used by other Tsyne apps:

- **EdlinStore** - Manages multiple documents, clipboard, search operations
- **DocumentStore** - Individual document with content, undo/redo stack
- **EdlinApp** - UI component with menus, tabs, and editor widgets

## Testing

### Unit Tests (Jest)

```bash
npm test ported-apps/edlin/edlin-store.test.ts
```

Tests cover:
- Document creation and management
- Content manipulation
- Undo/Redo operations
- Search and replace functionality
- Change notification system

### Integration Tests (TsyneTest)

```bash
npm test ported-apps/edlin/edlin.test.ts
```

Visual debugging:
```bash
TSYNE_HEADED=1 npm test ported-apps/edlin/edlin.test.ts
```

### Screenshots

Generate screenshot:
```bash
TSYNE_HEADED=1 TAKE_SCREENSHOTS=1 npm test ported-apps/edlin/edlin.test.ts
```

## Menu Reference

### File Menu

| Item | Description |
|------|-------------|
| New | Create a new empty document |
| Open... | Open a file from disk |
| Save... | Save current document |
| Close Tab | Close the current tab |

### Edit Menu

| Item | Shortcut | Description |
|------|----------|-------------|
| Undo | Ctrl+Z | Undo last change |
| Redo | Ctrl+Y | Redo undone change |
| Cut | Ctrl+X | Cut selected text |
| Copy | Ctrl+C | Copy selected text |
| Paste | Ctrl+V | Paste from clipboard |
| Select All | Ctrl+A | Select all text |
| Find/Replace... | Ctrl+F | Open search dialog |

### Help Menu

Contextual help for File Menu, Edit Menu, Shortcuts, and Search operations.

## Differences from Go Version

The TypeScript port uses Tsyne's built-in `MultilineEntry` widget for text editing, rather than the custom `TextList` widget from the Go version. This provides:

- Standard text editing behavior
- Native keyboard shortcuts
- Consistent look across platforms

The line-marking feature (Begin ^M, End ^E) from the Go version is not implemented, as `MultilineEntry` handles text selection natively.

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | Uses `border(top: toolbar, center: editor)` layout for document view. DocTabs for multi-document editing. Menu system with File/Edit/Help menus |
| **Core declarative** | Fluent method chaining | 4/10 | `.withId()` on path label (`path-{docId}`) and editor (`editor-{docId}`). Limited IDs overall. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 3/10 | No loop-based UI generation. Menu items manually listed. Tabs managed by DocTabs widget |
| **State architecture** | Observable store | 8/10 | Two-level store: `EdlinStore` (multi-document manager) + `DocumentStore` (per-document). Both with `subscribe()`/`notifyChange()`. Defensive copies via `getDocument()`. Counter-based IDs (`doc-${nextDocId}`). Undo/redo stacks, clipboard, search/replace |
| **Declarative updates** | `.when()` + `.bindTo()` | 2/10 | No `.when()`, no `.bindTo()`, no `.bindText()`. 4 `setText()` calls for path label and editor content. Tab switching managed by DocTabs onChange. `showForm()` used for Find/Replace dialog |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — initial setup only. Editor widgets stored in Map for incremental updates |
| **Testing** | `.withId()` coverage | 4/10 | Per-document IDs on path label and editor. Minimal but sufficient for tab-based testing |
| **Design** | Separation of concerns | 8/10 | `EdlinStore` + `DocumentStore` handle all document/clipboard/search logic (no UI). `buildEdlinApp()` is purely presentational. Menu handlers delegate to store. Clean two-level store hierarchy |
| | **Overall** | **5/10** | Strong two-level Observable store with undo/redo, clipboard, and search. `showForm()` for Find/Replace is a good declarative dialog pattern. But no `.when()`, `.bindTo()`, or reactive bindings — updates flow through `setText()` and manual widget management. The text editor paradigm (single large MultiLineEntry per document) limits opportunities for declarative list/view patterns |

## License

MIT License - Same as the original edlin project.

Based on the original Go/Fyne application by Bob Shofner.
