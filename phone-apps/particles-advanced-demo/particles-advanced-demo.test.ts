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

  it('should display fountain particles and stop', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildParticlesAdvancedApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    const screenshotDir = __dirname + '/screenshots';

    // Start fountain particles
    await ctx.getById('createCenterBtn').within(1000).shouldExist();
    await ctx.getById('createCenterBtn').click();

    // Screenshot immediately after start
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/02-fountain-0.5s.png`);

    // Screenshot 1 second later
    await new Promise(r => setTimeout(r, 1000));
    await tsyneTest.screenshot(`${screenshotDir}/02-fountain-1.5s.png`);

    // Try to click stop
    await ctx.getById('stopBtn').within(1000).shouldExist();
    await ctx.getById('stopBtn').click();

    // Screenshot after stop
    await new Promise(r => setTimeout(r, 500));
    await tsyneTest.screenshot(`${screenshotDir}/03-stopped.png`);

  }, 15000);

  it('should display smoke particles', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildParticlesAdvancedApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    const screenshotDir = __dirname + '/screenshots';

    // Switch to smoke
    await ctx.getById('btn-smoke').within(1000).shouldExist();
    await ctx.getById('btn-smoke').click();
    await new Promise(r => setTimeout(r, 100));

    // Start smoke particles
    await ctx.getById('createCenterBtn').click();
    await new Promise(r => setTimeout(r, 1000));
    await tsyneTest.screenshot(`${screenshotDir}/04-smoke.png`);

    // Stop - now using dedicated stopBtn
    await ctx.getById('stopBtn').within(1000).shouldExist();
    await ctx.getById('stopBtn').click();
    await new Promise(r => setTimeout(r, 200));

  }, 15000);
});
