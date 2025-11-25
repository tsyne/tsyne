# Tsyne Complete Reference

**Version:** 0.1.0
**Last Updated:** 2025-11-15

Complete technical reference for Tsyne - TypeScript → Go bridge → Fyne.io native GUI toolkit with pseudo-declarative MVC inspired by AngularJS 1.0.

## Table of Contents

- [What is Tsyne?](#what-is-tsyne)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Widget Reference](#widget-reference)
- [Layout System](#layout-system)
- [MVC Pattern](#mvc-pattern)
- [Testing](#testing)
- [Browser Mode](#browser-mode)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## What is Tsyne?

TypeScript → Go bridge → Fyne.io native GUI toolkit. Pseudo-declarative MVC inspired by AngularJS 1.0.

**Two Modes:**
1. **Regular App Mode**: Standard desktop applications with windows and widgets
2. **Browser/Page Mode**: Web-browser-like navigation with TypeScript pages served via HTTP

### Architecture

```
TypeScript (src/) ←→ JSON-RPC over stdio ←→ Go Bridge (bridge/) ←→ Fyne widgets
```

**Key Files:**
- `src/app.ts` - App class, factory methods
- `src/widgets.ts` - All widget classes
- `src/context.ts` - Declarative builder context (tracks parent containers)
- `src/fynebridge.ts` - IPC to Go process
- `src/browser.ts` - Browser/page mode
- `bridge/main.go` - Go bridge implementation

---

## Architecture Overview

### Communication Flow

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
```

### IPC Protocol

**Binary Frame Format** (v0.1.x+):
```
[uint32 length][uint32 crc32][json payload]
├─ 4 bytes  ──┤├─ 4 bytes ─┤├─ N bytes ─┤
```

**Features:**
- Message boundary detection via length prefix
- CRC32 integrity validation
- Recovery capability for corrupt frames
- 10MB size limit per message
- All logging redirected to stderr

**Why not newline-delimited JSON?**
- Any stray stdout write corrupts the stream
- Fyne or third-party libs might print to stdout
- No way to detect or recover from corruption

**Future (v0.2.0+):** Unix Domain Sockets with TCP fallback for Windows

---

## Quick Start

### Installation

See **[INSTALLATION.md](INSTALLATION.md)** for complete installation instructions.

**Quick start:**
```bash
# npm package (coming soon)
npm install tsyne  # Not yet published

# OR use standalone installer
curl -O https://raw.githubusercontent.com/paul-hammant/tsyne/main/scripts/install.sh
chmod +x install.sh && ./install.sh
```

### First App

```typescript
import { app } from 'tsyne';

app({ title: 'My App' }, (a) => {
  a.window({ title: 'Window', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Hello Tsyne!');
        a.button('Click Me', () => console.log('clicked'));
      });
    });
    win.show();
  });
});
```

### Building from Source

```bash
npm install
cd bridge && go build -o ../bin/tsyne-bridge && cd ..
npm run build
node examples/hello.js
npm test
```

**IMPORTANT:** DO NOT BUILD `tsyne-bridge` anywhere else - it goes into `bin/` only.

---

## Core Concepts

### Intended Code Style

**Pseudo-declarative builder pattern:**

```typescript
app({ title: 'My App' }, (a) => {
  a.window({ title: 'Window', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Hello');
        a.button('Click', () => console.log('clicked'));
        a.hbox(() => {
          a.entry('placeholder', onSubmit, 300);
        });
      });
    });
    win.show();
  });
});
```

**Key Conventions:**
- Use `a` for app instance (terse, inspired by Ruby DSLs)
- Builders use arrow functions: `() => { ... }`
- Context tracks parent container automatically
- Async operations return promises

### Context Management

The `Context` class tracks state during declarative UI building:

- **Widget ID generation**: Ensures unique IDs for all widgets
- **Window stack**: Tracks which window is currently being built
- **Container stack**: Tracks nested containers (VBox, HBox) to collect children

Example flow:
```typescript
vbox(() => {
  button("Click me");  // Automatically added to vbox
  label("Hello");      // Automatically added to vbox
});
```

The Context:
1. Pushes a new container onto the stack
2. Executes the builder function (widgets add themselves to container)
3. Pops the container and retrieves collected widget IDs
4. Sends `createVBox` message with child IDs

---

## Widget Reference

### Widget Categories

**Containers:**
- `vbox`, `hbox`, `stack`, `scroll`, `grid`, `center`, `border`, `gridwrap`, `split`, `tabs`, `card`, `accordion`, `form`

**Inputs:**
- `button`, `entry`, `multilineentry`, `passwordentry`, `checkbox`, `select`, `radiogroup`, `slider`

**Display:**
- `label`, `hyperlink`, `separator`, `progressbar`, `image`, `richtext`, `table`, `list`, `tree`, `toolbar`

**Browser:**
- `browser` (embedded webview/page navigation)

### Common Widget Features

**All widgets support:**
- `hide()` / `show()` - Imperative visibility control
- `when(() => boolean)` - Declarative visibility (returns `this` for chaining)
- `refresh()` - Re-evaluate visibility conditions

**VBox/HBox containers also support:**
- `model<T>(items: T[])` - Create ModelBoundList for smart list rendering
- `refreshVisibility()` - Update visibility of all children

### Widget Examples

**Button:**
```typescript
const btn = a.button('Click Me', () => {
  console.log('Button clicked!');
});
```

**Label:**
```typescript
const lbl = a.label('Hello World');
await lbl.setText('Updated text');
const text = await lbl.getText(); // 'Updated text'
```

**Entry (Text Input):**
```typescript
const entry = a.entry(
  'Enter name...',
  async (text) => console.log('Submitted:', text),
  300, // width
  undefined, // onDoubleClick
  (text) => console.log('Changed:', text),
  () => console.log('Cursor moved')
);

