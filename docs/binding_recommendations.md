# Binding Recommendations

This document describes the pseudo-declarative binding patterns available in Tsyne and recommendations for their use.

## Overview

Tsyne's binding system enables declarative, reactive UI patterns similar to AngularJS ng-repeat or React's map-based rendering. The goal is "pseudo-declarative nirvana" where:

- View declares *what* to show, not *how* to update it
- Model changes automatically propagate to bound widgets
- No manual `if (existing)` checks or widget lifecycle management
- Compositional chaining for elegant, readable code

## Core Binding Patterns

### 1. `.bindTo()` - List Binding

Bind a container to a dynamic list of items with automatic diffing.

```typescript
a.vbox(() => {}).bindTo({
  items: () => store.getItems(),

  empty: () => {
    a.label('No items yet');
  },

  render: (item, index) => {
    a.hbox(() => {
      a.checkbox(item.text, () => store.toggle(index));
      a.button('Delete').onClick(() => store.remove(index));
    });
  },

  trackBy: (item) => item.id  // Enables smart diffing
});
```

**Key points:**
- `items`: Function returning current array (re-evaluated on `.update()`)
- `empty`: Rendered when items array is empty
- `render`: Called once per item; use property bindings for updates
- `trackBy`: Identity function for efficient re-rendering

### 2. `.when()` - Conditional Visibility

Declaratively show/hide widgets based on state.

```typescript
// Simple condition
a.label('Error occurred').when(() => store.hasError());

// Filter-based visibility
a.hbox(() => {
  a.checkbox(todo.text);
  a.button('Delete');
}).when(() => {
  const filter = store.getFilter();
  return filter === 'all' ||
    (filter === 'active' && !todo.completed) ||
    (filter === 'completed' && todo.completed);
});

// Mode switching
a.button('Edit').when(() => !isEditMode);
a.button('Save').when(() => isEditMode);
```

### 3. `.bindText()` - Dynamic Text

Bind label text to a reactive function.

```typescript
// Status display
a.label('').bindText(() => `${store.getActiveCount()} items left`);

// Computed values
a.label('').bindText(() => {
  const total = store.getTotal();
  const done = store.getCompletedCount();
  return `${done}/${total} complete (${Math.round(done/total*100)}%)`;
});
```

### 4. `.bindFillColor()` / `.bindColor()` - Visual State

Bind visual properties to reactive functions.

```typescript
// Background color based on state
a.rectangle('#DC143C').bindFillColor(() =>
  store.isChecked(index) ? 'transparent' : '#DC143C'
);

// Text color based on state
a.canvasText(item.text).bindColor(() =>
  store.isChecked(index) ? '#888888' : '#000000'
);
```

### 5. `.bindVisible()` - Programmatic Visibility

Alternative to `.when()` for direct boolean binding.

```typescript
a.vbox(() => {
  a.label('Loading...');
  a.progressBar();
}).bindVisible(() => store.isLoading());
```

## Compositional Patterns

### Chaining Multiple Bindings

Combine bindings for complex behavior:

```typescript
a.label('Error')
  .bindText(() => store.getErrorMessage())
  .when(() => store.hasError());

a.button('Submit')
  .onClick(() => store.submit())
  .when(() => store.isValid() && !store.isSubmitting());
```

### Nested Binding with Visual Feedback

Combine `.bindTo()` with property bindings inside render:

```typescript
a.vbox(() => {}).bindTo({
  items: () => store.getTasks(),

  render: (task, index) => {
    a.max(() => {
      // Background layer - bound to completion state
      a.rectangle('transparent').bindFillColor(() =>
        task.completed ? '#e8f5e9' : 'transparent'
      );

      // Content layer
      a.hbox(() => {
        a.checkbox('', () => store.toggleTask(index))
          .setChecked(task.completed);

        a.canvasText(task.text).bindColor(() =>
          task.completed ? '#9e9e9e' : '#212121'
        );
      });
    });
  },

  trackBy: (task) => task.id
});
```

