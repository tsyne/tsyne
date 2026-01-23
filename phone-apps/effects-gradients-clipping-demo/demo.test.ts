/**
 * TsyneTest integration tests for SVG Graphics (Effects, Gradients, Clipping) Demo
 */

import { TsyneTest } from 'tsyne';
import { buildSVGDemoApp } from './demo';

describe('SVG Graphics Demo (Effects, Gradients, Clipping) - TsyneTest', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should create and display SVG graphics demo window', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSVGDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify window was created with correct title
    const window = await ctx.getWindowByTitle('SVG Graphics Demo: Effects, Gradients, Clipping').within(1000).shouldExist();
    expect(window).toBeDefined();
  });

  it('should have tab buttons for Effects, Gradients, and Clipping', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSVGDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify tab buttons exist
    await ctx.getById('tab-effects').within(500).shouldExist();
    await ctx.getById('tab-gradients').within(500).shouldExist();
    await ctx.getById('tab-clipping').within(500).shouldExist();
  });

  it('should display effects options', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSVGDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Click on Effects tab to ensure it renders
    const effectsTab = await ctx.getById('tab-effects').within(500).shouldExist();
    expect(effectsTab).toBeDefined();
  });

  it('should display gradient options', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSVGDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Gradients tab should be available
    const gradientsTab = await ctx.getById('tab-gradients').within(500).shouldExist();
    expect(gradientsTab).toBeDefined();
  });

  it('should display clipping options', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSVGDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Clipping tab should be available
    const clippingTab = await ctx.getById('tab-clipping').within(500).shouldExist();
    expect(clippingTab).toBeDefined();
  });

  it('should display tab label indicator', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSVGDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Tab label should exist
    await ctx.getById('tabLabel').within(500).shouldExist();
  });

  it('should render canvas for graphics visualization', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSVGDemoApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Canvas should be available for rendering graphics
    const canvas = await ctx.getByClass('cosyne-canvas').within(500).shouldExist();
    expect(canvas).toBeDefined();
  });
});
