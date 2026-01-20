/**
 * TsyneTest integration tests for Yet Another Doom Clone
 *
 * Tests the Tsyne UI layer and basic interaction
 */

import { TsyneTest } from 'tsyne/dist/index-test';
import { buildYetAnotherDoomCloneApp } from './index';

describe('Yet Another Doom Clone - TsyneTest', () => {
  let tsyneTest: TsyneTest;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should launch and show game title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildYetAnotherDoomCloneApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for the title to appear
    await ctx.getById('title').within(1000).shouldExist();
  }, 30000);

  it('should display score label', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildYetAnotherDoomCloneApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Score label should show initial score
    await ctx.getById('scoreLabel').within(1000).shouldExist();
  }, 30000);

  it('should display health label', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildYetAnotherDoomCloneApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('healthLabel').within(1000).shouldExist();
  }, 30000);

  it('should display status label', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildYetAnotherDoomCloneApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(1000).shouldExist();
  }, 30000);

  it('should have game canvas', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildYetAnotherDoomCloneApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('gameCanvas').within(1000).shouldExist();
  }, 30000);

  it('should have new game button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildYetAnotherDoomCloneApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('newGameBtn').within(1000).shouldExist();
  }, 30000);

  it('should have pause button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildYetAnotherDoomCloneApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('pauseBtn').within(1000).shouldExist();
  }, 30000);

  it('should reset game when new game button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildYetAnotherDoomCloneApp(app);
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Click new game button
    await ctx.getById('newGameBtn').within(1000).click();

    // Score should reset to 0
    await ctx.getById('scoreLabel').within(1000).shouldBe('Score: 0');
  }, 30000);
});