const text = await entry.getText();
await entry.setText('John Doe');
```

**Entry events:**
- `onSubmit` - Enter key pressed
- `onChange` - Text content changed
- `onDoubleClick` - Double-clicked
- `onCursorChanged` - Cursor position changed (arrow keys, mouse clicks)

**Checkbox:**
```typescript
const cb = a.checkbox(
  'Accept terms',
  (checked) => console.log('Checked:', checked),
  () => console.log('Focused'),
  () => console.log('Blurred')
);
```

**Checkbox events:**
- `onChanged` - Checked state changed
- `onFocus` - Widget gained focus
- `onBlur` - Widget lost focus

**Select (Dropdown):**
```typescript
const sel = a.select(
  ['Option 1', 'Option 2'],
  (selected) => console.log('Selected:', selected),
  () => console.log('Focused'),
  () => console.log('Blurred')
);

// Dynamic option updates
await sel.setOptions(['New Option 1', 'New Option 2']);
```

**Select events:**
- `onSelected` - Selection changed
- `onFocus` - Widget gained focus
- `onBlur` - Widget lost focus

---

## Layout System

### VBox (Vertical Box)

```typescript
a.vbox(() => {
  a.label('First');
  a.label('Second');
  a.label('Third');
});
```

### HBox (Horizontal Box)

```typescript
a.hbox(() => {
  a.button('Left');
  a.button('Center');
  a.button('Right');
});
```

### Stack Container

```typescript
a.stack(() => {
  // Background layer (bottom)
  a.rectangle('#3498db', 400, 100);

  // Text overlay (top)
  a.center(() => {
    a.label('Overlaid Text');
  });
});
```

**Use cases:**
- Image overlays with text
- Loading indicators over content
- Watermarks
- Picture-in-picture displays
- Badge indicators

### Grid Layout

```typescript
a.grid(2, () => {  // 2 columns
  a.button('1');
  a.button('2');
  a.button('3');
  a.button('4');
});
```

### Split Container

```typescript
a.hsplit(
  () => a.label('Left pane'),
  () => a.label('Right pane')
);

a.vsplit(
  () => a.label('Top pane'),
  () => a.label('Bottom pane')
);
```

### Tabs

```typescript
a.tabs([
  { title: 'Tab 1', builder: () => a.label('Content 1') },
  { title: 'Tab 2', builder: () => a.label('Content 2') }
]);
```

### Scroll Container

```typescript
a.scroll(() => {
  a.vbox(() => {
    // Long content...
    for (let i = 0; i < 100; i++) {
      a.label(`Item ${i}`);
    }
  });
});
```

---

## MVC Pattern

### Model: Observable Store with Change Listeners

```typescript
class TodoStore {
  private changeListeners: ChangeListener[] = [];
  private todos: Todo[] = [];

