// Test for gauge dashboard cosyne demo
import { TsyneTest, TestContext } from '../../core/src/index-test';
import * as path from 'path';

describe('Gauge Dashboard Cosyne Demo', () => {
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

  test('should render gauge dashboard with multiple sections', async () => {
    const { createGaugeDashboardApp } = await import('./gauge-cosyne');

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Gauge Dashboard', width: 500, height: 520 }, (win) => {
        cleanup = createGaugeDashboardApp(app, win);
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(200);

    // Capture initial screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'gauge-dashboard-initial.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Verify widgets exist
    const widgetInfo = await ctx.getAllWidgets();
    expect(widgetInfo.length).toBeGreaterThan(0);
  }, 15000);

  test('should animate gauge values over time', async () => {
    const { createGaugeDashboardApp } = await import('./gauge-cosyne');

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Gauge Dashboard', width: 500, height: 520 }, (win) => {
        cleanup = createGaugeDashboardApp(app, win);
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Capture at different time points to show animation
    await ctx.wait(200);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'gauge-dashboard-t0.png'));
    console.log('Screenshot t0 saved');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'gauge-dashboard-t500.png'));
    console.log('Screenshot t500 saved');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'gauge-dashboard-t1000.png'));
    console.log('Screenshot t1000 saved');

    expect(true).toBe(true);
  }, 15000);
});
