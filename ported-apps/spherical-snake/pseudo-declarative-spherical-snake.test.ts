/**
 * Visual test for Pseudo-Declarative Spherical Snake (Cosyne version)
 *
 * Run with: TSYNE_HEADED=1 pnpm test ported-apps/spherical-snake/pseudo-declarative-spherical-snake.test.ts
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { buildPseudoDeclarativeSphericalSnakeApp } from './pseudo-declarative-spherical-snake';
import * as fs from 'fs';
import * as path from 'path';

describe('Pseudo-Declarative Spherical Snake Visual Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  const screenshotsDir = path.join(__dirname, 'screenshots');

  beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should render initial game state', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed, timeout: 10000 });

    await tsyneTest.createApp(buildPseudoDeclarativeSphericalSnakeApp);
    ctx = tsyneTest.getContext();

    // Wait for game to initialize and render a few frames
    await ctx.wait(500);

    // Capture screenshot
    const screenshotPath = path.join(screenshotsDir, 'cosyne-initial.png');
    await tsyneTest.screenshot(screenshotPath);

    expect(fs.existsSync(screenshotPath)).toBe(true);
    console.log(`Screenshot saved to: ${screenshotPath}`);
  });

  test('should render game after several ticks', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed, timeout: 10000 });

    await tsyneTest.createApp(buildPseudoDeclarativeSphericalSnakeApp);
    ctx = tsyneTest.getContext();

    // Wait for game loop to run
    await ctx.wait(2000);

    // Capture screenshot after game has been running
    const screenshotPath = path.join(screenshotsDir, 'cosyne-after-2s.png');
    await tsyneTest.screenshot(screenshotPath);

    expect(fs.existsSync(screenshotPath)).toBe(true);
    console.log(`Screenshot saved to: ${screenshotPath}`);
  });
});