  subscribe(listener: ChangeListener) {
    this.changeListeners.push(listener);
  }

  private notifyChange() {
    this.changeListeners.forEach(l => l());
  }

  addTodo(text: string) {
    this.todos.push({ id: this.nextId++, text, completed: false });
    this.notifyChange(); // ← View auto-updates
  }
}
```

### View: Widget References (Don't Rebuild, Just Update)

```typescript
class TodoView {
  private todoContainer: VBox;
  private statusLabel: Label;

  buildUI(store: TodoStore) {
    a.vbox(() => {
      this.todoContainer = a.vbox(() => {});
      this.statusLabel = a.label('0 items');
    });

    // Subscribe to model changes
    store.subscribe(() => this.update(store));
  }

  update(store: TodoStore) {
    this.statusLabel.setText(`${store.getTodos().length} items`);
    this.rebuildTodoList(store);
  }
}
```

### Controller: Event Handlers that Update Model Only

```typescript
class TodoController {
  constructor(
    private model: TodoStore,
    private view: TodoView
  ) {}

  handleAddTodo(text: string) {
    this.model.addTodo(text);  // Model update only
    // View updates automatically via subscription
  }
}
```

### Declarative Visibility with when()

```typescript
todoHBox.when(() => {
  const filter = store.getFilter();
  if (filter === 'all') return true;
  if (filter === 'active') return !todo.completed;
  if (filter === 'completed') return todo.completed;
  return true;
});
```

### ModelBoundList for Smart Lists (ng-repeat Style)

```typescript
// Future: Smart list with incremental updates
const listBinding = todoContainer
  .model(store.getAllTodos())
  .trackBy((todo) => todo.id)
  .each((todo) => {
    a.hbox(() => {
      a.checkbox(todo.text, () => store.toggleTodo(todo.id));
      a.button('Delete', () => store.deleteTodo(todo.id));
    });
  });

// Update with smart diffing
store.subscribe(() => {
  listBinding.update(store.getAllTodos());
});
```

### Current Capabilities & Limitations

**✅ Implemented:**
1. **when() method** - Declarative visibility control (AngularJS when() style)
2. **ModelBoundList** - Smart list binding with diffing (AngularJS ng-repeat style)
3. **Observable pattern** - Store with change listeners for reactive updates

**⏳ Current Limitations:**
1. **Still rebuilds on change** - TodoMVC rebuilds entire list (ModelBoundList.update() ready to use)
2. **No two-way binding** - Manual setText/getText instead of ng-model
3. **No computed properties** - Manual label updates instead of reactive expressions
4. **when() optimization** - Infrastructure in place, not yet used for filter changes

---

## Testing

Tsyne has a two-tier testing approach:

```
        /\
       /UI \          TsyneTest - integration tests (~3s)
      /______\
     /        \
    /  Logic  \       Jest - unit tests (~100ms)
   /____________\
```

### Jest for Unit Tests (Business Logic)

```typescript
import { TodoStore } from './todomvc';

describe('TodoStore', () => {
  it('should add todos', () => {
    const store = new TodoStore();
    store.addTodo('Buy milk');
    expect(store.getAllTodos()).toHaveLength(1);
    expect(store.getAllTodos()[0].text).toBe('Buy milk');
  });
});
```

**Run:** `npx jest`

### TsyneTest for Integration Tests (Widget Mode)

```typescript
import { TsyneTest } from '../src/index-test';

const tsyneTest = new TsyneTest({ headed: false });
const testApp = await tsyneTest.createApp((app) => {
  createMyApp(app);
});
const ctx = tsyneTest.getContext();
await testApp.run();

// Interact with UI
await ctx.getByText('Hello').click();
await ctx.expect(ctx.getByExactText('Result')).toBeVisible();
```

### TsyneBrowserTest for Browser Mode

```typescript
import { TsyneBrowserTest } from '../src/index-test';

const test = new TsyneBrowserTest({ headed: false });
// test.page methods like Playwright
```

### Running Tests

```bash
# All tests
npm test

# Specific test
npx jest examples/todomvc.test.ts

