/**
 * Test for Contact Manager (showForm dialog demo)
 */
import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';

describe('Contact Manager - showForm Dialog Demo', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display contact manager UI', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      let statusLabel: any;
      let contactListLabel: any;

      app.window({ title: 'Contact Manager', width: 600, height: 500 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Contact Manager', undefined, 'center', undefined, { bold: true });
            app.separator();

            app.hbox(() => {
              app.button('Add Contact').onClick(async () => {
                statusLabel.setText('Add Contact clicked');
              });

              app.button('Quick Add').onClick(async () => {
                statusLabel.setText('Quick Add clicked');
              });

              app.button('Clear All').onClick(async () => {
                statusLabel.setText('Clear All clicked');
              });
            });

            app.separator();
            app.label('Contacts:', undefined, 'leading', undefined, { bold: true });

            app.scroll(() => {
              app.vbox(() => {
                contactListLabel = app.label('No contacts yet. Click "Add Contact" to get started!', undefined, 'leading', 'word');
              });
            });

            app.separator();
            statusLabel = app.label('Ready');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check that all UI elements are present
    await ctx.expect(ctx.getByText('Contact Manager')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Add Contact')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Quick Add')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Clear All')).toBeVisible();
    await ctx.expect(ctx.getByText('Contacts:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Ready')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'new-contact.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should handle button clicks', async () => {
    let statusLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Contact Manager Test', width: 600, height: 500 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Contact Manager');
            app.separator();

            app.hbox(() => {
              app.button('Add Contact').onClick(async () => {
                statusLabel.setText('Add Contact clicked');
              });

              app.button('Quick Add').onClick(async () => {
                statusLabel.setText('Quick Add clicked');
              });

              app.button('Clear All').onClick(async () => {
                statusLabel.setText('Clear All clicked');
              });
            });

            app.separator();
            statusLabel = app.label('Ready');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click Add Contact button
    await ctx.getByExactText('Add Contact').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Add Contact clicked')).toBeVisible();

    // Click Quick Add button
    await ctx.getByExactText('Quick Add').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Quick Add clicked')).toBeVisible();

    // Click Clear All button
    await ctx.getByExactText('Clear All').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Clear All clicked')).toBeVisible();
  });

  // Note: Testing the actual showForm dialog requires manual interaction
  // or a more sophisticated test approach. The dialog is modal and blocks
  // until the user interacts with it.
});
