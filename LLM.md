# LLM Quick Reference

## What is Tsyne?

TypeScript → Go bridge → Fyne.io native GUI toolkit. Pseudo-declarative MVC inspired by AngularJS 1.0.

There's a **regular app mode** for standalone desktop applications, and a **browser mode** that loads Tsyne TypeScript pages from HTTP servers (similar to how web browsers load HTML pages). See [docs/BROWSER_MODE.md](docs/BROWSER_MODE.md) for full documentation and `src/browser.ts` for the Swiby-inspired browser implementation


## Architecture

```
TypeScript (src/) ←→ IPC Protocol ←→ Go Bridge (bridge/) ←→ Fyne widgets
```

**Bridge Protocols:**
- `stdio` (default): JSON over stdio, compatible everywhere
- `grpc`: Binary protocol over TCP, faster serialization
- `msgpack-uds` (fastest): MessagePack over Unix Domain Sockets, ~10x faster than JSON

Set via `TSYNE_BRIDGE_MODE` env var or `bridgeMode` option in `app()`

**Key files:**
- `src/app.ts` - App class, factory methods for all widgets
- `src/widgets/` - Widget classes organized by category (base, containers, inputs, display, canvas)
- `src/context.ts` - Declarative builder context (tracks parent containers)
- `src/fynebridge.ts` - IPC to Go process
- `src/window.ts` - Window class and all dialog methods
- `src/browser.ts` - Browser/page mode
- `bridge/main.go` - Go bridge message routing
- `bridge/widget_creators_*.go` - Widget creation handlers (canvas, complex, containers, display, inputs)
- `bridge/dialogs.go` - Dialog handlers

## Intended End-User Code Style

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

**Key conventions:**
- Use `a` for app instance (terse)
  - we could do without that if we made the markup grammar global but we'd be violating IoC
- Builders use arrow functions: `() => { ... }`
- Context tracks parent container automatically
- Async operations return promises

## Widget Categories

**Containers:** vbox, hbox, stack, scroll, grid, center, max, border, gridwrap, adaptivegrid, padded, split, tabs, doctabs, card, accordion, form, themeoverride, clip, innerwindow, navigation, popup, multiplewindows
**Inputs:** button, entry, multilineentry, passwordentry, checkbox, select, selectentry, radiogroup, checkgroup, slider, dateentry, calendar
**Display:** label, hyperlink, separator, spacer, progressbar, progressbarInfinite, activity, image, richtext, table, list, tree, toolbar, menu, textgrid, icon, fileicon
**Canvas:** canvasLine, canvasCircle, canvasRectangle, canvasText, canvasRaster, canvasLinearGradient, canvasArc, canvasPolygon, canvasRadialGradient

**All widgets support:**
- `hide()` / `show()` - Imperative visibility control
- `when(() => boolean)` - Declarative visibility (returns `this` for chaining)
- `refresh()` - Re-evaluate visibility conditions

**VBox/HBox containers also support:**
- `model<T>(items: T[])` - Create ModelBoundList for smart list rendering
- `refreshVisibility()` - Update visibility of all children

## Testing

**Widget mode (TsyneTest):**
```typescript
import { TsyneTest, TestContext } from '../src/index-test';

const tsyneTest = new TsyneTest({ headed: false });
const testApp = await tsyneTest.createApp((app) => {
  createMyApp(app);
});
const ctx = tsyneTest.getContext();
await testApp.run();

await ctx.getByID('helloBtn').click(); // Always prefer getByID
await ctx.getByID('resultLabel').within(500).shouldBe('Result');
```

**Browser mode (TsyneBrowserTest):**
```typescript
import { TsyneBrowserTest } from '../src/index-test';

const test = new TsyneBrowserTest({ headed: false });
// test.page methods like Playwright
```

**Run:** `npm test` or `TSYNE_HEADED=1 npm test examples/todomvc.test.ts`

### TsyneTest Do's and Don'ts