# Headed mode (visual debugging)
TSYNE_HEADED=1 npm test examples/todomvc.test.ts
```

### Locators

```typescript
// By exact text
await ctx.getByExactText('Submit').click();

// By partial text
const label = ctx.getByText('Counter:');

// By type
const buttons = ctx.getByType('button');
```

### Assertions

```typescript
// Text matching
await ctx.expect(ctx.getByType('label')).toHaveText('Count: 5');
await ctx.expect(ctx.getByType('label')).toContainText('Count:');

// Visibility
await ctx.expect(ctx.getByExactText('Submit')).toBeVisible();

// Count
await ctx.expect(ctx.getByType('button')).toHaveCount(5);
```

---

## Browser Mode

Tsyne includes a web-browser-like mode where pages are served via HTTP as TypeScript code.

### Creating a Browser

```typescript
import { TsyneBrowser } from 'tsyne';

const browser = new TsyneBrowser({
  homeUrl: 'http://localhost:3000/',
  width: 900,
  height: 700
});

await browser.start();
```

### Page Format

Pages are TypeScript files executed in the browser context:

```typescript
// Served from http://localhost:3000/hello
const { vbox, label, button } = tsyne;

vbox(() => {
  label('Welcome to Page-Based Tsyne!');
  button('Next Page', () => {
    browserContext.changePage('/next');
  });
});
```

### Browser Navigation API

```typescript
// Navigate
browserContext.changePage('/path');

// History
browserContext.back();
browserContext.forward();
browserContext.reload();

// Status
browserContext.setStatus('Loading...');
browserContext.setPageTitle('My Page');

// Current state
console.log(browserContext.currentUrl);
```

### Browser Features

- ✅ Address bar with URL entry
- ✅ Back/Forward navigation
- ✅ Reload/Stop buttons
- ✅ History persistence
- ✅ Bookmarks with import/export
- ✅ Page caching
- ✅ Status bar
- ✅ View page source
- ✅ Find in page
- ✅ Menu bar (File, View, History, Bookmarks, Help)
- ✅ Custom page menus via `browserContext.addPageMenu()`

---

## Advanced Features

### Adding a New Widget (TypeScript)

```typescript
export class MyWidget extends Widget {
  constructor(ctx: Context, options: any) {
    const id = ctx.generateId('mywidget');
    super(ctx, id);
    ctx.bridge.send('createMyWidget', { id, ...options });
    ctx.addToCurrentContainer(id);
  }
}
```

### Adding a New Widget (Go Bridge)

```go
func (b *Bridge) handleCreateMyWidget(msg Message) {
  widgetID := msg.Payload["id"].(string)
  widget := widget.NewMyWidget()
  b.widgets[widgetID] = widget
  b.sendResponse(Response{ID: msg.ID, Success: true})
}
```

### Styling System

Tsyne has a CSS-like styling system:

```typescript
import { styles, FontFamily, FontStyle } from 'tsyne';

styles({
  root: {
    font_family: FontFamily.SANS_SERIF,
    font_size: 12
  },
  button: {
    font_weight: 'bold',
    color: 0x0000FF,
    background_color: 0xEEEEEE
  },
  label: {
    font_style: FontStyle.ITALIC,
    text_align: 'center'
  }
});
```

**Supported properties:**
- `font_family`, `font_size`, `font_weight`, `font_style`
- `color`, `background_color`
- `text_align`

---

## Troubleshooting

### Cloud/LLM Environment Setup (Restricted Network Access)

**Problem:** Working in containerized/cloud environments where network access is restricted and you can't access `storage.googleapis.com`, `fyne.io`, or other dependency hosts.

**Complete Solution:**

```bash
# Step 1: Install system dependencies
apt-get update -qq
apt-get install -y libgl1-mesa-dev xorg-dev libxrandr-dev

# Step 2: Download fyne.io/systray manually
cd /tmp
wget -q https://github.com/fyne-io/systray/archive/refs/heads/master.tar.gz -O systray-master.tar.gz
tar -xzf systray-master.tar.gz

# Step 3: Use go mod replace
cd /home/user/tsyne/bridge
go mod edit -replace=fyne.io/systray=/tmp/systray-master

# Step 4: Build bridge with GOPROXY=direct
env GOPROXY=direct go build -o ../bin/tsyne-bridge .

