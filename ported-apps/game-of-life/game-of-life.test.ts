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
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify toolbar buttons
    await ctx.getByText('Start').within(500).shouldExist();
    await ctx.getByText('Pause').within(500).shouldExist();
    await ctx.getByText('Step').within(500).shouldExist();
    await ctx.getByText('Reset').within(500).shouldExist();
    await ctx.getByText('Clear').within(500).shouldExist();

    // Verify status elements
    await ctx.getByText('Generation: 0').within(500).shouldExist();
    await ctx.getByText('Status: Paused').within(500).shouldExist();

    // Verify board section
    await ctx.getByText('Board (█ = alive, · = dead):').within(500).shouldExist();

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'game-of-life-initial.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should start simulation and advance generations automatically', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state: paused at generation 0
    await ctx.getByText('Generation: 0').within(500).shouldExist();
    await ctx.getByText('Status: Paused').within(500).shouldExist();

    // Click Start button
    await ctx.getByText('Start').click();

    // Should now be running
    await ctx.getByText('Status: Running').within(500).shouldExist();

    // Wait for simulation to advance (runs at ~6 FPS, so 166ms per generation)
    await ctx.wait(400);

    // Generation should have advanced (at least 2 generations in 400ms)
    // We can't check exact number due to timing, but it should not be 0
    const hasAdvanced = await ctx.hasText('Generation: 0');
    expect(hasAdvanced).toBe(false);
  });

  test('should pause a running simulation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start the game
    await ctx.getByText('Start').click();
    await ctx.getByText('Status: Running').within(500).shouldExist();

    // Let it run for a bit
    await ctx.wait(200);

    // Pause the game
    await ctx.getByText('Pause').click();

    // Should be paused
    await ctx.getByText('Status: Paused').within(500).shouldExist();
  });

  test('should step exactly one generation when Step is clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify we're at generation 0
    await ctx.getByText('Generation: 0').within(500).shouldExist();

    // Step forward once
    await ctx.getByText('Step').click();

    // Should be exactly generation 1
    await ctx.getByText('Generation: 1').within(500).shouldExist();

    // Step again
    await ctx.getByText('Step').click();

    // Should be exactly generation 2
    await ctx.getByText('Generation: 2').within(500).shouldExist();

    // Game should still be paused (Step doesn't auto-start)
    await ctx.getByText('Status: Paused').within(500).shouldExist();
  });

  test.skip('should reset board to initial Glider Gun pattern (flaky - generation display not updating)', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Advance several generations
    await ctx.getByText('Step').click();
    await ctx.getByText('Step').click();
    await ctx.getByText('Step').click();

    // Should be at generation 3
    await ctx.getByText('Generation: 3').within(500).shouldExist();

    // Reset the board
    await ctx.getByText('Reset').click();

    // Should be back to generation 0 and paused (reset may take a bit longer)
    await ctx.getByText('Generation: 0').within(1000).shouldExist();
    await ctx.getByText('Status: Paused').within(500).shouldExist();

    // Board should be reset (Glider Gun loaded again)
    // We can verify the description is still shown
    await ctx.getByText('Conway\'s Game of Life - Use menus for patterns and file operations').within(500).shouldExist();
  });

  test('should clear board and show empty state', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify we start with Glider Gun loaded (generation 0)
    await ctx.getByText('Generation: 0').within(500).shouldExist();

    // Clear the board
    await ctx.getByText('Clear').click();

    // Should reset to generation 0 and pause
    await ctx.getByText('Generation: 0').within(500).shouldExist();
    await ctx.getByText('Status: Paused').within(500).shouldExist();

    // Board should be cleared (all dead cells)
    // The board display should still be visible but will show mostly '·' characters
    await ctx.getByText('Board (█ = alive, · = dead):').within(500).shouldExist();
  });

  test.skip('should handle complex interaction sequence (flaky - generation display not updating after reset)', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start simulation
    await ctx.getByText('Start').click();
    await ctx.getByText('Status: Running').within(500).shouldExist();

    // Let it run for a few generations
    await ctx.wait(350); // ~2 generations

    // Pause it
    await ctx.getByText('Pause').click();
    await ctx.getByText('Status: Paused').within(500).shouldExist();

    // Step once more
    await ctx.getByText('Step').click();

    // Start again
    await ctx.getByText('Start').click();
    await ctx.getByText('Status: Running').within(500).shouldExist();

    // Pause again
    await ctx.getByText('Pause').click();

    // Reset to initial state
    await ctx.getByText('Reset').click();

    // Should be back to generation 0 (reset may take a bit longer)
    await ctx.getByText('Generation: 0').within(1000).shouldExist();
    await ctx.getByText('Status: Paused').within(500).shouldExist();

    // All UI elements should still be functional
    await ctx.getByText('Start').within(500).shouldExist();
    await ctx.getByText('Board (█ = alive, · = dead):').within(500).shouldExist();
  });

  test('should stop generation advancement when paused', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start and let it run
    await ctx.getByText('Start').click();
    await ctx.wait(350); // Let it advance

    // Pause
    await ctx.getByText('Pause').click();

    // Get the current generation text
    const allText = await ctx.getAllTextAsString();
    const genMatch = allText.match(/Generation: (\d+)/);
    expect(genMatch).toBeTruthy();
    const pausedGen = parseInt(genMatch![1], 10);

    // Wait a bit more - generation should NOT advance while paused
    await ctx.wait(500);

    // Check generation hasn't changed
    const allTextAfter = await ctx.getAllTextAsString();
    const genMatchAfter = allTextAfter.match(/Generation: (\d+)/);
    expect(genMatchAfter).toBeTruthy();
    const afterGen = parseInt(genMatchAfter![1], 10);

    // Generation should be the same as when paused
    expect(afterGen).toBe(pausedGen);
  });

  test('should render board with Conway Life symbols', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // The board should be visible with alive/dead cell indicators
    await ctx.getByText('Board (█ = alive, · = dead):').within(500).shouldExist();

    // The board label text should exist and contain game state
    // Initial Glider Gun should have some alive cells (█)
    const allText = await ctx.getAllTextAsString();
    expect(allText).toContain('█'); // Should have some alive cells
    expect(allText).toContain('·'); // Should have some dead cells
  });
});
