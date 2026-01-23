/**
 * TsyneTest integration tests for Markers Demo
 */

import { TsyneTest } from 'tsyne';
import { buildMarkersDemoApp } from './markers-demo';

describe('Markers Demo - TsyneTest', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should display markers on custom tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildMarkersDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    const screenshotDir = __dirname + '/screenshots';

    // Take initial screenshot (flowchart - default)
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/01-flowchart.png`);

    // Click Graph button to see connector() in action
    await ctx.getById('diagram-graph').within(1000).shouldExist();
    await ctx.getById('diagram-graph').click();
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/02-graph.png`);

    // Click Custom button to see all marker types
    await ctx.getById('diagram-custom').within(1000).shouldExist();
    await ctx.getById('diagram-custom').click();
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/03-custom-markers.png`);

  }, 30000);
});
