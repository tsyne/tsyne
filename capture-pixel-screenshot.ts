#!/usr/bin/env npx tsx
/**
 * Minimal script to capture a screenshot using Tsyne's bridge
 * Works on Pixel 3a XL with postmarketOS
 *
 * Usage: npx tsx capture-pixel-screenshot.ts [output.png]
 */

import { app, resolveTransport } from 'tsyne';

const outputPath = process.argv[2] || '/tmp/tsyne-capture.png';

app(resolveTransport(), { title: 'Screenshot Capture' }, async (a) => {
  a.window({ title: 'Capture', width: 1, height: 1 }, async (win) => {
    // Minimal window just to have a context
    win.setContent(() => {
      a.label('Capturing...');
    });
    win.show();

    // Give it a moment to initialize
    await new Promise(r => setTimeout(r, 500));

    // Take the screenshot
    try {
      await win.screenshot(outputPath);
      console.log(`Screenshot saved: ${outputPath}`);
    } catch (err) {
      console.error(`Screenshot failed: ${err}`);
    }

    process.exit(0);
  });
});
