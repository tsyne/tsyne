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

import { app, window, vbox, hbox, label, button, entry, checkbox, separator } from '../src';
import * as fs from 'fs';
import * as path from 'path';

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

  constructor(filePath?: string) {
    // Use provided path or default to todos.json relative to current directory
    this.filePath = filePath || path.join(process.cwd(), 'todos.json');
    this.load();
  }

  // Load todos from file
  load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(data);
        this.todos = parsed.todos || [];
        this.nextId = parsed.nextId || 1;
        console.log(`Loaded ${this.todos.length} todos from ${this.filePath}`);
      } else {
        console.log(`No existing file at ${this.filePath}, starting fresh`);
      }
    } catch (error) {
      console.error(`Error loading todos: ${error}`);
      this.todos = [];
      this.nextId = 1;
    }
  }

  // Save todos to file
  save(): void {
    try {
      const data = JSON.stringify({
        todos: this.todos,
        nextId: this.nextId
      }, null, 2);
      fs.writeFileSync(this.filePath, data, 'utf8');
      console.log(`Saved ${this.todos.length} todos to ${this.filePath}`);
    } catch (error) {
      console.error(`Error saving todos: ${error}`);
    }
  }

  // Add a new todo
  addTodo(text: string): TodoItem {
    const todo: TodoItem = {
      id: this.nextId++,
      text: text.trim(),
      completed: false
    };
    this.todos.push(todo);
    this.save();
    return todo;
  }

  // Toggle todo completion
  toggleTodo(id: number): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.save();
    }
  }

  // Delete a todo
  deleteTodo(id: number): void {
    this.todos = this.todos.filter(t => t.id !== id);
    this.save();
  }

  // Clear all completed todos
  clearCompleted(): void {
    this.todos = this.todos.filter(t => !t.completed);
    this.save();
  }

  // Get filtered todos
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

  // Get all todos
  getAllTodos(): TodoItem[] {
    return this.todos;
  }

  // Set current filter
  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
  }

  // Get current filter
  getFilter(): FilterType {
    return this.currentFilter;
  }

  // Get active count
  getActiveCount(): number {
    return this.todos.filter(t => !t.completed).length;
  }

  // Get completed count
  getCompletedCount(): number {
    return this.todos.filter(t => t.completed).length;
  }

  // Get file path
  getFilePath(): string {
    return this.filePath;
  }
}

// ============================================================================
// UI Application
// ============================================================================

export function createTodoApp(appInstance: any, storePath?: string) {
  const store = new TodoStore(storePath);

  // UI References
  let newTodoEntry: any;
  let todoContainer: any;
  let statusLabel: any;
  let filterAllButton: any;
  let filterActiveButton: any;
  let filterCompletedButton: any;

  // Render the todo list
  function renderTodos() {
    const filtered = store.getFilteredTodos();
    const activeCount = store.getActiveCount();
    const completedCount = store.getCompletedCount();
    const currentFilter = store.getFilter();

    // Update status label
    const itemText = activeCount === 1 ? 'item' : 'items';
    statusLabel.setText(`${activeCount} ${itemText} left | Filter: ${currentFilter} | File: ${path.basename(store.getFilePath())}`);

    // Clear and rebuild todo list
    todoContainer.removeAll();

    if (filtered.length === 0) {
      todoContainer.add(() => {
        label(currentFilter === 'all' ? 'No todos yet. Add one above!' : `No ${currentFilter} todos`);
      });
    } else {
      filtered.forEach((todo) => {
        todoContainer.add(() => {
          hbox(() => {
            // Checkbox for completion
            const cb = checkbox(todo.text, todo.completed, async (checked: boolean) => {
              store.toggleTodo(todo.id);
              renderTodos();
            });

            // Delete button
            button('Delete', async () => {
              store.deleteTodo(todo.id);
              renderTodos();
            });
          });
        });
      });
    }

    // Update filter button styles (simple text indicator)
    filterAllButton.setText(currentFilter === 'all' ? '[All]' : 'All');
    filterActiveButton.setText(currentFilter === 'active' ? '[Active]' : 'Active');
    filterCompletedButton.setText(currentFilter === 'completed' ? '[Completed]' : 'Completed');

    todoContainer.refresh();
  }

  // Build the UI
  window({ title: 'TodoMVC', width: 700, height: 600 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        // Header
        label('TodoMVC');
        separator();
        label('');

        // Add todo section
        label('Add New Todo:');
        hbox(() => {
          newTodoEntry = entry('What needs to be done?');
          button('Add', async () => {
            const text = await newTodoEntry.getText();
            if (text && text.trim()) {
              store.addTodo(text);
              await newTodoEntry.setText('');
              renderTodos();
            }
          });
        });

        label('');
        separator();
        label('');

        // Filters
        label('Filter:');
        hbox(() => {
          filterAllButton = button('[All]', async () => {
            store.setFilter('all');
            renderTodos();
          });

          filterActiveButton = button('Active', async () => {
            store.setFilter('active');
            renderTodos();
          });

          filterCompletedButton = button('Completed', async () => {
            store.setFilter('completed');
            renderTodos();
          });

          button('Clear Completed', async () => {
            const count = store.getCompletedCount();
            if (count > 0) {
              store.clearCompleted();
              renderTodos();
            }
          });
        });

        label('');

        // Status label
        statusLabel = label('');
        label('');

        // Todo list container
        todoContainer = vbox(() => {
          label('Loading...');
        });

        label('');
        separator();
        label('');

        // Footer actions
        hbox(() => {
          button('Reload from File', async () => {
            store.load();
            renderTodos();
          });

          button('Save to File', async () => {
            store.save();
            renderTodos();
          });
        });
      });
    });

    win.show();
    win.centerOnScreen();

    // Initial render
    renderTodos();
  });
}

