// Test for button-spacer example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Button Spacer Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should change label text when button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      let label: any;

      app.window({ title: 'Button', width: 200, height: 100 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            label = app.label("I'm Waiting ...");
            app.label(''); // Spacer
            app.button('Click here').onClick(async () => {
              await label.setText('Finally ...');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initially shows "I'm Waiting ..."
    await ctx.expect(ctx.getByExactText("I'm Waiting ...")).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '03-button-spacer.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }

    // Click the button
    await ctx.getByExactText('Click here').click();
    await ctx.wait(100);

    // Should show "Finally ..."
    await ctx.expect(ctx.getByExactText('Finally ...')).toBeVisible();
  });
});