**✅ DO:**
- **ALWAYS use `ctx.getByID()` as your primary selector** - it's unique, stable, and reliable
- Use `.withId('elementId')` to register custom IDs on all widgets that tests interact with
- Use `.within(timeout).shouldBe(value)` pattern for assertions with polling
- Use `.getText()` to retrieve text values directly

**❌ DON'T:**
- Don't use `ctx.wait()` to fix timing issues - use proper locators instead
- Don't increase Jest timeouts - find the root cause instead - lengthening timeouts almost never works
- Don't use `.getValue()` - use `.getText()` or `.within().shouldBe()`

**❌ AVOID getByText() - Use getByID() instead**

Why `getByID()` is strongly preferred:
- **Uniqueness**: IDs are guaranteed unique. Text can be duplicated (e.g., multiple "Reset" buttons)
- **Stability**: IDs don't change. Text changes with UI updates, i18n, or localization
- **Reliability**: Text-based selectors can randomly find the wrong widget when labels overlap
- **Performance**: ID lookups are faster than text searches
- **Bridge safety**: `getByText()` with dynamic content can cause bridge crashes

Only use `getByText()` in rare cases where adding an ID is impossible:
- Don't use `className` parameter as an ID - it's only for styling

**Examples:**
```typescript
// ❌ WRONG - using getByText can find the wrong widget
await ctx.getByText('Reset').click();  // Multiple "Reset" buttons? Random behavior!

// ✅ CORRECT - using getByID is unique and reliable
this.resetBtn = this.a.button('Reset', () => this.reset()).withId('resetBtn');
await ctx.getByID('resetBtn').click();

// ❌ WRONG - using getByText for dynamic content
await ctx.getByText('Generation: 0').shouldExist();

// ✅ CORRECT - using withId and getByID
this.generationLabel = this.a.label('0').withId('generationNum');
await ctx.getByID('generationNum').within(100).shouldBe('0');

// ❌ WRONG - trying to use className as ID
this.label = this.a.label('text', 'myId');  // Second param is className, not ID!
await ctx.getByID('myId').shouldBe('text');  // Won't work

// ✅ CORRECT - using withId for custom ID
this.label = this.a.label('text').withId('myId');
await ctx.getByID('myId').within(100).shouldBe('text');

// ❌ WRONG - using wait() for timing
await ctx.wait(1000);
await ctx.getByText('Loaded').shouldExist();

// ✅ CORRECT - using within() for polling with getByID
await ctx.getByID('statusLabel').within(500).shouldBe('Loaded');
```

## MVC Pattern

