/**
 * Screenshot helper for demo scripts
 *
 * Usage in demo scripts:
 *   import { screenshotIfRequested } from '../src';
 *
 *   window({ title: "My App" }, (win) => {
 *     // ... build UI ...
 *     screenshotIfRequested(win);
 *   });
 *
 * Then run: npx tsx examples/my-demo.ts --screenshot
 */

import * as path from 'path';

/**
 * Takes a screenshot if --screenshot arg is present, then exits
 * @param win - The Window instance to screenshot
 * @param delay - Delay in ms before taking screenshot (default: 500)
 */
export function screenshotIfRequested(win: any, delay: number = 500): void {
  if (!process.argv.includes('--screenshot')) return;

  setTimeout(async () => {
    // Get the script name from the call stack or process.argv
    const scriptPath = process.argv[1];
    const name = path.basename(scriptPath, '.ts');
    const screenshotDir = path.join(path.dirname(scriptPath), 'screenshots');
    const outputPath = path.join(screenshotDir, `${name}.png`);

    try {
      await win.screenshot(outputPath);
      console.log(`📸 Screenshot saved: screenshots/${name}.png`);
    } catch (err) {
      console.error(`Failed to save screenshot: ${err}`);
    }

    // Close the window properly before exiting
    try {
      await win.close();
    } catch (err) {
      // Ignore close errors
    }

    // Give the bridge time to process the close
    setTimeout(() => process.exit(0), 100);
  }, delay);
}
