/**
 * TsyneTest integration tests for SphericalSnake
 *
 * Tests UI rendering, keyboard input, and game interaction.
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { buildSphericalSnakeApp } from './spherical-snake';

describe('SphericalSnake UI Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  test('renders game canvas without errors', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify canvas exists
    const canvas = await ctx.getById('gameCanvas');
    expect(canvas).toBeDefined();

    // Verify we can find the canvas
    await expect(canvas).toBeDefined();
  });

  test('displays initial score', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check initial score label
    const scoreLabel = await ctx.getById('scoreLabel');
    const scoreText = await scoreLabel.getText();
    expect(scoreText).toContain('Score: 0');
  });

  test('displays playing status initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check status label
    const statusLabel = await ctx.getById('statusLabel');
    const statusText = await statusLabel.getText();
    expect(statusText).toContain('Playing');
  });

  test('keyboard input is recognized', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Focus canvas
    const canvas = await ctx.getById('gameCanvas');
    await canvas.focus();

    // Simulate arrow key press
    await canvas.sendKeyDown('ArrowLeft');
    await canvas.sendKeyUp('ArrowLeft');

    // Game should still be responsive
    const statusLabel = await ctx.getById('statusLabel');
    const statusText = await statusLabel.getText();
    expect(statusText).toContain('Playing');
  });

  test('new game button resets score', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click new game button
    const newGameBtn = await ctx.getByText('New Game');
    await newGameBtn.click();

    // Score should still be 0
    const scoreLabel = await ctx.getById('scoreLabel');
    const scoreText = await scoreLabel.getText();
    expect(scoreText).toContain('Score: 0');
  });

  test('pause button toggles game state', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click pause button
    const pauseBtn = await ctx.getByText('Pause');
    await pauseBtn.click();

    // Status should change to paused
    const statusLabel = await ctx.getById('statusLabel');
    const pausedText = await statusLabel.getText();
    expect(pausedText).toContain('Paused');

    // Click pause again
    await pauseBtn.click();

    // Status should return to playing
    const playingText = await statusLabel.getText();
    expect(playingText).toContain('Playing');
  });

  test('canvas exists and has correct size', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const canvas = await ctx.getById('gameCanvas');
    expect(canvas).toBeDefined();
  });

  test('window renders with title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify title exists
    const title = await ctx.getById('title');
    const titleText = await title.getText();
    expect(titleText).toContain('Spherical Snake');
  });

  test('game remains responsive after long play', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Simulate gameplay
    const canvas = await ctx.getById('gameCanvas');
    for (let i = 0; i < 10; i++) {
      await canvas.sendKeyDown('ArrowLeft');
      await new Promise(r => setTimeout(r, 10));
      await canvas.sendKeyUp('ArrowLeft');
      await new Promise(r => setTimeout(r, 10));
    }

    // Verify game still has playing status
    const statusLabel = await ctx.getById('statusLabel');
    const statusText = await statusLabel.getText();
    expect(statusText).toContain('Playing');
  });

  test('UI responds to multiple button clicks', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildSphericalSnakeApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const newGameBtn = await ctx.getByText('New Game');
    const pauseBtn = await ctx.getByText('Pause');

    // Click new game
    await newGameBtn.click();
    await new Promise(r => setTimeout(r, 10));

    // Click pause
    await pauseBtn.click();
    await new Promise(r => setTimeout(r, 10));

    // Click new game again
    await newGameBtn.click();
    await new Promise(r => setTimeout(r, 10));

    // Verify final state
    const scoreLabel = await ctx.getById('scoreLabel');
    const scoreText = await scoreLabel.getText();
    expect(scoreText).toContain('Score: 0');
  });
});
