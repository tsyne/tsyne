/**
 * Test for loading large images via horizontal stripes to avoid msgpack size limits.
 *
 * Uses the land-o-lakes image (6144x3456 = 21MP) which is ~85MB raw RGBA.
 * This would fail with setPixelBuffer due to message size limits.
 * setPixelBufferInStripes breaks it into ~1MB stripes that transfer successfully.
 */

import { TsyneTest, TestContext } from '../index-test';
import { App } from '../index';
import { TappableCanvasRaster } from '../widgets/canvas';
import * as fs from 'fs';
import * as path from 'path';
import { Jimp } from 'jimp';

// Path to the large test image
const LARGE_IMAGE_PATH = path.join(__dirname, '../../../land-o-lakes-inc-DdcWKBbJeEI-unsplash.jpg');

describe('Large Image Loading via Stripes', () => {
  let tsyneTest: TsyneTest;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('should load a large JPEG image via setPixelBufferInStripes without message size errors', async () => {
    // Skip if the test image doesn't exist
    if (!fs.existsSync(LARGE_IMAGE_PATH)) {
      console.log(`Skipping test: ${LARGE_IMAGE_PATH} not found`);
      return;
    }

    // Load and decode the JPEG
    const image = await Jimp.read(LARGE_IMAGE_PATH);
    const width = image.width;
    const height = image.height;

    console.log(`Loaded image: ${width}x${height} (${(width * height * 4 / 1024 / 1024).toFixed(1)}MB raw RGBA)`);

    // Jimp 1.x provides raw RGBA buffer directly
    const rgbaBuffer = new Uint8Array(image.bitmap.data);

    let canvas: TappableCanvasRaster | null = null;
    let loadError: Error | null = null;

    const createTestApp = (app: App) => {
      app.window({ title: 'Large Image Test', width, height }, (win) => {
        win.setContent(() => {
          // Create canvas at image size (display will clip/scroll as needed)
          canvas = app.tappableCanvasRaster(width, height);
        });
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    await testApp.run();

    // Wait for canvas to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(canvas).not.toBeNull();

    // Load the image via stripes - this should NOT throw message size errors
    const startTime = Date.now();
    try {
      await canvas!.setPixelBufferInStripes(rgbaBuffer, width, height);
    } catch (e) {
      loadError = e as Error;
    }
    const elapsed = Date.now() - startTime;

    console.log(`Loaded ${width}x${height} image in ${elapsed}ms via stripes`);

    // Should not have any errors
    expect(loadError).toBeNull();

    // Verify widget exists
    const ctx = tsyneTest.getContext();
    const widgets = await ctx.getAllWidgets();
    expect(widgets.some((w: any) => w.type === 'tappablecanvasraster')).toBe(true);
  }, 60000); // 60 second timeout for large image

  it('should correctly stripe a medium-sized buffer', async () => {
    // Test with a smaller image to verify stripe logic
    const width = 1000;
    const height = 500;
    const buffer = new Uint8Array(width * height * 4);

    // Fill with a pattern: red gradient
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        buffer[idx] = Math.floor((x / width) * 255);     // R varies with x
        buffer[idx + 1] = Math.floor((y / height) * 255); // G varies with y
        buffer[idx + 2] = 128;                            // B constant
        buffer[idx + 3] = 255;                            // A opaque
      }
    }

    let canvas: TappableCanvasRaster | null = null;

    const createTestApp = (app: App) => {
      app.window({ title: 'Stripe Test', width, height }, (win) => {
        win.setContent(() => {
          canvas = app.tappableCanvasRaster(width, height);
        });
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    await testApp.run();

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(canvas).not.toBeNull();

    // Use small stripe size to force multiple stripes
    const smallStripeSize = 50 * 1000 * 4; // ~50 rows worth
    await canvas!.setPixelBufferInStripes(buffer, width, height, smallStripeSize);

    // Verify widget exists
    const ctx = tsyneTest.getContext();
    const widgets = await ctx.getAllWidgets();
    expect(widgets.some((w: any) => w.type === 'tappablecanvasraster')).toBe(true);
  });
});
