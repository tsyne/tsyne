/**
 * FPS Advanced - TsyneTest Integration Tests
 *
 * End-to-end tests for the FPS app UI using TsyneTest framework.
 */

import { TsyneTest } from '../../src/index-test';
import buildFPSAdvancedApp from './index';

describe('FPS Advanced TsyneTest', () => {
  let tsyneTest: TsyneTest;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should render the FPS app with all UI elements', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFPSAdvancedApp(app);
    });
    const ctx = tsyneTest.getContext();

    await testApp.run();

    // Check title
    await ctx.getById('title').shouldExist();

    // Check stats labels
    await ctx.getById('pos-label').shouldExist();
    await ctx.getById('vel-label').shouldExist();
    await ctx.getById('grounded-label').shouldExist();
    await ctx.getById('map-label').shouldExist();

    // Check control labels
    await ctx.getById('ctrl-ws').shouldExist();
    await ctx.getById('ctrl-ad').shouldExist();
    await ctx.getById('ctrl-space').shouldExist();

    // Check buttons
    await ctx.getById('btn-reset').shouldExist();
    await ctx.getById('btn-look-left').shouldExist();
    await ctx.getById('btn-look-right').shouldExist();
    await ctx.getById('btn-look-up').shouldExist();
    await ctx.getById('btn-look-down').shouldExist();

    // Check viewport
    await ctx.getById('viewport').shouldExist();

    await testApp.close();
  }, 30000);

  it('should display initial position', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFPSAdvancedApp(app);
    });
    const ctx = tsyneTest.getContext();

    await testApp.run();

    // Initial spawn position from DEFAULT_MAP
    await ctx.getById('pos-label').within(1000).shouldContain('Position:');

    await testApp.close();
  }, 30000);

  it('should display map name', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFPSAdvancedApp(app);
    });
    const ctx = tsyneTest.getContext();

    await testApp.run();

    await ctx.getById('map-label').within(500).shouldBe('Map: Test Map');

    await testApp.close();
  }, 30000);

  it('should have reset button that works', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFPSAdvancedApp(app);
    });
    const ctx = tsyneTest.getContext();

    await testApp.run();

    // Click reset button
    await ctx.getById('btn-reset').click();

    // Position should show spawn coordinates
    await ctx.getById('pos-label').within(1000).shouldContain('Position:');

    await testApp.close();
  }, 30000);

  it('should have look control buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFPSAdvancedApp(app);
    });
    const ctx = tsyneTest.getContext();

    await testApp.run();

    // Click look buttons - they should be clickable
    await ctx.getById('btn-look-left').click();
    await ctx.getById('btn-look-right').click();
    await ctx.getById('btn-look-up').click();
    await ctx.getById('btn-look-down').click();

    // If we got here without error, buttons work
    await ctx.getById('title').shouldExist();

    await testApp.close();
  }, 30000);

  it('should display instructions', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildFPSAdvancedApp(app);
    });
    const ctx = tsyneTest.getContext();

    await testApp.run();

    await ctx.getById('instructions').shouldExist();

    await testApp.close();
  }, 30000);
});
