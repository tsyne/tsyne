// Test for custom dialog functionality
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Custom Dialog', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should open custom dialog and show content', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Custom Dialog Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Main Window');
            app.button('Open Dialog', async () => {
              await win.showCustom('Test Dialog', () => {
                app.vbox(() => {
                  app.label('Dialog Content');
                  app.label('This is custom content');
                });
              }, {
                dismissText: 'Close'
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Main window should be visible
    await ctx.expect(ctx.getByExactText('Main Window')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Open Dialog')).toBeVisible();

    // Capture screenshot before dialog
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'about-dialog-before.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }

    // Click to open dialog
    await ctx.getByExactText('Open Dialog').click();
    await ctx.wait(300);

    // Dialog content should be visible
    // Note: The dialog's Close button is a Fyne internal widget, not accessible via our test framework
    await ctx.expect(ctx.getByExactText('Dialog Content')).toBeVisible();
    await ctx.expect(ctx.getByExactText('This is custom content')).toBeVisible();

    // Capture screenshot with dialog open
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'about-dialog-open.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should open custom confirm dialog and show content', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Confirm Dialog Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Status: Waiting');
            app.button('Open Confirm', async () => {
              await win.showCustomConfirm('Confirm Action', () => {
                app.vbox(() => {
                  app.label('Do you want to proceed?');
                  app.label('This action requires confirmation.');
                });
              }, {
                confirmText: 'Yes',
                dismissText: 'No'
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state
    await ctx.expect(ctx.getByExactText('Status: Waiting')).toBeVisible();

    // Open dialog
    await ctx.getByExactText('Open Confirm').click();
    await ctx.wait(300);

    // Dialog content should show
    // Note: The Yes/No buttons are Fyne internal widgets, not accessible via our test framework
    await ctx.expect(ctx.getByExactText('Do you want to proceed?')).toBeVisible();
    await ctx.expect(ctx.getByExactText('This action requires confirmation.')).toBeVisible();
  });
});
