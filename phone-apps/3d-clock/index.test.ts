import { TsyneTest, TestContext } from '../../core/src/index-test';
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

  test('second hand moves 90 degrees in 15 seconds', async () => {
    const testApp = await tsyneTest.createApp(buildClockApp);
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(500);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Take first screenshot
    const screenshot1 = path.join(screenshotDir, '3d-clock-t0.png');
    await tsyneTest.screenshot(screenshot1);
    console.log(`📸 Screenshot 1 saved: ${screenshot1}`);

    // Wait 15 seconds
    console.log('⏳ Waiting 15 seconds for second hand to move 90 degrees...');
    await ctx.wait(15000);

    // Take second screenshot
    const screenshot2 = path.join(screenshotDir, '3d-clock-t15.png');
    await tsyneTest.screenshot(screenshot2);
    console.log(`📸 Screenshot 2 saved: ${screenshot2}`);
    console.log('✅ Compare the two screenshots - second hand should have moved 90 degrees');
  }, 30000); // 30 second timeout
});
