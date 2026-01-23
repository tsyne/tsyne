/**
 * TodoMVC Example Application (when() version)
 *
 * A fully-functional TodoMVC implementation with when() method:
 * - Add/delete/toggle todos
 * - Filter by All/Active/Completed using when() for declarative visibility
 * - Clear completed todos
 * - Persistent storage to filesystem
 * - Comprehensive TsyneTest suite
 *
 * This version demonstrates the when() method added in the MVC refactor.
 * Each todo item uses when(shouldShowTodo) for declarative visibility control.
 *
 * Usage:
 *   npm run build && npm start examples/todomvc-when.ts [filepath]
 *
 * Arguments:
 *   filepath - Optional path to save file (default: todos.json relative to exe)
 *
 * Testing:
 *   "test:todomvc-when": "jest examples/todomvc-when.test.ts"
 */

import { app, resolveTransport, window, vbox, hbox, label, button, entry, checkbox, separator, Window  } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Observable System - Pseudo-declarative automatic updates
// ============================================================================

type ChangeType = 'filter' | 'add' | 'delete' | 'toggle' | 'update' | 'clear' | 'load';
type StoreChangeListener = (changeType: ChangeType) => void;
type SimpleChangeListener = () => void;

class Observable<T> {
  private value: T;
  private listeners: SimpleChangeListener[] = [];

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(newValue: T): void {
    this.value = newValue;
    this.notify();
  }

  subscribe(listener: SimpleChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

// ============================================================================
// Data Models
// ============================================================================

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

type FilterType = 'all' | 'active' | 'completed';

// ============================================================================
// Application State
// ============================================================================

class TodoStore {
  private todos: TodoItem[] = [];
  private nextId: number = 1;
  private currentFilter: FilterType = 'all';
  private filePath: string;
  private changeListeners: StoreChangeListener[] = [];

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'todos.json');
    this.load();
  }

  subscribe(listener: StoreChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(changeType: ChangeType): void {
    this.changeListeners.forEach(listener => listener(changeType));
  }

  load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(data);
        this.todos = parsed.todos || [];
        this.nextId = parsed.nextId || 1;
      } else {
        // Starting fresh - no existing file
      }
    } catch (error) {
      console.error(`Error loading todos: ${error}`);
      this.todos = [];
      this.nextId = 1;
    }
    this.notifyChange('load');
  }

  save(): void {
    try {
      const data = JSON.stringify({
        todos: this.todos,
        nextId: this.nextId
      }, null, 2);
      fs.writeFileSync(this.filePath, data, 'utf8');
    } catch (error) {
      console.error(`Error saving todos: ${error}`);
    }
  }

  addTodo(text: string): TodoItem {
    const todo: TodoItem = {
      id: this.nextId++,
      text: text.trim(),
      completed: false
    };
    this.todos.push(todo);
    this.save();
    this.notifyChange('add');
    return todo;
  }

  toggleTodo(id: number): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.save();
      this.notifyChange('toggle');
    }
  }

  updateTodo(id: number, newText: string): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.text = newText.trim();
      this.save();
      this.notifyChange('update');
    }
  }

  deleteTodo(id: number): void {
    this.todos = this.todos.filter(t => t.id !== id);
    this.save();
    this.notifyChange('delete');
  }

  clearCompleted(): void {
    this.todos = this.todos.filter(t => !t.completed);
    this.save();
    this.notifyChange('clear');
  }

  getFilteredTodos(): TodoItem[] {
    switch (this.currentFilter) {
      case 'active':
        return this.todos.filter(t => !t.completed);
      case 'completed':
        return this.todos.filter(t => t.completed);
      default:
        return this.todos;
    }
  }

  getAllTodos(): TodoItem[] {
    return this.todos;
  }

  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
    this.notifyChange('filter');
  }

  getFilter(): FilterType {
    return this.currentFilter;
  }

  getActiveCount(): number {
    return this.todos.filter(t => !t.completed).length;
  }

  getCompletedCount(): number {
    return this.todos.filter(t => t.completed).length;
  }

  getFilePath(): string {
    return this.filePath;
  }
}

// ============================================================================
// UI Application
// ============================================================================

