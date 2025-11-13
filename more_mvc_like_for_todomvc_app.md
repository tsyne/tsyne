# More MVC-like for TodoMVC App

## Goal
Transform the TodoMVC list rendering from imperative rebuild-everything to pseudo-declarative ng-repeat + ng-show style, inspired by AngularJS 1.0.

## Current State (Problems)

### Inefficient Full Rebuild
Every model change triggers complete list destruction and recreation:
```typescript
function rebuildTodoList() {
  const filtered = store.getFilteredTodos();
  todoViews.clear();                    // Destroy all view references
  todoContainer.removeAll();            // Remove all widgets from DOM

  if (filtered.length === 0) {
    showEmptyState();
  } else {
    filtered.forEach((todo) => {        // Recreate ALL views
      addTodoView(todo);
    });
  }

  todoContainer.refresh();
}
```

**Performance Impact:**
- Adding 1 todo → rebuilds all N todos
- Toggling 1 checkbox → rebuilds all N todos
- Changing filter → rebuilds all N todos
- Deleting 1 todo → rebuilds all N todos

### Missing AngularJS-style Declarative Binding
The ideal (from AngularJS):
```html
<tr ng:repeat="story in data.xref.stories.$filter(ui.search).$orderBy(ui.storyOrder)">
    <td ng:show="ui.columns.status" class="status">
        <img src="images/passed-true.png" ng:show="story.passed"/>
        <img src="images/passed-false.png" ng:show="story.passed == false"/>
    </td>
    <td ng:show="ui.columns.path">{{story.path}}</td>
</tr>
```

**What we want:**
```typescript
// Pseudo-declarative list binding
todoContainer.model(store.getAllTodos()).each((todo) => {
  a.hbox(() => {
    a.checkbox(todo.text, () => store.toggleTodo(todo.id))
      .ngShow(() => shouldShowTodo(todo));  // Visibility based on filter
    a.button('Delete', () => store.deleteTodo(todo.id));
  });
});
```

## Proposed Solution

### Phase 1: Add Smart List Binding to VBox Widget

**New API:**
```typescript
// In src/widgets.ts - VBox class
model<T>(items: T[]): ModelBoundList<T> {
  return new ModelBoundList(this.ctx, this, items);
}

class ModelBoundList<T> {
  private trackedItems = new Map<any, { widget: any, visible: boolean }>();
  private keyFn: (item: T) => any = (item) => item;

  // Track items by key (like ng-repeat track by)
  trackBy(fn: (item: T) => any): ModelBoundList<T> {
    this.keyFn = fn;
    return this;
  }

  // Builder for each item
  each(builder: (item: T) => void): void {
    // Called once per item - creates view and tracks it
    // On subsequent updates, diffs items and only adds/removes changed
  }

  // Update the model - smart diff and update
  update(newItems: T[]): void {
    // Diff oldItems vs newItems using keyFn
    // Remove views for deleted items
    // Add views for new items
    // Keep existing views for unchanged items
  }
}
```

**Usage in TodoMVC:**
```typescript
// Initial binding - pseudo-declarative
const listBinding = todoContainer
  .model(store.getAllTodos())
  .trackBy((todo) => todo.id)
  .each((todo) => {
    const view = a.hbox(() => {
      a.checkbox(todo.text, () => store.toggleTodo(todo.id));
      a.button('Edit', ifNotEditingStartEdit);
      a.button('Delete', () => store.deleteTodo(todo.id));
    });

    // ng-show equivalent - hide/show based on filter
    view.ngShow(() => {
      const filter = store.getFilter();
      if (filter === 'all') return true;
      if (filter === 'active') return !todo.completed;
      if (filter === 'completed') return todo.completed;
    });
  });

// On model change - just update the binding
store.subscribe(() => {
  listBinding.update(store.getAllTodos());
  updateStatusLabel();
  updateFilterButtons();
});
```

### Phase 2: Add ng-show Directive

**New API:**
```typescript
// In src/widgets.ts - Widget base class
ngShow(conditionFn: () => boolean): this {
  const updateVisibility = async () => {
    const shouldShow = conditionFn();
    if (shouldShow) {
      await this.show();
    } else {
      await this.hide();
    }
  };

  // Store for reactive re-evaluation
  this.visibilityCondition = updateVisibility;
  updateVisibility(); // Initial evaluation

  return this;
}

// Trigger re-evaluation when model changes
refresh(): void {
  if (this.visibilityCondition) {
    this.visibilityCondition();
  }
}
```

