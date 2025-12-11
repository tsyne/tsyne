// Test for counter example
import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';

describe('Counter Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should start at 0 and increment', async () => {
    let count = 0;
    let countLabel: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Counter', width: 300, height: 150 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            countLabel = app.label(`Count: ${count}`);

            app.hbox(() => {
              app.button('Decrement').onClick(async () => {
                count--;
                await countLabel.setText(`Count: ${count}`);
              });

              app.button('Reset').onClick(async () => {
                count = 0;
                await countLabel.setText(`Count: ${count}`);
              });

              app.button('Increment').onClick(async () => {
                count++;
                await countLabel.setText(`Count: ${count}`);
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial count should be 0
    await ctx.expect(ctx.getByExactText('Count: 0')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '02-counter.png');
      await ctx.getByExactText('Count: 0').within(500).shouldExist();
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }

    // Click increment
    await ctx.getByExactText('Increment').click();
    await ctx.getByExactText('Count: 1').within(100).shouldExist();

    // Click increment again
    await ctx.getByExactText('Increment').click();
    await ctx.getByExactText('Count: 2').within(100).shouldExist();

    // Click decrement
    await ctx.getByExactText('Decrement').click();
    await ctx.getByExactText('Count: 1').within(100).shouldExist();

    // Click reset
    await ctx.getByExactText('Reset').click();
    await ctx.getByExactText('Count: 0').within(100).shouldExist();
  });
});
