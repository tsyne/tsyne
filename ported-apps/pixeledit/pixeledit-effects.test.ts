/**
 * Pixel Editor Effects Integration Tests
 *
 * Tests image effects by:
 * 1. Creating an isometric grid pattern programmatically
 * 2. Loading it into pixeledit
 * 3. Applying effects (grayscale, etc.)
 * 4. Verifying pixels actually changed
 *
 * Usage:
 *   npm test ported-apps/pixeledit/pixeledit-effects.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/pixeledit/pixeledit-effects.test.ts
 */

import { TsyneTest, TestContext } from 'tsyne';
import { PixelEditor } from './pixeledit';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import { Jimp } from 'jimp';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const TEMP_DIR = os.tmpdir();

/**
 * Create an isometric grid image using Jimp
 * Returns the image buffer and original pixel data for comparison
 */
async function createIsometricGrid(): Promise<{ pngBuffer: Buffer; originalPixels: Uint8ClampedArray; width: number; height: number }> {
  const width = 300;
  const height = 200;
  const tileWidth = 40;
  const tileHeight = 20; // 2:1 ratio
  const rows = 15;
  const cols = 15;

  // Create image with dark background
  const image = new Jimp({ width, height, color: 0x1a1a1aff });

  // Draw isometric diamond grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Isometric projection math
      const x = Math.floor((c - r) * (tileWidth / 2) + (width / 2));
      const y = Math.floor((c + r) * (tileHeight / 2) + 20);

      // Alternate colors: cyan (#00ffcc) and blue (#3366ff)
      const isEven = (r + c) % 2 === 0;
      const color = isEven ? 0x00ffccff : 0x3366ffff;

      // Draw filled diamond
      drawDiamond(image, x, y, tileWidth, tileHeight, color);
    }
  }

  // Get raw pixel data before PNG encoding
  const originalPixels = new Uint8ClampedArray(image.bitmap.data);

  // Export as PNG buffer
  const pngBuffer = await image.getBuffer('image/png');

  return { pngBuffer, originalPixels, width, height };
}

/**
 * Draw a filled diamond shape
 */
function drawDiamond(image: any, cx: number, cy: number, w: number, h: number, color: number): void {
  const halfW = w / 2;
  const halfH = h / 2;

  // Fill diamond by scanning each row
  for (let dy = 0; dy <= h; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= image.height) continue;

    // Calculate x range at this y level (diamond shape)
    let xRange: number;
    if (dy <= halfH) {
      // Top half: expands
      xRange = (dy / halfH) * halfW;
    } else {
      // Bottom half: contracts
      xRange = ((h - dy) / halfH) * halfW;
    }

    const xStart = Math.floor(cx - xRange);
    const xEnd = Math.floor(cx + xRange);

    for (let x = xStart; x <= xEnd; x++) {
      if (x >= 0 && x < image.width) {
        image.setPixelColor(color, x, y);
      }
    }
  }
}

/**
 * Check if pixels have significantly changed (for grayscale, R=G=B)
 */
function isGrayscale(pixels: Uint8ClampedArray): boolean {
  let grayscaleCount = 0;
  let totalPixels = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Skip near-black pixels (background)
    if (r < 30 && g < 30 && b < 30) continue;

    totalPixels++;
    // Grayscale means R ≈ G ≈ B (allow small tolerance)
    if (Math.abs(r - g) <= 2 && Math.abs(g - b) <= 2 && Math.abs(r - b) <= 2) {
      grayscaleCount++;
    }
  }

  // Consider grayscale if >90% of non-background pixels are gray
  return totalPixels > 0 && (grayscaleCount / totalPixels) > 0.9;
}

/**
 * Check if original image has color (not grayscale)
 */
function hasColor(pixels: Uint8ClampedArray): boolean {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Skip near-black pixels
    if (r < 30 && g < 30 && b < 30) continue;

    // If R, G, B differ significantly, it has color
    if (Math.abs(r - g) > 10 || Math.abs(g - b) > 10 || Math.abs(r - b) > 10) {
      return true;
    }
  }
  return false;
}

describe('Pixel Editor Effects', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let tempImagePath: string;

  beforeAll(async () => {
    // Create the isometric grid image once
    const { pngBuffer } = await createIsometricGrid();
    tempImagePath = path.join(TEMP_DIR, `isometric-grid-${Date.now()}.png`);
    fs.writeFileSync(tempImagePath, pngBuffer);
  });

  afterAll(() => {
    // Clean up temp file
    if (fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
    }
  });

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create isometric grid with color', async () => {
    const { originalPixels } = await createIsometricGrid();

    // Verify original has color (not grayscale)
    expect(hasColor(originalPixels)).toBe(true);
    expect(isGrayscale(originalPixels)).toBe(false);
  });

  test('should apply grayscale effect to isometric grid', async () => {
    let editor: PixelEditor | null = null;

    const testApp = await tsyneTest.createApp((app: App) => {
      editor = new PixelEditor(app);

      app.window({ title: 'Effects Test', width: 400, height: 350 }, async (win: Window) => {
        // Load the isometric grid image before building UI
        await editor!.loadFile(tempImagePath);

        win.setContent(async () => {
          await editor!.buildUI(win);
          await editor!.updateStatusPublic();
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for image to load
    await ctx.wait(300);

    // Verify image loaded - status should show dimensions
    await ctx.getByText('300x200').within(1000).shouldExist();

    // Get pixels before effect - CLONE since grayscale modifies in place
    const pixelsOriginal = editor!.getPixels();
    expect(pixelsOriginal).not.toBeNull();
    expect(hasColor(pixelsOriginal!)).toBe(true);
    const pixelsBefore = new Uint8ClampedArray(pixelsOriginal!);

    // Apply grayscale effect
    await editor!.applyGrayscale();

    // Wait for effect to apply
    await ctx.wait(200);

    // Get pixels after effect (same array, but modified)
    const pixelsAfter = editor!.getPixels();
    expect(pixelsAfter).not.toBeNull();

    // Verify: after grayscale, pixels should be grayscale
    expect(isGrayscale(pixelsAfter!)).toBe(true);

    // Verify: pixels actually changed (compare clone to current)
    let changedPixels = 0;
    for (let i = 0; i < pixelsBefore.length; i++) {
      if (pixelsBefore[i] !== pixelsAfter![i]) {
        changedPixels++;
      }
    }
    expect(changedPixels).toBeGreaterThan(1000); // Many pixels should have changed
  });
});
