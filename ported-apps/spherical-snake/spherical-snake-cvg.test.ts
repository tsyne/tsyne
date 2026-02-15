/**
 * Tests for Spherical Snake CVG version
 *
 * Visual test: TSYNE_HEADED=1 TAKE_SCREENSHOTS=1 npx jest spherical-snake-cvg.test.ts
 */

import { TsyneTest, TestContext } from 'tsyne';
import { buildSphericalSnakeCvgApp } from './spherical-snake-cvg';
import * as fs from 'fs';
import * as path from 'path';

const screenshotsDir = path.join(__dirname, 'screenshots');
const takeScreenshots = process.env.TAKE_SCREENSHOTS === '1';

describe('Spherical Snake CVG', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(() => {
    if (takeScreenshots && !fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  test('renders initial game state with title and labels', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed, timeout: 10000 });

    await tsyneTest.createApp((app) => {
      buildSphericalSnakeCvgApp(app);
    });
    ctx = tsyneTest.getContext();
    await ctx.wait(500);

    // Verify title
    const title = await ctx.getById('title');
    const titleText = await title.getText();
    expect(titleText).toContain('Spherical Snake');

    // Verify score label
    const scoreLabel = await ctx.getById('scoreLabel');
    const scoreText = await scoreLabel.getText();
    expect(scoreText).toContain('Score: 0');

    // Verify status label
    const statusLabel = await ctx.getById('statusLabel');
    const statusText = await statusLabel.getText();
    expect(statusText).toContain('Playing');

    if (takeScreenshots) {
      await tsyneTest.screenshot(path.join(screenshotsDir, 'cvg-initial.png'));
    }
  });

  test('game runs for 2 seconds without errors', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed, timeout: 10000 });

    await tsyneTest.createApp((app) => {
      buildSphericalSnakeCvgApp(app);
    });
    ctx = tsyneTest.getContext();

    // Let the game loop run
    await ctx.wait(2000);

    // Game should still be playing (no crash)
    const statusLabel = await ctx.getById('statusLabel');
    const statusText = await statusLabel.getText();
    // Could be 'Playing' or 'Good game!' if self-collision happened
    expect(statusText.length).toBeGreaterThan(0);

    if (takeScreenshots) {
      await tsyneTest.screenshot(path.join(screenshotsDir, 'cvg-after-2s.png'));
    }
  });

  test('new game button resets score', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed, timeout: 10000 });

    await tsyneTest.createApp((app) => {
      buildSphericalSnakeCvgApp(app);
    });
    ctx = tsyneTest.getContext();
    await ctx.wait(300);

    // Click new game button
    const newGameBtn = await ctx.getByText('New Game');
    await newGameBtn.click();
    await ctx.wait(100);

    // Score should be 0
    const scoreLabel = await ctx.getById('scoreLabel');
    const scoreText = await scoreLabel.getText();
    expect(scoreText).toContain('Score: 0');
  });

  test('pause button toggles game state', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed, timeout: 10000 });

    await tsyneTest.createApp((app) => {
      buildSphericalSnakeCvgApp(app);
    });
    ctx = tsyneTest.getContext();
    await ctx.wait(300);

    // Click pause
    const pauseBtn = await ctx.getByText('Pause');
    await pauseBtn.click();
    await ctx.wait(100);

    const statusLabel = await ctx.getById('statusLabel');
    const pausedText = await statusLabel.getText();
    expect(pausedText).toContain('Paused');

    // Click pause again to resume
    await pauseBtn.click();
    await ctx.wait(100);

    const playingText = await statusLabel.getText();
    expect(playingText).toContain('Playing');
  });

  test('grid canvas exists', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed, timeout: 10000 });

    await tsyneTest.createApp((app) => {
      buildSphericalSnakeCvgApp(app);
    });
    ctx = tsyneTest.getContext();
    await ctx.wait(300);

    const gridCanvas = await ctx.getById('gridCanvas');
    expect(gridCanvas).toBeDefined();
  });
});
