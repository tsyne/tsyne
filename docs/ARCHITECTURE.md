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

#### IPC Protocol with Safeguards

**Overview**: Tsyne uses a custom binary framing protocol over stdin/stdout for IPC between the Node.js client and Go bridge. This protocol includes robust safeguards against corruption.

**Frame Format** (implemented v0.1.x):
```
[uint32 length][uint32 crc32][json payload]
├─ 4 bytes  ──┤├─ 4 bytes ─┤├─ N bytes ─┤
```

**Protocol Details**:
- **Length prefix** (4 bytes, big-endian): Size of JSON payload in bytes
- **CRC32 checksum** (4 bytes, big-endian): IEEE CRC32 of JSON payload
- **JSON payload** (N bytes): UTF-8 encoded JSON message

**Key Features**:
1. **Message boundary detection**: Length prefix allows reading exact message size
2. **Integrity validation**: CRC32 detects corruption from accidental stdout writes
3. **Recovery capability**: Can skip corrupt frames and resync on next valid frame
4. **Size limits**: Rejects messages larger than 10MB to prevent memory attacks

**Implementation**:
- Go side: `writeFramedMessage()` and `readFramedMessage()` in `bridge/main.go`
- TypeScript side: `tryReadFrame()` in `src/fynebridge.ts`
- All message writes protected by mutex to prevent interleaving
- All logging redirected to stderr (via `log.SetOutput(os.Stderr)`)

**Example Frame** (button creation):
```
Length:    [0x00, 0x00, 0x00, 0x5A]  // 90 bytes
CRC32:     [0x12, 0x34, 0x56, 0x78]  // Checksum
JSON:      {"id":"msg_1","type":"createButton","payload":{...}}
```

**Why Not Newline-Delimited JSON?**

The original protocol used newline-delimited JSON (`JSON\n`), which is fragile:
- Any `fmt.Println()` or stdout write corrupts the stream
- Fyne or third-party libraries might write to stdout
- No way to detect or recover from corruption
- One stray print statement crashes the entire application

The framed protocol solves these issues by:
- Adding length prefix for exact message boundaries
- Adding CRC32 for corruption detection
- Allowing recovery by skipping invalid frames
- Redirecting all logging to stderr

**Future Migration** (planned for v0.2.0+):
- Move to Unix Domain Sockets (Linux/macOS) with TCP fallback (Windows)
- Completely separate IPC from stdin/stdout streams
- Industry standard approach (Chrome DevTools Protocol, Language Server Protocol)
- Enables arbitrary logging without any protocol concerns

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

## Reactive Patterns: Design Rationale

### Why Tsyne Doesn't Use Fyne's Data Binding

Fyne provides a `data/binding` package with observable wrappers:

```go
// Fyne's approach - wrap every value in an observable type
myString := binding.NewString()
myString.Set("hello")
myString.AddListener(binding.NewDataListener(func() { ... }))
label := widget.NewLabelWithData(myString)  // auto-updates when myString changes
```

This is the **observable wrapper pattern** from the 1990s-2010s:
- **VB6/MFC** (1990s) - Data-bound controls
- **WinForms** `BindingSource` (2002)
- **WPF** `INotifyPropertyChanged` (2006)
- **Knockout.js** observables (2010)

**Characteristics:**
- Requires explicit wrapper types for every piece of data (`binding.Int`, `binding.String`, etc.)
- Type-specific bindings and conversions (`binding.StringToInt`)
- Automatic propagation once wired up
- Significant boilerplate to set up

### Tsyne's Approach: Modern Reactive Patterns

Tsyne uses patterns closer to modern frameworks:

```typescript
// Plain values + declarative conditions
let filter = 'all';
todoRow.when(() => filter === 'all' || todo.completed);

// Callback-based updates with store pattern
store.subscribe(() => {
  label.setText(store.getCount().toString());
  container.refreshVisibility();  // Re-evaluates all when() conditions
});
```

This is more like:
- **React** hooks/state (2019)
- **Vue 3** Composition API (2020)
- **Solid.js** signals (2021)

**Characteristics:**
- Works with plain TypeScript values (no wrapper types)
- `when(() => boolean)` for declarative visibility (like `ng-if`/`v-if`)
- `ModelBoundList` for smart list rendering with diffing (like `ng-repeat`/`v-for`)
- Store pattern with explicit subscriptions
- More explicit control flow, less "magic"

