/**
 * Test demonstrating various locator methods including getById()
 *
 * This test demonstrates:
 * 1. Using ctx.getById() to find widgets by their unique ID
 * 2. The difference between .find() (single element, like Selenium's findElement)
 *    and .findAll() (multiple elements, like Selenium's findElements)
 * 3. Practical examples of when to use each locator type
 */

import { TsyneTest, TestContext } from '../core/src/index-test';

describe('Locator Tests - getById and find/findAll patterns', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  // Widget IDs will be stored here for testing
  let submitButtonId: string;
  let cancelButtonId: string;
  let statusLabelId: string;
  let usernameEntryId: string;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should find widgets by ID using getById()', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'ID Locator Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const statusLabel = app.label("Ready");
            statusLabelId = statusLabel.id;

            const usernameEntry = app.entry("Enter username");
            usernameEntryId = usernameEntry.id;

            app.hbox(() => {
              const submitBtn = app.button("Submit").onClick(() => {
                statusLabel.setText("Submitted!");
              });
              submitButtonId = submitBtn.id;

              const cancelBtn = app.button("Cancel").onClick(() => {
                statusLabel.setText("Cancelled");
              });
              cancelButtonId = cancelBtn.id;
            });
          });
        });
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Test 1: Find submit button by ID and click it
    const submitLocator = ctx.getById(submitButtonId);
    await submitLocator.click();
    await ctx.wait(50);

    // Verify status changed
    const statusLocator = ctx.getById(statusLabelId);
    await ctx.expect(statusLocator).toHaveText("Submitted!");
  });

  test('should demonstrate find() vs findAll() pattern', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Find Pattern Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label("Multiple Buttons Test");

            // Create multiple buttons with same text pattern
            app.button("Action 1");
            app.button("Action 2");
            app.button("Action 3");

            // Also create buttons of same type
            app.button("Submit");
            app.button("Cancel");
          });
        });
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Test 1: find() returns first match (like Selenium's findElement)
    const firstActionLocator = ctx.getByText("Action");
    const firstActionId = await firstActionLocator.find();
    expect(firstActionId).not.toBeNull();

    // Test 2: findAll() returns all matches (like Selenium's findElements)
    const allActionLocator = ctx.getByText("Action");
    const allActionIds = await allActionLocator.findAll();
    expect(allActionIds.length).toBe(3); // Should find "Action 1", "Action 2", "Action 3"

    // Test 3: find() on a unique element returns that element
    const submitLocator = ctx.getByExactText("Submit");
    const submitId = await submitLocator.find();
    expect(submitId).not.toBeNull();

    // Test 4: Count all buttons using getByType
    const allButtonsLocator = ctx.getByType("button");
    const allButtons = await allButtonsLocator.findAll();
    expect(allButtons.length).toBe(5); // 3 Action buttons + Submit + Cancel
  });

  test('should type text into entry found by ID', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Entry Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const entry = app.entry("Type here");
            usernameEntryId = entry.id;

            const displayLabel = app.label("");
            statusLabelId = displayLabel.id;

            app.button("Display").onClick(() => {
              entry.getText().then(text => {
                displayLabel.setText(`You typed: ${text}`);
              });
            });
          });
        });
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Find entry by ID and type into it
    const entryLocator = ctx.getById(usernameEntryId);
    await entryLocator.type("Hello World");
    await ctx.wait(50);

    // Click display button
    await ctx.getByExactText("Display").click();
    await ctx.wait(50);

    // Verify the text was typed
    const displayLocator = ctx.getById(statusLabelId);
    await ctx.expect(displayLocator).toHaveText("You typed: Hello World");
  });

  test('should wait for widget to appear using waitFor', async () => {
    let dynamicButtonId: string;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Wait Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label("Click to add button");

            let buttonAdded = false;
            app.button("Add Button").onClick(() => {
              if (!buttonAdded) {
                const newBtn = app.button("Dynamic Button");
                dynamicButtonId = newBtn.id;
                buttonAdded = true;
              }
            });
          });
        });
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click to add the button
    await ctx.getByExactText("Add Button").click();
    await ctx.wait(50);

    // Wait for dynamic button to appear using waitFor
    const dynamicLocator = ctx.getByExactText("Dynamic Button");
    await dynamicLocator.waitFor(2000);

    // Verify button exists
    await ctx.expect(dynamicLocator).toBeVisible();
  });

  test('should use getInfo to inspect widget details', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Widget Info Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const myButton = app.button("Inspect Me");
            submitButtonId = myButton.id;
          });
        });
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get widget info using ID
    const buttonLocator = ctx.getById(submitButtonId);
    const info = await buttonLocator.getInfo();

    expect(info.id).toBe(submitButtonId);
    expect(info.type).toBe('button');
    expect(info.text).toBe('Inspect Me');
  });

  test('should demonstrate all assertion methods', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Assertions Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            const label = app.label("Test Label");
            statusLabelId = label.id;

            app.button("Update").onClick(() => {
              label.setText("Updated Text");
            });

            // Multiple buttons for count testing
            app.button("Item 1");
            app.button("Item 2");
            app.button("Item 3");
          });
        });
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Test toHaveText
    const labelLocator = ctx.getById(statusLabelId);
    await ctx.expect(labelLocator).toHaveText("Test Label");

    // Test toContainText
    await ctx.expect(labelLocator).toContainText("Test");

    // Test toBeVisible
    await ctx.expect(labelLocator).toBeVisible();

    // Test toExist
    await ctx.expect(labelLocator).toExist();

    // Test toHaveCount with multiple buttons
    const itemLocator = ctx.getByText("Item");
    await ctx.expect(itemLocator).toHaveCount(3);

    // Update and verify new text
    await ctx.getByExactText("Update").click();
    await ctx.wait(50);
    await ctx.expect(labelLocator).toHaveText("Updated Text");
  });

  test('should handle errors when widget not found', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Error Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label("No buttons here");
          });
        });
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Try to click a non-existent widget by ID
    const fakeLocator = ctx.getById("non-existent-id");

    await expect(async () => {
      await fakeLocator.click();
    }).rejects.toThrow("No widget found with id: non-existent-id");
  });

  test('should compare getById vs getByText vs getByType', async () => {
    let button1Id: string = '';
    let button2Id: string = '';

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Comparison Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Two buttons with same text
            const btn1 = app.button("Click");
            button1Id = btn1.id;

            const btn2 = app.button("Click");
            button2Id = btn2.id;
          });
        });
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Method 1: getByText finds first button (imprecise)
    const textLocator = ctx.getByText("Click");
    const firstButtonId = await textLocator.find();
    expect(firstButtonId).not.toBeNull();
    expect([button1Id, button2Id]).toContain(firstButtonId);

    // Method 2: getByType finds all buttons
    const typeLocator = ctx.getByType("button");
    const allButtonIds = await typeLocator.findAll();
    expect(allButtonIds.length).toBe(2);

    // Method 3: getById finds exact widget (most precise)
    const id1Locator = ctx.getById(button1Id);
    const id2Locator = ctx.getById(button2Id);

    const foundId1 = await id1Locator.find();
    const foundId2 = await id2Locator.find();

    expect(foundId1).toBe(button1Id);
    expect(foundId2).toBe(button2Id);
    expect(foundId1).not.toBe(foundId2);
  });
});
