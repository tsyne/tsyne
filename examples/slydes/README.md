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