### The Architectural Decision

Tsyne intentionally does NOT port Fyne's `binding.*` package because:

1. **TypeScript already has reactivity primitives** - Callbacks, Promises, async/await work naturally
2. **No type wrapper overhead** - Use `number` not `binding.Int`, `string` not `binding.String`
3. **Pseudo-declarative fits better** - `when()` + store subscriptions match AngularJS 1.0 inspiration
4. **Simpler mental model** - Changes flow through explicit `subscribe()` callbacks
5. **Better TypeScript integration** - No need for Go-style interface{} type erasure

### What Tsyne Provides Instead

| Fyne Binding | Tsyne Equivalent |
|--------------|------------------|
| `binding.String` | Plain `string` + `label.setText()` |
| `binding.Bool` | Plain `boolean` + `widget.when(() => condition)` |
| `binding.StringList` | `ModelBoundList<T>` with `trackBy()` and `each()` |
| `widget.NewLabelWithData()` | `store.subscribe(() => label.setText(...))` |
| Automatic propagation | Explicit `notifyChange()` → subscriber callbacks |

### Example: TodoMVC Filter

```typescript
// Store (Model)
class TodoStore {
  private filter: 'all' | 'active' | 'completed' = 'all';
  private listeners: (() => void)[] = [];

  subscribe(fn: () => void) { this.listeners.push(fn); }
  private notify() { this.listeners.forEach(fn => fn()); }

  setFilter(f: typeof this.filter) {
    this.filter = f;
    this.notify();  // Explicit trigger
  }
}

// View - declarative visibility
todoRow.when(() => {
  const f = store.getFilter();
  return f === 'all' ||
         (f === 'active' && !todo.completed) ||
         (f === 'completed' && todo.completed);
});

// Controller - wire up updates
store.subscribe(() => {
  todoContainer.refreshVisibility();  // Re-evaluates all when() conditions
  countLabel.setText(`${store.getActiveCount()} items left`);
});
```

This achieves the same reactive behavior as Fyne's binding but with:
- Plain TypeScript types
- Explicit data flow
- No wrapper boilerplate
- Better IDE support and type inference

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

See [ROADMAP.md](ROADMAP.md) for current implementation status (~95% Fyne coverage).

**Remaining opportunities:**
1. **Canvas Animations** - Color, position, and size animations
2. **Performance** - Widget pooling, lazy loading for very large lists
3. **Hot Reload** - Development mode with auto-restart on file changes

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


# Put it another way

Tsyne: TypeScript as a Native Scripting Language

  Tsyne's model (ts-node):
  npx ts-node examples/todomvc.ts /tmp/todos.json
  # ↑ TypeScript executes directly, feels like Python/Ruby

  - TypeScript is the source of truth
  - No build artifacts to manage
  - Direct execution: ts-node → TypeScript interpreter
  - Changes to .ts files take effect immediately on next run
  - Feels like a scripting language (Python, Ruby, Lua)

  Traditional web TS development:
  tsc → bundle (webpack/vite) → minify → dist/bundle.min.js
  # ↑ TypeScript is a compile target, JS is what actually runs

  - JavaScript is the runtime artifact
  - TypeScript is just a development-time tool
  - Build step required between code changes and execution
  - Distribution is compiled JS bundles

  Why This Matters for Tsyne

  Native desktop apps benefit from scripting-style development:
  1. Rapid iteration: Change code → run → see results (no bundling wait)
  2. Deployment simplicity: Ship .ts files + ts-node + bridge binary
  3. Debugging: Source maps aren't needed - you're debugging the actual TS code
  4. Clarity: What you write is what executes (no transpilation mystery)

  It's like Electron + Node, but with:
  - Go/Fyne for native UI (not Chromium)
  - TypeScript as the direct runtime (not compiled JS)
  - ts-node as the interpreter (not V8 executing bundled JS)

  This makes Tsyne feel more like PyQt/wxPython (scripting language + native UI) than Electron (web tech + Chromium).

  The bridge architecture enables this: Go handles the heavy UI lifting, TypeScript handles app logic as a first-class scripted language!
