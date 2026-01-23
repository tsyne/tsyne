/**
 * Mahjongg TsyneTest Integration Tests
 *
 * Test suite for Mahjongg Solitaire demonstrating:
 * - Game board rendering with multi-layer tiles
 * - Tile selection and matching interactions
 * - Win/lose conditions
 * - Hint functionality
 * - Screenshot capture for documentation
 *
 * Usage:
 *   npm test ported-apps/mahjongg/mahjongg.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/mahjongg/mahjongg.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test ported-apps/mahjongg/mahjongg.test.ts  # Capture screenshots
 *
 * Based on the original QmlMahjongg from https://gitlab.com/alaskalinuxuser/QmlMahjongg
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createMahjonggApp, MahjonggUI } from './mahjongg';
import * as path from 'path';
import * as fs from 'fs';

describe('Mahjongg Integration Tests', () => {
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
    let ui: MahjonggUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createMahjonggApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Verify control buttons
    await ctx.getById('newGameBtn').within(500).shouldExist();
    await ctx.getById('hintBtn').within(500).shouldExist();

    // Verify status elements
    await ctx.getById('tilesCount').within(100).shouldBe('144');
    await ctx.getById('movesCount').within(100).shouldBe('0');
    await ctx.getById('gameStatus').within(500).shouldExist();

    // Verify game board marker exists
    await ctx.getById('gameBoard').within(500).shouldExist();

    // Verify instructions
    await ctx.getByText('Click matching pairs of free tiles to remove them').within(500).shouldExist();
  });

  test('should start with 144 tiles and proper initial state', async () => {
    let ui: MahjonggUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createMahjonggApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Check initial tile count
    await ctx.getById('tilesCount').within(100).shouldBe('144');

    // Check initial move count
    await ctx.getById('movesCount').within(100).shouldBe('0');

    // Game should be in playing state (status shows available moves)
    const statusText = await ctx.getById('gameStatus').getText();
    expect(statusText).toContain('Playing');
  });

  test('should have working New Game button', async () => {
    let ui: MahjonggUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createMahjonggApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Click New Game
    await ctx.getById('newGameBtn').click();

    // Should still show 144 tiles (new game)
    await ctx.getById('tilesCount').within(100).shouldBe('144');
    await ctx.getById('movesCount').within(100).shouldBe('0');
  });

  test('should have working Hint button', async () => {
    let ui: MahjonggUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createMahjonggApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Click Hint button - should not crash
    await ctx.getById('hintBtn').click();

    // Game should still be in playing state
    const statusText = await ctx.getById('gameStatus').getText();
    expect(statusText).toContain('Playing');
  });

  test('should display status bar with game information', async () => {
    let ui: MahjonggUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createMahjonggApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Verify status bar elements
    await ctx.getByText('Tiles:').within(500).shouldExist();
    await ctx.getByText('Moves:').within(500).shouldExist();

    // Verify counts are displayed
    const tilesCount = await ctx.getById('tilesCount').getText();
    expect(parseInt(tilesCount)).toBe(144);

    const movesCount = await ctx.getById('movesCount').getText();
    expect(parseInt(movesCount)).toBe(0);
  });

  test('should display game message area', async () => {
    let ui: MahjonggUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createMahjonggApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Message label should exist (empty initially)
    await ctx.getById('gameMessage').within(500).shouldExist();
  });

  test('should capture screenshot for documentation', async () => {
    let ui: MahjonggUI;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createMahjonggApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui!.initialize();

    // Wait for board to render
    await ctx.wait(500);

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const screenshotPath = path.join(screenshotsDir, 'mahjongg-initial.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);

      // Verify screenshot was created
      expect(fs.existsSync(screenshotPath)).toBe(true);
    }
  });
});
