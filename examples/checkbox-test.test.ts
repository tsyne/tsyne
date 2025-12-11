/**
 * Minimal checkbox test to isolate clicking behavior
 */

import { TsyneTest, TestContext } from '../core/src/index-test';

describe('Checkbox Click Test', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should toggle checkbox and update label', async () => {
    let checkboxState = false;
    let statusLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Checkbox Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Checkbox Test');

            app.checkbox('Test Checkbox', async (checked: boolean) => {
              checkboxState = checked;
              await statusLabel.setText(checked ? 'Checked' : 'Unchecked');
            });

            statusLabel = app.label('Unchecked');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state
    await ctx.expect(ctx.getByExactText('Unchecked')).toBeVisible();

    // Click checkbox
    await ctx.getByExactText('Test Checkbox').click();
    await ctx.wait(100);

    // Should show 'Checked'
    await ctx.expect(ctx.getByExactText('Checked')).toBeVisible();

    // Click again
    await ctx.getByExactText('Test Checkbox').click();
    await ctx.wait(100);

    // Should show 'Unchecked' again
    await ctx.expect(ctx.getByExactText('Unchecked')).toBeVisible();
  });
});
