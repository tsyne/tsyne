# Tsyne Designer - Status & Roadmap

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
**Impact**: High - essential for visual editing UX. Users should be able to drag widgets within the tree to reorder siblings or move between containers.
**Implementation Notes**:
- HTML5 drag and drop API
- Visual drop indicators
- Validation (can't drop container inside itself)
- Update both model and source on drop

#### 2. Monaco Editor for Event Handlers
**Status**: Not implemented
**Impact**: High - event handlers are currently read-only.
**Implementation Notes**:
- Integrate Monaco editor for TypeScript intellisense, syntax highlighting, and inline editing in property inspector or modal.

#### 3. Multi-Select
**Status**: Not implemented
**Impact**: Medium - for bulk operations.
**Implementation Notes**:
- Shift+click or Ctrl+click to select multiple widgets for bulk property editing, CSS class application, and deletion.

### Medium Priority

#### 4. Hot Reload
**Status**: Not implemented (full reload on save)
**Impact**: Medium - faster iteration.
**Implementation Notes**:
- Implement incremental updates instead of full re-execution (e.g., debounced reload).
- Only re-execute affected widgets and maintain UI state across reloads.

#### 5. Template/Component Library
**Status**: Not implemented
**Impact**: Medium - productivity boost.
**Implementation Notes**:
- Create a library of pre-built patterns (Login form, Nav bar, etc.).
- Store templates as JSON files in `.tsyne/templates/`.

#### 6. Mock Data System for Loops
**Status**: Not implemented
**Impact**: Medium - required for `.model().each()` visualization.
**Implementation Notes**:
- Implement a mock data system, either via a config file (`.tsyne-designer/mocks.ts`) or inline comments (`// @designer-mock: [...]`).

#### 7. Keyboard Shortcuts
**Status**: Partially implemented (Undo/Redo, Duplicate exist).
**Impact**: Medium - improves usability.
**Implementation Notes**:
- Add shortcuts for `Delete`, `Save`, arrow key navigation, `Escape` to clear selection.
- Create a global keyboard event handler and a reference panel.

### Lower Priority / Future Vision

#### 8. Visual Container Boundaries
**Status**: Not implemented
**Impact**: Low-Medium - UX improvement.
**Implementation Notes**:
- Show dotted outlines on container hover to visualize structure, padding, and spacing.

#### 9. Property Validation
**Status**: Not implemented
**Impact**: Low-Medium - Polish.
**Implementation Notes**:
- Implement real-time, type-specific validation in the property editor with visual indicators.

#### 10. Design-Time State Preview
**Status**: Not implemented
**Impact**: High (differentiating feature) but complex.
**Implementation Notes**:
- Auto-detect state variables from `when()` predicates and provide a UI to toggle them, re-evaluating visibility.

#### 11. Component Extraction
**Status**: Not implemented
**Impact**: Medium - code quality.
**Implementation Notes**:
- Add functionality to extract repeated UI patterns into reusable functions.

#### 12. LLM-Assisted Formatting
**Status**: Not implemented
**Impact**: High - quality of life.
**Implementation Notes**:
- Use the existing transformer plugin system to integrate an LLM for preserving whitespace, comments, and minimizing diffs.

#### 13. Responsive Preview Modes
**Status**: Not implemented
**Impact**: Medium - for responsive design.
**Implementation Notes**:
- Add toggles for mobile, tablet, and desktop presets.

#### 14. Accessibility Checker
**Status**: Not implemented
**Impact**: High - for building accessible apps.
**Implementation Notes**:
- Integrate WCAG compliance warnings (e.g., missing labels, poor contrast) via a tool like `axe-core`.

#### 15. Version History
**Status**: Not implemented
**Impact**: Medium - safety feature.
**Implementation Notes**:
- Track saved versions with timestamps and allow reverting.

#### 16. Grid/Snap to Grid
**Status**: Not implemented.
**Impact**: Low.
**Implementation Notes**:
- Add a visual grid overlay with snap-to-grid functionality for alignment.

#### 17. Theme Switcher
**Status**: Not implemented.
**Impact**: Low.
**Implementation Notes**:
- Add a UI to preview the application with different Fyne themes applied.

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
