import { TsyneTest, TestContext } from '../../core/src/index-test';
import * as path from 'path';
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

    // Verify app title or some element
    // The app creates a window with title "3D Clock"
    // TsyneTest doesn't easily check window titles directly unless exposed via bridge, 
    // but we can check if it runs and renders.
    
    // Wait for a bit to let the animation loop run
    await ctx.wait(500);

    // Take screenshot if enabled
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '3d-clock.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });
});
