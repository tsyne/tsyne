# LLM Quick Reference

## What is Tsyne?

TypeScript → Go bridge → Fyne.io native GUI toolkit. Pseudo-declarative MVC inspired by AngularJS 1.0.

There's a regular app mode, and there's a page-by-page mode inspired by the web that has a browser


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

**Containers:** vbox, hbox, scroll, grid, center, border, gridwrap, split, tabs, card, accordion, form
**Inputs:** button, entry, multilineentry, passwordentry, checkbox, select, radiogroup, slider
**Display:** label, hyperlink, separator, progressbar, image, richtext, table, list, tree, toolbar
**Browser:** browser (embedded webview/page)

**All widgets support:**
- `hide()` / `show()` - Imperative visibility control
- `ngShow(() => boolean)` - Declarative visibility (returns `this` for chaining)
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

**Example (TodoMVC with ngShow):**
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

// Declarative visibility with ngShow (AngularJS-style)
todoHBox.ngShow(() => {
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

**New declarative APIs (AngularJS 1.0-inspired):**
- `widget.ngShow(() => boolean)` - Declarative visibility control
- `container.model(items).trackBy(fn).each(builder)` - Smart list binding (ng-repeat)
- `widget.refresh()` - Re-evaluate visibility conditions
- `container.refreshVisibility()` - Update visibility without rebuild

## Current Capabilities & Limitations

**✅ Implemented:**
1. **ngShow directive** - Declarative visibility control (AngularJS ng-show style)
2. **ModelBoundList** - Smart list binding with diffing (AngularJS ng-repeat style)
3. **Observable pattern** - Store with change listeners for reactive updates

**⏳ Current Limitations:**
1. **Still rebuilds on change** - TodoMVC rebuilds entire list (ModelBoundList.update() ready to use)
2. **No two-way binding** - Manual setText/getText instead of ng-model
3. **No computed properties** - Manual label updates instead of reactive expressions
4. **ngShow optimization** - Infrastructure in place, not yet used for filter changes

See `more_mvc_like_for_todomvc_app.md` for implementation status and next steps.

## Declarative Patterns (AngularJS-Inspired)

**ngShow for conditional visibility:**
```typescript
// Single condition
checkbox.ngShow(() => !isEditing);
textEntry.ngShow(() => isEditing);

// Complex condition with store lookup
todoHBox.ngShow(() => {
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
- **Test-driven**: Include Jest tests for new features
- **AI-friendly**: AI assistance encouraged for tests, code

## Quick Start

```bash
npm install
cd bridge && go build -o ../bin/tsyne-bridge && cd ..
npm run build
node examples/hello.js
npm test
```

## Troubleshooting

### Can't Access storage.googleapis.com for Fyne Dependencies

**Problem:** Go tries to fetch Fyne v2.7.0 from `https://storage.googleapis.com/proxy-golang-org-prod` and fails with DNS or connection errors.

**Solution:** Fetch directly from GitHub instead of using Google's proxy:

```bash
# Use GOPROXY=direct to bypass Google's proxy
cd bridge
env GOPROXY=direct go build -o ../bin/tsyne-bridge .
```

**If you get C library errors** (X11, OpenGL headers missing):

```bash
# Install required development libraries (Ubuntu/Debian)
apt-get update
apt-get install -y libgl1-mesa-dev xorg-dev libxrandr-dev

# Then rebuild
cd bridge
env GOPROXY=direct go build -o ../bin/tsyne-bridge .
```

**What these packages provide:**
- `libgl1-mesa-dev` - OpenGL development headers
- `xorg-dev` - X11 development libraries (metapackage)
- `libxrandr-dev` - X11 RandR extension (screen resolution/rotation)

**Why GOPROXY=direct works:**
- Tells Go to fetch modules directly from their source repositories (GitHub)
- Bypasses Google's module proxy entirely
- Uses the version tags directly from `fyne.io/fyne/v2@v2.7.0` → GitHub release

**Alternative:** Set globally in environment:
```bash
export GOPROXY=direct
go build -o ../bin/tsyne-bridge .
```

## References

- `examples/todomvc.ts` - Full MVC example with ngShow (16 tests, 15/16 passing)
- `examples/todomvc-ngshow.ts` - Preserved ngShow implementation variant
- `more_mvc_like_for_todomvc_app.md` - Implementation status: Phase 1 & 2 complete!
- `src/widgets.ts` - Widget base class, ModelBoundList, ngShow implementation
- `CODE_OF_CONDUCT.md` - Community guidelines
- `CONTRIBUTING.md` - Developer guide

**Key commits:**
- `fa35224` - Added ngShow directive and ModelBoundList infrastructure
- `b75ab38` - Added todomvc-ngshow variants to preserve implementation