export function createTodoApp(a: any, storePath?: string) {
  const store = new TodoStore(storePath);

  let newTodoEntry: any;
  let todoContainer: any;
  let statusLabel: any;
  let filterAllButton: any;
  let filterActiveButton: any;
  let filterCompletedButton: any;
  let listBinding: any;

  async function updateStatusLabel() {
    const activeCount = store.getActiveCount();
    const currentFilter = store.getFilter();
    const itemText = activeCount === 1 ? 'item' : 'items';
    await statusLabel.setText(`${activeCount} ${itemText} left | Filter: ${currentFilter} | File: ${path.basename(store.getFilePath())}`);
  }

  async function updateFilterButtons() {
    const currentFilter = store.getFilter();
    await filterAllButton.setText(currentFilter === 'all' ? '[All]' : 'All');
    await filterActiveButton.setText(currentFilter === 'active' ? '[Active]' : 'Active');
    await filterCompletedButton.setText(currentFilter === 'completed' ? '[Completed]' : 'Completed');
  }

  function showEmptyState() {
    const currentFilter = store.getFilter();
    todoContainer.removeAll();
    todoContainer.add(() => {
      a.label(currentFilter === 'all' ? 'No todos yet. Add one above!' : `No ${currentFilter} todos`);
    });
    todoContainer.refresh();
  }

  // Pseudo-declarative todo item builder (AngularJS ng-repeat style)
  function createTodoItemBuilder() {
    return (todo: TodoItem) => {
      let todoHBox: any;
      let checkbox: any;
      let textEntry: any;
      let originalText = todo.text;
      let isEditing = false;

      const saveEdit = async () => {
        const newText = await textEntry.getText();
        if (newText && newText.trim()) {
          store.updateTodo(todo.id, newText);
          originalText = newText.trim();
          await checkbox.setText(originalText);
        } else {
          await textEntry.setText(originalText);
        }
        isEditing = false;
        await todoHBox.refreshVisibility();
      };

      const startEdit = async () => {
        isEditing = true;
        originalText = await checkbox.getText();
        await textEntry.setText(originalText);
        await todoHBox.refreshVisibility();
        await textEntry.focus();
      };

      const ifEditingSaveEdit = async () => {
        if (isEditing) await saveEdit();
      };

      const ifNotEditingStartEdit = async () => {
        if (!isEditing) await startEdit();
      };

      // when()-style visibility predicate
      const shouldShowTodo = () => {
        const currentTodo = store.getAllTodos().find(t => t.id === todo.id);
        if (!currentTodo) return false;

        const filter = store.getFilter();
        if (filter === 'all') return true;
        if (filter === 'active') return !currentTodo.completed;
        if (filter === 'completed') return currentTodo.completed;
        return true;
      };

      // Pseudo-declarative todo item construction
      todoContainer.add(() => {
        todoHBox = a.hbox(() => {
          checkbox = a.checkbox(todo.text, async (checked: boolean) => {
            store.toggleTodo(todo.id);
          });

          textEntry = a.entry('', ifEditingSaveEdit, 300);

          a.button('Edit').onClick(ifNotEditingStartEdit);

          a.button('Delete').onClick(async () => {
            store.deleteTodo(todo.id);
          });
        });
      });

      // Apply when() methods for declarative visibility
      (async () => {
        await checkbox.setChecked(todo.completed);
        await checkbox.setText(todo.text);
        await textEntry.setText('');

        checkbox.when(() => !isEditing);
        textEntry.when(() => isEditing);
        todoHBox.when(shouldShowTodo);
      })();

      return todoHBox;
    };
  }

  // Pseudo-declarative UI construction
  a.window({ title: 'TodoMVC', width: 700, height: 600 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('TodoMVC');
        a.separator();
        a.label('');

        a.label('Add New Todo:');
        // Pseudo-declarative event handler - just update model
        a.hbox(() => {
          newTodoEntry = a.entry('What needs to be done?', undefined, 400);
          a.button('Add').onClick(async () => {
            const text = await newTodoEntry.getText();
            if (text && text.trim()) {
              store.addTodo(text);
              await newTodoEntry.setText('');
            }
          });
        });

        a.label('');
        a.separator();
        a.label('');

        a.label('Filter:');
        // Pseudo-declarative filters - just update model
        a.hbox(() => {
          filterAllButton = a.button('[All]').onClick(async () => store.setFilter('all'));
          filterActiveButton = a.button('Active').onClick(async () => store.setFilter('active'));
          filterCompletedButton = a.button('Completed').onClick(async () => store.setFilter('completed'));
          a.button('Clear Completed').onClick(async () => {
            if (store.getCompletedCount() > 0) store.clearCompleted();
          });
        });

        a.label('');
        statusLabel = a.label('');
        a.label('');

        // Pseudo-declarative model-bound list - AngularJS ng-repeat style
        todoContainer = a.vbox(() => a.label('Loading...'));

        a.label('');
        a.separator();
        a.label('');

        // Pseudo-declarative file operations - just update model
        a.hbox(() => {
          a.button('Reload from File').onClick(async () => store.load());
          a.button('Save to File').onClick(async () => store.save());
        });
      });
    });

    win.show();
    win.centerOnScreen();

    // Pseudo-declarative binding - model changes auto-update view
    store.subscribe((changeType) => {
      (async () => {
        const allTodos = store.getAllTodos();

        if (allTodos.length === 0) {
          showEmptyState();
          listBinding = null;  // Clear binding when empty
        } else {
          if (!listBinding) {
            // Create pseudo-declarative list binding with trackBy (like ng-repeat track by)
            listBinding = todoContainer
              .model(allTodos)
              .trackBy((todo: TodoItem) => todo.id)
              .each(createTodoItemBuilder());
          } else if (changeType === 'filter') {
            // Optimization: filter changes only toggle visibility!
            await listBinding.refreshVisibility();
          } else {
            // Declarative update - diff and patch (add/delete/toggle/clear/load/update)
            listBinding.update(allTodos);
          }
        }

        await updateStatusLabel();
        await updateFilterButtons();
      })();
    });

    // Initial render - trigger list creation for preloaded data
    (async () => {
      const allTodos = store.getAllTodos();

      if (allTodos.length === 0) {
        showEmptyState();
      } else {
        // Create pseudo-declarative list binding with trackBy (like ng-repeat track by)
        listBinding = todoContainer
          .model(allTodos)
          .trackBy((todo: TodoItem) => todo.id)
          .each(createTodoItemBuilder());
      }

      await updateStatusLabel();
      await updateFilterButtons();
    })();
  });
}

// ============================================================================
// Main Application Entry Point
// ============================================================================

if (require.main === module) {
  // Get file path from command line args
  const args = process.argv.slice(2);
  const filePath = args[0];

  app(resolveTransport(), { title: 'TodoMVC' }, (a) => {
    createTodoApp(a, filePath);
  });
}

// ============================================================================
// Tests
// ============================================================================
// See examples/todomvc.test.ts for the comprehensive test suite
