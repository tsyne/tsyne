# Architectural Patterns in Tsyne

This document explains the various architectural patterns you can use when building Tsyne applications, including state management strategies and best practices.

## Table of Contents

- [Overview](#overview)
- [State Management](#state-management)
  - [Observable State](#observable-state)
  - [Computed State](#computed-state)
  - [State Store](#state-store)
  - [Two-Way Data Binding](#two-way-data-binding)
- [Architectural Patterns](#architectural-patterns)
  - [MVC (Model-View-Controller)](#mvc-model-view-controller)
  - [MVVM (Model-View-ViewModel)](#mvvm-model-view-viewmodel)
  - [MVP (Model-View-Presenter)](#mvp-model-view-presenter)
- [Dialog State Passing](#dialog-state-passing)
- [Pattern Comparison](#pattern-comparison)
- [Best Practices](#best-practices)

## Overview

Tsyne provides flexible state management utilities that enable you to build applications using various architectural patterns. These patterns help you:

- **Separate concerns**: Keep UI, business logic, and data separate
- **Improve testability**: Test logic independently of UI
- **Enhance maintainability**: Make code easier to understand and modify
- **Enable reusability**: Share logic across different parts of your app

## State Management

### Observable State

`ObservableState<T>` provides reactive state management with automatic change notifications.

**Key Features:**
- Reactive updates when state changes
- Subscribe/unsubscribe pattern for listeners
- Type-safe state management

**Example:**

```typescript
import { ObservableState } from 'tsyne';

const count = new ObservableState(0);

// Subscribe to changes
const unsubscribe = count.subscribe((newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
  label.setText(`Count: ${newValue}`);
});

// Update state
count.set(5); // Triggers subscriber
count.update(c => c + 1); // Update using function

// Clean up
unsubscribe();
```

**When to use:**
- Single values that need to notify on change
- Binding UI widgets to data
- Simple reactive state management

### Computed State

`ComputedState<T, TDeps>` derives its value from one or more observable states and automatically updates when dependencies change.

**Example:**

```typescript
import { ObservableState, ComputedState } from 'tsyne';

const firstName = new ObservableState('John');
const lastName = new ObservableState('Doe');

const fullName = new ComputedState(
  [firstName, lastName],
  (first, last) => `${first} ${last}`
);

fullName.subscribe((name) => {
  console.log(`Full name: ${name}`);
});

firstName.set('Jane'); // Automatically updates fullName
```

**When to use:**
- Derived/calculated values
- Values that depend on multiple sources
- Avoiding redundant calculations

### State Store

`StateStore<T>` provides centralized state management for larger applications, similar to Redux or Vuex.

**Key Features:**
- Single source of truth
- Immutable state updates
- Subscribe to entire state or specific properties

**Example:**

```typescript
import { StateStore } from 'tsyne';

interface AppState {
  user: string;
  count: number;
  theme: 'light' | 'dark';
}

const store = new StateStore<AppState>({
  user: 'Guest',
  count: 0,
  theme: 'light'
});

// Subscribe to all changes
store.subscribe(state => {
  console.log('State changed:', state);
});

// Update entire state
store.update(state => ({
  ...state,
  count: state.count + 1
}));

// Update specific property
store.set('user', 'John');

// Read state
const currentUser = store.get('user');
const state = store.getState();
```

**When to use:**
- Large applications with complex state
- State shared across multiple components
- Need for centralized state management

### Two-Way Data Binding

`TwoWayBinding<T, W>` keeps a widget synchronized with an observable state.

**Example:**

```typescript
import { ObservableState, TwoWayBinding } from 'tsyne';

const name = new ObservableState('');
const nameEntry = entry('Enter name');

// Create binding
const binding = new TwoWayBinding(name, nameEntry);
binding.bind();

// State changes update widget
name.set('John'); // nameEntry text becomes "John"

// Clean up
binding.unbind();
```

**When to use:**
- Form inputs bound to state
- Real-time synchronization between UI and data
- Reducing boilerplate update code

## Architectural Patterns

### MVC (Model-View-Controller)

**Components:**
- **Model**: Business logic and data
- **View**: UI presentation
- **Controller**: Handles user input, updates model

**Data Flow:**
```
User Input → Controller → Model → View Update
```

**Example Structure:**

```typescript
// Model - Business logic
class CounterModel extends Model {
  private count = 0;

  increment() {
    this.count++;
    this.notifyChanged();
  }

  getCount() {
    return this.count;
  }
}

// View - UI presentation
class CounterView {
  private label: any;

  createUI(onIncrement: () => void) {
    vbox(() => {
      this.label = label('Count: 0');
      button('Increment', onIncrement);
    });
  }

  updateCount(count: number) {
    this.label.setText(`Count: ${count}`);
  }
}

// Controller - Connects Model and View
class CounterController {
  constructor(
    private model: CounterModel,
    private view: CounterView
  ) {
    this.model.subscribe(() => this.updateView());
  }

  handleIncrement() {
    this.model.increment();
  }

  private updateView() {
    this.view.updateCount(this.model.getCount());
  }
}
```

**Characteristics:**
- Controller mediates between Model and View
- View can query Model directly
- Model is independent of View

**When to use:**
- Traditional desktop applications
- Clear separation of concerns
- Team has experience with MVC (e.g., from Swing, Rails)

**See:** [examples/mvc-counter.ts](examples/mvc-counter.ts)

### MVVM (Model-View-ViewModel)

**Components:**
- **Model**: Domain data and business logic
- **View**: UI presentation (declarative)
- **ViewModel**: Presentation logic with observable properties

**Data Flow:**
```
View ←→ ViewModel ←→ Model
(two-way binding)
```

**Example Structure:**

```typescript
// Model - Domain data
class TodoModel {
  private todos: TodoItem[] = [];

  addTodo(text: string) {
    this.todos.push({ text, completed: false });
  }

  getTodos() {
    return [...this.todos];
  }
}

// ViewModel - Presentation logic
class TodoViewModel extends ViewModel {
  todos = new ObservableState<TodoItem[]>([]);
  newTodoText = new ObservableState('');

  constructor(private model: TodoModel) {
    super();
  }

  addTodo() {
    this.model.addTodo(this.newTodoText.get());
    this.newTodoText.set('');
    this.updateFromModel();
  }

  private updateFromModel() {
    this.todos.set(this.model.getTodos());
  }
}

// View - Binds to ViewModel
class TodoView {
  constructor(private viewModel: TodoViewModel) {
    // Bind to ViewModel changes
    this.viewModel.todos.subscribe(() => this.updateUI());
  }

  render() {
    vbox(() => {
      entry('New todo');
      button('Add', () => this.viewModel.addTodo());
      // ... display todos
    });
  }
}
```

**Characteristics:**
- Emphasizes data binding
- ViewModel exposes observable properties
- View binds to ViewModel, no direct Model access
- ViewModel is testable without UI

**When to use:**
- Data-heavy applications
- Need for automatic UI synchronization
- Experience with WPF, Angular, or Vue.js

**See:** [examples/mvvm-todo.ts](examples/mvvm-todo.ts)

### MVP (Model-View-Presenter)

**Components:**
- **Model**: Domain data and business logic
- **View**: Passive UI interface (no logic)
- **Presenter**: Contains all presentation logic

**Data Flow:**
```
User Input → View → Presenter → Model
Model → Presenter → View Update
```

**Example Structure:**

```typescript
// Model - Business logic
class AuthModel {
  authenticate(username: string, password: string) {
    // authentication logic
    return user;
  }

  validateUsername(username: string) {
    // validation logic
    return error || null;
  }
}

// View Interface - Passive UI
interface ILoginView {
  setUsernameError(error: string): void;
  setStatusMessage(message: string): void;
  getUsername(): Promise<string>;
  getPassword(): Promise<string>;
}

// View Implementation
class LoginView implements ILoginView {
  private usernameEntry: any;

  async getUsername() {
    return await this.usernameEntry.getText();
  }

  setUsernameError(error: string) {
    this.errorLabel.setText(error);
  }
}

// Presenter - Mediates everything
class LoginPresenter {
  constructor(
    private view: ILoginView,
    private model: AuthModel
  ) {}

  async handleLogin() {
    const username = await this.view.getUsername();
    const error = this.model.validateUsername(username);

    if (error) {
      this.view.setUsernameError(error);
      return;
    }

    const user = this.model.authenticate(username, password);
    this.view.setStatusMessage('Login successful');
  }
}
```

**Characteristics:**
- View is completely passive (interface-based)
- All logic in Presenter
- Presenter owns the View-Model interaction
- View never accesses Model directly

**When to use:**
- Maximum testability required
- Complex presentation logic
- View needs to be easily swappable

**See:** [examples/mvp-login.ts](examples/mvp-login.ts)

## Dialog State Passing

Tsyne supports passing state into dialogs/windows and retrieving results, similar to traditional desktop frameworks.

### Dialog Pattern

**Use Case:**
- Show a dialog with initial state
- User interacts with dialog
- Return result to caller

**Example:**

```typescript
import { StateStore, DialogResult } from 'tsyne';

// Dialog manager
class DialogManager<TInput, TOutput> {
  private resolveFunc?: (result: DialogResult<TOutput>) => void;

  show(): Promise<DialogResult<TOutput>> {
    return new Promise((resolve) => {
      this.resolveFunc = resolve;
    });
  }

  confirm(data: TOutput) {
    this.resolveFunc?.({ confirmed: true, data });
  }

  cancel() {
    this.resolveFunc?.({ confirmed: false });
  }
}

// Usage in main window
const dialog = new ProfileDialog(currentProfile);
const result = await dialog.show();

if (result.confirmed) {
  store.update(state => ({
    ...state,
    profile: result.data
  }));
}
```

**See:** [examples/dialog-state.ts](examples/dialog-state.ts)

## Pattern Comparison

| Pattern | Best For | Complexity | Testability | Learning Curve |
|---------|----------|------------|-------------|----------------|
| **MVC** | Traditional desktop apps | Medium | Good | Low (well-known) |
| **MVVM** | Data-heavy apps with binding | Medium-High | Excellent | Medium |
| **MVP** | Maximum testability | Medium | Excellent | Medium |
| **Simple State** | Small apps | Low | Fair | Very Low |

### When to Choose Each Pattern

**Choose MVC when:**
- Building traditional desktop-style applications
- Team is familiar with Swing, MFC, or Rails
- Need clear separation but not maximum testability

**Choose MVVM when:**
- Building data-driven applications
- Want automatic UI synchronization
- Team has experience with WPF, Angular, or Vue
- Presentation logic is complex

**Choose MVP when:**
- Maximum testability is priority
- View needs to be easily swappable (e.g., web vs. desktop)
- Presentation logic is very complex
- Team has Android development background

**Don't use a pattern when:**
- Application is very simple (< 3 screens)
- Prototyping or proof-of-concept
- Learning Tsyne basics

## Best Practices

### 1. State Management

**Do:**
- Keep state immutable when updating (use spread operators)
- Subscribe to state changes for UI updates
- Clean up subscriptions to avoid memory leaks

**Don't:**
- Mutate state directly
- Create circular dependencies in computed states
- Forget to unsubscribe from observables

```typescript
// ✓ Good
store.update(state => ({ ...state, count: state.count + 1 }));

// ✗ Bad
const state = store.getState();
state.count++; // Direct mutation!
```

### 2. Separation of Concerns

**Do:**
- Keep business logic in Models
- Keep presentation logic in ViewModels/Presenters
- Keep UI code in Views

**Don't:**
- Put business logic in Views
- Access UI widgets directly from Models
- Mix concerns across layers

### 3. Testing

**Do:**
- Write unit tests for Models (pure logic)
- Write unit tests for ViewModels/Presenters
- Use interfaces for Views in MVP

**Don't:**
- Test UI directly if avoidable
- Skip testing business logic
- Tightly couple tests to UI implementation

### 4. Performance

**Do:**
- Use ComputedState for derived values
- Unsubscribe from observables when done
- Batch state updates when possible

**Don't:**
- Create excessive observables
- Perform heavy computation in subscribers
- Update state in tight loops

### 5. Code Organization

```
src/
├── models/          # Business logic and data
├── viewmodels/      # MVVM presentation logic
├── presenters/      # MVP presentation logic
├── views/           # UI components
└── state/           # Shared state stores
```

## Examples

All patterns include working examples:

- **Data Binding**: [examples/data-binding.ts](examples/data-binding.ts)
- **MVC Pattern**: [examples/mvc-counter.ts](examples/mvc-counter.ts)
- **MVVM Pattern**: [examples/mvvm-todo.ts](examples/mvvm-todo.ts)
- **MVP Pattern**: [examples/mvp-login.ts](examples/mvp-login.ts)
- **Dialog State**: [examples/dialog-state.ts](examples/dialog-state.ts)

## Further Reading

- [README.md](README.md) - Getting started with Tsyne
- [State Management API Documentation](src/state.ts)
- [Martin Fowler - GUI Architectures](https://martinfowler.com/eaaDev/uiArchs.html)
