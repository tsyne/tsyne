# Tsyne Designer - Status & Roadmap

**Last Updated**: 2025-11-22

## Overview

The Tsyne Designer is a WYSIWYG interface builder for Tsyne applications. Inspired by Action! (Denny Bollay, 1988), it uses an **execution-based approach** - running TypeScript code in a design context rather than parsing ASTs.

**Core Principle**: Execute, don't parse. The designer runs your code and intercepts widget creation to capture metadata.

---

## Current Status: Production-Ready Core

### What Works Today

#### Core Infrastructure
- **Metadata Capture System** - Captures widget type, properties, source location (file:line:column), parent-child relationships
- **Stack Trace Parsing** - Extracts source locations from Node.js stack traces
- **Text-Based Source Editing** - Simple, reliable text replacement (no AST complexity)
- **Transformer Plugin System** - Pluggable architecture for source code post-processing
- **ABI Emulation Server** - HTTP server implementing designer API endpoints

#### Visual Editor (Web UI)
- **3-Panel Layout** - Widget tree | Preview | Property inspector
- **Professional Dark Theme** - VS Code-inspired styling
- **Multi-Tab Source View** - Preview, Source Code, Original Source, Diffs

#### Widget Support (25+ types)
| Containers | Inputs | Display |
|------------|--------|---------|
| vbox, hbox | button | label |
| grid, gridwrap | entry, multilineentry | image |
| scroll | passwordentry | hyperlink |
| hsplit, vsplit | checkbox | separator |
| tabs | select | progressbar |
| card | radiogroup | table, list, tree |
| accordion | slider | toolbar |
| form, border, center | | window, app |

#### Editing Features
- **Property Editing** - Dynamic inputs per widget type with real-time updates
- **Widget Palette** - Add new widgets to containers
- **Delete Widgets** - Remove with confirmation
- **Duplicate Widgets** - Ctrl+D with new IDs
- **CSS Classes Editor** - Full modal for managing styles
- **Undo/Redo** - Command pattern with Ctrl+Z/Y
- **Search/Find** - By type, ID, property, source text
- **Context Menu** - Right-click operations
- **withId() Support** - Add/rename/remove user-defined widget IDs
- **Accessibility Editing** - `.description()`, `.role()`, `.label()`, `.hint()`
- **Mouse Events** - `onMouseIn()`, `onMouseMoved()`, `onMouseOut()`, `onMouse()`
- **when() Preservation** - Conditional visibility maintained

#### Code Generation
- Proper import statements
- CSS `styles()` function generation
- Event handler preservation
- Method chaining (accessibility, mouse events)
- Clean Git-friendly diffs

#### Testing
- **80 Roundtrip Tests** - Bidirectional transformation validation
- **25+ Unit Tests** - CSS editor, metadata, parsing, undo-redo
- **E2E Tests** - Full designer integration

---

## Remaining Work

### High Priority

#### 1. Drag-and-Drop Widget Reordering
**Status**: Not implemented
**Impact**: High - essential for visual editing UX

Currently widgets can only be added or deleted. Users should be able to drag widgets within the tree to reorder siblings or move between containers.