# Step 5: Install npm dependencies
cd /home/user/tsyne
npm install --ignore-scripts

# Step 6: Run tests
npx jest examples/solitaire/draw-regression.test.ts --runInBand
```

**What this fixes:**
- ✅ Bypasses `storage.googleapis.com` (Google's Go module proxy)
- ✅ Bypasses `fyne.io/systray` direct fetch (503 errors)
- ✅ Installs required X11/OpenGL headers for Fyne
- ✅ Skips npm postinstall script that would fail without network
- ✅ Allows running tests in restricted environments

### Standard Setup: Can't Access storage.googleapis.com

**Solution:** Use `GOPROXY=direct` to fetch from GitHub instead:

```bash
cd bridge
env GOPROXY=direct go build -o ../bin/tsyne-bridge .
```

**If you get C library errors:**

```bash
# Ubuntu/Debian
apt-get update
apt-get install -y libgl1-mesa-dev xorg-dev libxrandr-dev

# Then rebuild
cd bridge
env GOPROXY=direct go build -o ../bin/tsyne-bridge .
```

### Bridge Doesn't Start

- Check that `bin/tsyne-bridge` exists and is executable
- Verify Go is installed and Fyne dependencies are met

### Widgets Not Appearing

- Ensure `setContent` is called before `showWindow`
- Check that widgets are created in the correct container context

### Events Not Firing

- Verify callback IDs are being registered
- Check that event handlers are registered before `run()` is called

---

## API Reference

### App

```typescript
import { app } from 'tsyne';

app({ title: string }, (app: App) => void): App
```

### Window

```typescript
app.window({
  title: string,
  width?: number,
  height?: number
}, (win: Window) => void): Window

win.setContent(() => void): void
win.show(): void
win.hide(): void
win.close(): void
```

### Widgets

```typescript
// Label
app.label(text: string): Label
label.setText(text: string): Promise<void>
label.getText(): Promise<string>

// Button
app.button(text: string, onClick?: () => void): Button

// Entry
app.entry(
  placeholder?: string,
  onSubmit?: (text: string) => void,
  width?: number,
  onDoubleClick?: () => void,
  onChange?: (text: string) => void,
  onCursorChanged?: () => void
): Entry
entry.setText(text: string): Promise<void>
entry.getText(): Promise<string>

// Checkbox
app.checkbox(
  label: string,
  onChange?: (checked: boolean) => void,
  onFocus?: () => void,
  onBlur?: () => void
): Checkbox
checkbox.setChecked(checked: boolean): Promise<void>
checkbox.getChecked(): Promise<boolean>

// Select
app.select(
  options: string[],
  onSelected?: (value: string) => void,
  onFocus?: () => void,
  onBlur?: () => void
): Select
select.setSelected(value: string): Promise<void>
select.getSelected(): Promise<string>
select.setOptions(options: string[]): Promise<void>

// Slider
app.slider(
  min: number,
  max: number,
  initial: number,
  onChange?: (value: number) => void,
  onFocus?: () => void,
  onBlur?: () => void
): Slider
slider.setValue(value: number): Promise<void>
slider.getValue(): Promise<number>

// RadioGroup
app.radiogroup(
  options: string[],
  initialSelected?: string,
  onSelected?: (selected: string) => void,
  horizontal?: boolean
): RadioGroup
radiogroup.setSelected(value: string): Promise<void>
radiogroup.getSelected(): Promise<string>
radiogroup.setOptions(options: string[]): Promise<void>

// List
app.list(
  items: string[],
  onSelected?: (index: number, item: string) => void,
  onUnselected?: (index: number, item: string) => void
): List
list.updateItems(items: string[]): Promise<void>
list.unselectAll(): Promise<void>
```

### Containers

```typescript
// VBox
app.vbox(builder: () => void): VBox

// HBox
app.hbox(builder: () => void): HBox

// Stack - overlapping widgets
app.stack(builder: () => void): Stack

// Grid
app.grid(columns: number, builder: () => void): Grid

// Scroll
app.scroll(builder: () => void): Scroll

// Split
app.hsplit(left: () => void, right: () => void): Split
app.vsplit(top: () => void, bottom: () => void): Split

// Tabs
app.tabs(items: { title: string, builder: () => void }[]): Tabs
```

### Visibility Control

```typescript
// All widgets
widget.hide(): void
widget.show(): void
widget.when(condition: () => boolean): Widget  // Chainable
widget.refresh(): void

