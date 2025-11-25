import { TsyneTest } from '../src/index-test';
import * as path from 'path';

describe('RadioGroup Horizontal Demo', () => {
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

  it('should display radiogroup horizontal demo', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      require('./radiogroup-horizontal-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the demo loaded
    await ctx.expect(ctx.getByExactText('RadioGroup Horizontal Layout Demo')).toBeVisible();
    await ctx.expect(ctx.getByText('Compare vertical vs horizontal radio button layouts')).toBeVisible();

    // Verify examples
    await ctx.expect(ctx.getByExactText('Example 1: Default Vertical Layout')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Example 2: Horizontal Layout (horizontal: true)')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Example 3: Horizontal Yes/No Toggle')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Example 4: View Mode Selector')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Example 5: Star Rating (1-5)')).toBeVisible();

    // Verify status display
    await ctx.expect(ctx.getByExactText('Current Selections:')).toBeVisible();
    await ctx.expect(ctx.getByText('Size: Medium | View: List | Rating: 3 stars')).toBeVisible();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      await ctx.wait(500);
      const screenshotPath = path.join(__dirname, 'screenshots', 'radiogroup-horizontal-demo.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved to ${screenshotPath}`);
    }
  });

  it('should show benefits of horizontal layout', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      require('./radiogroup-horizontal-demo');
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify benefits section
    await ctx.expect(ctx.getByText('💡 Benefits of Horizontal Layout:')).toBeVisible();
    await ctx.expect(ctx.getByText('• Saves vertical screen space')).toBeVisible();
    await ctx.expect(ctx.getByText('• Better for short option lists (2-5 items)')).toBeVisible();
  });
});
