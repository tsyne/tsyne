/**
 * TsyneTest integration tests for Scales Demo
 */

import { TsyneTest } from '../../core/src/index-test';
import { buildScalesDemoApp } from './scales-demo';

describe('Scales Demo - TsyneTest', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should create and display scales demo window', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildScalesDemoApp(app);
    });

    await testApp.run();

    // Verify app was created
    expect(testApp).toBeDefined();
  });

  it('should have scale type buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildScalesDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify scale type buttons exist (using correct IDs from scales-demo.ts)
    await ctx.getById('scale-linear').within(500).shouldExist();
    await ctx.getById('scale-log').within(500).shouldExist();
    await ctx.getById('scale-sqrt').within(500).shouldExist();
    await ctx.getById('scale-power').within(500).shouldExist();
    await ctx.getById('scale-ordinal').within(500).shouldExist();
  });

  it('should switch scale types on button click', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildScalesDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    const screenshotDir = __dirname + '/screenshots';

    // Take initial screenshot (linear scale - default)
    await tsyneTest.screenshot(`${screenshotDir}/01-linear.png`);

    // Click Log button and screenshot
    await ctx.getById('scale-log').within(1000).shouldExist();
    await ctx.getById('scale-log').click();
    await new Promise(r => setTimeout(r, 300));
    await tsyneTest.screenshot(`${screenshotDir}/02-log.png`);

    // Click Sqrt button and screenshot
    await ctx.getById('scale-sqrt').click();
    await new Promise(r => setTimeout(r, 300));
    await tsyneTest.screenshot(`${screenshotDir}/03-sqrt.png`);

    // Click Power button and screenshot
    await ctx.getById('scale-power').click();
    await new Promise(r => setTimeout(r, 300));
    await tsyneTest.screenshot(`${screenshotDir}/04-power.png`);

    // Click Ordinal button and screenshot
    await ctx.getById('scale-ordinal').click();
    await new Promise(r => setTimeout(r, 300));
    await tsyneTest.screenshot(`${screenshotDir}/05-ordinal.png`);

  }, 30000);
});
