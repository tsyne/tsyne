// Test for multiplication-table example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

describe('Multiplication Table Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display multiplication table', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Multiplication table', width: 330, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Multiplication Table (1-10)');

            app.table(
              10, // rows
              10, // columns
              () => {
                return app.label('...');
              },
              (cell: any, row: number, col: number) => {
                const r = row + 1;
                const c = col + 1;
                const product = r * c;
                (async () => {
                  await cell.setText(product.toString());
                })();
              }
            );
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check title is visible
    await ctx.expect(ctx.getByExactText('Multiplication Table (1-10)')).toBeVisible();

    // Check some multiplication results are visible
    // 1x1 = 1, 5x5 = 25, 10x10 = 100
    await ctx.expect(ctx.getByExactText('1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('25')).toBeVisible();
    await ctx.expect(ctx.getByExactText('100')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '10-multiplication-table.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should calculate products correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Multiplication table', width: 330, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.table(
              3, // Test with smaller table
              3,
              () => app.label('...'),
              (cell: any, row: number, col: number) => {
                const r = row + 1;
                const c = col + 1;
                const product = r * c;
                (async () => {
                  await cell.setText(product.toString());
                })();
              }
            );
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check that various products are present
    // 1x1=1, 1x2=2, 1x3=3, 2x1=2, 2x2=4, 2x3=6, 3x1=3, 3x2=6, 3x3=9
    await ctx.expect(ctx.getByExactText('1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('4')).toBeVisible();
    await ctx.expect(ctx.getByExactText('9')).toBeVisible();
  });
});
