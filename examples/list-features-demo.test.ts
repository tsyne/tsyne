import { TsyneTest } from '../src/index-test';
import * as path from 'path';

describe('List Features Demo', () => {
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

  it('should display list features demo', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      require('./list-features-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the demo loaded
    await ctx.expect(ctx.getByExactText('List Features Demo')).toBeVisible();
    await ctx.expect(ctx.getByText('New OnUnselected event and unselectAll() method')).toBeVisible();

    // Verify control buttons
    await ctx.expect(ctx.getByExactText('Unselect All')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Show Selection')).toBeVisible();

    // Verify initial state
    await ctx.expect(ctx.getByExactText('Selected: (none)')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Unselected: (none)')).toBeVisible();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      await ctx.wait(500);
      const screenshotPath = path.join(__dirname, 'screenshots', 'list-features-demo.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved to ${screenshotPath}`);
    }
  });

  it('should show tips for usage', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      require('./list-features-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify tips section
    await ctx.expect(ctx.getByText('💡 Tips:')).toBeVisible();
    await ctx.expect(ctx.getByText('• Click an item to select it (fires OnSelected)')).toBeVisible();
    await ctx.expect(ctx.getByText('• Use "Unselect All" to clear selection programmatically')).toBeVisible();
  });
});
