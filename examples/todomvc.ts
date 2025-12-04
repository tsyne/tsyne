/**
 * TodoMVC Example Application
 *
 * A fully-functional TodoMVC implementation with:
 * - Add/delete/toggle todos
 * - Filter by All/Active/Completed
 * - Clear completed todos
 * - Persistent storage to filesystem
 * - Comprehensive TsyneTest suite
 *
 * Usage:
 *   npm run build && npm start examples/todomvc.ts [filepath]
 *
 * Arguments:
 *   filepath - Optional path to save file (default: todos.json relative to exe)
 *
 * Testing:
 *   Add to package.json scripts:
 *   "test:todomvc": "jest examples/todomvc.test.ts"
 */

import { app, window, vbox, hbox, label, button, entry, checkbox, separator, Window } from '../src';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Observable System - Pseudo-declarative automatic updates
// ============================================================================

type ChangeListener = () => void;

class Observable<T> {
  private value: T;
  private listeners: ChangeListener[] = [];

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

  subscribe(listener: ChangeListener): () => void {
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
  private changeListeners: ChangeListener[] = [];

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'todos.json');
    // Load asynchronously - initial load doesn't need to await notifyChange since no listeners yet
    this.load();
  }

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private async notifyChange(): Promise<void> {
    for (const listener of this.changeListeners) {
      await listener();
    }
  }

  async load(): Promise<void> {
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
    await this.notifyChange();
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

  async addTodo(text: string): Promise<TodoItem> {
    const todo: TodoItem = {
      id: this.nextId++,
      text: text.trim(),
      completed: false
    };
    this.todos.push(todo);
    this.save();
    await this.notifyChange();
    return todo;
  }

  async toggleTodo(id: number): Promise<void> {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.save();
      await this.notifyChange();
    }
  }

  async updateTodo(id: number, newText: string): Promise<void> {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.text = newText.trim();
      this.save();
      await this.notifyChange();
    }
  }

  async deleteTodo(id: number): Promise<void> {
    this.todos = this.todos.filter(t => t.id !== id);
    this.save();
    await this.notifyChange();
  }

  async clearCompleted(): Promise<void> {
    this.todos = this.todos.filter(t => !t.completed);
    this.save();
    await this.notifyChange();
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

  async setFilter(filter: FilterType): Promise<void> {
    this.currentFilter = filter;
    await this.notifyChange();
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

  const todoViews = new Map<number, { container: any; checkbox: any; textEntry: any; deleteButton: any }>();

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

  function addTodoView(todo: TodoItem) {
    let todoHBox: any;
    let checkbox: any;
    let textEntry: any;
    let deleteButton: any;
    let originalText = todo.text;
    let isEditing = false;

    const saveEdit = async () => {
      const newText = await textEntry.getText();
      if (newText && newText.trim()) {
        await store.updateTodo(todo.id, newText);
        originalText = newText.trim();
        await checkbox.setText(originalText);
      } else {
        await textEntry.setText(originalText);
      }
      await textEntry.hide();
      await checkbox.show();
      isEditing = false;
    };

    const startEdit = async () => {
      isEditing = true;
      originalText = await checkbox.getText();
      await textEntry.setText(originalText);
      await checkbox.hide();
      await textEntry.show();
      await textEntry.focus();
    };

    const ifEditingSaveEdit = async () => {
      if (isEditing) await saveEdit();
    };

    const ifNotEditingStartEdit = async () => {
      if (!isEditing) await startEdit();
    };

    // Helper function to check if this todo should be visible based on current filter
    // Looks up current state from store to handle completion status changes
    const shouldShowTodo = () => {
      const currentTodo = store.getAllTodos().find(t => t.id === todo.id);
      if (!currentTodo) return false; // Todo was deleted

      const filter = store.getFilter();
      if (filter === 'all') return true;
      if (filter === 'active') return !currentTodo.completed;
      if (filter === 'completed') return currentTodo.completed;
      return true;
    };

    // Pseudo-declarative todo item - event handlers just update model
    todoContainer.add(() => {
      todoHBox = a.hbox(() => {
        checkbox = a.checkbox(todo.text, async (checked: boolean) => {
          await store.toggleTodo(todo.id);
        }).withId(`todo-checkbox-${todo.id}`);

        textEntry = a.entry('', ifEditingSaveEdit, 300);

        a.button('Edit').onClick(ifNotEditingStartEdit);

        deleteButton = a.button('Delete').onClick(async () => {
          await store.deleteTodo(todo.id);
        });
      });
    });

    (async () => {
      await checkbox.setChecked(todo.completed);
      await checkbox.setText(todo.text);
      await textEntry.setText('');
      await textEntry.hide();

      // Apply when() for declarative visibility based on filter
      todoHBox.when(shouldShowTodo);
    })();

    todoViews.set(todo.id, { container: todoHBox, checkbox, textEntry, deleteButton });
  }

  function removeTodoView(todoId: number) {
    const view = todoViews.get(todoId);
    if (view) {
      todoViews.delete(todoId);
      rebuildTodoList();
    }
  }

  function showEmptyState() {
    const currentFilter = store.getFilter();
    todoContainer.add(() => {
      a.label(currentFilter === 'all' ? 'No todos yet. Add one above!' : `No ${currentFilter} todos`);
    });
    todoContainer.refresh();
  }

  function rebuildTodoList() {
    const allTodos = store.getAllTodos();
    todoViews.clear();
    todoContainer.removeAll();

    if (allTodos.length === 0) {
      showEmptyState();
    } else {
      allTodos.forEach((todo) => {
        addTodoView(todo);
      });
    }

    todoContainer.refresh();
  }

  // Refresh visibility of all todo items without rebuilding
  async function refreshTodoVisibility() {
    for (const view of todoViews.values()) {
      await view.container.refreshVisibility();
    }
  }

  // Pseudo-declarative UI construction
  a.window({ title: 'TodoMVC', width: 700, height: 600 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('TodoMVC');
        a.separator();
        a.spacer();

        a.label('Add New Todo:');
        // Pseudo-declarative event handler - just update model
        a.hbox(() => {
          newTodoEntry = a.entry('What needs to be done?', undefined, 400).withId('newTodoEntry');
          a.button('Add').onClick(async () => {
            const text = await newTodoEntry.getText();
            if (text && text.trim()) {
              await store.addTodo(text);
              await newTodoEntry.setText('');
            }
          });
        });

        a.spacer();
        a.separator();
        a.spacer();

        a.label('Filter:');
        // Pseudo-declarative filters - just update model
        a.hbox(() => {
          filterAllButton = a.button('[All]').onClick(async () => await store.setFilter('all'));
          filterActiveButton = a.button('Active').onClick(async () => await store.setFilter('active'));
          filterCompletedButton = a.button('Completed').onClick(async () => await store.setFilter('completed'));
          a.button('Clear Completed').onClick(async () => {
            if (store.getCompletedCount() > 0) await store.clearCompleted();
          });
        });

        a.spacer();
        statusLabel = a.label('').withId('statusLabel');
        a.spacer();

        todoContainer = a.vbox(() => a.label('Loading...'));

        a.spacer();
        a.separator();
        a.spacer();

        // Pseudo-declarative file operations - just update model
        a.hbox(() => {
          a.button('Reload from File').onClick(async () => await store.load());
          a.button('Save to File').onClick(async () => store.save());
        });
      });
    });

    win.show();
    win.centerOnScreen();

    // Pseudo-declarative binding - model changes auto-update view
    store.subscribe(async () => {
      rebuildTodoList();
      await updateStatusLabel();
      await updateFilterButtons();
    });

    (async () => {
      rebuildTodoList();
      await updateStatusLabel();
      await updateFilterButtons();
    })();
  });
}

// ============================================================================
// Main Application Entry Point
// ============================================================================

// Skip auto-run when imported by test framework (Jest sets this)
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  // Get file path from command line args (only when run directly)
  const filePath = require.main === module ? process.argv.slice(2)[0] : undefined;

  // Run the app - this executes when loaded by designer or run directly
  app({ title: 'TodoMVC' }, (a) => {
    createTodoApp(a, filePath);
  });
}

// ============================================================================
// Tests
// ============================================================================
// See examples/todomvc.test.ts for the comprehensive test suite
