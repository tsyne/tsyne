# Tsyne Architecture

This document describes the internal architecture of Tsyne.

## Overview

Tsyne bridges TypeScript/Node.js with Go's Fyne UI toolkit using a child process and JSON-RPC communication over stdio.

## Module Architecture

### Module Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          User Application                                    │
│                          (TypeScript/Node.js)                                │
└─────────────────────────────────┬───────────────────────────────────────┘
                                      │ imports
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Tsyne Client Library (src/)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐                                                             │
│  │  index.ts   │  Main entry point, exports declarative API                 │
│  │  src/       │  (app, window, button, label, etc.)                        │
│  └──────┬──────┘                                                             │
│         │ uses                                                               │
│         ↓                                                                    │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │  App Lifecycle & Window Management                       │                │
│  ├─────────────────────────────────────────────────────────┤                │
│  │  app.ts       - Application lifecycle management        │                │
│  │  src/         - Main app instance                       │                │
│  │                                                          │                │
│  │  window.ts    - Window creation and management          │                │
│  │  src/         - Multiple windows support                │                │
│  └────────┬────────────────────────────────────────────────┘                │
│           │ uses                                                             │
│           ↓                                                                  │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │  Core Infrastructure                                     │                │
│  ├─────────────────────────────────────────────────────────┤                │
│  │  context.ts   - Widget ID generation                    │                │
│  │  src/         - Window/container stack management       │                │
│  │               - Declarative API context tracking        │                │
│  │                                                          │                │
│  │  bridge.ts    - IPC with Go bridge process              │                │
│  │  src/         - JSON-RPC message handling               │                │
│  │               - Callback registration                   │                │
│  │               - Child process management                │                │
│  └────────┬────────────────────────────────────────────────┘                │
│           │ uses                                                             │
│           ↓                                                                  │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │  UI Components & Features                                │                │
│  ├─────────────────────────────────────────────────────────┤                │
│  │  widgets.ts   - All widget classes                      │                │
│  │  src/         - Button, Label, Entry, etc.              │                │
│  │               - Layouts (VBox, HBox, Grid, etc.)        │                │
│  │               - Advanced widgets (Table, Tree, etc.)    │                │
│  │                                                          │                │
│  │  styles.ts    - CSS-like styling system                 │                │
│  │  src/         - Font, color, text alignment             │                │
│  │               - Stylesheet management                   │                │
│  │                                                          │                │
│  │  state.ts     - Reactive state management               │                │
│  │  src/         - Observable state for data binding       │                │
│  │                                                          │                │
│  │  browser.ts   - Browser/menu system                     │                │
│  │  src/         - Navigation, menu bar, toolbar           │                │
│  └─────────────────────────────────────────────────────────┘                │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │  Testing Framework                                       │                │
│  ├─────────────────────────────────────────────────────────┤                │
│  │  test.ts              - Headless testing utilities      │                │
│  │  src/                 - Test helpers                    │                │
│  │                                                          │                │
│  │  tsyne-test.ts        - TsyneTest framework             │                │
│  │  src/                 - Widget testing API              │                │
│  │                                                          │                │
│  │  tsyne-browser-test.ts - Browser testing framework      │                │
│  │  src/                 - Page navigation testing         │                │
│  │                                                          │                │
│  │  index-test.ts        - Test mode entry point           │                │
│  │  src/                 - Headless mode setup             │                │
│  └─────────────────────────────────────────────────────────┘                │
└─────────────────────────────────┬───────────────────────────────────────┘
                                      │ JSON-RPC over stdio
                                      │ (spawns child process)
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Tsyne Bridge (bridge/)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐                                                             │
│  │  main.go    │  Go bridge process                                         │
│  │  bridge/    │  - JSON-RPC message handler                                │
│  └──────┬──────┘  - Widget registry                                         │
│         │         - Fyne object lifecycle management                        │
│         │         - Event callback dispatching                              │
│         │                                                                    │
│         │ uses                                                               │
│         ↓                                                                    │
│  ┌─────────────┐                                                             │
│  │  go.mod     │  Go module dependencies                                    │
│  │  bridge/    │                                                             │
│  └─────────────┘                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ uses (external)
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Fyne UI Toolkit (EXTERNAL)                                │
│                    fyne.io/fyne/v2                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  - Native widget rendering                                                   │
│  - Cross-platform UI abstraction                                            │
│  - Window management                                                         │
│  - Event handling                                                            │
│  - Theme system                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module Reference Table

