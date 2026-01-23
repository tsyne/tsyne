import { TsyneTest } from 'tsyne';
import * as path from 'path';

describe.skip('Entry Cursor Demo', () => {
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

  it('should display entry cursor demo', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      require('./entry-cursor-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the demo loaded
    await ctx.expect(ctx.getByExactText('Entry OnCursorChanged Demo')).toBeVisible();
    await ctx.expect(ctx.getByText('Track cursor position changes in real-time')).toBeVisible();

    // Verify status display
    await ctx.expect(ctx.getByExactText('Cursor Activity:')).toBeVisible();
    await ctx.expect(ctx.getByText('Cursor has not moved yet')).toBeVisible();

    // Verify use cases
    await ctx.expect(ctx.getByText('Use Cases for OnCursorChanged:')).toBeVisible();
    await ctx.expect(ctx.getByText('• Text editor with cursor position indicator')).toBeVisible();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      await ctx.wait(500);
      const screenshotPath = path.join(__dirname, 'screenshots', 'entry-cursor-demo.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved to ${screenshotPath}`);
    }
  });

  it('should show multiple entry examples', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      require('./entry-cursor-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify examples section
    await ctx.expect(ctx.getByExactText('Try These Examples:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Example 1: Navigate with Arrow Keys')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Example 2: Click to Position Cursor')).toBeVisible();
  });
});
