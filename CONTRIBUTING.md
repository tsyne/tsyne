# Contributing to Tsyne

Thank you for considering contributing to Tsyne! This document provides guidelines for contributing.

## Development Setup

### Prerequisites

1. **Node.js** 16+ and npm
2. **Go** 1.21+
3. **Platform-specific requirements**:
   - **macOS**: Xcode Command Line Tools
   - **Linux**: X11 and OpenGL development libraries
     ```bash
     # Debian/Ubuntu
     sudo apt-get install libgl1-mesa-dev xorg-dev

     # Fedora
     sudo dnf install libXcursor-devel libXrandr-devel mesa-libGL-devel libXi-devel libXinerama-devel libXxf86vm-devel
     ```
   - **Windows**: MinGW-w64 for CGO support

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/paul-hammant/tsyne.git
   cd tsyne
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Build the Go bridge:
   ```bash
   cd bridge
   go mod download
   go build -o ../bin/tsyne-bridge
   cd ..
   ```

4. Build the TypeScript library:
   ```bash
   npm run build
   ```

5. Run an example:
   ```bash
   node examples/hello.js
   ```

## Project Structure

```
tsyne/
├── src/              # TypeScript client library
│   ├── index.ts      # Main entry point
│   ├── app.ts        # App class
│   ├── window.ts     # Window class
│   ├── widgets.ts    # Widget classes
│   ├── bridge.ts     # IPC bridge
│   └── context.ts    # Context management
├── bridge/           # Go bridge application
│   ├── main.go       # Bridge implementation
│   └── go.mod        # Go dependencies
├── examples/         # Example applications
└── dist/             # Compiled output (generated)
```

## Making Changes

### TypeScript Client

The TypeScript client is in the `src/` directory. Key concepts:

- **Context**: Manages state during declarative UI building
- **Widgets**: UI components (Button, Label, Entry, etc.)
- **Containers**: Layout components (VBox, HBox)
- **Bridge**: IPC communication with Go process

When adding new widgets:

1. Add the widget class to `src/widgets.ts`
2. Export factory function from `src/index.ts`
3. Update TypeScript types
4. Add corresponding Go implementation

### Go Bridge

The Go bridge is in `bridge/main.go`. Key concepts:

- **Message handling**: Add new message types in `handleMessage()`
- **Widget registry**: Track Fyne objects by ID
- **Event forwarding**: Send events back to TypeScript

When adding new widgets:

1. Add message handler (e.g., `handleCreateCheckbox`)
2. Create the Fyne widget
3. Register it in the widgets map
4. Set up event callbacks if needed

### Testing

Currently, testing is manual. To test your changes:

1. Build the bridge and TypeScript: `npm run build && npm run build:bridge`
2. Create a test example in `examples/`
3. Run it: `node examples/your-test.js`

Future: We plan to add automated testing with headless Fyne.

## Code Style

### TypeScript

- Use TypeScript strict mode
- Follow the existing declarative API style
- Add JSDoc comments for public APIs
- Use meaningful variable names

### Go

- Follow standard Go formatting (`go fmt`)
- Use meaningful variable names
- Handle errors appropriately
- Add comments for exported types

## Adding New Features

### New Widgets

To add a new widget (e.g., Checkbox):

1. **Go Bridge** (`bridge/main.go`):
   ```go
   func (b *Bridge) handleCreateCheckbox(msg Message) {
       widgetID := msg.Payload["id"].(string)
       text := msg.Payload["text"].(string)

       checkbox := widget.NewCheck(text, func(checked bool) {
           // Handle state change
       })

       b.mu.Lock()
       b.widgets[widgetID] = checkbox
       b.mu.Unlock()

       b.sendResponse(Response{
           ID: msg.ID,
           Success: true,
           Result: map[string]interface{}{"widgetId": widgetID},
       })
   }
   ```

2. **TypeScript Widget** (`src/widgets.ts`):
   ```typescript
   export class Checkbox extends Widget {
     constructor(ctx: Context, text: string, onChange?: (checked: boolean) => void) {
       const id = ctx.generateId('checkbox');
       super(ctx, id);

       const payload: any = { id, text };

       if (onChange) {
         const callbackId = ctx.generateId('callback');
         payload.callbackId = callbackId;
         ctx.bridge.registerEventHandler(callbackId, onChange);
       }

       ctx.bridge.send('createCheckbox', payload);
       ctx.addToCurrentContainer(id);
     }
   }
   ```

3. **Export Function** (`src/index.ts`):
   ```typescript
   export function checkbox(text: string, onChange?: (checked: boolean) => void): Checkbox {
     if (!globalContext) {
       throw new Error('checkbox() must be called within an app context');
     }
     return new Checkbox(globalContext, text, onChange);
   }
   ```

### New Layouts

To add a new layout (e.g., Grid):

1. Implement `handleCreateGrid` in Go bridge
2. Create `Grid` class in TypeScript
3. Handle child widget positioning

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Test thoroughly with examples
4. Update documentation (README.md, ARCHITECTURE.md)
5. Commit with clear messages
6. Push and create a Pull Request

## Design Principles

When contributing, keep these principles in mind:

1. **Elegant Syntax**: API should be terse and declarative
2. **Type Safety**: Full TypeScript support
3. **Performance**: Minimize IPC overhead
4. **Simplicity**: Easy to understand and use
5. **Compatibility**: Work across macOS, Windows, Linux

## Questions?

If you have questions:

- Check the [ARCHITECTURE.md](ARCHITECTURE.md) documentation
- Review existing examples in `examples/`
- Open an issue for discussion

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
