/**
 * TsyneTest for Status Bar widget functionality
 *
 * This test verifies that label widgets (used for status bar) can be created and updated.
 * Full status bar testing with browser integration is done in browser-status-bar.test.ts
 */

import { TsyneTest, TestContext, Label } from '../core/src/index-test';

describe('Status Bar Label Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create label for status bar with default text', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Status Bar Test' }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Main content
            app.label('Application Content');

            // Status bar at bottom (simulated)
            app.separator();
            app.label('Ready').withId('status-label');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify status label exists with default text
    const statusLabel = ctx.getByID('status-label');
    await ctx.expect(statusLabel).toBeVisible();
    await ctx.expect(statusLabel).toHaveText('Ready');
  });

  test('should update status label text', async () => {
    let statusLabel: Label;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Status Update Test' }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Application');

            app.button('Update Status').onClick(() => {
              statusLabel.setText('Loading...');
            }).withId('update-btn');

            app.separator();
            statusLabel = app.label('Ready').withId('status-label');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial status
    const status = ctx.getByID('status-label');
    await ctx.expect(status).toHaveText('Ready');

    // Click button to update status
    await ctx.getByID('update-btn').click();

    // Status should be updated
    await status.within(500).shouldBe('Loading...');
  });

  test('should handle multiple status updates', async () => {
    let statusLabel: Label;
    let currentStatus = 'Ready';

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Multiple Status Updates Test' }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.button('Cycle Status').onClick(() => {
              if (currentStatus === 'Ready') {
                currentStatus = 'Loading...';
                statusLabel.setText('Loading...');
              } else if (currentStatus === 'Loading...') {
                currentStatus = 'Done';
                statusLabel.setText('Done');
              } else {
                currentStatus = 'Ready';
                statusLabel.setText('Ready');
              }
            }).withId('cycle-btn');

            app.separator();
            statusLabel = app.label(currentStatus).withId('status-label');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const button = ctx.getByID('cycle-btn');
    const status = ctx.getByID('status-label');

    // Initial: Ready
    await ctx.expect(status).toHaveText('Ready');

    // Click 1: Loading...
    await button.click();
    await status.within(500).shouldBe('Loading...');

    // Click 2: Done
    await button.click();
    await status.within(500).shouldBe('Done');

    // Click 3: Back to Ready
    await button.click();
    await status.within(500).shouldBe('Ready');
  });
});
