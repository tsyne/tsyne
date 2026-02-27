/**
 * Capture screenshot of Charon Jr.
 * Run with: TSYNE_HEADED=1 npx tsx ported-apps/roblouie_charonir/capture-screenshot.ts
 */

import { TsyneTest } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import Module from 'module';

// Hook Module._resolveFilename to resolve @/ aliases to src/ directory
// (TSX_TSCONFIG_PATH can't be set at runtime — tsx reads it at startup)
const srcDir = path.resolve(__dirname, 'src');
const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function(request: string, parent: any, isMain: boolean, options: any) {
  if (request.startsWith('@/')) {
    request = path.join(srcDir, request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Hard timeout to prevent system hangs — kill the process after 60s
const HARD_TIMEOUT = 60_000;
const hardTimer = setTimeout(() => {
  console.error('[Charon Jr.] HARD TIMEOUT — forcing exit to prevent system hang');
  process.exit(1);
}, HARD_TIMEOUT);
hardTimer.unref(); // Don't keep process alive just for this timer

async function main() {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const tsyneTest = new TsyneTest({ headed: true, timeout: 45000 });

  try {
    console.log('Creating Charon Jr. app...');

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: 'Charon Jr.', width: 960, height: 540 },
        (win) => {
          win.setContent(() => {
            app.label('Loading Charon Jr...');
          });
          win.show();

          setTimeout(async () => {
            try {
              const { buildCharonJr } = require('./src/main');
              await buildCharonJr(app, win);
            } catch (e) {
              console.error('[Charon Jr.] Failed to start:', e);
            }
          }, 100);
        }
      );
    });

    const ctx = tsyneTest.getContext();

    // Wait for texture generation + GPU init + first render frames
    // With buffer leak fix and adaptive pacing, init should be faster
    console.log('Waiting for game to initialize (~15s)...');
    await ctx.wait(15000);

    // Capture after game has been rendering
    const initialPath = path.join(screenshotsDir, 'charonir-t0.png');
    await tsyneTest.screenshot(initialPath);
    const stat = fs.statSync(initialPath);
    console.log(`Screenshot saved: ${initialPath} (${stat.size} bytes)`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    console.log('Cleaning up...');
    await tsyneTest.cleanup();
    // Force exit after cleanup — game loop may still be running
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
