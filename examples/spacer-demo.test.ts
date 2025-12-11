// Test for spacer-demo example
import { TsyneTest, TestContext } from '../core/src/index-test';
import * as path from 'path';

describe('Spacer Demo Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create spacer widgets for flexible layout', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Spacer Layout Demo', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Spacer Demo - Flexible Layout Spacing');
            app.separator();

            // Horizontal layout with spacers
            app.label('Horizontal spacers (buttons pushed to edges):');
            app.hbox(() => {
              app.button('Left').onClick(() => {});
              app.spacer();
              app.button('Right').onClick(() => {});
            });

            app.separator();

            // Multiple spacers for even distribution
            app.label('Multiple spacers (evenly distributed):');
            app.hbox(() => {
              app.spacer();
              app.button('A').onClick(() => {});
              app.spacer();
              app.button('B').onClick(() => {});
              app.spacer();
              app.button('C').onClick(() => {});
              app.spacer();
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify spacer widgets were created
    const widgetInfo = await ctx.getAllWidgets();
    const spacers = widgetInfo.filter((w: any) => w.type === 'spacer');
    expect(spacers.length).toBeGreaterThanOrEqual(5); // At least 5 spacers

    // Verify labels and buttons are visible
    await ctx.expect(ctx.getByExactText('Spacer Demo - Flexible Layout Spacing')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Left')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Right')).toBeVisible();
    await ctx.expect(ctx.getByExactText('A')).toBeVisible();
    await ctx.expect(ctx.getByExactText('B')).toBeVisible();
    await ctx.expect(ctx.getByExactText('C')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'spacer-demo.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should verify spacer widget metadata', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Spacer Test', width: 200, height: 100 }, (win) => {
        win.setContent(() => {
          app.hbox(() => {
            app.button('A').onClick(() => {});
            app.spacer();
            app.button('B').onClick(() => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify spacer is correctly identified
    const widgetInfo = await ctx.getAllWidgets();
    const spacers = widgetInfo.filter((w: any) => w.type === 'spacer');
    expect(spacers.length).toBe(1);
  });
});
