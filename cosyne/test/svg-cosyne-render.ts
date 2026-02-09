/**
 * Standalone script to render an SVG through the Cosyne/Tsyne pipeline.
 *
 * Usage: npx tsx cosyne/test/svg-cosyne-render.ts <svg-path> <output-png>
 */

import { CosyneTest } from '../src/cosyne-test';
import { loadSvg } from '../src/svg/loader';
import type { App } from 'tsyne';
import * as fs from 'fs';

const [svgPath, outputPath] = process.argv.slice(2);
if (!svgPath || !outputPath) {
  console.error('Usage: npx tsx cosyne/test/svg-cosyne-render.ts <svg-path> <output-png>');
  process.exit(1);
}

const svgContent = fs.readFileSync(svgPath, 'utf-8');

(async () => {
  const test = new CosyneTest({ headed: true });
  const app = await test.createApp((a: App) => {
    a.window({ title: 'SVG', width: 400, height: 400 }, (win: any) => {
      win.setContent(() => {
        a.canvasStack(() => {
          loadSvg(a, svgContent, { width: 400, height: 400 });
        });
      });
      win.show();
    });
  });
  const ctx = test.getContext();
  await app.run();
  await ctx.wait(500);
  await ctx.captureScreenshot(outputPath);
  await test.cleanup();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
