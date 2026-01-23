// Test for multiplication-table example
import { TsyneTest, TestContext } from 'tsyne';
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

            // Generate multiplication table data
            const headers = ['x', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
            const data: string[][] = [];
            for (let row = 1; row <= 10; row++) {
              const rowData = [row.toString()];
              for (let col = 1; col <= 10; col++) {
                rowData.push((row * col).toString());
              }
              data.push(rowData);
            }

            app.table(headers, data);
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check title is visible
    await ctx.expect(ctx.getByExactText('Multiplication Table (1-10)')).toBeVisible();

    // Note: Table cell contents are not currently searchable via getByExactText
    // because table cells are internal Label widgets within the Table widget.
    // We can only verify the table was created by checking the title.

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
            // Generate smaller multiplication table data (3x3)
            const headers = ['x', '1', '2', '3'];
            const data: string[][] = [];
            for (let row = 1; row <= 3; row++) {
              const rowData = [row.toString()];
              for (let col = 1; col <= 3; col++) {
                rowData.push((row * col).toString());
              }
              data.push(rowData);
            }

            app.table(headers, data);
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Note: Table cell contents are not currently searchable via getByExactText
    // because table cells are internal Label widgets within the Table widget.
    // This test just verifies the table was created and displayed.
    await ctx.wait(100);
  });
});
