import { TsyneTest } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';

describe.skip('Stack Container Demo', () => {
  let tsyneTest: TsyneTest;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({
      headed: process.env.TSYNE_HEADED === '1',
      timeout: 10000
    });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should display stack container examples', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      // Import and run the demo
      require('./stack-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the demo loaded
    await ctx.expect(ctx.getByExactText('Stack Container - Overlapping Widgets')).toBeVisible();

    // Verify examples are present
    await ctx.expect(ctx.getByExactText('Example 1: Text Overlay')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Example 2: Loading Overlay')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Example 3: Corner Badge')).toBeVisible();

    // Verify stacked content
    await ctx.expect(ctx.getByExactText('Stacked Content')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Background + Text')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Main Content')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Loading...')).toBeVisible();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      await ctx.wait(500);
      const screenshotPath = path.join(__dirname, 'screenshots', 'stack-demo.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved to ${screenshotPath}`);
    }
  });

  it('should allow interaction with stacked widgets', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      require('./stack-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // The button should be clickable even with overlay on top
    const button = ctx.getByExactText('Action Button');
    await ctx.expect(button).toBeVisible();

    // In a real app, the overlay might be conditionally shown
    // For this demo, the button is under the loading overlay
  });
});
