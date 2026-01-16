/**
 * Capture screenshot of Cosyne Spherical Snake
 * Run with: pnpm tsx ported-apps/spherical-snake/capture-cosyne-screenshot.ts
 */

import { TsyneTest } from '../../core/src/index-test';
import { buildPseudoDeclarativeSphericalSnakeApp } from './pseudo-declarative-spherical-snake';
import * as path from 'path';

async function main() {
  const screenshotsDir = path.join(__dirname, 'screenshots');

  // Use headed mode for real screenshots
  const tsyneTest = new TsyneTest({ headed: true, timeout: 15000 });

  try {
    console.log('Creating app...');
    await tsyneTest.createApp(buildPseudoDeclarativeSphericalSnakeApp);
    const ctx = tsyneTest.getContext();

    // Wait for game to initialize
    console.log('Waiting for game to initialize...');
    await ctx.wait(1000);

    // Capture initial screenshot
    const initialPath = path.join(screenshotsDir, 'cosyne-initial.png');
    await tsyneTest.screenshot(initialPath);
    console.log(`Screenshot saved to: ${initialPath}`);

    // Wait for a couple seconds of gameplay
    console.log('Running game for 2 seconds...');
    await ctx.wait(2000);

    // Capture after gameplay
    const afterPath = path.join(screenshotsDir, 'cosyne-after-2s.png');
    await tsyneTest.screenshot(afterPath);
    console.log(`Screenshot saved to: ${afterPath}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await tsyneTest.cleanup();
  }
}

main();
