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

**Example (TodoMVC):**
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

// Pseudo-declarative binding
store.subscribe(() => {
  rebuildTodoList(); // TODO: Make incremental (ng-repeat style)
  updateStatusLabel();
});
```

## Current Limitations

1. **Full rebuild on change** - TodoMVC rebuilds entire list instead of smart diff (see `more_mvc_like_for_todomvc_app.md` for planned ng-repeat + ng-show)
2. **No two-way binding** - Manual setText/getText instead of ng-model
3. **No computed properties** - Manual label updates instead of reactive expressions

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

## References

- `examples/todomvc.ts` - Full MVC example (16 tests)
- `more_mvc_like_for_todomvc_app.md` - Plan for ng-repeat/ng-show
- `CODE_OF_CONDUCT.md` - Community guidelines
- `CONTRIBUTING.md` - Developer guide
