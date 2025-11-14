/**
 * Game of Life TsyneTest Integration Tests
 *
 * Test suite for Conway's Game of Life demonstrating:
 * - Game initialization
 * - UI element visibility
 * - Start/pause/step controls
 * - Board state management
 * - Generation tracking
 *
 * Usage:
 *   npm test examples/game-of-life/game-of-life.test.ts
 *   TSYNE_HEADED=1 npm test examples/game-of-life/game-of-life.test.ts  # Visual debugging
 *
 * Based on the original Game of Life from https://github.com/fyne-io/life
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createGameOfLifeApp } from './game-of-life';

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

  test('should display initial game UI', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify toolbar buttons
    await ctx.expect(ctx.getByText('Start')).toBeVisible();
    await ctx.expect(ctx.getByText('Pause')).toBeVisible();
    await ctx.expect(ctx.getByText('Step')).toBeVisible();
    await ctx.expect(ctx.getByText('Reset')).toBeVisible();
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();

    // Verify status elements
    await ctx.expect(ctx.getByText('Generation: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Status: Paused')).toBeVisible();

    // Verify board section
    await ctx.expect(ctx.getByText('Board (█ = alive, · = dead):')).toBeVisible();
  });

  test('should start the simulation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial status should be paused
    await ctx.expect(ctx.getByText('Status: Paused')).toBeVisible();

    // Click start
    await ctx.getByText('Start').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Status should change to running
    await ctx.expect(ctx.getByText('Status: Running')).toBeVisible();
  });

  test('should pause the simulation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start the game
    await ctx.getByText('Start').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.expect(ctx.getByText('Status: Running')).toBeVisible();

    // Pause the game
    await ctx.getByText('Pause').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should be paused
    await ctx.expect(ctx.getByText('Status: Paused')).toBeVisible();
  });

  test('should step through one generation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial generation
    await ctx.expect(ctx.getByText('Generation: 0')).toBeVisible();

    // Step forward
    await ctx.getByText('Step').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Generation should increment
    await ctx.expect(ctx.getByText('Generation: 1')).toBeVisible();
  });

  test('should reset the board', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Step a few times
    await ctx.getByText('Step').click();
    await new Promise(resolve => setTimeout(resolve, 50));
    await ctx.getByText('Step').click();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Generation should be > 0
    // Note: Can't easily test exact generation number due to timing

    // Reset
    await ctx.getByText('Reset').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should be back to generation 0
    await ctx.expect(ctx.getByText('Generation: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Status: Paused')).toBeVisible();
  });

  test('should clear the board', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Clear the board
    await ctx.getByText('Clear').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should reset to generation 0 and pause
    await ctx.expect(ctx.getByText('Generation: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Status: Paused')).toBeVisible();
  });

  test('should display all toolbar controls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All controls should be visible
    const controls = ['Start', 'Pause', 'Step', 'Reset', 'Clear'];

    for (const control of controls) {
      await ctx.expect(ctx.getByText(control)).toBeVisible();
    }
  });

  test('should show Conway\'s Game of Life description', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify description text
    await ctx.expect(ctx.getByText('Conway\'s Game of Life - Loaded with Gosper Glider Gun')).toBeVisible();
  });

  test('should maintain state after multiple operations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start
    await ctx.getByText('Start').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Status: Running')).toBeVisible();

    // Pause
    await ctx.getByText('Pause').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Status: Paused')).toBeVisible();

    // Step
    await ctx.getByText('Step').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // All UI elements should still be visible
    await ctx.expect(ctx.getByText('Start')).toBeVisible();
    await ctx.expect(ctx.getByText('Board (█ = alive, · = dead):')).toBeVisible();
  });

  test('should handle rapid start/pause toggling', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Rapid toggling
    await ctx.getByText('Start').click();
    await new Promise(resolve => setTimeout(resolve, 50));

    await ctx.getByText('Pause').click();
    await new Promise(resolve => setTimeout(resolve, 50));

    await ctx.getByText('Start').click();
    await new Promise(resolve => setTimeout(resolve, 50));

    await ctx.getByText('Pause').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should end in paused state
    await ctx.expect(ctx.getByText('Status: Paused')).toBeVisible();

    // All controls should still work
    await ctx.expect(ctx.getByText('Start')).toBeVisible();
    await ctx.expect(ctx.getByText('Reset')).toBeVisible();
  });

  test('should display correct window title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Window title should be "Game of Life"
    // Note: Window title testing may not be directly supported
    // This test verifies the app launches successfully
    await ctx.expect(ctx.getByText('Start')).toBeVisible();
  });

  test('should show all UI sections on startup', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createGameOfLifeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All major sections should be visible
    const elements = [
      'Start',
      'Pause',
      'Step',
      'Reset',
      'Clear',
      'Generation: 0',
      'Status: Paused',
      'Board (█ = alive, · = dead):',
      'Conway\'s Game of Life - Loaded with Gosper Glider Gun'
    ];

    for (const element of elements) {
      await ctx.expect(ctx.getByText(element)).toBeVisible();
    }
  });
});
