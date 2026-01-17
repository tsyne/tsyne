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

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify window was created with correct title
    const window = await ctx.getWindowByTitle('Scales & Axes Demo').within(1000).shouldExist();
    expect(window).toBeDefined();
  });

  it('should have scale type buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildScalesDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify scale type buttons exist
    await ctx.getById('btn-linear').within(500).shouldExist();
    await ctx.getById('btn-log').within(500).shouldExist();
    await ctx.getById('btn-sqrt').within(500).shouldExist();
    await ctx.getById('btn-power').within(500).shouldExist();
    await ctx.getById('btn-ordinal').within(500).shouldExist();
  });

  it('should render canvas for scale visualization', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildScalesDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Canvas should be available for rendering scales
    const canvas = await ctx.getByClass('cosyne-canvas').within(500).shouldExist();
    expect(canvas).toBeDefined();
  });
});