// Containers
container.refreshVisibility(): void
```

### Model Binding

```typescript
// VBox/HBox
container.model<T>(items: T[]): ModelBoundList<T>

// ModelBoundList
list.trackBy(fn: (item: T) => any): ModelBoundList<T>
list.each(builder: (item: T) => void): ModelBoundList<T>
list.update(newItems: T[]): void
```

### Browser Context

```typescript
// Navigation
browserContext.changePage(url: string): Promise<void>
browserContext.back(): void
browserContext.forward(): void
browserContext.reload(): void
browserContext.stop(): void

// State
browserContext.currentUrl: string
browserContext.setStatus(message: string): void
browserContext.setPageTitle(title: string): void

// Menus
browserContext.addPageMenu(name: string, items: MenuItem[]): void

// Search
browserContext.findInPage(query: string): void
browserContext.findNext(): void
browserContext.findPrevious(): void
browserContext.clearFind(): void
```

### Testing

```typescript
// TsyneTest
import { TsyneTest } from 'tsyne/test';

const test = new TsyneTest({ headed: boolean });
const app = test.createApp((app) => void);
const ctx = test.getContext();
await app.run();
await test.cleanup();

// Locators
ctx.getByExactText(text: string): Locator
ctx.getByText(text: string): Locator
ctx.getByType(type: string): Locator

// Actions
locator.click(): Promise<void>
locator.type(text: string): Promise<void>
locator.getText(): Promise<string>
locator.getInfo(): Promise<WidgetInfo>
locator.waitFor(timeout?: number): Promise<void>

// Assertions
ctx.expect(locator).toHaveText(text: string): Promise<void>
ctx.expect(locator).toContainText(text: string): Promise<void>
ctx.expect(locator).toBeVisible(): Promise<void>
ctx.expect(locator).toExist(): Promise<void>
ctx.expect(locator).toHaveCount(count: number): Promise<void>

// Helpers
ctx.wait(ms: number): Promise<void>
ctx.getAllWidgets(): Promise<WidgetInfo[]>
```

---

## Philosophy

- **Terse**: Use single letters where clear (`a` for app)
- **Declarative**: Describe UI structure, not imperative steps
- **Type-safe**: Full TypeScript types
- **Test-driven**: Include Jest tests for new features (`npx jest` to execute)
- **AI-friendly**: AI assistance encouraged for tests and code

---

## References

### Example Applications

- `examples/todomvc.ts` - Full MVC example with when() (16 tests, 15/16 passing)
- `examples/todomvc-when.ts` - Preserved when() implementation variant
- `examples/hello.ts` - Simple hello world
- `examples/calculator.ts` - Calculator with business logic tests

### Documentation

- `README.md` - Getting started
- `ARCHITECTURE.md` - Internal architecture deep dive
- `TESTING.md` - TsyneTest framework guide
- `PATTERNS.md` - Architectural patterns (MVC, MVVM, MVP)
- `QUICKSTART.md` - 5-minute quick start
- `ROADMAP.md` - Feature roadmap and implementation status
- `PROS_AND_CONS.md` - Comparison with Electron/Tauri
- `PUBLISHING.md` - npm publishing guide

### Key Commits

- `fa35224` - Added when() method and ModelBoundList infrastructure
- `b75ab38` - Added todomvc-when variants to preserve implementation
- `6c5ac7c` - Forked chess example into Tsyne
- `dfc2379` - Fork andydotxyz/chess into Tsyne as idiomatic TypeScript solution

---

## Version History

**v0.1.0** (Current)
- Core infrastructure with JSON-RPC bridge
- 17+ widgets implemented
- Advanced layouts (VBox, HBox, Grid, Split, Tabs, etc.)
- TsyneTest framework with Playwright-like API
- Browser mode with navigation
- MVC pattern with when() and ModelBoundList
- Jest integration for business logic tests
- CSS-like styling system
- Menu and toolbar support

**Next: v0.2.0** - Essential widgets (Checkbox, Select, ProgressBar, basic dialogs)

---

**Tsyne** - Native desktop apps using TypeScript, without the web overhead.

*"TypeScript as a Native Scripting Language"*
