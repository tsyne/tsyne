/**
 * Capture screenshot while simulating key press
 */

import { TsyneTest } from '../../core/src/index-test';
import { buildPseudoDeclarativeSphericalSnakeApp } from './pseudo-declarative-spherical-snake';
import * as path from 'path';

async function main() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const tsyneTest = new TsyneTest({ headed: true, timeout: 15000 });

  try {
    console.log('Creating app...');
    await tsyneTest.createApp(buildPseudoDeclarativeSphericalSnakeApp);
    const ctx = tsyneTest.getContext();

    // Wait for game to initialize
    await ctx.wait(1000);

    // Capture before rotation
    await tsyneTest.screenshot(path.join(screenshotsDir, 'before-rotation.png'));
    console.log('Captured before-rotation.png');

    // Wait 3 seconds (game auto-rotates)
    await ctx.wait(3000);

    // Capture after time passes
    await tsyneTest.screenshot(path.join(screenshotsDir, 'after-3s.png'));
    console.log('Captured after-3s.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await tsyneTest.cleanup();
  }
}

main();
