# Slydes - Markdown Presentation Tool

A presentation application for Tsyne, ported from [andydotxyz/slydes](https://github.com/andydotxyz/slydes).

## Features

- **Markdown Editor**: Write your presentation in markdown format
- **Live Preview**: See your slides rendered in real-time
- **Navigation**: Browse through slides with Previous/Next buttons
- **Presentation Mode**: Full-screen presentation window
- **TOML Front Matter**: Configure presentations with TOML headers

## Slide Format

Each presentation is a markdown file with slides separated by `---`:

```markdown
+++
theme = "default"
+++

# Slide 1 Title
## Subtitle

Content for the first slide

---

# Slide 2 Title

* Bullet point 1
* Bullet point 2
* Bullet point 3

---

# Code Example

```javascript
function hello() {
  console.log("Hello!");
}
```
```

## Architecture

This port follows Tsyne's MVC pattern:

- **Model**: `SlideStore` - Observable store managing presentation state
- **View**: Tsyne widgets with incremental updates (no full rebuilds)
- **Controller**: Event handlers that update the store

### Incremental UI Updates

Following the solitaire example pattern, Slydes uses:

- Widget references stored for later updates
- Direct updates to labels/content (no widget rebuilding)
- Observable pattern with change listeners
- Efficient re-rendering of only changed content

## NPM Dependencies

- `marked` - Markdown parser
- `gray-matter` - Front matter parser (TOML/YAML/JSON)

## Running

```bash
npm run build
node examples/slydes/slydes.js
```

## Testing

The project includes comprehensive tests:

### Unit Tests
- `parser.test.ts` - Markdown parsing logic
- `store.test.ts` - Store state management

### Functional Tests
- `slydes.test.ts` - End-to-end UI tests with TsyneTest

Run tests:
```bash
npm test examples/slydes/parser.test.ts
npm test examples/slydes/store.test.ts
npm test examples/slydes/slydes.test.ts
```

Or run all slydes tests:
```bash
npm test examples/slydes/
```

## Implementation Notes

This port demonstrates:

1. **Markdown Parsing**: Using `marked` instead of Go's `goldmark`
2. **Front Matter**: Using `gray-matter` instead of Go's `toml` parser
3. **MVC Pattern**: Observable store with change notifications
4. **Incremental Updates**: Updating specific widgets rather than rebuilding UI
5. **TsyneTest**: Functional testing with fluent assertions

## Differences from Original

- Simplified code block rendering (original used goshot for syntax highlighting)
- No theme JSON file support yet (future enhancement)
- Simplified image handling
- Focus on core presentation features

## Future Enhancements

- [ ] Syntax highlighting for code blocks
- [ ] Theme support (JSON files)
- [ ] Image support
- [ ] Export to PDF
- [ ] Keyboard shortcuts in editor
- [ ] Auto-save functionality

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Uses `hsplit()` for editor/preview panes. Editor panel with toolbar buttons. Preview panel with heading/subheading/content labels. Separate presentation window with similar layout. `buildContent()` defines clear split-pane structure |
| **Core declarative** | Fluent method chaining | 7/10 | `.withId()` on 24+ elements: btn-new, btn-open, btn-save, btn-add-slide, btn-present, editor-label, preview-label, editor, slide-count, current-slide, preview-heading/subheading/content, presentation-heading/subheading/content, presentation-status, and navigation buttons |
| **Core declarative** | Programmatic generation | 3/10 | No loop-based UI generation for widgets. Slides are rendered one at a time in the preview pane, not as a list |
| **State architecture** | Observable store | 7/10 | `SlideStore` with `subscribe()`/`notifyChange()`. Manages slides array, current index, config. Markdown parsing via `parsePresentation()`. Navigation methods (next/previous/goTo). No defensive copies (returns slide references directly) |
| **Declarative updates** | `.when()` + `.bindTo()` | 2/10 | No `.when()`, no `.bindTo()`, no `.bindText()`. 10 `setText()` calls in `refreshPreview()` — updates heading, subheading, content, slide count, current slide, editor, and presentation labels. All imperative widget updates |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No penalty — initial setup only. All subsequent updates via `setText()` |
| **Testing** | `.withId()` coverage | 8/10 | Excellent coverage with 24+ IDs on all interactive elements, labels, and presentation window widgets. Good for TsyneTest assertions |
| **Design** | Separation of concerns | 7/10 | `SlideStore` handles slide parsing and navigation (no UI). `parser.ts` is pure markdown parsing. `buildSlydesApp()` is presentational. Minor concern: `refreshPreview()` has 10 imperative `setText()` calls |
| | **Overall** | **5/10** | Good Observable store with markdown parsing and clean split-pane layout. Excellent `.withId()` coverage (24+ IDs). But heavily reliant on `setText()` for all updates (10 calls). No `.when()`, `.bindTo()`, or reactive bindings. The presentation paradigm (one slide at a time) doesn't naturally lend itself to list-based declarative patterns, but `.bindText()` on heading/content labels would improve the score significantly |