| Module | Path | Purpose | Key Dependencies |
|--------|------|---------|------------------|
| **index.ts** | `src/index.ts` | Main entry point, exports declarative API | app.ts, window.ts, widgets.ts |
| **app.ts** | `src/app.ts` | Application lifecycle management | bridge.ts, context.ts, window.ts |
| **window.ts** | `src/window.ts` | Window creation and management | bridge.ts, context.ts |
| **widgets.ts** | `src/widgets.ts` | All widget classes and layouts | context.ts, bridge.ts, styles.ts |
| **bridge.ts** | `src/bridge.ts` | IPC bridge to Go process | Node.js child_process |
| **context.ts** | `src/context.ts` | Widget ID generation, stack management | bridge.ts |
| **styles.ts** | `src/styles.ts` | CSS-like styling system | context.ts, bridge.ts |
| **state.ts** | `src/state.ts` | Reactive state management | - |
| **browser.ts** | `src/browser.ts` | Browser/menu/navigation system | app.ts, window.ts, widgets.ts |
| **test.ts** | `src/test.ts` | Headless testing utilities | bridge.ts |
| **tsyne-test.ts** | `src/tsyne-test.ts` | TsyneTest widget testing framework | test.ts, app.ts |
| **tsyne-browser-test.ts** | `src/tsyne-browser-test.ts` | Browser testing framework | tsyne-test.ts, browser.ts |
| **index-test.ts** | `src/index-test.ts` | Test mode entry point | tsyne-test.ts, tsyne-browser-test.ts |
| **main.go** | `bridge/main.go` | Go bridge process | **fyne.io/fyne/v2** (EXTERNAL) |
| **go.mod** | `bridge/go.mod` | Go module definition | - |

### Data Flow

```
User Code                                Bridge Process               Fyne
─────────                                ──────────────               ────

button("Click", cb)
   │
   ├─> generateId("button")
   │   └─> "button_1"
   │
   ├─> registerEventHandler("callback_1", cb)
   │
   └─> bridge.send({                      ──> JSON decode
         type: "createButton"                  │
         payload: {                            ├─> widget.NewButton(...)
           id: "button_1"                      │   └─> Store in registry
           text: "Click"                       │
           callbackId: "callback_1"            ├─> button.OnTapped = ...
         }                                     │
       })                                      └─> JSON encode response
         │                                           │
         └─────<─── response ────────────────<──────┘


[User clicks button in UI]
                                                      Fyne triggers
                                                      OnTapped callback
                                                           │
bridge receives event <───── JSON encode <───────────────┘
   │                         {
   │                           type: "callback"
   │                           data: {
   │                             callbackId: "callback_1"
   │                           }
   │                         }
   │
   └─> lookup handler("callback_1")
       └─> execute cb()
```

## Components

### 1. TypeScript Client (`src/`)

The client library provides the user-facing API and manages communication with the Go bridge.

#### Key Files

- **`index.ts`**: Main entry point, exports declarative API functions
- **`app.ts`**: Application class that manages the overall app lifecycle
- **`window.ts`**: Window class for creating Fyne windows
- **`widgets.ts`**: Widget classes (Button, Label, Entry, VBox, HBox)
- **`bridge.ts`**: BridgeConnection class that manages IPC with Go process
- **`context.ts`**: Context class that tracks state during declarative UI building

#### Context Management

The Context class is crucial for the declarative API. It maintains:

- **Widget ID generation**: Ensures unique IDs for all widgets
- **Window stack**: Tracks which window is currently being built
- **Container stack**: Tracks nested containers (VBox, HBox) to collect children

When you write:

```typescript
vbox(() => {
  button("Click me");
  label("Hello");
});
```

The Context:
1. Pushes a new container onto the stack
2. Executes the builder function (which adds widgets to the container)
3. Pops the container and retrieves the collected widget IDs
4. Sends a `createVBox` message with the child IDs

### 2. Go Bridge (`bridge/`)

The bridge is a standalone Go application that embeds Fyne and communicates with the TypeScript client.

#### Key Components

- **`main.go`**: Entry point, sets up message handling and Fyne app
- **`Bridge` struct**: Manages Fyne objects and message routing

#### Message Handling

The bridge listens for JSON messages on stdin and sends responses/events on stdout.

**Message format**:
```json
{
  "id": "msg_123",
  "type": "createButton",
  "payload": {
    "id": "button_1",
    "text": "Click me",
    "callbackId": "callback_1"
  }
}
```

**Response format**:
```json
{
  "id": "msg_123",
  "success": true,
  "result": {
    "widgetId": "button_1"
  }
}
```

**Event format** (for callbacks):
```json
{
  "type": "callback",
  "widgetId": "button_1",
  "data": {
    "callbackId": "callback_1"
  }
}
```

