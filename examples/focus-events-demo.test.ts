import { TsyneTest } from '../core/src/index-test';
import * as path from 'path';

describe.skip('Focus Events Demo', () => {
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

  it('should display focus events demo', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      require('./focus-events-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the demo loaded
    await ctx.expect(ctx.getByExactText('Focus Events Demo')).toBeVisible();
    await ctx.expect(ctx.getByText('Tab through widgets to see focus events')).toBeVisible();

    // Verify widgets are present
    await ctx.expect(ctx.getByExactText('Enable notifications')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Checkbox Focus Events:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Slider Focus Events:')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Select Focus Events:')).toBeVisible();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      await ctx.wait(500);
      const screenshotPath = path.join(__dirname, 'screenshots', 'focus-events-demo.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved to ${screenshotPath}`);
    }
  });

  it('should show all widget types with focus handlers', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      require('./focus-events-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify status area
    await ctx.expect(ctx.getByExactText('Recent Focus Events (newest first):')).toBeVisible();
    await ctx.expect(ctx.getByText('No focus events yet')).toBeVisible();

    // Verify additional widgets for tab testing
    await ctx.expect(ctx.getByExactText('Button 1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Button 2')).toBeVisible();
  });
});
