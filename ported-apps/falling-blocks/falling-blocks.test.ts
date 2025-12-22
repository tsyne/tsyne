/**
 * Falling Blocks TsyneTest Integration Tests
 *
 * Tests the Falling Blocks game UI using the Tsyne testing framework.
 *
 * Usage:
 *   npm test ported-apps/falling-blocks/falling-blocks.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/falling-blocks/falling-blocks.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test ported-apps/falling-blocks/falling-blocks.test.ts  # Capture screenshots
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createFallingBlocksApp, FallingBlocksUI } from './falling-blocks';
import * as path from 'path';
import * as fs from 'fs';

describe('Falling Blocks Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial game UI with all elements', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Verify control buttons
    await ctx.getById('newGameBtn').within(500).shouldExist();
    await ctx.getById('pauseBtn').within(500).shouldExist();

    // Verify status elements
    await ctx.getById('scoreLabel').within(500).shouldExist();
    await ctx.getById('linesLabel').within(500).shouldExist();
    await ctx.getById('levelLabel').within(500).shouldExist();
    await ctx.getById('statusLabel').within(500).shouldExist();
  });

  test('should display control buttons', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Check game control buttons
    await ctx.getById('leftBtn').within(500).shouldExist();
    await ctx.getById('rotateBtn').within(500).shouldExist();
    await ctx.getById('rightBtn').within(500).shouldExist();
    await ctx.getById('dropBtn').within(500).shouldExist();
  });

  test('should have working New Game button', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Click New Game
    await ctx.getById('newGameBtn').click();

    // Wait for game to start
    await ctx.wait(500);

    // Score should exist
    const score = await ctx.getById('scoreLabel').getText();
    expect(score).toBeDefined();
  });

  test('should have working Pause button', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Start game first
    await ctx.getById('newGameBtn').click();
    await ctx.wait(200);

    // Click Pause - should not crash
    await ctx.getById('pauseBtn').click();

    // Status should show paused
    const status = await ctx.getById('statusLabel').getText();
    expect(status).toContain('PAUSED');
  });

  test('should update score display', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Initial score should be 0
    await ctx.getById('scoreLabel').within(100).shouldBe('0');
    await ctx.getById('linesLabel').within(100).shouldBe('0');
    await ctx.getById('levelLabel').within(100).shouldBe('1');
  });

  test('should capture screenshot for documentation', async () => {
    let ui: FallingBlocksUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingBlocksApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Start game and wait for piece
    await ctx.getById('newGameBtn').click();
    await ctx.wait(1000);

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const screenshotPath = path.join(screenshotsDir, 'falling-blocks-gameplay.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);

      expect(fs.existsSync(screenshotPath)).toBe(true);
    }
  });
});
