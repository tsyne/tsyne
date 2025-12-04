/**
 * TsyneTest for window title updates
 *
 * This test verifies that window titles can be set and updated.
 */

import { TsyneTest, TestContext } from '../src/index-test';

describe('Window Title Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create window with default title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Test Window' }, (win) => {
        win.setContent(() => {
          const tsyne = require('../src/index');
          tsyne.vbox(() => {
            tsyne.label('Window with default title');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify content exists
    await ctx.expect(ctx.getByText('Window with default title')).toBeVisible();
  });

  test('should update window title', async () => {
    let windowInstance: any = null;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Initial Title' }, (win) => {
        windowInstance = win;
        win.setContent(() => {
          const tsyne = require('../src/index');
          tsyne.vbox(() => {
            const btn = tsyne.button('Change Title').onClick(() => {
              windowInstance.setTitle('New Title');
            });
            btn.id = 'change-title-btn';
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click button to change title
    await ctx.getByID('change-title-btn').click();

    // We can't directly test window title in headless mode,
    // but we can verify the button works and doesn't crash
    await ctx.expect(ctx.getByID('change-title-btn')).toBeVisible();
  });

  test('should handle multiple title changes', async () => {
    let windowInstance: any = null;
    let clickCount = 0;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Test Window' }, (win) => {
        windowInstance = win;
        win.setContent(() => {
          const tsyne = require('../src/index');
          tsyne.vbox(() => {
            const btn = tsyne.button('Change Title Multiple Times').onClick(() => {
              clickCount++;
              windowInstance.setTitle(`Title ${clickCount}`);
            });
            btn.id = 'multi-title-btn';

            const lbl = tsyne.label('Click count: 0');
            lbl.id = 'count-label';
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click button multiple times
    const button = ctx.getByID('multi-title-btn');
    await button.click();
    await button.click();
    await button.click();

    // Verify button still works after multiple clicks
    expect(clickCount).toBe(3);
    await ctx.expect(button).toBeVisible();
  });

  test('should handle empty title', async () => {
    let windowInstance: any = null;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Has Title' }, (win) => {
        windowInstance = win;
        win.setContent(() => {
          const tsyne = require('../src/index');
          tsyne.vbox(() => {
            const btn = tsyne.button('Clear Title').onClick(() => {
              windowInstance.setTitle('');
            });
            btn.id = 'clear-title-btn';
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click button to set empty title
    await ctx.getByID('clear-title-btn').click();

    // Should not crash
    await ctx.expect(ctx.getByID('clear-title-btn')).toBeVisible();
  });
});