**Model:** Observable store with change listeners
**View:** Widget references (don't rebuild, just update)
**Controller:** Event handlers that update model only

**Example (TodoMVC with when()):**
```typescript
class TodoStore {
  private changeListeners: ChangeListener[] = [];

  subscribe(listener: ChangeListener) { /* ... */ }
  private notifyChange() { /* triggers view updates */ }

  addTodo(text: string) {
    this.todos.push({ id: this.nextId++, text, completed: false });
    this.notifyChange(); // ← View auto-updates
  }
}

// Declarative visibility with when()
todoHBox.when(() => {
  const filter = store.getFilter();
  if (filter === 'all') return true;
  if (filter === 'active') return !todo.completed;
  if (filter === 'completed') return todo.completed;
  return true;
});

// Store subscription triggers view updates
store.subscribe(() => {
  rebuildTodoList();  // Can be optimized with ModelBoundList
  updateStatusLabel();
  updateFilterButtons();
});
```

**Declarative APIs:**
- `widget.when(() => boolean)` - Declarative visibility control
- `container.model(items).trackBy(fn).each(builder)` - Smart list binding
- `widget.refresh()` - Re-evaluate visibility conditions
- `container.refreshVisibility()` - Update visibility without rebuild

## Current Capabilities & Limitations

**✅ Implemented:**
1. **when() method** - Declarative visibility control
2. **ModelBoundList** - Smart list binding with diffing
3. **Observable pattern** - Store with change listeners for reactive updates

**⏳ Current Limitations:**
1. **Still rebuilds on change** - TodoMVC rebuilds entire list (ModelBoundList.update() ready to use)
2. **No two-way binding** - Manual setText/getText
3. **No computed properties** - Manual label updates instead of reactive expressions
4. **when() optimization** - Infrastructure in place, not yet used for filter changes

See `more_mvc_like_for_todomvc_app.md` for implementation status and next steps.

## Declarative Patterns

**when() for conditional visibility:**
```typescript
// Single condition
checkbox.when(() => !isEditing);
textEntry.when(() => isEditing);

// Complex condition with store lookup
todoHBox.when(() => {
  const currentTodo = store.getAllTodos().find(t => t.id === todo.id);
  if (!currentTodo) return false;
  const filter = store.getFilter();
  return filter === 'all' ||
         (filter === 'active' && !currentTodo.completed) ||
         (filter === 'completed' && currentTodo.completed);
});
```

**ModelBoundList for smart lists (ng-repeat):**
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

## Additional Display Widgets

**Icon** - Display theme icons:
```typescript
a.icon('confirm');  // Theme icon by name
a.icon('delete');   // 50+ icons: cancel, confirm, delete, search, home, settings, etc.
icon.setIconResource('search');  // Update icon
```

**FileIcon** - Display file type icons:
```typescript
a.fileicon('/path/to/document.pdf');  // Shows PDF icon
fileIcon.setURI('/new/path.jpg');     // Update path
fileIcon.setSelected(true);           // Selection state
```

**Calendar** - Standalone calendar picker:
```typescript
a.calendar(new Date(), (date) => console.log('Selected:', date));
// Full calendar UI, different from dateentry inline picker
```

## Dialog System

All dialogs are methods on `Window` objects:

**Information Dialogs:**
```typescript
await win.showInfo('Title', 'Information message');
await win.showError('Error', 'Something went wrong');
await win.showConfirm('Confirm', 'Are you sure?');  // Returns boolean
```

**File Dialogs:**
```typescript
const filePath = await win.showFileOpen();      // Returns path or null
const savePath = await win.showFileSave('default.txt');  // Returns path or null
const folder = await win.showFolderOpen();      // Returns folder path or null
```

**Input Dialogs:**
```typescript
// Quick text input
const text = await win.showEntryDialog('Name', 'Enter your name:');

// Complex form with multiple fields
const result = await win.showForm('User Details', [
  { type: 'entry', label: 'Name', key: 'name' },
  { type: 'password', label: 'Password', key: 'pass' },
  { type: 'multiline', label: 'Bio', key: 'bio' },
  { type: 'select', label: 'Country', key: 'country', options: ['US', 'UK', 'CA'] },
  { type: 'check', label: 'Subscribe', key: 'subscribe' }
]);
// Returns: { submitted: boolean, values: { name: string, pass: string, ... } }
```

**Color Picker:**
```typescript
const color = await win.showColorPicker('Choose Color', '#ff0000');
// Returns: { hex: '#ff0000', r: 255, g: 0, b: 0, a: 255 }
```

**Custom Content Dialogs:**
```typescript
// Custom dialog with arbitrary content
await win.showCustom('Custom', () => {
  a.vbox(() => {
    a.label('Any widgets here');
    a.button('Action', () => {});
  });
}, { dismissText: 'Close' });

// Custom confirm dialog
const confirmed = await win.showCustomConfirm('Confirm', () => {
  a.label('Custom content with confirm/cancel');
}, { confirmText: 'Yes', dismissText: 'No' });
```

**Progress Dialog:**
```typescript
const progress = await win.showProgress('Loading', 'Please wait...', {
  infinite: false,  // or true for spinner
  onCancelled: () => console.log('User cancelled')
});
progress.setValue(0.5);  // 50% (only for non-infinite)
progress.hide();         // Close dialog
```

## Window Methods

**Window Control:**
```typescript
win.resize(1024, 768);         // Resize window
win.setTitle('New Title');     // Change title
win.centerOnScreen();          // Center on display
win.setFullScreen(true);       // Enter fullscreen
win.setIcon('icon-resource');  // Set window icon
win.close();                   // Close window
```

**Close Intercept:**
```typescript
win.setCloseIntercept(async () => {
  const confirmed = await win.showConfirm('Quit', 'Save changes?');
  return confirmed;  // Return true to allow close, false to prevent
});
```

**Application Menu:**
```typescript
win.setMainMenu([
  {
    label: 'File',
    items: [
      { label: 'New', onClick: () => newFile() },
      { isSeparator: true },
      { label: 'Quit', onClick: () => app.quit() }
    ]
  },
  {
    label: 'Edit',
    items: [
      { label: 'Copy', onClick: () => copy() },
      { label: 'Paste', onClick: () => paste() }
    ]
  }
]);
```

**Clipboard Access:**
```typescript
const content = await win.getClipboard();  // Get clipboard text
await win.setClipboard('Hello');           // Set clipboard text
```

**Screenshot:**
```typescript
await win.screenshot('/path/to/screenshot.png');  // Capture window to PNG
```

## App-Level Features

**Theme Management:**
```typescript
app.setTheme('dark');   // or 'light'
const theme = app.getTheme();  // Returns current theme
```

**Custom Theming:**
```typescript
app.setCustomTheme({
  background: '#1a1a1a',
  foreground: '#ffffff',
  primary: '#0066cc',
  error: '#ff0000',
  success: '#00cc00',
  // 20+ color keys available
});
app.clearCustomTheme();  // Revert to default
```

**Custom Fonts:**
```typescript
app.setCustomFont('/path/to/font.ttf', 'regular');  // regular, bold, italic, boldItalic, monospace, symbol
app.clearCustomFont('regular');  // or 'all' to clear all
app.setFontScale(1.2);           // Global font scaling (0.75-1.5)
const fonts = app.getAvailableFonts();  // Get font info
```

**System Tray:**
```typescript
app.setSystemTray({
  iconPath: '/path/to/icon.png',
  menuItems: [
    { label: 'Show Window', onClick: () => win.show() },
    { isSeparator: true },
    { label: 'Quit', onClick: () => app.quit() }
  ]
});
```

**Desktop Notifications:**
```typescript
app.sendNotification('Title', 'Notification message content');
```

**Persistent Preferences:**
```typescript
// Store and retrieve preferences (persists across sessions)
app.setPreference('username', 'john');
const username = app.getPreference('username', 'default');

// Type-specific getters
const count = app.getPreferenceInt('count', 0);
const ratio = app.getPreferenceFloat('ratio', 1.0);
const enabled = app.getPreferenceBool('enabled', true);

app.removePreference('username');
```

**Show Source Code:**
```typescript
app.showSource();              // Show current app source
app.showSource('/path/to/file.ts');  // Show specific file
```

## Container Widget Methods

**DocTabs (dynamic tab management):**
```typescript
const tabs = a.doctabs((tab) => { /* initial tabs */ });
tabs.append('New Tab', () => a.label('Content'), true);  // Add tab, select it
tabs.remove(0);    // Remove tab by index
tabs.select(1);    // Select tab by index
```

**Navigation (stack-based navigation):**
```typescript
const nav = a.navigation('Home', () => a.label('Home page'));
nav.push(() => a.label('Detail page'), 'Details');  // Push new view
nav.back();       // Pop to previous
nav.forward();    // Go forward in history
nav.setTitle('New Title');  // Update current title
```

**InnerWindow:**
```typescript
const inner = a.innerwindow('Title', () => { /* content */ });
inner.setTitle('New Title');
inner.close();
```

**Popup:**
```typescript
const popup = a.popup(() => { /* content */ });
popup.show(100, 200);  // Show at x, y coordinates
popup.move(150, 250);  // Move to new position
popup.hide();          // Hide popup
```

## Interaction Features

**Drag & Drop:**
```typescript
widget.setDraggable(true);   // Enable dragging
widget.setDroppable(true);   // Accept drops
// Handle via callbacks configured at creation
```

**Context Menus:**
```typescript
widget.setContextMenu([
  { label: 'Copy', onClick: () => copy() },
  { label: 'Paste', onClick: () => paste() }
]);
```

**Focus Management:**
```typescript
widget.focus();      // Set focus to widget
widget.focusNext();  // Move to next focusable
widget.focusPrevious();  // Move to previous focusable
```

**Widget Registration (for testing):**
```typescript
widget.registerTestId('my-button');    // Register for automated testing
widget.registerCustomId('unique-id');  // Custom ID for lookup
```

## Accessibility

```typescript
// Set accessibility metadata
widget.setAccessibility({
  label: 'Submit button',
  description: 'Submits the form',
  role: 'button'
});

// Screen reader announcements
app.announce('Form submitted successfully');

// Enable/disable accessibility
app.enableAccessibility();
app.disableAccessibility();
```

## TextGrid Advanced Features

```typescript
const grid = a.textgrid(80, 24);  // columns, rows

// Set content
grid.setText('Full grid content');
grid.setCell(0, 0, 'A', { fgColor: '#ff0000', bold: true });
grid.setRow(1, 'Entire row text', { bgColor: '#333333' });

// Styling
grid.setStyle(0, 0, { fgColor: '#00ff00', italic: true });
grid.setStyleRange(0, 0, 5, 10, { bgColor: '#0000ff' });

// Read content
const text = grid.getText();
```

## Resource Management

```typescript
// Register binary resources (for images, fonts, etc.)
app.resources.register('my-image', imageBuffer);
app.resources.unregister('my-image');

// Use registered resources
a.image({ resource: 'my-image' });
```

## Adding Features

**New widget (TypeScript):**
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

**New widget (Go bridge):**
```go
func (b *Bridge) handleCreateMyWidget(msg Message) {
  widgetID := msg.Payload["id"].(string)
  widget := widget.NewMyWidget()
  b.widgets[widgetID] = widget
  b.sendResponse(Response{ID: msg.ID, Success: true})
}
```

## Philosophy

- **Terse**: Use single letters where clear (`a` for app)
- **Declarative**: Describe UI structure, not imperative steps
- **Type-safe**: Full TypeScript types
- **Test-driven**: Include Jest tests for new features (npx jest to execute)
- **AI-friendly**: AI assistance encouraged for tests, code

## Quick Start

### Agentic Dev Environments

If you're in a containerized/cloud environment (Claude Code Web, Google's JulesAgent, Codespaces, etc.) with restricted network access:

