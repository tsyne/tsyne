/**
 * TodoMVC TsyneTest Integration Tests
 *
 * Comprehensive test suite demonstrating:
 * - Adding todos
 * - Toggling completion
 * - Deleting todos
 * - Filtering (All/Active/Completed)
 * - Clearing completed
 * - File persistence
 *
 * Usage:
 *   npm test examples/todomvc.test.ts
 *   TSYNE_HEADED=1 npm test examples/todomvc.test.ts  # Visual debugging
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { createTodoApp } from './todomvc';
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

    await ctx.getByID("statusLabel").within(1000).shouldContain("0 items left");
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
    await ctx.getByExactText("Add").within(200).click();

    // Poll for todo to appear and count to update
    await ctx.expect(ctx.getByExactText("Buy groceries").within(1000)).toBeVisible();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
    await ctx.getByID("newTodoEntry").within(1000).shouldBe(""); // Poll for entry to clear

    // Add second todo
    await entry.type("Second task");
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("2 items left");
    await ctx.getByID("newTodoEntry").within(1000).shouldBe(""); // Poll for entry to clear

    // Add third todo
    await entry.type("Third task");
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("3 items left");

    // Should show all todos
    await ctx.expect(ctx.getByExactText("First task")).toBeVisible();
    await ctx.expect(ctx.getByExactText("Second task")).toBeVisible();
    await ctx.expect(ctx.getByExactText("Third task")).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'todomvc.png');
      await ctx.getByExactText("Third task").within(500).shouldExist();
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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");

    // Click checkbox to complete - poll for todo to render
    const checkbox = ctx.getByExactText("Test task");
    await checkbox.within(100).click();

    // Poll status label text until it shows 0 items
    const expectedStatus = `0 items left | Filter: all | File: ${path.basename(testFilePath)}`;
    await ctx.getByID("statusLabel").within(2000).shouldBe(expectedStatus);

    // Click again to uncomplete
    await checkbox.click();

    // Should show 1 active item again
    const expectedStatus2 = `1 item left | Filter: all | File: ${path.basename(testFilePath)}`;
    await ctx.getByID("statusLabel").within(2000).shouldBe(expectedStatus2);
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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");

    // Click delete
    await ctx.getByExactText("Delete").click();

    // Poll for empty state
    await ctx.expect(ctx.getByExactText("No todos yet. Add one above!").within(1000)).toBeVisible();
    await ctx.getByID("statusLabel").within(1000).shouldContain("0 items left");
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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
    await ctx.getByID("newTodoEntry").within(1000).shouldBe(""); // Poll for entry to clear

    await entry.type("Completed task");
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("2 items left");

    // Complete second task (id 2)
    await ctx.getByID("todo-checkbox-2").click();
    await ctx.getByID("statusLabel").within(2000).shouldContain("1 item left");

    // Filter by Active
    await ctx.getByExactText("Active").click();

    // Poll for filter to update
    await ctx.getByID("statusLabel").within(1000).shouldContain("Filter: active");
    await ctx.expect(ctx.getByExactText("Active task")).toBeVisible();
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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");

    // Poll for todo to render then click
    const checkbox = ctx.getByExactText("Done task");
    await checkbox.within(100).click();
    await ctx.getByID("statusLabel").within(2000).shouldContain("0 items left");

    // Filter by Completed
    await ctx.getByExactText("Completed").click();

    // Poll for filter to update
    await ctx.getByID("statusLabel").within(1000).shouldContain("Filter: completed");
    await ctx.expect(ctx.getByExactText("Done task")).toBeVisible();
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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
    await ctx.getByID("newTodoEntry").within(1000).shouldBe(""); // Poll for entry to clear

    await entry.type("Completed task");
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("2 items left");

    // Complete second task - poll for todo to render
    const completedCheckbox = ctx.getByExactText("Completed task");
    await completedCheckbox.within(100).click();
    await ctx.getByID("statusLabel").within(2000).shouldContain("1 item left");

    // Switch to active filter
    await ctx.getByExactText("Active").click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("Filter: active");

    // Switch back to all filter (button text is now "All" without brackets)
    await ctx.getByExactText("All").click();

    // Poll for filter to update
    await ctx.getByID("statusLabel").within(1000).shouldContain("Filter: all");
    await ctx.expect(ctx.getByExactText("Active task")).toBeVisible();
    await ctx.expect(ctx.getByExactText("Completed task")).toBeVisible();
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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
    await ctx.getByID("newTodoEntry").within(1000).shouldBe(""); // Poll for entry to clear

    await entry.type("Clear this");
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("2 items left");

    // Complete second task - poll for todo to render
    const completedCheckbox = ctx.getByExactText("Clear this");
    await completedCheckbox.within(100).click();
    await ctx.getByID("statusLabel").within(2000).shouldContain("1 item left");

    // Clear completed
    await ctx.getByExactText("Clear Completed").click();

    // Only active task should remain
    await ctx.expect(ctx.getByExactText("Keep this")).toBeVisible();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
  });

  test('should not add empty todos', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Try to add empty todo
    await ctx.getByExactText("Add").click();

    // Should still show empty state - poll for it
    await ctx.expect(ctx.getByExactText("No todos yet. Add one above!").within(1000)).toBeVisible();
    await ctx.getByID("statusLabel").within(1000).shouldContain("0 items left");
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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");

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
    await ctx.expect(ctx.getByExactText("Preloaded task").within(1000)).toBeVisible();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");

    // Click checkbox by ID (first todo = id 1)
    await ctx.getByID("todo-checkbox-1").click();
    await ctx.getByID("statusLabel").within(2000).shouldContain("0 items left");

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
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
    await ctx.getByID("newTodoEntry").within(1000).shouldBe(""); // Poll for entry to clear

    await entry.type("Task 2");
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("2 items left");
    await ctx.getByID("newTodoEntry").within(1000).shouldBe(""); // Poll for entry to clear

    await entry.type("Task 3");
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("3 items left");

    // Complete first and third (ids 1 and 3)
    await ctx.getByID("todo-checkbox-1").click();
    await ctx.getByID("statusLabel").within(2000).shouldContain("2 items left");

    await ctx.getByID("todo-checkbox-3").click();
    await ctx.getByID("statusLabel").within(2000).shouldContain("1 item left");

    // Clear completed
    await ctx.getByExactText("Clear Completed").click();

    // Only Task 2 should remain
    await ctx.expect(ctx.getByExactText("Task 2").within(1000)).toBeVisible();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
  });

  test('should show correct item counts with singular/plural', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTodoApp(app, testFilePath);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start with 0 items
    await ctx.getByID("statusLabel").within(1000).shouldContain("0 items left");

    // Add one item - should say "item"
    const entry = ctx.getByType("entry");
    await entry.type("Single task");
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("1 item left");
    await ctx.getByID("newTodoEntry").within(1000).shouldBe(""); // Poll for entry to clear

    // Add another - should say "items"
    await entry.type("Second task");
    await ctx.getByExactText("Add").within(200).click();
    await ctx.getByID("statusLabel").within(1000).shouldContain("2 items left");
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

    // Wait for initial load to complete by polling for the preloaded task
    await ctx.expect(ctx.getByExactText("Original task").within(1000)).toBeVisible();

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

    // Poll for both tasks to appear
    await ctx.expect(ctx.getByExactText("Original task").within(1000)).toBeVisible();
    await ctx.expect(ctx.getByExactText("Externally added").within(1000)).toBeVisible();
    await ctx.getByID("statusLabel").within(1000).shouldContain("2 items left");
  });
});
