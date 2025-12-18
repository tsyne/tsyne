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

// @tsyne-app:name TodoMVC
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
// @tsyne-app:category productivity
// @tsyne-app:builder createTodoApp
// @tsyne-app:count one

import { app, window, vbox, hbox, label, button, entry, checkbox, separator, Window } from '../core/src';
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
  let boundList: any;
  let statusLabel: any;
  let filterAllButton: any;
  let filterActiveButton: any;
  let filterCompletedButton: any;

  async function updateStatusLabel() {
    if (!statusLabel) return;  // Guard for deferred content building (PhoneTop)
    const activeCount = store.getActiveCount();
    const currentFilter = store.getFilter();
    const itemText = activeCount === 1 ? 'item' : 'items';
    await statusLabel.setText(`${activeCount} ${itemText} left | Filter: ${currentFilter} | File: ${path.basename(store.getFilePath())}`);
  }

  async function updateFilterButtons() {
    if (!filterAllButton) return;  // Guard for deferred content building (PhoneTop)
    const currentFilter = store.getFilter();
    await filterAllButton.setText(currentFilter === 'all' ? '[All]' : 'All');
    await filterActiveButton.setText(currentFilter === 'active' ? '[Active]' : 'Active');
    await filterCompletedButton.setText(currentFilter === 'completed' ? '[Completed]' : 'Completed');
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

        // Declarative todo list with bindTo
        boundList = a.vbox(() => {}).bindTo({
          items: () => store.getAllTodos(),

          empty: () => {
            const currentFilter = store.getFilter();
            a.label(currentFilter === 'all' ? 'No todos yet. Add one above!' : `No ${currentFilter} todos`);
          },

          render: (todo: TodoItem) => {
            let checkbox: any;
            let textEntry: any;
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

            // Helper to check if todo should be visible based on filter
            const shouldShowTodo = () => {
              const currentTodo = store.getAllTodos().find(t => t.id === todo.id);
              if (!currentTodo) return false;
              const filter = store.getFilter();
              if (filter === 'all') return true;
              if (filter === 'active') return !currentTodo.completed;
              if (filter === 'completed') return currentTodo.completed;
              return true;
            };

            const todoHBox = a.hbox(() => {
              checkbox = a.checkbox(todo.text, async () => {
                await store.toggleTodo(todo.id);
              }).withId(`todo-checkbox-${todo.id}`);

              textEntry = a.entry('', async () => {
                if (isEditing) await saveEdit();
              }, 300);

              a.button('Edit').onClick(async () => {
                if (!isEditing) await startEdit();
              });

              a.button('Delete').onClick(async () => {
                await store.deleteTodo(todo.id);
              });
            }).when(shouldShowTodo);

            (async () => {
              await checkbox.setChecked(todo.completed);
              await textEntry.hide();
            })();
          },

          trackBy: (todo: TodoItem) => todo.id
        });

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

    // Declarative binding - model changes auto-update view via bindTo
    store.subscribe(async () => {
      boundList.update();
      await updateStatusLabel();
      await updateFilterButtons();
    });

    (async () => {
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
