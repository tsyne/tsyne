# Pseudo-Declarative UI Composition in Tsyne

Tsyne encourages a "pseudo-declarative" style of UI composition that combines the readability of declarative markup with the power and flexibility of a full programming language (TypeScript). This approach uses a fluent, builder-style API where UI components are nested within anonymous functions, creating a clear visual hierarchy in the code that mirrors the application's layout.

This document draws lessons from key examples in the Tsyne repository to illustrate this style:
- **`calculator.ts`**: A straightforward example of layout and direct event handling.
- **`todomvc.ts`**: A more advanced showcase of state management and reactive data binding.
- **`05-live-clock.ts`**: Demonstrates how to handle imperative updates for continuously changing data.
- **`phone-apps/keyboard/`**: Shows how to generate complex, layered UIs programmatically, avoiding static config files.

## Core Concepts: The Builder Pattern

The foundation of Tsyne's UI composition is the builder pattern. You start with a top-level `app` function and nest layout widgets like `window`, `vbox` (vertical box), and `hbox` (horizontal box) inside it. Each layout widget accepts an anonymous function that defines its children.

This creates a clean, indented structure that's easy to read and understand.

### Example: `calculator.ts`

The calculator example provides a clear demonstration of this foundational structure. The entire UI is defined within nested blocks.

```typescript
// from examples/calculator.ts

a.window({ title: "Calculator" }, (win: Window) => {
  win.setContent(() => {
    a.vbox(() => {
      // Display label
      display = a.label(currentValue).withId('calc-display');

      // 4x4 grid for buttons
      a.grid(4, () => {
        // Button creation
        a.button("7").onClick(() => handleNumber("7"));
        a.button("8").onClick(() => handleNumber("8"));
        // ... more buttons
      });
    });
  });
});
```

Key takeaways:
- **Hierarchy in Code**: The `vbox` is visually "inside" the `window`, and the `grid` is inside the `vbox`, just like in the final UI.
- **Implicit Context**: You don't need to manually add children to their parents. The builder (`a`) tracks the current container (`vbox`, `grid`, etc.) and automatically adds newly created widgets to it.
- **Readability**: The structure is immediately scannable. You can see the layout (a vertical box with a label and a grid) without needing to parse complex object literals or XML.

## Fluent Method Chaining

Widgets created by the builder (`a.button`, `a.label`, etc.) return an instance of the widget, allowing you to chain configuration methods fluently. This is the primary way to attach event handlers, set properties, and control visibility.

### Key Methods:
- **`.onClick(handler)`**: Attaches a click event handler.
- **`.withId(id)`**: Assigns a stable ID for testing, making tests more robust.
- **`.when(condition)`**: Declaratively controls the widget's visibility based on a boolean condition.

### Example: Combining Layout and Logic in `calculator.ts`

The calculator's buttons are created and configured in a single, expressive line.

```typescript
// from examples/calculator.ts

// A button is created, an event handler is attached, and it's added to the parent grid.
a.button("=").onClick(() => calculate());
```

This is highly readable and keeps the logic for a widget co-located with its definition.

### Example: Declarative Visibility in `todomvc.ts`

The TodoMVC example uses `.when()` to show or hide a todo item based on the current filter (All, Active, Completed). The framework automatically re-evaluates this condition when the data changes.

```typescript
// from examples/todomvc.ts

// The hbox containing the todo item is only visible when `shouldShowTodo` returns true.
const todoHBox = a.hbox(() => {
  // ... checkbox, buttons, etc.
}).when(shouldShowTodo);
```

This fluent API avoids messy `if/else` blocks for managing UI state, leading to cleaner and more maintainable view code.

## State Management and UI Generation Patterns

A key principle of this style is the separation of UI definition from state management. The UI is declared once, and then it *reacts* to state changes.

### Pattern 1: Self-Contained State (`calculator.ts`)

For simpler components, the state can be managed directly within the builder function.

