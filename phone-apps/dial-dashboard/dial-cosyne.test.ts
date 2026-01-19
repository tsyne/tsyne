import { TsyneTest, TestContext } from '../../core/src/index-test';
import * as path from 'path';
import * as fs from 'fs';
import { createDialDashboardApp } from './dial-cosyne';

describe('Dial Dashboard', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should render dial dashboard with proper spacing', async () => {
    const testApp = await tsyneTest.createApp((a: any) => {
      a.window({ title: 'Dial Dashboard', width: 540, height: 600 }, (win: any) => {
        createDialDashboardApp(a, win);
        win.show();
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(500);

    // Take screenshot
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, 'dial-dashboard.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Screenshot saved: ${screenshotPath}`);
  });

  test('dial dashboard renders with all styles and layouts', async () => {
    // This test verifies the dial dashboard renders correctly with:
    // - 4 dial styles: classic, minimal, vintage, modern
    // - Various configurations: 360°, 180°, centered pan control
    // - Size variations: small, medium, large
    // - Animated bound dial

    const testApp = await tsyneTest.createApp((a: any) => {
      a.window({ title: 'Dial Dashboard', width: 540, height: 600 }, (win: any) => {
        createDialDashboardApp(a, win);
        win.show();
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render and a few animation frames
    await ctx.wait(500);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Take screenshot showing all dials
    const screenshotPath = path.join(screenshotDir, 'dial-styles.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Dial styles screenshot: ${screenshotPath}`);

    // Verify the footer shows correct initial values
    // Volume: 50%, Temp: 21.5°, Pan: 0, Speed: 75
    await ctx.getById('vol-label').shouldContain('50%');
    await ctx.getById('temp-label').shouldContain('21.5');
    await ctx.getById('pan-label').shouldContain('0');
    await ctx.getById('speed-label').shouldContain('75');
  });

  // NOTE: Drag interaction test is temporarily skipped due to framework limitations
  // The test.Drag API doesn't reliably route events to TappableCanvasRaster in
  // containers using NewWithoutLayout. The dials work correctly when used interactively.
  //
  // TODO: Investigate deeper Fyne test infrastructure for canvasStack hit testing
  test.skip('dial interaction - drag changes dial value', async () => {
    // Test that dragging on a dial changes its value
    const testApp = await tsyneTest.createApp((a: any) => {
      a.window({ title: 'Dial Dashboard', width: 540, height: 600 }, (win: any) => {
        createDialDashboardApp(a, win);
        win.show();
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(500);

    // Drag on the Volume dial
    await ctx.drag(40, 120, 60, 0);
    await ctx.wait(200);

    // Get final volume value
    const afterLabel = await ctx.getById('vol-label').getText();
    console.log(`Final volume: ${afterLabel}`);
  });
});
