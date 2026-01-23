import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildRobotArmApp } from './index';

describe('3D Robot Arm App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should render 3D robot arm', async () => {
    const testApp = await tsyneTest.createApp(buildRobotArmApp);
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(500);

    // Verify control sliders exist
    await ctx.getById('sliderBase').within(1000).shouldExist();
    await ctx.getById('sliderShoulder').within(1000).shouldExist();
    await ctx.getById('sliderElbow').within(1000).shouldExist();
    await ctx.getById('sliderClaw').within(1000).shouldExist();
    await ctx.getById('resetBtn').within(1000).shouldExist();

    // Take screenshot if enabled
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      const screenshotPath = path.join(screenshotDir, '3d-robot-arm.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should respond to reset button', async () => {
    const testApp = await tsyneTest.createApp(buildRobotArmApp);
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(500);

    // Click reset button
    const resetBtn = await ctx.getById('resetBtn').within(1000);
    await resetBtn.click();

    // App should still be responsive after reset
    await ctx.getById('sliderBase').within(500).shouldExist();
  });

  test('should have all joint control sliders', async () => {
    const testApp = await tsyneTest.createApp(buildRobotArmApp);
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(300);

    // All 4 DOF sliders should be present
    const sliderIds = ['sliderBase', 'sliderShoulder', 'sliderElbow', 'sliderClaw'];
    for (const id of sliderIds) {
      await ctx.getById(id).within(1000).shouldExist();
    }
  });
});
