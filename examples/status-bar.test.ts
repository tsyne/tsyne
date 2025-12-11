/**
 * TsyneTest for Status Bar widget functionality
 *
 * This test verifies that label widgets (used for status bar) can be created and updated.
 * Full status bar testing with browser integration is done in browser-status-bar.test.ts
 */

import { TsyneTest, TestContext } from '../core/src/index-test';

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
          const tsyne = require('../core/src/index');

          tsyne.vbox(() => {
            // Main content
            tsyne.label('Application Content');

            // Status bar at bottom (simulated)
            tsyne.separator();
            const statusLabel = tsyne.label('Ready');
            statusLabel.id = 'status-label';
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
    let statusLabel: any = null;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Status Update Test' }, (win) => {
        win.setContent(() => {
          const tsyne = require('../core/src/index');

          tsyne.vbox(() => {
            tsyne.label('Application');

            const btn = tsyne.button('Update Status').onClick(() => {
              if (statusLabel) {
                statusLabel.setText('Loading...');
              }
            });
            btn.id = 'update-btn';

            tsyne.separator();
            statusLabel = tsyne.label('Ready');
            statusLabel.id = 'status-label';
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

    // Wait a bit for the update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Status should be updated
    await ctx.expect(status).toHaveText('Loading...');
  });

  test('should handle multiple status updates', async () => {
    let statusLabel: any = null;
    let currentStatus = 'Ready';

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Multiple Status Updates Test' }, (win) => {
        win.setContent(() => {
          const tsyne = require('../core/src/index');

          tsyne.vbox(() => {
            const btn = tsyne.button('Cycle Status').onClick(() => {
              if (statusLabel) {
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
              }
            });
            btn.id = 'cycle-btn';

            tsyne.separator();
            statusLabel = tsyne.label(currentStatus);
            statusLabel.id = 'status-label';
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
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(status).toHaveText('Loading...');

    // Click 2: Done
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(status).toHaveText('Done');

    // Click 3: Back to Ready
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(status).toHaveText('Ready');
  });
});