- **State variables**: `currentValue`, `operator`, `previousValue` are defined as local variables.
- **Event handlers**: Functions like `handleNumber`, `handleOperator`, and `calculate` are defined to manipulate this state.
- **UI Updates**: These handlers directly call methods on widget instances (e.g., `display.setText(value)`) to update the view.

```typescript
// from examples/calculator.ts

// Instance-local state
let display: Label | undefined;
let currentValue = "0";
// ...

function updateDisplay(value: string) {
  // ...
  if (display) {
    // Imperative update
    display.setText(value);
  }
}
```

This pattern is simple and effective for components that don't need to share state with other parts of the application.

### Pattern 2: External Observable Store (`todomvc.ts`)

For more complex applications, state should be managed in a dedicated store that the UI can observe. The TodoMVC example implements a `TodoStore` class.

- **Centralized State**: The `TodoStore` holds the list of todos, the current filter, and all business logic.
- **Observable Pattern**: The store allows the UI to `subscribe` to changes, which triggers listeners that update the view.
- **One-Way Data Flow**: UI event handlers only call methods on the store. They do not update the UI directly.

```typescript
// from examples/todomvc.ts

// Event handler only modifies the model
a.button('Add').onClick(async () => {
  // ...
  await store.addTodo(text); // No direct UI manipulation here
});

// The store subscription handles all UI updates
store.subscribe(async () => {
  boundList.update();
  // ...
});
```

This creates a predictable, one-way data flow that is easier to debug and scales well to larger applications.

### Pattern 3: Programmatic UI Generation (`phone-apps/keyboard/`)

For highly complex or repetitive UIs, Tsyne's programmatic nature offers a significant advantage over static markup languages. Instead of defining every button in a config file, you can generate the UI dynamically using loops, functions, and standard TypeScript logic. The on-screen keyboard is a perfect example.

#### Dynamic Layout from Data

The keyboard layout in `phone-apps/keyboard/en-us/keyboard.ts` is not defined in a static file. Instead, each row of keys is generated by looping over a simple string of characters. This makes the layout concise, easy to modify, and type-safe.

```typescript
// from phone-apps/keyboard/en-us/keyboard.ts

// ROW 1: Q W E R T Y U I O P
a.hbox(() => {
  for (const c of ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']) {
    a.button(c).onClick((b) => k.key(c, b)).when(isLower);
    a.button(c.toUpperCase()).onClick((b) => k.key(c, b)).when(isUpper);
  }
});
```

