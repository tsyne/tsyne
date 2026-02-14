/**
 * Tests that SVG viewport clipping works (overflow: hidden per SVG spec).
 *
 * Elements extending beyond the viewBox should be clipped at viewport bounds.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, cvg, CvgContext } from '../src';
import { loadSvg } from '../src/cvg';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

describe('SVG viewport clipping', () => {
  let cosyneTest: CosyneTest;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('clips elements that overflow the viewBox', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    // A 200x200 viewBox with a large red rect that extends well beyond it
    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Clip Test', width: 250, height: 250, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          // White background so we can detect clipping vs overflow
          a.canvasStack(() => {
            a.canvasRectangle({ width: 250, height: 250, fillColor: 'white' });
            cvg(a, { viewBox: '0 0 200 200', width: 200, height: 200 }, (s) => {
              // This rect overflows: starts at x=150 and is 200 wide → extends to x=350
              s.rect({ x: '150', y: '50', width: '200', height: '100', fill: 'red' });
              // A rect fully inside for reference
              s.rect({ x: '10', y: '10', width: '80', height: '80', fill: 'blue' });
            });
          });
        });
        win.show();
      });
    });

    const ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await ctx.captureScreenshot(path.join(SCREENSHOT_DIR, 'svg-viewport-clip.png'));
  }, 15000);

  it('clips circles1.svg (circles translated outside viewport)', async () => {
    cosyneTest = new CosyneTest({ headed: true });

    const svgPath = path.join(__dirname, 'svg', 'circles1.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf-8');

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Clip circles1', width: 440, height: 440, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            loadSvg(a, svgContent, { width: 400, height: 400 });
          });
        });
        win.show();
      });
    });

    const ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await ctx.captureScreenshot(path.join(SCREENSHOT_DIR, 'svg-viewport-clip-circles1.png'));
  }, 15000);
});