// ============================================================================
// Main Application Entry Point
// ============================================================================

if (require.main === module) {
  // Get file path from command line args
  const args = process.argv.slice(2);
  const filePath = args[0];

  app({ title: 'TodoMVC' }, (appInstance) => {
    createTodoApp(appInstance, filePath);
  });
}

// ============================================================================
// TsyneTest Test Suite
// ============================================================================

/**
 * To run these tests, create a separate test file or add this to your
 * Jest configuration:
 *
 * import { TsyneTest, TestContext } from '../src/index-test';
 * import { app } from '../src';
 * import { createTodoApp } from './todomvc';
 * import * as fs from 'fs';
 * import * as path from 'path';
 *
 * describe('TodoMVC Tests', () => {
 *   let tsyneTest: TsyneTest;
 *   let ctx: TestContext;
 *   let testFilePath: string;
 *
 *   beforeEach(async () => {
 *     const headed = process.env.TSYNE_HEADED === '1';
 *     tsyneTest = new TsyneTest({ headed });
 *
 *     // Create unique test file
 *     testFilePath = path.join(process.cwd(), `test-todos-${Date.now()}.json`);
 *   });
 *
 *   afterEach(async () => {
 *     await tsyneTest.cleanup();
 *
 *     // Clean up test file
 *     if (fs.existsSync(testFilePath)) {
 *       fs.unlinkSync(testFilePath);
 *     }
 *   });
 *
 *   test('should display empty state initially', async () => {
 *     const testApp = await tsyneTest.createApp((app) => {
 *       createTodoApp(app, testFilePath);
 *     });
 *
 *     ctx = tsyneTest.getContext();
 *     await testApp.run();
 *
 *     await ctx.expect(ctx.getByExactText("0 items left | Filter: all | File: " + path.basename(testFilePath))).toBeVisible();
 *     await ctx.expect(ctx.getByExactText("No todos yet. Add one above!")).toBeVisible();
 *   });
 *
 *   test('should add a new todo', async () => {
 *     const testApp = await tsyneTest.createApp((app) => {
 *       createTodoApp(app, testFilePath);
 *     });
 *
 *     ctx = tsyneTest.getContext();
 *     await testApp.run();
 *
 *     // Type in entry and click Add
 *     const entry = ctx.getByType("entry");
 *     await entry.type("Buy groceries");
 *     await ctx.wait(100);
 *     await ctx.getByExactText("Add").click();
 *     await ctx.wait(100);
 *
 *     // Should show the todo
 *     await ctx.expect(ctx.getByExactText("Buy groceries")).toBeVisible();
 *     await ctx.expect(ctx.getByText("1 item left")).toBeVisible();
 *   });
 *
 *   test('should toggle todo completion', async () => {
 *     const testApp = await tsyneTest.createApp((app) => {
 *       createTodoApp(app, testFilePath);
 *     });
 *
 *     ctx = tsyneTest.getContext();
 *     await testApp.run();
 *
 *     // Add a todo
 *     const entry = ctx.getByType("entry");
 *     await entry.type("Test task");
 *     await ctx.wait(100);
 *     await ctx.getByExactText("Add").click();
 *     await ctx.wait(100);
 *
 *     // Click checkbox to complete
 *     const checkbox = ctx.getByExactText("Test task");
 *     await checkbox.click();
 *     await ctx.wait(100);
 *
 *     // Should show 0 active items
 *     await ctx.expect(ctx.getByText("0 items left")).toBeVisible();
 *   });
 *
 *   test('should delete a todo', async () => {
 *     const testApp = await tsyneTest.createApp((app) => {
 *       createTodoApp(app, testFilePath);
 *     });
 *
 *     ctx = tsyneTest.getContext();
 *     await testApp.run();
 *
 *     // Add a todo
 *     const entry = ctx.getByType("entry");
 *     await entry.type("Delete me");
 *     await ctx.wait(100);
 *     await ctx.getByExactText("Add").click();
 *     await ctx.wait(100);
 *
 *     // Click delete
 *     await ctx.getByExactText("Delete").click();
 *     await ctx.wait(100);
 *
 *     // Should be gone
 *     await ctx.expect(ctx.getByExactText("No todos yet. Add one above!")).toBeVisible();
 *   });
 *
 *   test('should filter active todos', async () => {
 *     const testApp = await tsyneTest.createApp((app) => {
 *       createTodoApp(app, testFilePath);
 *     });
 *
 *     ctx = tsyneTest.getContext();
 *     await testApp.run();
 *
 *     // Add two todos
 *     const entry = ctx.getByType("entry");
 *     await entry.type("Active task");
 *     await ctx.wait(50);
 *     await ctx.getByExactText("Add").click();
 *     await ctx.wait(100);
 *
 *     await entry.type("Completed task");
 *     await ctx.wait(50);
 *     await ctx.getByExactText("Add").click();
 *     await ctx.wait(100);
 *
 *     // Complete second task
 *     const completedCheckbox = ctx.getByExactText("Completed task");
 *     await completedCheckbox.click();
 *     await ctx.wait(100);
 *
 *     // Filter by Active
 *     await ctx.getByExactText("Active").click();
 *     await ctx.wait(100);
 *
 *     // Should only show active task
 *     await ctx.expect(ctx.getByExactText("Active task")).toBeVisible();
 *     await ctx.expect(ctx.getByText("Filter: active")).toBeVisible();
 *   });
 *
 *   test('should filter completed todos', async () => {
 *     const testApp = await tsyneTest.createApp((app) => {
 *       createTodoApp(app, testFilePath);
 *     });
 *
 *     ctx = tsyneTest.getContext();
 *     await testApp.run();
 *
 *     // Add and complete a todo
 *     const entry = ctx.getByType("entry");
 *     await entry.type("Done task");
 *     await ctx.wait(50);
 *     await ctx.getByExactText("Add").click();
 *     await ctx.wait(100);
 *
 *     const checkbox = ctx.getByExactText("Done task");
 *     await checkbox.click();
 *     await ctx.wait(100);
 *
 *     // Filter by Completed
 *     await ctx.getByExactText("Completed").click();
 *     await ctx.wait(100);
 *
 *     // Should show completed task
 *     await ctx.expect(ctx.getByExactText("Done task")).toBeVisible();
 *     await ctx.expect(ctx.getByText("Filter: completed")).toBeVisible();
 *   });
 *
 *   test('should clear completed todos', async () => {
 *     const testApp = await tsyneTest.createApp((app) => {
 *       createTodoApp(app, testFilePath);
 *     });
 *
 *     ctx = tsyneTest.getContext();
 *     await testApp.run();
 *
 *     // Add two todos
 *     const entry = ctx.getByType("entry");
 *     await entry.type("Keep this");
 *     await ctx.wait(50);
 *     await ctx.getByExactText("Add").click();
 *     await ctx.wait(100);
 *
 *     await entry.type("Clear this");
 *     await ctx.wait(50);
 *     await ctx.getByExactText("Add").click();
 *     await ctx.wait(100);
 *
 *     // Complete second task
 *     const completedCheckbox = ctx.getByExactText("Clear this");
 *     await completedCheckbox.click();
 *     await ctx.wait(100);
 *
 *     // Clear completed
 *     await ctx.getByExactText("Clear Completed").click();
 *     await ctx.wait(100);
 *
 *     // Only active task should remain
 *     await ctx.expect(ctx.getByExactText("Keep this")).toBeVisible();
 *     await ctx.expect(ctx.getByText("1 item left")).toBeVisible();
 *   });
 *
 *   test('should persist todos to file', async () => {
 *     const testApp = await tsyneTest.createApp((app) => {
 *       createTodoApp(app, testFilePath);
 *     });
 *
 *     ctx = tsyneTest.getContext();
 *     await testApp.run();
 *
 *     // Add a todo
 *     const entry = ctx.getByType("entry");
 *     await entry.type("Persistent task");
 *     await ctx.wait(50);
 *     await ctx.getByExactText("Add").click();
 *     await ctx.wait(100);
 *
 *     // Verify file was created and contains the todo
 *     expect(fs.existsSync(testFilePath)).toBe(true);
 *     const data = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
 *     expect(data.todos).toHaveLength(1);
 *     expect(data.todos[0].text).toBe("Persistent task");
 *   });
 *
 *   test('should reload todos from file', async () => {
 *     // Pre-populate the file
 *     fs.writeFileSync(testFilePath, JSON.stringify({
 *       todos: [
 *         { id: 1, text: "Preloaded task", completed: false }
 *       ],
 *       nextId: 2
 *     }), 'utf8');
 *
 *     const testApp = await tsyneTest.createApp((app) => {
 *       createTodoApp(app, testFilePath);
 *     });
 *
 *     ctx = tsyneTest.getContext();
 *     await testApp.run();
 *
 *     // Should show preloaded task
 *     await ctx.expect(ctx.getByExactText("Preloaded task")).toBeVisible();
 *     await ctx.expect(ctx.getByText("1 item left")).toBeVisible();
 *   });
 * });
 */
