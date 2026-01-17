/**
 * TsyneTest integration tests for Particles Advanced Demo
 */

import { TsyneTest } from '../../core/src/index-test';
import { buildParticlesAdvancedApp } from './particles-advanced-demo';

describe('Particles Advanced Demo - TsyneTest', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should create and display particles advanced demo window', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildParticlesAdvancedApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify window was created with correct title
    const window = await ctx.getWindowByTitle('Particle System Advanced Demo').within(1000).shouldExist();
    expect(window).toBeDefined();
  });

  it('should have emitter type buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildParticlesAdvancedApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify emitter type buttons exist
    await ctx.getById('btn-fountain').within(500).shouldExist();
    await ctx.getById('btn-fireworks').within(500).shouldExist();
    await ctx.getById('btn-smoke').within(500).shouldExist();
    await ctx.getById('btn-explosion').within(500).shouldExist();
  });

  it('should have start/stop toggle button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildParticlesAdvancedApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Toggle button should exist
    await ctx.getById('toggleBtn').within(500).shouldExist();
  });

  it('should have clear and create center buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildParticlesAdvancedApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Action buttons should exist
    await ctx.getById('clearBtn').within(500).shouldExist();
    await ctx.getById('createCenterBtn').within(500).shouldExist();
  });

  it('should display particle count', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildParticlesAdvancedApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Particle count label should exist
    await ctx.getById('particleCountLabel').within(500).shouldExist();
  });

  it('should render canvas for particle visualization', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildParticlesAdvancedApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Canvas should be available for rendering particles
    const canvas = await ctx.getByClass('cosyne-canvas').within(500).shouldExist();
    expect(canvas).toBeDefined();
  });
});