**Implementation Notes**:
- HTML5 drag and drop API
- Visual drop indicators
- Validation (can't drop container inside itself)
- Update both model and source on drop

#### 2. Monaco Editor for Event Handlers
**Status**: Not implemented
**Impact**: High - event handlers are currently read-only

Event handlers display as strings but can't be edited. Integrate Monaco editor for:
- TypeScript intellisense
- Syntax highlighting
- Inline editing in property inspector or modal

#### 3. Multi-Select
**Status**: Not implemented
**Impact**: Medium - bulk operations

Shift+click or Ctrl+click to select multiple widgets for:
- Bulk property editing
- Bulk CSS class application
- Bulk delete

### Medium Priority

#### 4. Hot Reload
**Status**: Not implemented (full reload on save)
**Impact**: Medium - faster iteration

Incremental updates instead of full re-execution:
- Debounced reload (500ms after last edit)
- Only re-execute affected widgets
- Maintain UI state across reloads

#### 5. Template/Snippet Library
**Status**: Not implemented
**Impact**: Medium - productivity boost

Pre-built patterns users can drag into their UI:
- Login form
- Navigation bar
- Data table
- Dialog with OK/Cancel
- Toolbar with actions

Storage format: JSON files in `.tsyne/templates/`

#### 6. Mock Data System for Loops
**Status**: Not implemented
**Impact**: Medium - required for `.model().each()` visualization

Two approaches from original vision:
1. **Config file**: `.tsyne-designer/mocks.ts`
2. **Inline comments**: `// @designer-mock: [{"id": 1, ...}]`

Without mocks, loops like `todos.model().each()` can't render sample data in the designer.

#### 7. Visual Container Boundaries
**Status**: Not implemented
**Impact**: Low-Medium - UX improvement

Show dotted outlines on container hover to visualize:
- VBox/HBox boundaries
- Padding and spacing
- Nesting structure

### Lower Priority / Future Vision

#### 8. Design-Time State Preview
**Status**: Not implemented
**Impact**: High (differentiating feature) but complex

The original vision included toggleable state controls:
```
State Preview Controls:
  isEditing: [○ false] [● true]
  filter: [● all] [○ active] [○ completed]
```

This would:
- Auto-detect state variables from `when()` predicates
- Provide toggle UI for booleans and enums
- Re-evaluate visibility conditions when toggled

This was inspired by AngularJS Design Mode but with toggles instead of showing all states simultaneously.

#### 9. Component Extraction
Extract repeated UI patterns into reusable functions:
```typescript
// Before (inline):
a.hbox(() => { checkbox(...); button('Edit'...); button('Delete'...); });

// After (component):
function TodoItem(a, todo, store) { ... }
TodoItem(a, todo, store);
```

#### 10. LLM-Assisted Formatting
The transformer plugin system is ready for LLM integration to:
- Preserve original whitespace style
- Preserve comments not tied to widgets
- Minimize diffs
- Handle complex edge cases

#### 11. Responsive Preview Modes
Toggle between window sizes:
- Mobile, tablet, desktop presets
- Custom size input
- Breakpoint indicators

#### 12. Accessibility Checker
WCAG compliance warnings:
- Missing labels
- Poor contrast
- Keyboard navigation issues

#### 13. Version History
Track saved versions with timestamps, allow reverting.

#### 14. Collaborative Editing
Real-time multi-user editing via WebSocket.

---

## Architecture Notes

### Execution-Based Design (Why Not AST?)

The designer **executes** TypeScript rather than parsing it because:

1. **Simpler** - No need for full TypeScript parser/transformer
2. **Dynamic** - Handles loops, conditionals naturally
3. **True to runtime** - What you design is what runs
4. **Proven** - Action! used this approach in 1988

```
User's .ts file
    ↓ Execute with
Designer ABI (captures metadata)
    ↓ Edit via
Text replacement (find line:column, replace string)
    ↓ Save to
Updated .ts file (clean diff)
```

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/load` | Load file in designer mode |
| `POST /api/load-string` | Load inline source code |
| `POST /api/update-property` | Update widget property |
| `POST /api/update-widget-id` | Add/rename/remove widget IDs |
| `POST /api/update-accessibility` | Update accessibility metadata |
| `POST /api/add-widget` | Add new widget to container |
| `POST /api/delete-widget` | Delete widget |
| `POST /api/save` | Save changes (disk or memory) |
| `POST /api/update-styles` | Update CSS classes |
| `GET /api/load-styles` | Load current CSS classes |

### File Structure

```
designer/
├── src/
│   ├── metadata.ts          # Widget metadata types and store
│   ├── stack-trace-parser.ts # Source location extraction
│   ├── transformers.ts      # Plugin system for source fixes
│   └── server.ts            # HTTP server and ABI emulation
├── public/
│   ├── index.html           # Web UI (1044 lines)
│   └── editor.js            # Frontend logic (2600 lines)
├── __tests__/
│   ├── unit/                # 8 test suites
│   ├── roundtrip/           # 80 transformation tests
│   └── e2e/                 # Integration tests
└── package.json             # Dependencies: Tauri, Jest, etc.
```

---

## Running the Designer

```bash
# Development server
cd designer
npm install
npm start
# Open http://localhost:3000

# Desktop app (Tauri)
npm run tauri dev
```

---

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| Roundtrip (perfect) | 57 | ✅ All pass |
| Roundtrip (transformer fixes) | 12 | ✅ All pass |
| Roundtrip (known limitations) | 11 | ⏭️ Skipped |
| Unit tests | 25+ | ✅ All pass |
| E2E tests | 5+ | ✅ All pass |

### Known Roundtrip Limitations
- Inline comments may be lost
- Some code formatting changes
- Complex nested event handlers
- Advanced TypeScript features

---

## Historical Context

This designer was inspired by:

1. **Action! (1988)** - Denny Bollay's Lisp-based WYSIWYG that executed code into a live, modifiable context
2. **AngularJS Design Mode (2012)** - Paul Hammant's approach showing all UI states for documentation

The key innovation is **execution-based editing**: run the code, capture metadata, edit via text replacement, save readable TypeScript with clean diffs.

Unlike Interface Builder (.nib/.xib), Tsyne saves as pure TypeScript - source-control friendly, human-readable, round-trip editable in any text editor.

---

## Priority Summary

| Priority | Feature | Effort |
|----------|---------|--------|
| 🔴 High | Drag-drop reordering | Medium |
| 🔴 High | Monaco editor for handlers | Medium |
| 🟡 Medium | Multi-select | Low |
| 🟡 Medium | Hot reload | Medium |
| 🟡 Medium | Template library | Medium |
| 🟡 Medium | Mock data system | High |
| 🟢 Lower | State preview toggles | High |
| 🟢 Lower | Component extraction | Medium |
| 🟢 Lower | LLM formatting | Medium |
| ⚪ Future | Responsive preview | Low |
| ⚪ Future | Accessibility checker | Medium |
| ⚪ Future | Version history | Medium |
| ⚪ Future | Collaborative editing | High |