### Empty State with Contextual Messages

```typescript
a.vbox(() => {}).bindTo({
  items: () => store.getFilteredItems(),

  empty: () => {
    const filter = store.getFilter();
    if (filter === 'all') {
      a.label('No items yet. Add one above!');
    } else {
      a.label(`No ${filter} items`);
      a.button('Show All').onClick(() => store.setFilter('all'));
    }
  },

  render: (item) => { /* ... */ },
  trackBy: (item) => item.id
});
```

## MVC vs MVVM Patterns

### MVVM Pattern (Widget References)

Render returns widget references for manual updates:

```typescript
render: (item, index, existing) => {
  if (existing) {
    // Update existing widgets
    existing.bg.update({ fillColor: getColor(index) });
    existing.text.update({ text: item.name });
    return existing;
  }

  // Create new widgets, return references
  const bg = a.rectangle(getColor(index));
  const text = a.canvasText(item.name);
  return { bg, text };
}
```

### MVC Pattern (Declarative Bindings) - Recommended

Render returns void; use property bindings:

```typescript
render: (item, index) => {
  a.rectangle('transparent').bindFillColor(() => getColor(index));
  a.canvasText(item.name).bindColor(() => getTextColor(index));
}
```

**MVC is preferred** because:
- Simpler render functions
- No manual update logic
- Framework handles widget lifecycle
- Easier to reason about

## Triggering Updates

### Store Subscription Pattern

```typescript
const store = new MyStore();
let boundList;

// In UI setup
boundList = a.vbox(() => {}).bindTo({ /* ... */ });

// Subscribe to store changes
store.subscribe(() => {
  boundList.update();  // Re-evaluates all bindings
});
```

### Manual Update

```typescript
// After modifying data
items.push(newItem);
boundList.update();
```

### Global Binding Refresh

```typescript
import { refreshAllBindings } from '../src';

// Refresh all registered bindings
await refreshAllBindings();
```

## Best Practices

### Do

- Use `trackBy` for lists with stable IDs
- Prefer `.bindText()` over `label.setText()` for reactive text
- Use `.when()` for conditional visibility instead of manual show/hide
- Keep render functions simple; move logic to store/model
- Combine `.bindTo()` with property bindings for rich updates

### Don't

- Don't mix MVVM and MVC patterns in the same render function
- Don't call async operations directly in binding functions
- Don't forget `trackBy` for lists that change frequently
- Don't use `.bindTo()` for static lists (use regular loops instead)

## Example: Complete Todo Item

```typescript
a.vbox(() => {}).bindTo({
  items: () => store.getTodos(),

  empty: () => {
    a.center(() => {
      a.label('All done! Add a new task above.');
    });
  },

  render: (todo) => {
    a.hbox(() => {
      // Checkbox
      a.checkbox('', async () => {
        await store.toggleTodo(todo.id);
      }).setChecked(todo.completed);

      // Text with strikethrough style when complete
      a.canvasText(todo.text).bindColor(() =>
        todo.completed ? '#9e9e9e' : '#212121'
      );

      a.spacer();

      // Delete button
      a.button('x').onClick(() => store.deleteTodo(todo.id));
    }).when(() => {
      // Filter visibility
      const filter = store.getFilter();
      return filter === 'all' ||
        (filter === 'active' && !todo.completed) ||
        (filter === 'completed' && todo.completed);
    });
  },

  trackBy: (todo) => todo.id
});

// Status bar with bound text
a.label('').bindText(() => {
  const count = store.getActiveCount();
  return `${count} item${count !== 1 ? 's' : ''} left`;
});
```

## Related Documentation

- [Architecture](ARCHITECTURE.md) - Overall framework design
- [Reference](reference.md) - Complete API reference
- [Examples](../examples/) - Working code examples
  - `daily-checklist-mvc.ts` - MVC binding showcase
  - `todomvc.ts` - Complete todo app with bindings
  - `12-shopping-list.ts` - Simple bindTo example