```bash
# Step 1: Install system dependencies
apt-get update -qq
apt-get install -y libgl1-mesa-dev xorg-dev libxrandr-dev

# Step 2: Download Fyne and systray from GitHub (bypasses Google's module proxy)
cd /tmp
wget -q https://github.com/fyne-io/fyne/archive/refs/tags/v2.7.1.tar.gz -O fyne-v2.7.1.tar.gz
tar -xzf fyne-v2.7.1.tar.gz
wget -q https://github.com/fyne-io/systray/archive/refs/heads/master.tar.gz -O systray-master.tar.gz
tar -xzf systray-master.tar.gz

# Step 3: Use go mod replace to point to local copies
cd /home/user/tsyne/bridge
go mod edit -replace=fyne.io/fyne/v2=/tmp/fyne-2.7.1
go mod edit -replace=fyne.io/systray=/tmp/systray-master

# Step 4: Build bridge with GOPROXY=direct (bypasses Google's module proxy for remaining deps)
env GOPROXY=direct go build -o ../bin/tsyne-bridge .

# Step 5: Install npm dependencies
cd /home/user/tsyne
npm install --ignore-scripts

# Step 6: Build and test
npm run build
npm test
```

### Standard Environments (Full Network Access)

If you have unrestricted network access:

```bash
npm install
cd bridge && go build -o ../bin/tsyne-bridge && cd ..
npm run build
node examples/hello.js
npm test
```

