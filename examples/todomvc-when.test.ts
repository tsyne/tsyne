/**
 * TodoMVC TsyneTest Integration Tests (when() version)
 *
 * Comprehensive test suite demonstrating:
 * - Adding todos
 * - Toggling completion
 * - Deleting todos
 * - Filtering (All/Active/Completed) using when() method
 * - Clearing completed
 * - File persistence
 *
 * This tests the when() implementation of TodoMVC.
 *
 * Usage:
 *   npm test examples/todomvc-when.test.ts
 *   TSYNE_HEADED=1 npm test examples/todomvc-when.test.ts  # Visual debugging
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createTodoApp } from './todomvc-when';
import * as fs from 'fs';
import * as path from 'path';

describe('TodoMVC Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testFilePath: string;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });

    // Create unique test file
    testFilePath = path.join(process.cwd(), `test-todos-${Date.now()}.json`);
  });

  afterEach(async () => {
    await tsyneTest.cleanup();

    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test('should display empty state initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByText("0 items left")).toBeVisible();
    await ctx.expect(ctx.getByExactText("No todos yet. Add one above!")).toBeVisible();
  });

  test('should add a new todo', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Type in entry and click Add
    const entry = ctx.getByType("entry");
    await entry.type("Buy groceries");
    await ctx.wait(100);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Should show the todo
    await ctx.expect(ctx.getByExactText("Buy groceries")).toBeVisible();
    await ctx.expect(ctx.getByText("1 item left")).toBeVisible();
  });

  test('should add multiple todos', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add first todo
    const entry = ctx.getByType("entry");
    await entry.type("First task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Add second todo
    await entry.type("Second task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Add third todo
    await entry.type("Third task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(200);

    // Should show all todos
    await ctx.expect(ctx.getByExactText("First task")).toBeVisible();
    await ctx.expect(ctx.getByExactText("Second task")).toBeVisible();
    await ctx.expect(ctx.getByExactText("Third task")).toBeVisible();
    await ctx.expect(ctx.getByText("3 items left")).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'todomvc-when.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should toggle todo completion', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add a todo
    const entry = ctx.getByType("entry");
    await entry.type("Test task");
    await ctx.wait(100);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Click checkbox to complete
    const checkbox = ctx.getByExactText("Test task");
    await checkbox.click();

    // Should show 0 active items (retry up to 1 second for async updates)
    await ctx.expect(ctx.getByText("0 items left").within(1000)).toBeVisible();

    // Click again to uncomplete
    await checkbox.click();

    // Should show 1 active item again
    await ctx.expect(ctx.getByText("1 item left").within(1000)).toBeVisible();
  });

  test('should delete a todo', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add a todo
    const entry = ctx.getByType("entry");
    await entry.type("Delete me");
    await ctx.wait(100);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Click delete
    await ctx.getByExactText("Delete").click();
    await ctx.wait(100);

    // Should be gone
    await ctx.expect(ctx.getByExactText("No todos yet. Add one above!")).toBeVisible();
  });

  test('should filter active todos', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add two todos
    const entry = ctx.getByType("entry");
    await entry.type("Active task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    await entry.type("Completed task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Complete second task
    const completedCheckbox = ctx.getByExactText("Completed task");
    await completedCheckbox.click();

    // Filter by Active
    await ctx.getByExactText("Active").click();
    await ctx.wait(100);

    // Should only show active task
    await ctx.expect(ctx.getByExactText("Active task")).toBeVisible();
    await ctx.expect(ctx.getByText("Filter: active").within(1000)).toBeVisible();
  });

  test('should filter completed todos', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add and complete a todo
    const entry = ctx.getByType("entry");
    await entry.type("Done task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    const checkbox = ctx.getByExactText("Done task");
    await checkbox.click();

    // Filter by Completed
    await ctx.getByExactText("Completed").click();
    await ctx.wait(100);

    // Should show completed task
    await ctx.expect(ctx.getByExactText("Done task")).toBeVisible();
    await ctx.expect(ctx.getByText("Filter: completed").within(1000)).toBeVisible();
  });

  test('should show all todos when filter is all', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add two todos
    const entry = ctx.getByType("entry");
    await entry.type("Active task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    await entry.type("Completed task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Complete second task
    const completedCheckbox = ctx.getByExactText("Completed task");
    await completedCheckbox.click();

    // Switch to active filter
    await ctx.getByExactText("Active").click();
    await ctx.wait(100);

    // Switch back to all filter (button text is now "All" without brackets)
    await ctx.getByExactText("All").click();
    await ctx.wait(100);

    // Should show both tasks
    await ctx.expect(ctx.getByExactText("Active task")).toBeVisible();
    await ctx.expect(ctx.getByExactText("Completed task")).toBeVisible();
    await ctx.expect(ctx.getByText("Filter: all")).toBeVisible();
  });

  test('should clear completed todos', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add two todos
    const entry = ctx.getByType("entry");
    await entry.type("Keep this");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    await entry.type("Clear this");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Complete second task
    const completedCheckbox = ctx.getByExactText("Clear this");
    await completedCheckbox.click();

    // Clear completed
    await ctx.getByExactText("Clear Completed").click();
    await ctx.wait(100);

    // Only active task should remain
    await ctx.expect(ctx.getByExactText("Keep this")).toBeVisible();
    await ctx.expect(ctx.getByText("1 item left").within(1000)).toBeVisible();
  });

  test('should not add empty todos', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Try to add empty todo
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Should still show empty state
    await ctx.expect(ctx.getByExactText("No todos yet. Add one above!")).toBeVisible();
    await ctx.expect(ctx.getByText("0 items left")).toBeVisible();
  });

  test('should persist todos to file', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add a todo
    const entry = ctx.getByType("entry");
    await entry.type("Persistent task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Verify file was created and contains the todo
    expect(fs.existsSync(testFilePath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
    expect(data.todos).toHaveLength(1);
    expect(data.todos[0].text).toBe("Persistent task");
    expect(data.todos[0].completed).toBe(false);
  });

  test('should reload todos from file', async () => {
    // Pre-populate the file
    fs.writeFileSync(testFilePath, JSON.stringify({
      todos: [
        { id: 1, text: "Preloaded task", completed: false }
      ],
      nextId: 2
    }), 'utf8');

    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show preloaded task
    await ctx.expect(ctx.getByExactText("Preloaded task")).toBeVisible();
    await ctx.expect(ctx.getByText("1 item left")).toBeVisible();
  });

  test('should persist completed state', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add and complete a todo
    const entry = ctx.getByType("entry");
    await entry.type("Complete me");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    const checkbox = ctx.getByExactText("Complete me");
    await checkbox.click();
    await ctx.wait(200); // Wait for checkbox callback and file write

    // Verify file persisted the completed state
    const data = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
    expect(data.todos[0].completed).toBe(true);
  });

  test('should handle multiple completed todos', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add three todos
    const entry = ctx.getByType("entry");

    await entry.type("Task 1");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    await entry.type("Task 2");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    await entry.type("Task 3");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);

    // Complete first and third
    await ctx.getByExactText("Task 1").click();
    await ctx.getByExactText("Task 3").click();

    // Should show 1 item left (retry for async updates)
    await ctx.expect(ctx.getByText("1 item left").within(1000)).toBeVisible();

    // Clear completed
    await ctx.getByExactText("Clear Completed").click();
    await ctx.wait(100);

    // Only Task 2 should remain
    await ctx.expect(ctx.getByExactText("Task 2")).toBeVisible();
    await ctx.expect(ctx.getByText("1 item left")).toBeVisible();
  });

  test('should show correct item counts with singular/plural', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start with 0 items
    await ctx.expect(ctx.getByText("0 items left")).toBeVisible();

    // Add one item - should say "item"
    const entry = ctx.getByType("entry");
    await entry.type("Single task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText("1 item left")).toBeVisible();

    // Add another - should say "items"
    await entry.type("Second task");
    await ctx.wait(50);
    await ctx.getByExactText("Add").click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText("2 items left")).toBeVisible();
  });

  test('should manually reload from file', async () => {
    // Pre-populate the file
    fs.writeFileSync(testFilePath, JSON.stringify({
      todos: [
        { id: 1, text: "Original task", completed: false }
      ],
      nextId: 2
    }), 'utf8');

    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(100);

    // Manually modify the file
    fs.writeFileSync(testFilePath, JSON.stringify({
      todos: [
        { id: 1, text: "Original task", completed: false },
        { id: 2, text: "Externally added", completed: false }
      ],
      nextId: 3
    }), 'utf8');

    // Click Reload
    await ctx.getByExactText("Reload from File").click();
    await ctx.wait(100);

    // Should show both tasks
    await ctx.expect(ctx.getByExactText("Original task")).toBeVisible();
    await ctx.expect(ctx.getByExactText("Externally added")).toBeVisible();
    await ctx.expect(ctx.getByText("2 items left")).toBeVisible();
  });
});
