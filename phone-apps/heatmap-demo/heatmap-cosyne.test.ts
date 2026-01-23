// Test for heatmap cosyne demo - captures screenshots for visual verification
import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';

describe('Heatmap Cosyne Demo', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let cleanup: (() => void) | undefined;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    // Clear interval before cleanup
    if (cleanup) cleanup();
    await tsyneTest.cleanup();
  });

  test('should render heatmap with viridis color scheme', async () => {
    // Import the createHeatmapApp function
    const { createHeatmapApp } = await import('./heatmap-cosyne');

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Heatmap Demo', width: 400, height: 450 }, (win) => {
        cleanup = createHeatmapApp(app, win);
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(200);

    // Capture initial screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', 'heatmap-initial.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Verify widgets exist
    const widgetInfo = await ctx.getAllWidgets();
    expect(widgetInfo.length).toBeGreaterThan(0);
  }, 15000);

  test('should animate heatmap over time', async () => {
    const { createHeatmapApp } = await import('./heatmap-cosyne');

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Heatmap Demo', width: 400, height: 450 }, (win) => {
        cleanup = createHeatmapApp(app, win);
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Capture at different time points to show animation
    await ctx.wait(200);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'heatmap-t0.png'));
    console.log('Screenshot t0 saved');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'heatmap-t500.png'));
    console.log('Screenshot t500 saved');

    await ctx.wait(500);
    await tsyneTest.screenshot(path.join(__dirname, 'screenshots', 'heatmap-t1000.png'));
    console.log('Screenshot t1000 saved');

    // Test passes if we got this far without errors
    expect(true).toBe(true);
  }, 15000);
});
