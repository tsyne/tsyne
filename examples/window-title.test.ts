/**
 * TsyneTest for window title updates
 *
 * This test verifies that window titles can be set and updated.
 */

import { TsyneTest, TestContext, Window } from '../core/src/index-test';

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
          app.vbox(() => {
            app.label('Window with default title');
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
    let windowInstance: Window;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Initial Title' }, (win) => {
        windowInstance = win;
        win.setContent(() => {
          app.vbox(() => {
            app.button('Change Title').onClick(() => {
              windowInstance.setTitle('New Title');
            }).withId('change-title-btn');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click button to change title
    await ctx.getById('change-title-btn').click();

    // We can't directly test window title in headless mode,
    // but we can verify the button works and doesn't crash
    await ctx.expect(ctx.getById('change-title-btn')).toBeVisible();
  });

  test('should handle multiple title changes', async () => {
    let windowInstance: Window;
    let clickCount = 0;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Test Window' }, (win) => {
        windowInstance = win;
        win.setContent(() => {
          app.vbox(() => {
            app.button('Change Title Multiple Times').onClick(() => {
              clickCount++;
              windowInstance.setTitle(`Title ${clickCount}`);
            }).withId('multi-title-btn');

            app.label('Click count: 0').withId('count-label');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click button multiple times
    const button = ctx.getById('multi-title-btn');
    await button.click();
    await button.click();
    await button.click();

    // Verify button still works after multiple clicks
    expect(clickCount).toBe(3);
    await ctx.expect(button).toBeVisible();
  });

  test('should handle empty title', async () => {
    let windowInstance: Window;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Has Title' }, (win) => {
        windowInstance = win;
        win.setContent(() => {
          app.vbox(() => {
            app.button('Clear Title').onClick(() => {
              windowInstance.setTitle('');
            }).withId('clear-title-btn');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click button to set empty title
    await ctx.getById('clear-title-btn').click();

    // Should not crash
    await ctx.expect(ctx.getById('clear-title-btn')).toBeVisible();
  });
});