This approach is powerful:
- **Maintainable**: To change the layout, you just edit a string, not a large block of boilerplate.
- **Data-Driven**: The layout could easily be loaded from a JSON file or an API response at runtime.
- **DRY (Don't Repeat Yourself)**: The logic for creating a button is written once and reused for every key in the row.

#### Declarative Layer Switching with `.when()`

The keyboard has multiple layers (standard, symbols, function keys). Instead of manually hiding and showing hundreds of individual buttons, each layer is wrapped in a container widget whose visibility is controlled by a single `.when()` condition.

```typescript
// from phone-apps/keyboard/en-us/keyboard.ts

const isAbc = () => k.mode === 'abc';
const isSymbols = () => k.mode === 'symbols';

// The entire container for the "abc" (QWERTY) layout
a.vbox(() => {
  // ... all the hbox rows for QWERTY keys ...
}).when(isAbc);

// The entire container for the "symbols" layout
a.vbox(() => {
  // ... all the hbox rows for symbol keys ...
}).when(isSymbols);
```

When the controller's mode changes (e.g., `k.cycleMode()`), the framework automatically re-evaluates the `.when()` conditions. It hides the entire `vbox` for the old layer and shows the `vbox` for the new one. This is an extremely efficient and declarative way to manage complex UI states.

## Reactive and Imperative UI Updates

Tsyne supports both fully reactive and direct imperative approaches to updating the UI after the initial render.

### Reactive Updates with `.bindTo()`

The most powerful pattern for dynamic lists is using `.bindTo()` on a container. This method links the container's content to a data source.

In `todomvc.ts`, a `vbox` is bound to the list of todos from the store.

```typescript
// from examples/todomvc.ts

boundList = a.vbox(() => {}).bindTo({
  items: () => store.getAllTodos(),
  render: (todo: TodoItem) => {
    // ... logic to create the hbox for a single todo item ...
  },
  trackBy: (todo: TodoItem) => todo.id
});
```

When `boundList.update()` is called, Tsyne intelligently re-renders the list, only updating what has changed. This is the most efficient way to manage collections.

### Imperative Updates for Simple Cases

Sometimes, a full reactive binding is overkill. The `05-live-clock.ts` example updates the time every 500 milliseconds by holding a reference to the label and calling `.setText()` directly.

```typescript
// from examples/05-live-clock.ts

let timeLabel: any;

win.setContent(() => {
  a.vbox(() => {
    timeLabel = a.label(new Date().toString());
  });
});

setInterval(async () => {
  await timeLabel.setText(new Date().toString());
}, 500);
```

This approach is perfectly suitable for cases like the clock, where the change is isolated and simple.

## Lessons from Ported Apps (7 Complete Real-World Applications)

Seven complete mobile/web applications have been successfully ported to Tsyne, demonstrating the effectiveness of the pseudo-declarative pattern at scale:

### Tab-Based Navigation Pattern

**Apps using this pattern:** All 7 ported apps (Food Truck, Expense Tracker, NextCloud, DuckDuckGo, Wikipedia, Element, Ebook Reader)

A common real-world pattern: multiple tabs where only the selected tab is visible. The pseudo-declarative approach using `.when()` and async refresh makes this elegant:

```typescript
let selectedTab = 'library';

// Each tab container uses .when() for declarative visibility
const libraryView = a.vbox(() => {
  // Library content
}).when(() => selectedTab === 'library' && store.getBooks());

const readingView = a.vbox(() => {
  // Reading content
}).when(() => selectedTab === 'reading');

const favoritesView = a.vbox(() => {
  // Favorites content
}).when(() => selectedTab === 'favorites');

// Tab buttons and observable updates
store.subscribe(async () => {
  await updateLabels();
  await viewStack.refresh();  // Re-evaluates all .when() conditions
});

a.button('📚 Library', async () => {
  selectedTab = 'library';
  await viewStack.refresh();
});
```

**Key insight:** Using `.when()` with `await refresh()` handles complex tab state elegantly without manual show/hide.

### Observable Store + Reactive UI Pattern

**Observable Pattern Consistency:** All 7 apps use identical observable pattern:

```typescript
class AppStore {
  private changeListeners: ChangeListener[] = [];

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((listener) => listener());
  }
}
```

**Why this works:** The return value from `subscribe()` is an unsubscriber function. This is critical for cleanup:

```typescript
let unsubscribe: () => void;

store.subscribe(async () => {
  await updateUI();
});

// When component unmounts or scope ends, cleanup:
unsubscribe?.();
```

### Smart List Rendering with `.bindTo()` and `trackBy`

**Efficient List Updates:** All ported apps with collections use `.bindTo()` with `trackBy`:

```typescript
a.vbox(() => {})
  .bindTo({
    items: () => store.getBooks(),
    render: (book: Ebook) => {
      return a.hbox(() => {
        a.label(() => book.title);
        a.button('Favorite', async () => {
          store.toggleFavorite(book.id);
          await updateLabels();
          await viewStack.refresh();
        });
      });
    },
    trackBy: (book: Ebook) => book.id  // Critical for diffing!
  });
```

**Important:** The `trackBy` function identifies items uniquely. Without it, Tsyne can't diff the list efficiently.

### Defensive Copying for State Management

**Critical Pattern:** All 7 apps strictly enforce immutability:

```typescript
// ❌ WRONG - mutates returned array
getBooks(): Ebook[] {
  return this.books;  // Direct reference!
}

// ✅ CORRECT - returns defensive copy
getBooks(): Ebook[] {
  return [...this.books];  // Spread operator
}

// ❌ WRONG - mutates returned object
getPreferences(): Preferences {
  return this.preferences;
}

// ✅ CORRECT - returns copy
getPreferences(): Preferences {
  return { ...this.preferences };  // Shallow copy
}
```

**Why it matters:** Tests verify immutability with `expect(arr1).not.toBe(arr2)`. Mutation breaks Observable pattern and causes state synchronization bugs.

### Counter-Based ID Generation

**Pattern Used in All Ported Apps:**

```typescript
private nextBookId = 13;  // Start after initial data

addBook(data: BookData): Book {
  const id = `book-${String(this.nextBookId++).padStart(3, '0')}`;
  // book-013, book-014, book-015, ...
}
```

**Why not timestamp?** IDs generated from `Date.now()` are identical when called rapidly in tests, causing false collisions.

### Async Label Updates in Observable Callbacks

**Pattern for Reactive Stats:**

```typescript
let userLabel: any;
let statsLabel: any;

store.subscribe(async () => {
  // Async operations are safe in callbacks
  const downloaded = store.getDownloadedCount();
  const favorites = store.getFavoriteCount();

  userLabel?.setText(`👤 User | Downloaded: ${downloaded}`);
  statsLabel?.setText(`Favorites: ${favorites}`);

  // Always refresh after updates
  await viewStack.refresh();
});
```

**Key:** Store subscription handler is async, enabling conditional updates based on store state.

### Multi-Level Forms with `.bindTo()`

**Example from Expense Tracker (61 tests):**

```typescript
// Render categories dynamically
a.vbox(() => {})
  .bindTo({
    items: () => store.getCategories(),
    render: (category: Category) => {
      const expenses = store.getExpensesByCategory(category.id);
      return a.vbox(() => {
        a.label(() => `${category.emoji} ${category.name}`).withBold();

        // Nested list with .bindTo()
        a.vbox(() => {})
          .bindTo({
            items: () => expenses,
            render: (expense: Expense) => {
              return a.label(() => `$${expense.amount} - ${expense.description}`);
            },
            trackBy: (e) => e.id
          });
      });
    },
    trackBy: (cat) => cat.id
  });
```

## Conclusion

Tsyne's pseudo-declarative style provides a flexible and powerful way to build user interfaces. By combining a declarative builder pattern for layout with fluent method chaining for configuration, you can create readable and maintainable UI code. The framework supports a range of patterns from simple self-contained state to observable stores and fully programmatic UI generation. With support for both reactive data binding and direct imperative updates, you have the tools to build dynamic and responsive applications efficiently.

The 7 ported apps demonstrate that these patterns scale from small utilities (400 lines) to feature-rich applications (700+ lines), maintaining code clarity and testability throughout.

---

**Lessons for Future Ports**

1. **Always use Observable pattern** - Consistent across all 7 apps, proven pattern for reactive updates
2. **Use `.when()` + `await refresh()` for complex visibility** - More elegant than manual show/hide
3. **Defensive copies are essential** - Tests depend on it, state synchronization requires it
4. **Counter-based IDs, not timestamps** - Prevents collision issues in rapid-fire operations
5. **Tab-based navigation scales well** - Cleaner than modal/stack patterns for most apps
6. **Store subscriptions handle all view updates** - Never update UI directly in event handlers
7. **61 tests is achievable for complex features** - Well-structured store makes comprehensive testing easy

**Resources**
- See `/ported-apps/ebooks/` for the most recent and complete example (Ebook Reader, 730 lines, 61 Jest tests)
- See `/ported-apps/wikipedia/` for complex data models with language/article management
- See `/ported-apps/element/` for real-time messaging patterns with sessions
- See `/ported-apps/duckduckgo/` for search/filter patterns with analytics tracking
