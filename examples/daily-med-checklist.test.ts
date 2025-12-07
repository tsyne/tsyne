/**
 * Tests for Daily Medication Checklist
 *
 * Tests both Jest unit tests and TsyneTest integration tests.
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { buildDailyMedChecklist } from './daily-med-checklist';
import * as path from 'path';

describe('Daily Medication Checklist', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display empty state when no items configured', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      // Clear any existing preferences for clean test
      app.setPreference('daily-med-checklist.items', '');
      buildDailyMedChecklist(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show the title
    await ctx.getByID('title').within(500).shouldBe('Daily Medication Checklist');

    // Should indicate no items configured
    await ctx.getByID('statusLabel').within(500).shouldContain('No items configured');
  });

  test('should allow entering edit mode and adding items', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.setPreference('daily-med-checklist.items', '');
      buildDailyMedChecklist(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click edit button
    await ctx.getByID('editBtn').click();

    // Should show the text area
    await ctx.getByID('itemsTextArea').within(500).shouldExist();

    // Enter some medications
    await ctx.getByID('itemsTextArea').setText('Morning pill\nEvening pill\nVitamins');

    // Save
    await ctx.getByID('saveBtn').click();

    // Should now show status with 3 items
    await ctx.getByID('statusLabel').within(500).shouldContain('3 items remaining');
  });

  test('should check off items and update status', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      // Pre-configure with some items
      app.setPreference('daily-med-checklist.items', 'Morning pill\nEvening pill');
      buildDailyMedChecklist(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show 2 items remaining initially
    await ctx.getByID('statusLabel').within(500).shouldContain('2 items remaining');

    // Check off first item
    await ctx.getByID('med-item-0').click();

    // Should now show 1 item remaining
    await ctx.getByID('statusLabel').within(500).shouldContain('1 item remaining');

    // Check off second item
    await ctx.getByID('med-item-1').click();

    // Should show all done
    await ctx.getByID('statusLabel').within(500).shouldContain('All done!');
  });

  test('should reset all checks', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.setPreference('daily-med-checklist.items', 'Morning pill\nEvening pill');
      buildDailyMedChecklist(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check off both items
    await ctx.getByID('med-item-0').click();
    await ctx.getByID('med-item-1').click();

    // Should show all done
    await ctx.getByID('statusLabel').within(500).shouldContain('All done!');

    // Click reset
    await ctx.getByID('resetBtn').click();

    // Should be back to 2 items remaining
    await ctx.getByID('statusLabel').within(500).shouldContain('2 items remaining');
  });

  test('should cancel edit without saving', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.setPreference('daily-med-checklist.items', 'Original item');
      buildDailyMedChecklist(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show 1 item remaining
    await ctx.getByID('statusLabel').within(500).shouldContain('1 item remaining');

    // Enter edit mode
    await ctx.getByID('editBtn').click();

    // Change the text
    await ctx.getByID('itemsTextArea').setText('Changed item\nNew item');

    // Cancel without saving
    await ctx.getByID('cancelBtn').click();

    // Should still show 1 item (not 2)
    await ctx.getByID('statusLabel').within(500).shouldContain('1 item remaining');
  });

  test('should handle empty lines in item list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      // Items with empty lines that should be filtered out
      app.setPreference('daily-med-checklist.items', 'Item 1\n\n\nItem 2\n  \nItem 3');
      buildDailyMedChecklist(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should only count non-empty items (3 items)
    await ctx.getByID('statusLabel').within(500).shouldContain('3 items remaining');
  });

  test('should persist items across preference save', async () => {
    let savedValue = '';

    const testApp = await tsyneTest.createApp((app) => {
      // Mock setPreference to capture saved value
      const originalSetPref = app.setPreference.bind(app);
      app.setPreference = async (key: string, value: string) => {
        if (key === 'daily-med-checklist.items') {
          savedValue = value;
        }
        return originalSetPref(key, value);
      };

      app.setPreference('daily-med-checklist.items', '');
      buildDailyMedChecklist(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter edit mode and add items
    await ctx.getByID('editBtn').click();
    await ctx.getByID('itemsTextArea').setText('Saved medication');
    await ctx.getByID('saveBtn').click();

    // Wait for save to complete
    await ctx.getByID('statusLabel').within(500).shouldContain('1 item remaining');

    // Verify the value was saved (contains our medication)
    expect(savedValue).toContain('Saved medication');
  });

  test('screenshot: initial state', async () => {
    if (process.env.TAKE_SCREENSHOTS !== '1') {
      return;
    }

    const testApp = await tsyneTest.createApp((app) => {
      app.setPreference('daily-med-checklist.items', 'Morning blood pressure pill\nEvening vitamin D\nBedtime melatonin');
      buildDailyMedChecklist(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(500).shouldContain('3 items remaining');

    const screenshotPath = path.join(__dirname, 'screenshots', 'daily-med-checklist.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Screenshot saved: ${screenshotPath}`);
  });
});
