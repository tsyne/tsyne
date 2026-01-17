/**
 * TsyneTest integration tests for Markers Demo
 */

import { TsyneTest } from '../../core/src/index-test';
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

  it('should create and display markers demo window', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildMarkersDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify window was created with correct title
    const window = await ctx.getWindowByTitle('Markers Demo').within(1000).shouldExist();
    expect(window).toBeDefined();
  });

  it('should have diagram type buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildMarkersDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify diagram type buttons exist
    await ctx.getById('tab-flowchart').within(500).shouldExist();
    await ctx.getById('tab-graph').within(500).shouldExist();
    await ctx.getById('tab-state').within(500).shouldExist();
    await ctx.getById('tab-network').within(500).shouldExist();
    await ctx.getById('tab-custom').within(500).shouldExist();
  });

  it('should have label toggle checkbox', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildMarkersDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Label toggle should exist
    await ctx.getById('cbx-labels').within(500).shouldExist();
  });

  it('should render canvas for diagram visualization', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildMarkersDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Canvas should be available for rendering diagrams
    const canvas = await ctx.getByClass('cosyne-canvas').within(500).shouldExist();
    expect(canvas).toBeDefined();
  });
});
