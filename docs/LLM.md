# Tsyne - Quick Reference for LLMs

## What is Tsyne?
TypeScript wrapper for Go's Fyne UI toolkit. JSON-RPC bridge over stdio. Declarative API for desktop apps.

## Architecture
- **TypeScript** (src/) - Declarative API, spawns Go bridge
- **Go Bridge** (bridge/main.go) - Fyne wrapper, JSON message handler
- **Communication** - JSON over stdin/stdout, async request/response

## Basic App Structure

```typescript
import { app, window, vbox, button, label } from 'tsyne';

app({ title: 'App' }, () => {
  window({ title: 'Window', width: 400, height: 300 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Hello');
        button('Click', () => console.log('clicked'));
      });
    });
    win.show();
  });
});
```

## Available Widgets
- `label(text)` - Display text
- `button(text, onClick)` - Button with callback
- `entry(placeholder)` - Text input
- `vbox(builder)` - Vertical container
- `hbox(builder)` - Horizontal container

## Widget Methods
- `setText(text)` - Async, updates Go widget
- `getText()` - Async, retrieves from Go widget

## State Management (New!)

### Observable State
```typescript
const count = new ObservableState(0);
count.subscribe((newVal, oldVal) => label.setText(`${newVal}`));
count.set(5); // Triggers subscriber
```

### Computed State
```typescript
const firstName = new ObservableState('John');
const lastName = new ObservableState('Doe');
const fullName = new ComputedState([firstName, lastName],
  (f, l) => `${f} ${l}`);
```

### State Store
```typescript
const store = new StateStore({ user: 'Guest', count: 0 });
store.subscribe(state => console.log(state));
store.set('user', 'John');
store.update(s => ({ ...s, count: s.count + 1 }));
```

### Two-Way Binding
```typescript
const name = new ObservableState('');
const binding = new TwoWayBinding(name, entry(''));
binding.bind();
name.set('John'); // Updates entry text
```

## Architectural Patterns

### MVC
- Model extends `Model` class
- View handles UI rendering
- Controller mediates, subscribes to Model changes
- See: examples/mvc-counter.ts

### MVVM
- Model has domain logic
- ViewModel extends `ViewModel`, has ObservableStates
- View binds to ViewModel observables
- See: examples/mvvm-todo.ts

### MVP
- Model has business logic
- View implements interface (passive)
- Presenter contains all presentation logic
- See: examples/mvp-login.ts

## Dialog State Passing
```typescript
class DialogManager<TInput, TOutput> {
  show(): Promise<DialogResult<TOutput>>;
  confirm(data: TOutput): void;
  cancel(): void;
}
```
See: examples/dialog-state.ts

## Key Files
- src/index.ts - Main exports, declarative API
- src/widgets.ts - Widget classes
- src/state.ts - State management utilities
- src/bridge.ts - IPC layer
- bridge/main.go - Go bridge (657 lines)

## Running Examples
```bash
npm run build
npm run example:mvc-counter
npm run example:mvvm-todo
npm run example:mvp-login
npm run example:dialog-state
npm run example:data-binding
```

## Pattern Selection

| Pattern | Use When |
|---------|----------|
| Simple state | < 3 screens, prototypes |
| MVC | Traditional desktop, team knows Swing/Rails |
| MVVM | Data-heavy, want auto-sync, know WPF/Vue |
| MVP | Max testability, swappable views |

## Common Pitfalls
- **Don't** mutate state directly (use spread operators)
- **Don't** forget to unsubscribe from observables
- **Don't** mix business logic into Views
- **Do** keep UI updates in subscriptions
- **Do** use async/await for widget methods
- **Do** clean up with dispose() on ViewModels

## Documentation
- README.md - Getting started
- PATTERNS.md - Detailed pattern guide
- ROADMAP.md - Feature tracking
- PROS_AND_CONS.md - Tsyne vs Electron/Tauri