#### Widget Registry

The bridge maintains maps to track Fyne objects:

- **`windows`**: Maps window IDs to `fyne.Window` instances
- **`widgets`**: Maps widget IDs to `fyne.CanvasObject` instances
- **`callbacks`**: Maps widget IDs to callback IDs

#### Concurrency

- Messages are processed sequentially on the main goroutine
- Fyne UI operations happen on the Fyne main thread
- Response/event writing is protected by a mutex

### 3. Communication Protocol

#### Supported Messages

**Window Management**:
- `createWindow`: Create a new Fyne window
- `setContent`: Set a widget as window content
- `showWindow`: Show a window

**Widget Creation**:
- `createButton`: Create a button widget
- `createLabel`: Create a label widget
- `createEntry`: Create a text entry widget
- `createVBox`: Create a vertical box container
- `createHBox`: Create a horizontal box container

**Widget Operations**:
- `setText`: Update widget text
- `getText`: Get widget text

**Application**:
- `quit`: Quit the application

#### Event Flow

1. User clicks a button in the Fyne UI
2. Fyne triggers the button's `OnTapped` callback
3. Bridge sends a `callback` event to TypeScript
4. TypeScript client looks up the registered event handler
5. Event handler executes in Node.js

## Declarative API Design

The declarative API uses several techniques to achieve elegant syntax:

### 1. Global Context

Functions like `button()` and `vbox()` use a global context that's set when `app()` is called:

```typescript
let globalContext: Context | null = null;

export function app(options: AppOptions, builder: () => void): App {
  const appInstance = new App(options);
  globalContext = (appInstance as any).ctx;
  builder();
  return appInstance;
}

export function button(text: string, onClick?: () => void): Button {
  if (!globalContext) {
    throw new Error('button() must be called within an app context');
  }
  return new Button(globalContext, text, onClick);
}
```

### 2. Container Stack

Containers like `vbox()` and `hbox()` push a new container onto the stack, execute their builder function to collect children, then pop the stack:

```typescript
export class VBox {
  constructor(ctx: Context, builder: () => void) {
    this.id = ctx.generateId('vbox');

    ctx.pushContainer();     // Start collecting children
    builder();               // Execute builder (widgets add themselves)
    const children = ctx.popContainer();  // Get collected children

    ctx.bridge.send('createVBox', { id: this.id, children });
  }
}
```

### 3. Automatic Registration

Widgets automatically add themselves to the current container:

```typescript
export class Button extends Widget {
  constructor(ctx: Context, text: string, onClick?: () => void) {
    // ...create button...
    ctx.addToCurrentContainer(id);  // Auto-register with parent
  }
}
```

This allows the terse syntax:

```typescript
vbox(() => {
  button("One");    // Automatically added to vbox
  button("Two");    // Automatically added to vbox
});
```

## Building and Distribution

### Build Process

1. **Bridge compilation**: `go build` creates the `tsyne-bridge` binary
2. **TypeScript compilation**: `tsc` compiles `src/` to `dist/`
3. **Package**: npm packages both the compiled JS and the bridge binary

### NPM Package Structure

```
tsyne/
├── dist/           # Compiled JavaScript
├── bin/            # tsyne-bridge executable
├── package.json
├── README.md
└── LICENSE
```

## Future Enhancements

Potential improvements:

1. **More Widgets**: Tree, Table, List, Progress Bar, etc.
2. **Layout Options**: Grid, Border, Form layouts
3. **Dialogs**: Alert, Confirm, File picker dialogs
4. **Themes**: Support for custom themes and styling
5. **Canvas**: Direct drawing capabilities
6. **Performance**: Widget pooling, lazy loading
7. **Testing**: Headless mode for automated testing
8. **Hot Reload**: Development mode with auto-restart

## Debugging

### Enable Bridge Logging

The bridge logs to stderr, which is inherited from the parent process. To see bridge logs:

```typescript
// In your app
process.stderr.write('Bridge starting...\n');
```

### Message Tracing

Add logging to `bridge.ts` to trace all messages:

```typescript
async send(type: string, payload: Record<string, any>): Promise<any> {
  console.log('→', type, payload);
  // ...send message...
}
```

### Troubleshooting

**Bridge doesn't start**:
- Check that `bin/tsyne-bridge` exists and is executable
- Verify Go is installed and Fyne dependencies are met

**Widgets not appearing**:
- Ensure `setContent` is called before `showWindow`
- Check that widgets are created in the correct container context

**Events not firing**:
- Verify callback IDs are being registered
- Check that event handlers are registered before `run()` is called