**Usage:**
```typescript
checkbox.ngShow(() => !isEditing);
textEntry.ngShow(() => isEditing);
```

### Phase 3: Optimize for Filter Changes

Instead of rebuild, just toggle visibility:
```typescript
store.subscribe(() => {
  const filter = store.getFilter();

  // Update visibility of all existing views (no rebuild!)
  todoViews.forEach((view, todoId) => {
    const todo = store.getAllTodos().find(t => t.id === todoId);
    if (todo) {
      const shouldShow = (
        filter === 'all' ||
        (filter === 'active' && !todo.completed) ||
        (filter === 'completed' && todo.completed)
      );

      if (shouldShow) {
        view.container.show();
      } else {
        view.container.hide();
      }
    }
  });

  updateStatusLabel();
  updateFilterButtons();
});
```

## Implementation Steps

### Step 1: Add ModelBoundList to VBox (src/widgets.ts)
- [ ] Create ModelBoundList class
- [ ] Add trackBy() method for item identity
- [ ] Add each() method for item rendering
- [ ] Add update() method for smart diffing
- [ ] Implement diff algorithm (added/removed/unchanged)

### Step 2: Add ngShow to Widget base class
- [ ] Add ngShow(conditionFn) method
- [ ] Add refresh() to re-evaluate visibility
- [ ] Store visibility condition function

### Step 3: Refactor TodoMVC to use new APIs
- [ ] Replace rebuildTodoList() with model binding
- [ ] Use ngShow for edit mode toggle
- [ ] Use ngShow for filter visibility
- [ ] Update subscription to call update() instead of rebuild

### Step 4: Test and Verify
- [ ] All 16 existing tests still pass
- [ ] Verify only changed items update (not full rebuild)
- [ ] Verify hide/show used for filtering

## Benefits

### Performance
- **Adding 1 todo:** Creates 1 view (not N views)
- **Toggling checkbox:** Updates 1 view's data (not rebuild N views)
- **Changing filter:** Hides/shows existing views (not rebuild)
- **Deleting 1 todo:** Removes 1 view (not rebuild N-1 views)

### Code Clarity
```typescript
// Before (imperative)
store.subscribe(() => {
  rebuildTodoList();
  updateStatusLabel();
  updateFilterButtons();
});

// After (pseudo-declarative)
todoContainer.model(store.getAllTodos())
  .trackBy(todo => todo.id)
  .each(todo => {
    a.hbox(() => {
      a.checkbox(todo.text, () => store.toggleTodo(todo.id))
        .ngShow(() => !isEditing);
      a.entry('', ifEditingSaveEdit, 300)
        .ngShow(() => isEditing);
    });
  });
```

### MVC Conformance
Closer to AngularJS 2009 declarative style:
- Model changes propagate automatically
- Views declared once, updated intelligently
- Visibility controlled declaratively with ngShow
- List binding with ng-repeat equivalent

## Risks & Considerations

### Complexity
- ModelBoundList adds framework complexity
- Diffing algorithm needs to be correct
- More moving parts = more bugs

### Test Coverage
- Need tests for ModelBoundList itself
- Need tests for ngShow
- All 16 TodoMVC tests must continue passing

### Breaking Changes
- This is additive (new APIs), not breaking
- Existing code continues to work
- TodoMVC can be refactored incrementally

## Future Enhancements

### ng-class equivalent
```typescript
widget.ngClass({
  'completed': () => todo.completed,
  'editing': () => isEditing
});
```

### ng-model equivalent (two-way binding)
```typescript
entry.ngModel(todo, 'text');  // Auto-sync with model property
```

### Computed properties
```typescript
label.ngText(() => `${store.getActiveCount()} items left`);
```

## Success Criteria

1. ✅ TodoMVC list updates are incremental (not full rebuild)
2. ✅ Filter changes use hide/show (not rebuild)
3. ✅ All 16 tests pass
4. ✅ Code reads more declaratively (closer to AngularJS style)
5. ✅ Performance improvement measurable (benchmark add/delete/filter)

## References

- [AngularJS 1.0 ng-repeat docs](https://docs.angularjs.org/api/ng/directive/ngRepeat)
- [AngularJS 1.0 ng-show docs](https://docs.angularjs.org/api/ng/directive/ngShow)
- [StoryNavigator example](https://paul-hammant-fork.github.io/StoryNavigator/navigator.html) - Real-world AngularJS 1.0 usage
