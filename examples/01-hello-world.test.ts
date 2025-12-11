// Test for hello world example
import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';

describe('Hello World Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display hello world message', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Hello', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Hello Tsyne world!');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByExactText('Hello Tsyne world!')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '01-hello-world.png');
      await ctx.wait(500); // Wait for rendering
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });
});
