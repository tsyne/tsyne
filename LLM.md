# LLM Quick Reference

## What is Tsyne?

TypeScript → Go bridge → Fyne.io native GUI toolkit. Pseudo-declarative MVC inspired by AngularJS 1.0.

There's a **regular app mode** for standalone desktop applications, and a **browser mode** that loads Tsyne TypeScript pages from HTTP servers (similar to how web browsers load HTML pages). See [docs/BROWSER_MODE.md](docs/BROWSER_MODE.md) for full documentation and `src/browser.ts` for the Swiby-inspired browser implementation


## Architecture

```
TypeScript (src/) ←→ JSON-RPC over stdio ←→ Go Bridge (bridge/) ←→ Fyne widgets
```

**Key files:**
- `src/app.ts` - App class, factory methods
- `src/widgets.ts` - All widget classes
- `src/context.ts` - Declarative builder context (tracks parent containers)
- `src/fynebridge.ts` - IPC to Go process
- `src/browser.ts` - Browser/page mode
- `bridge/main.go` - Go bridge implementation

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

**Containers:** vbox, hbox, scroll, grid, center, border, gridwrap, split, tabs, card, accordion, form, themeoverride, stack, clip, innerwindow, navigation
**Inputs:** button, entry, multilineentry, passwordentry, checkbox, select, radiogroup, slider
**Display:** label, hyperlink, separator, progressbar, image, richtext, table, list, tree, toolbar
**Browser:** browser (embedded webview/page)

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

await ctx.getByText('Hello').click();
await ctx.expect(ctx.getByExactText('Result')).toBeVisible();
```

**Browser mode (TsyneBrowserTest):**
```typescript
import { TsyneBrowserTest } from '../src/index-test';

const test = new TsyneBrowserTest({ headed: false });
// test.page methods like Playwright
```

**Run:** `npm test` or `TSYNE_HEADED=1 npm test examples/todomvc.test.ts`

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

### Cloud/LLM Environments (Recommended)

If you're in a containerized/cloud environment (Claude Code, Codespaces, etc.) with restricted network access:

```bash
# Step 1: Install system dependencies
apt-get update -qq
apt-get install -y libgl1-mesa-dev xorg-dev libxrandr-dev

# Step 2: Download fyne.io/systray manually (not on Google's proxy)
cd /tmp
wget -q https://github.com/fyne-io/systray/archive/refs/heads/master.tar.gz -O systray-master.tar.gz
tar -xzf systray-master.tar.gz

# Step 3: Use go mod replace to point to local systray
cd /home/user/tsyne/bridge
go mod edit -replace=fyne.io/systray=/tmp/systray-master

# Step 4: Build bridge with GOPROXY=direct (bypasses Google's module proxy)
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
- `docs/ROADMAP.md` - Feature roadmap (~50% Fyne coverage, lists remaining APIs)
- `docs/PROS_AND_CONS.md` - Honest comparison with Electron/Tauri
- `docs/TROUBLESHOOTING.md` - Common issues and solutions

### Example Code
- `examples/todomvc.ts` - Full MVC example with when() and filtering
- `examples/todomvc-when.ts` - Preserved when() implementation variant
- `more_mvc_like_for_todomvc_app.md` - Implementation status and next steps
- `src/widgets.ts` - Widget base class, ModelBoundList, when() implementation

### Community
- `CODE_OF_CONDUCT.md` - Community guidelines
- `CONTRIBUTING.md` - Developer guide
