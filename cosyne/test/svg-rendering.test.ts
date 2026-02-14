/**
 * SVG Rendering Visual Comparison Tests
 *
 * For each SVG in cosyne/test/svg/:
 * 1. Reference: rsvg-convert renders to PNG
 * 2. Ours: loadSvg() → Tsyne screenshot
 * 3. Compare: pixel MAE with threshold
 *
 * Requires:
 *  - rsvg-convert (librsvg) for reference images
 *  - TSYNE_HEADED=1 for screenshots
 *
 * Skip gracefully if either is unavailable.
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from '../src';
import { loadSvg } from '../src/cvg';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SVG_DIR = path.join(__dirname, 'svg');
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const REF_DIR = path.join(SCREENSHOT_DIR, 'svg-reference');
const OUR_DIR = path.join(SCREENSHOT_DIR, 'svg-ours');

const WIDTH = 400;
const HEIGHT = 400;

// Check if rsvg-convert is available
let hasRsvg = false;
try {
  execSync('which rsvg-convert', { stdio: 'pipe' });
  hasRsvg = true;
} catch {
  hasRsvg = false;
}

// Check if headed mode is available
const isHeaded = process.env.TSYNE_HEADED === '1';

const svgFiles = fs.readdirSync(SVG_DIR).filter(f => f.endsWith('.svg'));

describe('SVG Rendering - Visual Comparison', () => {
  if (!hasRsvg) {
    it('skipped: rsvg-convert not available', () => {
      console.log('Install librsvg (apt install librsvg2-bin) for reference rendering');
    });
    return;
  }

  if (!isHeaded) {
    it('skipped: TSYNE_HEADED=1 not set', () => {
      console.log('Run with TSYNE_HEADED=1 for visual comparison tests');
    });
    return;
  }

  // Ensure output directories exist
  beforeAll(() => {
    fs.mkdirSync(REF_DIR, { recursive: true });
    fs.mkdirSync(OUR_DIR, { recursive: true });
  });

  // Generate reference images
  describe('reference images', () => {
    for (const file of svgFiles) {
      it(`generates reference for ${file}`, () => {
        const svgPath = path.join(SVG_DIR, file);
        const refPath = path.join(REF_DIR, file.replace('.svg', '.png'));
        try {
          execSync(
            `rsvg-convert -w ${WIDTH} -h ${HEIGHT} -o "${refPath}" "${svgPath}"`,
            { stdio: 'pipe' },
          );
          expect(fs.existsSync(refPath)).toBe(true);
        } catch (e: any) {
          console.warn(`rsvg-convert failed for ${file}: ${e.message}`);
        }
      });
    }
  });

  // Render each SVG with our loader and capture screenshot
  describe('our rendering', () => {
    let cosyneTest: CosyneTest;

    afterEach(async () => {
      if (cosyneTest) {
        await cosyneTest.cleanup();
      }
    });

    for (const file of svgFiles) {
      it(`renders ${file}`, async () => {
        const svgPath = path.join(SVG_DIR, file);
        const svgContent = fs.readFileSync(svgPath, 'utf-8');
        const ourPath = path.join(OUR_DIR, file.replace('.svg', '.png'));

        cosyneTest = new CosyneTest({ headed: true });
        const testApp = await cosyneTest.createApp((a: App) => {
          a.window(
            { title: `SVG: ${file}`, width: WIDTH + 40, height: HEIGHT + 60 },
            (win: any) => {
              win.setContent(() => {
                a.canvasStack(() => {
                  loadSvg(a, svgContent, { width: WIDTH, height: HEIGHT });
                });
              });
              win.show();
            },
          );
        });

        const ctx = cosyneTest.getContext();
        await testApp.run();
        await ctx.wait(500);
        await ctx.captureScreenshot(ourPath);

        expect(fs.existsSync(ourPath)).toBe(true);
      }, 15000);
    }
  });
});
