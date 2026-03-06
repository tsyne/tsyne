# Image Resizer - Batch Image Resizing

A batch image resizing application supporting multiple formats with customizable dimensions.

## Features

- Single or batch image resizing
- Customizable width and height
- Maintain aspect ratio option
- Quality control (0-100%)
- Support for JPG, PNG, GIF, BMP, WebP, TIFF
- Job queue with status tracking

## Running

```bash
tsyne image-resizer.ts
```

## Testing

```bash
pnpm test
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > hbox(controls) + vbox(settings) + hbox(actions)` nesting. Form-style layout for resize options |
| **Core declarative** | Fluent method chaining | 7/10 | `.withId()` on 20 elements: input fields, buttons, status labels. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 3/10 | Minimal loop-based generation. Job list rendering from array |
| **State architecture** | Observable store | 3/10 | No Observable store. Resize state managed directly in class |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 3 `setText()` calls for status updates |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -2 | 2 `setContent()` calls for UI rebuilds |
| **Testing** | `.withId()` coverage | 7/10 | Good coverage on input fields, buttons, status elements |
| **Design** | Separation of concerns | 5/10 | Resize logic mixed with UI in single class |
| | **Overall** | **4/10** | Good `.withId()` coverage but no reactive patterns, no Observable store, and uses `setContent()` for rebuilds |

## License

MIT
