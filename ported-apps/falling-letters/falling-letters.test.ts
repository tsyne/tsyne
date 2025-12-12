/**
 * Falling Letters TsyneTest Integration Tests
 *
 * Tests the Falling Letters game UI using the Tsyne testing framework.
 *
 * Usage:
 *   npm test ported-apps/falling-letters/falling-letters.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/falling-letters/falling-letters.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test ported-apps/falling-letters/falling-letters.test.ts  # Capture screenshots
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createFallingLettersApp, FallingLettersUI } from './falling-letters';
import * as path from 'path';
import * as fs from 'fs';

describe('Falling Letters Integration Tests', () => {
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
    let ui: FallingLettersUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingLettersApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Verify control buttons
    await ctx.getByID('newGameBtn').within(500).shouldExist();
    await ctx.getByID('pauseBtn').within(500).shouldExist();

    // Verify score and word labels
    await ctx.getByID('scoreLabel').within(500).shouldExist();
    await ctx.getByID('wordLabel').within(500).shouldExist();
    await ctx.getByID('statusLabel').within(500).shouldExist();
  });

  test('should display word input controls', async () => {
    let ui: FallingLettersUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingLettersApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Check submit and clear buttons
    await ctx.getByID('submitBtn').within(500).shouldExist();
    await ctx.getByID('clearBtn').within(500).shouldExist();
  });

  test('should have working New Game button', async () => {
    let ui: FallingLettersUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingLettersApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Click New Game
    await ctx.getByID('newGameBtn').click();

    // Wait for game to start
    await ctx.wait(500);

    // Score should be 0
    await ctx.getByID('scoreLabel').within(100).shouldBe('0');
  });

  test('should have working Pause button', async () => {
    let ui: FallingLettersUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingLettersApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Start game first
    await ctx.getByID('newGameBtn').click();
    await ctx.wait(200);

    // Click Pause - should not crash
    await ctx.getByID('pauseBtn').click();

    // Status should show paused
    const status = await ctx.getByID('statusLabel').getText();
    expect(status).toContain('PAUSED');
  });

  test('should capture screenshot for documentation', async () => {
    let ui: FallingLettersUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createFallingLettersApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Start game and wait for letters to fall
    await ctx.getByID('newGameBtn').click();
    await ctx.wait(3000);

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const screenshotPath = path.join(screenshotsDir, 'falling-letters-gameplay.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);

      expect(fs.existsSync(screenshotPath)).toBe(true);
    }
  });
});
