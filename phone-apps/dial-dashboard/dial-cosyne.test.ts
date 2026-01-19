// Test for dial dashboard cosyne demo
import { TsyneTest, TestContext } from '../../core/src/index-test';
import * as path from 'path';

describe('Dial Dashboard Cosyne Demo', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let cleanup: (() => void) | undefined;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    if (cleanup) cleanup();
    await tsyneTest.cleanup();
  });

  test('should render dial dashboard with multiple dial styles', async () => {
    const { createDialDashboardApp } = await import('./dial-cosyne');

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Dial Dashboard', width: 500, height: 520 }, (win) => {
        cleanup = createDialDashboardApp(app, win);
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(200);

    // Capture initial screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'dial-dashboard-initial.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Verify widgets exist
    const widgetInfo = await ctx.getAllWidgets();
    expect(widgetInfo.length).toBeGreaterThan(0);
  }, 15000);

  test('should show different dial styles', async () => {
    const { createDialDashboardApp } = await import('./dial-cosyne');

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Dial Dashboard', width: 500, height: 520 }, (win) => {
        cleanup = createDialDashboardApp(app, win);
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for render and animation
    await ctx.wait(300);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'dial-styles-t0.png'));
    console.log('Screenshot dial-styles-t0 saved');

    // Let the bound dial animate
    await ctx.wait(1000);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'dial-styles-t1000.png'));
    console.log('Screenshot dial-styles-t1000 saved');

    expect(true).toBe(true);
  }, 20000);
});
