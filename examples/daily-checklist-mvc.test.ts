/**
 * Tests for Daily Checklist (MVC Style)
 *
 * Same tests as daily-checklist.test.ts but for the MVC version.
 * Both versions should behave identically from the user's perspective.
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { buildDailyChecklistMVC } from './daily-checklist-mvc';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const CHECKLIST_FILE = path.join(os.homedir(), '.daily-checklist.txt');

describe('Daily Checklist (MVC)', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let originalContent: string | null = null;

  beforeEach(async () => {
    // Backup existing file if present
    if (fs.existsSync(CHECKLIST_FILE)) {
      originalContent = fs.readFileSync(CHECKLIST_FILE, 'utf-8');
    }
    // Remove file for clean test state
    if (fs.existsSync(CHECKLIST_FILE)) {
      fs.unlinkSync(CHECKLIST_FILE);
    }

    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();

    // Restore original file if it existed
    if (originalContent !== null) {
      fs.writeFileSync(CHECKLIST_FILE, originalContent, 'utf-8');
    } else if (fs.existsSync(CHECKLIST_FILE)) {
      fs.unlinkSync(CHECKLIST_FILE);
    }
    originalContent = null;
  });

  test('should display empty state when no items configured', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDailyChecklistMVC(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show the title
    await ctx.getByID('title').within(500).shouldContain('Daily Checklist');

    // Should indicate no items configured
    await ctx.getByID('statusLabel').within(500).shouldContain('No items configured');
  });

  test('should allow entering edit mode and adding items', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDailyChecklistMVC(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click edit button
    await ctx.getByID('editBtn').click();

    // Should show the text area
    await ctx.getByID('itemsTextArea').within(500).shouldExist();

    // Enter some tasks
    await ctx.getByID('itemsTextArea').type('Morning task\nEvening task\nNight task');

    // Save
    await ctx.getByID('saveBtn').click();

    // Should now show status with 3 items
    await ctx.getByID('statusLabel').within(500).shouldContain('3 items remaining');

    // Verify file was created
    expect(fs.existsSync(CHECKLIST_FILE)).toBe(true);
  });

  test('should check off items and update status', async () => {
    // Pre-configure with some items
    fs.writeFileSync(CHECKLIST_FILE, 'Morning task\nEvening task', 'utf-8');

    const testApp = await tsyneTest.createApp((app) => {
      buildDailyChecklistMVC(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show 2 items remaining initially
    await ctx.getByID('statusLabel').within(500).shouldContain('2 items remaining');

    // Check off first item
    await ctx.getByID('checklist-item-0').click();

    // Should now show 1 item remaining
    await ctx.getByID('statusLabel').within(500).shouldContain('1 item remaining');

    // Check off second item
    await ctx.getByID('checklist-item-1').click();

    // Should show all done
    await ctx.getByID('statusLabel').within(500).shouldContain('All done!');
  });

  test('should reset all checks', async () => {
    fs.writeFileSync(CHECKLIST_FILE, 'Morning task\nEvening task', 'utf-8');

    const testApp = await tsyneTest.createApp((app) => {
      buildDailyChecklistMVC(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check off both items
    await ctx.getByID('checklist-item-0').click();
    await ctx.getByID('checklist-item-1').click();

    // Should show all done
    await ctx.getByID('statusLabel').within(500).shouldContain('All done!');

    // Click reset
    await ctx.getByID('resetBtn').click();

    // Should be back to 2 items remaining
    await ctx.getByID('statusLabel').within(500).shouldContain('2 items remaining');
  });

  test('should cancel edit without saving', async () => {
    fs.writeFileSync(CHECKLIST_FILE, 'Original item', 'utf-8');

    const testApp = await tsyneTest.createApp((app) => {
      buildDailyChecklistMVC(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should show 1 item remaining
    await ctx.getByID('statusLabel').within(500).shouldContain('1 item remaining');

    // Enter edit mode
    await ctx.getByID('editBtn').click();

    // Change the text
    await ctx.getByID('itemsTextArea').type('Changed item\nNew item');

    // Cancel without saving
    await ctx.getByID('cancelBtn').click();

    // Should still show 1 item (not 2)
    await ctx.getByID('statusLabel').within(500).shouldContain('1 item remaining');
  });

  test('should handle empty lines in item list', async () => {
    // Items with empty lines that should be filtered out
    fs.writeFileSync(CHECKLIST_FILE, 'Item 1\n\n\nItem 2\n  \nItem 3', 'utf-8');

    const testApp = await tsyneTest.createApp((app) => {
      buildDailyChecklistMVC(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should only count non-empty items (3 items)
    await ctx.getByID('statusLabel').within(500).shouldContain('3 items remaining');
  });

  test('should persist items to file on save', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDailyChecklistMVC(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter edit mode and add items
    await ctx.getByID('editBtn').click();
    await ctx.getByID('itemsTextArea').type('Saved task');
    await ctx.getByID('saveBtn').click();

    // Wait for save to complete
    await ctx.getByID('statusLabel').within(500).shouldContain('1 item remaining');

    // Verify the file was saved
    expect(fs.existsSync(CHECKLIST_FILE)).toBe(true);
    const content = fs.readFileSync(CHECKLIST_FILE, 'utf-8');
    expect(content).toContain('Saved task');
  });

  test('screenshot: initial state', async () => {
    if (process.env.TAKE_SCREENSHOTS !== '1') {
      return;
    }

    fs.writeFileSync(CHECKLIST_FILE, 'Morning standup\nReview PRs\nUpdate documentation', 'utf-8');

    const testApp = await tsyneTest.createApp((app) => {
      buildDailyChecklistMVC(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('statusLabel').within(500).shouldContain('3 items remaining');

    const screenshotPath = path.join(__dirname, 'screenshots', 'daily-checklist-mvc.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Screenshot saved: ${screenshotPath}`);
  });
});
