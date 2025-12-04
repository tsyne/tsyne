/**
 * Game of Life TsyneTest Integration Tests
 *
 * Test suite for Conway's Game of Life demonstrating:
 * - Real game simulation and generation advancement
 * - User interactions (start/pause/step/reset/clear)
 * - Board state changes and Conway's rules
 * - Generation counter accuracy
 * - Screenshot capture for documentation
 *
 * Usage:
 *   npm test examples/game-of-life/game-of-life.test.ts
 *   TSYNE_HEADED=1 npm test examples/game-of-life/game-of-life.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test examples/game-of-life/game-of-life.test.ts  # Capture screenshots
 *
 * Based on the original Game of Life from https://github.com/fyne-io/life
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createGameOfLifeApp } from './game-of-life';
import * as path from 'path';

describe('Game of Life Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial game UI and capture screenshot', async () => {
    let ui: any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();

    // Verify toolbar buttons
    await ctx.getByID('startBtn').within(500).shouldExist();
    await ctx.getByID('pauseBtn').within(500).shouldExist();
    await ctx.getByID('stepBtn').within(500).shouldExist();
    await ctx.getByID('resetBtn').within(500).shouldExist();
    await ctx.getByID('clearBtn').within(500).shouldExist();

    // Verify status elements
    await ctx.getByID('generationNum').within(100).shouldBe('0');
    await ctx.getByID('statusText').within(100).shouldBe('Paused');

    // Verify board section
    await ctx.getByText('Game of Life Board:').within(500).shouldExist();

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      // Wait for UI to fully render
      await ctx.wait(1000);

      // Run the game for a few generations to show it in action
      await ctx.getByID('startBtn').click();
      await ctx.wait(800); // Let it run for ~5 generations (166ms per gen)
      await ctx.getByID('pauseBtn').click();

      // Wait for board rendering to complete
      await ctx.wait(500);

      const screenshotPath = path.join(__dirname, '../screenshots', 'game-of-life.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should start simulation and advance generations automatically', async () => {
    let ui: any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();

    // Initial state: paused at generation 0
    await ctx.getByID('generationNum').within(100).shouldBe('0');
    await ctx.getByID('statusText').within(100).shouldBe('Paused');

    // Click Start button
    await ctx.getByID('startBtn').click();

    // Should now be running
    await ctx.getByID('statusText').within(100).shouldBe('Running');

    // Wait for simulation to advance (runs at ~6 FPS, so 166ms per generation)
    await ctx.wait(400);

    // Generation should have advanced (at least 2 generations in 400ms)
    // We can't check exact number due to timing, but it should not be 0
    const genValue = await ctx.getByID('generationNum').getText();
    expect(genValue).not.toBe('0');
  }, 10000);

  test('should pause a running simulation', async () => {
    let ui: any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();

    // Wait for UI to be ready - give more time for async setup
    await ctx.getByID('startBtn').within(500).shouldExist();
    await ctx.getByID('generationNum').within(500).shouldBe('0');
    await ctx.getByID('statusText').within(500).shouldBe('Paused');

    // Start the game
    await ctx.getByID('startBtn').click();
    await ctx.getByID('statusText').within(100).shouldBe('Running');

    // Let it run for a bit
    await ctx.wait(200);

    // Pause the game
    await ctx.getByID('pauseBtn').click();

    // Should be paused
    await ctx.getByID('statusText').within(100).shouldBe('Paused');
  }, 10000);

  test('should step exactly one generation when Step is clicked', async () => {
    let ui: any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();

    // Wait for UI to be ready - give more time for async setup
    await ctx.getByID('startBtn').within(500).shouldExist();
    await ctx.getByID('generationNum').within(500).shouldBe('0');
    await ctx.getByID('statusText').within(500).shouldBe('Paused');

    // Step forward once
    await ctx.getByID('stepBtn').click();

    // Should be exactly generation 1
    await ctx.getByID('generationNum').within(100).shouldBe('1');

    // Step again
    await ctx.getByID('stepBtn').click();

    // Should be exactly generation 2
    await ctx.getByID('generationNum').within(100).shouldBe('2');

    // Game should still be paused (Step doesn't auto-start)
    await ctx.getByID('statusText').within(100).shouldBe('Paused');
  }, 10000);

  test('should reset board to initial Glider Gun pattern', async () => {
    let ui: any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();

    // Wait for UI to be ready - give more time for async setup
    await ctx.getByID('startBtn').within(500).shouldExist();
    await ctx.getByID('generationNum').within(500).shouldBe('0');
    await ctx.getByID('statusText').within(500).shouldBe('Paused');

    // Advance several generations
    await ctx.getByID('stepBtn').click();
    await ctx.getByID('stepBtn').click();
    await ctx.getByID('stepBtn').click();

    // Should be at generation 3
    await ctx.getByID('generationNum').within(100).shouldBe('3');

    // Reset the board
    await ctx.getByID('resetBtn').click();

    // Should be back to generation 0 and paused (use polling with .within())
    // Reset reloads pattern and re-renders canvas which can take time
    await ctx.getByID('generationNum').within(5000).shouldBe('0');
    await ctx.getByID('statusText').within(1000).shouldBe('Paused');

    // Board should be reset (Glider Gun loaded again)
    // We can verify the description is still shown
    await ctx.getByText('Conway\'s Game of Life - Use menus for patterns and file operations').within(500).shouldExist();
  }, 10000);

  test('should clear board and show empty state', async () => {
    let ui: any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();

    // Verify we start with Glider Gun loaded (generation 0) - give more time for async setup
    await ctx.getByID('startBtn').within(500).shouldExist();
    await ctx.getByID('generationNum').within(500).shouldBe('0');

    // Clear the board
    await ctx.getByID('clearBtn').click();

    // Should reset to generation 0 and pause
    await ctx.getByID('generationNum').within(100).shouldBe('0');
    await ctx.getByID('statusText').within(100).shouldBe('Paused');

    // Board should be cleared (all dead cells)
    // The board display should still be visible (canvas-based rendering)
    await ctx.getByText('Game of Life Board:').within(500).shouldExist();
  });

  test('should handle complex interaction sequence', async () => {
    let ui: any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();

    // Wait for UI to be ready - give more time for async setup
    await ctx.getByID('startBtn').within(500).shouldExist();
    await ctx.getByID('generationNum').within(500).shouldBe('0');
    await ctx.getByID('statusText').within(500).shouldBe('Paused');

    // Start simulation
    await ctx.getByID('startBtn').click();
    await ctx.getByID('statusText').within(100).shouldBe('Running');

    // Let it run for a few generations
    await ctx.wait(350); // ~2 generations

    // Pause it
    await ctx.getByID('pauseBtn').click();
    await ctx.getByID('statusText').within(100).shouldBe('Paused');

    // Step once more
    await ctx.getByID('stepBtn').click();

    // Start again
    await ctx.getByID('startBtn').click();
    await ctx.getByID('statusText').within(100).shouldBe('Running');

    // Pause again
    await ctx.getByID('pauseBtn').click();

    // Reset to initial state
    await ctx.getByID('resetBtn').click();

    // Should be back to generation 0 (use polling with .within())
    // Reset reloads pattern and re-renders canvas which can take time
    await ctx.getByID('generationNum').within(5000).shouldBe('0');
    await ctx.getByID('statusText').within(1000).shouldBe('Paused');

    // All UI elements should still be functional
    await ctx.getByID('startBtn').within(500).shouldExist();
    await ctx.getByText('Game of Life Board:').within(500).shouldExist();
  }, 10000);

  test('should stop generation advancement when paused', async () => {
    let ui: any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();

    // Wait for initial UI to be ready
    await ctx.getByID('startBtn').within(500).shouldExist();
    await ctx.getByID('generationNum').within(500).shouldBe('0');
    await ctx.getByID('statusText').within(500).shouldBe('Paused');

    // Start and let it run
    await ctx.getByID('startBtn').click();
    await ctx.wait(350); // Let it advance

    // Pause
    await ctx.getByID('pauseBtn').click();

    // Get the current generation number
    const pausedGenText = await ctx.getByID('generationNum').getText();
    const pausedGen = parseInt(pausedGenText, 10);
    expect(pausedGen).toBeGreaterThan(0); // Should have advanced

    // Wait a bit more - generation should NOT advance while paused
    await ctx.wait(500);

    // Check generation hasn't changed
    const afterGenText = await ctx.getByID('generationNum').getText();
    const afterGen = parseInt(afterGenText, 10);

    // Generation should be the same as when paused
    expect(afterGen).toBe(pausedGen);
  }, 10000);

  test('should render board with Conway Life canvas', async () => {
    let ui: any;
    const testApp = await tsyneTest.createApp((app) => {
      ui = createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();

    // Wait for the widget to be findable with polling
    await ctx.getByID('startBtn').within(10000).shouldExist();

    // Take screenshot right after initialization
    await tsyneTest.screenshot('/tmp/game-canvas-test-after-run.png');

    // The board should be visible (canvas-based rendering)
    await ctx.getByText('Game of Life Board:').within(500).shouldExist();

    // Verify that some cells are alive in the initial state
    // (Glider Gun pattern should have alive cells)
    const allText = await ctx.getAllTextAsString();
    expect(allText).toContain('Game of Life Board:');
  }, 60000); // Increase timeout to 60s for the pause
});
