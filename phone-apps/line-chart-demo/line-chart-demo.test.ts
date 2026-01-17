/**
 * TsyneTest integration tests for Line Chart Demo
 */

import { TsyneTest } from '../../core/src/index-test';
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

  it('should create and display line chart demo window', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildLineChartDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify window was created with correct title
    const window = await ctx.getWindowByTitle('Line Chart Advanced Demo').within(1000).shouldExist();
    expect(window).toBeDefined();
  });

  it('should have interpolation method buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildLineChartDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify interpolation method buttons exist
    await ctx.getById('btn-linear').within(500).shouldExist();
    await ctx.getById('btn-step').within(500).shouldExist();
    await ctx.getById('btn-catmull').within(500).shouldExist();
    await ctx.getById('btn-monotone').within(500).shouldExist();
  });

  it('should have series toggle button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildLineChartDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify series toggle button exists
    await ctx.getById('btn-multi').within(500).shouldExist();
  });

  it('should have zoom reset button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildLineChartDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify zoom reset button exists
    await ctx.getById('btn-reset').within(500).shouldExist();
  });

  it('should render canvas for chart visualization', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildLineChartDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Canvas should be available for rendering charts
    const canvas = await ctx.getByClass('cosyne-canvas').within(500).shouldExist();
    expect(canvas).toBeDefined();
  });
});