**IMPORTANT:** DO NOT BUILD `tsyne-bridge` anywhere else - it goes into `bin/` only.

## Development Workflow

**CRITICAL: No compiled JavaScript in src/ directory**

- TypeScript source files live in `src/` (`.ts` files only)
- Compiled output goes to `dist/` directory only (via `npm run build`)
- **NEVER** have `.js` or `.d.ts` files in the `src/` tree
- Use `npx ts-node` for running applications (compiles on-the-fly)
- This applies to both development AND production - ts-node is used everywhere
- Tests use ts-node automatically - no pre-compilation needed

**Why this matters:**
- When `.js` files exist in `src/`, Node.js/ts-node loads them instead of compiling `.ts` files
- This causes stale code issues where your TypeScript changes don't take effect
- The project depends on ts-node on-the-fly compilation, not pre-compiled artifacts
- `npm run build` creates `dist/` for distribution, but runtime uses ts-node

**If you find `.js` files in src/:**
```bash
# Clean up stale compiled files
rm src/*.js src/*.d.ts src/**/*.js src/**/*.d.ts
```

**Running applications (development and production):**
```bash
npx ts-node examples/calculator.ts
npx ts-node examples/todomvc.ts
npx ts-node examples/01-hello-world.ts
npx ts-node your-app.ts
```

