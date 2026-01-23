/**
 * TsyneTest integration tests for Line Chart Demo
 */

import { TsyneTest } from 'tsyne';
import { buildLineChartDemoApp } from './line-chart-demo';

describe('Line Chart Demo - TsyneTest', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should change interpolation when buttons are clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildLineChartDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    const screenshotDir = __dirname + '/screenshots';

    // Take initial screenshot (linear interpolation - default)
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/01-linear.png`);

    // Click Step button
    await ctx.getById('interp-step').within(1000).shouldExist();
    await ctx.getById('interp-step').click();
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/02-step.png`);

    // Click Catmull-rom button
    await ctx.getById('interp-catmull-rom').within(1000).shouldExist();
    await ctx.getById('interp-catmull-rom').click();
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/03-catmull-rom.png`);

    // Click Monotone button
    await ctx.getById('interp-monotone').within(1000).shouldExist();
    await ctx.getById('interp-monotone').click();
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/04-monotone.png`);

    // Toggle multiple series checkbox
    await ctx.getById('multipleCheckbox').within(1000).shouldExist();
    await ctx.getById('multipleCheckbox').click();
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/05-multiple-series.png`);

  }, 30000);
});
