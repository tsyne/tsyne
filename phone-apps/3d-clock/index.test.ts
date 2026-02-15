import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildClockApp } from './index';

describe('3D Clock App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should render 3D clock', async () => {
    const testApp = await tsyneTest.createApp(buildClockApp);
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(500);

    // Take screenshot if enabled
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      const screenshotPath = path.join(screenshotDir, '3d-clock.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  // Visual-only test: captures two screenshots to verify animation.
  // Skipped in CI — only runs with TAKE_SCREENSHOTS=1.
  (process.env.TAKE_SCREENSHOTS === '1' ? test : test.skip)(
    'second hand visibly moves between screenshots',
    async () => {
      const testApp = await tsyneTest.createApp(buildClockApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.wait(500);

      const screenshotDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const screenshot1 = path.join(screenshotDir, '3d-clock-t0.png');
      await tsyneTest.screenshot(screenshot1);

      // Wait 2 seconds — second hand moves ~12 degrees, visibly different
      await ctx.wait(2000);

      const screenshot2 = path.join(screenshotDir, '3d-clock-t2.png');
      await tsyneTest.screenshot(screenshot2);
    },
    15000
  );
});
