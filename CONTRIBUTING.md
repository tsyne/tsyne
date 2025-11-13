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

Tsyne has automated testing using Jest with TsyneTest (for widget mode) or TsyneBrowserTest (for browser/page mode):

1. Run all tests:
   ```bash
   npm test
   ```

2. Run specific test file:
   ```bash
   npm test examples/todomvc.test.ts
   ```

3. Visual debugging (headed mode):
   ```bash
   TSYNE_HEADED=1 npm test examples/todomvc.test.ts
   ```

**When adding features or fixing bugs, please include tests.** AI use to help you make good terse/elegant tests is just fine.

For manual testing:
1. Build: `npm run build && npm run build:bridge`
2. Create a test example in `examples/`
3. Run it: `node examples/your-test.js`

## Code Style

### TypeScript

- Use TypeScript strict mode
- Follow the existing pseudo-declarative API style
- Add JSDoc comments for public APIs
- Use meaningful variable names
- AI-assisted development is welcome and encouraged

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

1. **Pseudo-declarative MVC**: This project explores pseudo-declarative MVC patterns inspired by AngularJS 1.0 and other prior technologies. The goal is declarative UI definition where model changes automatically update the view.
2. **Elegant Syntax**: API should be terse and declarative (e.g., using `a` for app instance)
3. **Type Safety**: Full TypeScript support
4. **Performance**: Minimize IPC overhead, avoid unnecessary full rebuilds
5. **Simplicity**: Easy to understand and use
6. **Compatibility**: Work across macOS, Windows, Linux

Understand the architectural goals before proposing major changes. That said, we are open to "Tsyne could also have..." modes that don't take out existing modes. If you want to take the project in a different direction, consider forking - no hard feelings!

## Questions and Issues?

If you have questions:

- Check the [ARCHITECTURE.md](ARCHITECTURE.md) documentation
- Review existing examples in `examples/`
- Open an issue for discussion

### Filing Issues

Issues should be filed if your google, stackoverflow (etc) research has not yielded an answer:

- **Say what you searched for** that didn't solve your problem
- **Include what AI tools said** if you consulted them (ChatGPT, Claude, etc.)
- **Provide reproduction steps** for bugs - clear and actionable
- Don't be upset if you're asked to make a failing test in a PR

There are no stupid questions, only opportunities to improve our docs!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