## Troubleshooting

See **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** for detailed solutions to common issues:
- Cloud/LLM environment setup (restricted network access)
- Go module proxy issues (`storage.googleapis.com`, `fyne.io/systray`)
- Missing system libraries (X11, OpenGL)
- Bridge startup problems
- Test timeouts
- Stale compiled JavaScript

### Screenshots Are Blank in Cloud/LLM Environments

**Problem:** You've set up Xvfb, run tests with `TSYNE_HEADED=1 TAKE_SCREENSHOTS=1`, tests pass, but screenshots are blank/white (~600 bytes instead of ~7KB).

**This is expected behavior, not a bug.**

Fyne uses OpenGL for rendering, which requires GPU hardware acceleration. Xvfb provides a software X11 display but cannot render OpenGL content properly. As a result:

- ✅ Tests pass (logic is verified)
- ✅ Screenshot files are created (capture mechanism works)
- ❌ Screenshot content is blank (OpenGL doesn't render to software framebuffer)

**What to do:**

1. **Don't worry about it** - Tests verify functionality; screenshots are supplementary
2. **Use existing screenshots** - `examples/screenshots/` contains pre-captured screenshots from a real display
3. **Verify screenshots exist** - Check file sizes (~7KB = real content, ~600 bytes = blank)

**For documentation purposes:** The repository's existing screenshots were captured on machines with real displays and show actual UI content. These can be referenced without needing to regenerate them.

See `docs/SCREENSHOTS.md` for more details on screenshot troubleshooting.

## References

### Documentation
- **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** - Complete API reference for widgets, layouts, and dialogs
- **[docs/reference.md](docs/reference.md)** - Comprehensive technical reference with examples
- **[docs/README.md](docs/README.md)** - Documentation index and navigation
- `docs/ARCHITECTURE.md` - Deep dive into internal architecture
- `docs/TESTING.md` - TsyneTest framework guide
- `docs/BROWSER_TESTING.md` - Browser mode testing guide
- `docs/PATTERNS.md` - MVC, MVVM, MVP patterns
- `docs/ACCESSIBILITY.md` - Accessibility features and guidelines
- `docs/QUICKSTART.md` - Getting started guide
- `docs/ROADMAP.md` - Feature roadmap (~85% Fyne coverage, lists remaining APIs)
- `docs/PROS_AND_CONS.md` - Honest comparison with Electron/Tauri
- `docs/TROUBLESHOOTING.md` - Common issues and solutions

### Example Code
- `examples/todomvc.ts` - Full MVC example with when() and filtering
- `examples/todomvc-when.ts` - Preserved when() implementation variant
- `more_mvc_like_for_todomvc_app.md` - Implementation status and next steps
- `src/widgets/base.ts` - Widget base class, when() implementation
- `src/widgets/containers.ts` - ModelBoundList, all container widgets

### Community
- `CODE_OF_CONDUCT.md` - Community guidelines
- `CONTRIBUTING.md` - Developer guide
