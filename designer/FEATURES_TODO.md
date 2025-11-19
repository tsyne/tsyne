# Tsyne Designer - Feature TODO List

This document tracks potential features and enhancements for the Tsyne WYSIWYG Designer.

## Critical Missing Features

### 1. Undo/Redo
Essential for any editor. Would need a command pattern implementation to track operations like:
- Property changes
- Widget additions/deletions
- CSS edits
- Container reordering

**Implementation Notes:**
- Maintain command history stack
- Each operation encapsulates both execute and undo logic
- Keyboard shortcuts: `Ctrl+Z` / `Ctrl+Y`

### 2. Drag and Drop Reordering
Ability to drag widgets within or between containers to reorder them visually, rather than editing source code.

**Implementation Notes:**
- HTML5 drag and drop API
- Visual drop indicators showing where widget will land
- Validation (can't drop container inside itself, etc.)
- Update both model and source code on drop

### 3. Copy/Paste/Duplicate Widgets
Right-click → duplicate, or keyboard shortcuts to copy entire widget subtrees.

**Implementation Notes:**
- Copy widget metadata including all properties and children
- Generate new unique IDs for duplicates
- Context menu integration
- Keyboard shortcuts: `Ctrl+C`, `Ctrl+V`, `Ctrl+D`

## Very Useful Additions

### 4. Widget Tree/Outline Panel
A hierarchical tree view showing the full widget structure (like browser DevTools Elements panel). Makes navigation easier than clicking in the preview.

**Implementation Notes:**
- Collapsible tree structure
- Sync selection between tree and preview
- Show widget type, ID, and class in tree nodes
- Drag-and-drop reordering within the tree

### 5. Multi-select
Shift+click or Ctrl+click to select multiple widgets, then bulk edit properties or apply the same CSS class.

**Implementation Notes:**
- Visual indication of multiple selected widgets (outline/highlight)
- Property editor shows common properties across selection
- Bulk operations: delete, apply class, change common properties

### 6. Keyboard Shortcuts
- `Ctrl+Z` / `Ctrl+Y` - Undo/redo
- `Delete` - Remove selected widget
- `Ctrl+D` - Duplicate selected widget
- `Ctrl+S` - Save current file
- `Arrow keys` - Navigate widget tree
- `Escape` - Clear selection

**Implementation Notes:**
- Global keyboard event handler
- Display shortcut hints in UI (tooltips, context menus)
- Keyboard shortcuts reference panel (`?` key)

### 7. Property Validation
Real-time validation showing which properties are invalid (already have TypeScript linting, but could show validation inline in the property editor).

**Implementation Notes:**
- Type-specific validators (number ranges, valid colors, etc.)
- Visual indicators (red border on invalid fields)
- Helpful error messages
- Prevent saving invalid values

### 8. Visual Container Boundaries
When hovering over containers like VBox/HBox, show dotted outlines to make the structure more visible.

**Implementation Notes:**
- CSS overlays on hover
- Different colors for different container types
- Show container padding/spacing visually
- Optional "always show" toggle

## Nice to Have

### 9. Template/Component Library
Pre-built common patterns (login form, navigation bar, data table, etc.) that can be inserted.

**Implementation Notes:**
- Library panel with searchable templates
- Categories: forms, navigation, layouts, data display
- Drag template into canvas to insert
- Customizable user templates

### 10. Responsive Preview Modes
Toggle between different window sizes to test layouts.

**Implementation Notes:**
- Preset sizes: mobile, tablet, desktop
- Custom size input
- Preview frame that resizes
- Breakpoint indicators

### 11. Accessibility Checker
Warn about missing labels, poor contrast, etc.

**Implementation Notes:**
- WCAG compliance checks
- Color contrast analyzer
- Missing alt text/labels warnings
- Keyboard navigation testing
- Integration with axe-core or similar

### 12. Search Widgets
Quick filter: "show all buttons" or "find widget with ID 'submitBtn'".

**Implementation Notes:**
- Search bar with filters
- Search by: type, ID, class, property value
- Highlight matches in preview
- Jump to widget in tree/source

## Additional Ideas

### 13. Grid/Snap to Grid
Visual grid overlay with snap-to-grid for pixel-perfect alignment (if applicable to Fyne layouts).

### 14. Export to Different Formats
- Export as standalone TypeScript file
- Export as component module
- Export preview as screenshot/image

### 15. Version History
Track saved versions with timestamps, allow reverting to previous versions.

### 16. Collaborative Editing
Real-time collaborative editing with multiple users (WebSocket-based).

### 17. Theme Switcher
Preview UI with different Fyne themes applied.

### 18. Performance Profiler
Show which widgets are expensive to render, identify performance bottlenecks.

### 19. Code Generation Options
Toggle between different code styles (functional vs class-based, verbose vs compact).

### 20. Widget Property Presets
Save commonly used property combinations as presets (e.g., "Primary Button", "Danger Button").

---

## Implementation Priority

**Phase 1 (Essential):**
1. Undo/Redo
2. Widget Tree/Outline Panel
3. Keyboard Shortcuts

**Phase 2 (Usability):**
4. Drag and Drop Reordering
5. Copy/Paste/Duplicate
6. Multi-select
7. Visual Container Boundaries

**Phase 3 (Polish):**
8. Property Validation
9. Search Widgets
10. Template Library

**Phase 4 (Advanced):**
11. Responsive Preview
12. Accessibility Checker
13. Remaining features as needed
