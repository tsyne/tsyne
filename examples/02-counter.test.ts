// Test for counter example
import { TsyneTest, TestContext } from '../src/index-test';

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
              app.button('Decrement', async () => {
                count--;
                await countLabel.setText(`Count: ${count}`);
              });

              app.button('Reset', async () => {
                count = 0;
                await countLabel.setText(`Count: ${count}`);
              });

              app.button('Increment', async () => {
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

    // Click increment
    await ctx.getByExactText('Increment').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Count: 1')).toBeVisible();

    // Click increment again
    await ctx.getByExactText('Increment').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Count: 2')).toBeVisible();

    // Click decrement
    await ctx.getByExactText('Decrement').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Count: 1')).toBeVisible();

    // Click reset
    await ctx.getByExactText('Reset').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByExactText('Count: 0')).toBeVisible();
  });
});
