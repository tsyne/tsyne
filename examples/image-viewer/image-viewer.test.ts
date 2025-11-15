/**
 * Image Viewer TsyneTest Integration Tests
 *
 * Test suite for the image viewer demonstrating:
 * - Real image loading with Jimp processing
 * - Actual image editing (brightness, contrast, saturation, hue)
 * - Zoom functionality with state verification
 * - Reset operations and value preservation
 * - Screenshot capture for documentation
 *
 * Usage:
 *   npm test examples/image-viewer/image-viewer.test.ts
 *   TSYNE_HEADED=1 npm test examples/image-viewer/image-viewer.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test examples/image-viewer/image-viewer.test.ts  # Capture screenshots
 *
 * Based on the original image viewer from https://github.com/Palexer/image-viewer
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createImageViewerApp } from './image-viewer';
import * as path from 'path';

describe('Image Viewer Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial UI with all controls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify toolbar buttons
    await ctx.expect(ctx.getByText('Open')).toBeVisible();
    await ctx.expect(ctx.getByText('Reset Edits')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom In')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom Out')).toBeVisible();
    await ctx.expect(ctx.getByText('Reset Zoom')).toBeVisible();

    // Verify initial state
    await ctx.expect(ctx.getByText('No image loaded')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom: 100%')).toBeVisible();

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'image-viewer-initial.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should show initial image area', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Image area should show "No image loaded" initially
    await ctx.expect(ctx.getByText('No image loaded')).toBeVisible();
  });

  test('should display Information tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Information tab should be visible
    await ctx.expect(ctx.getByText('Information')).toBeVisible();
    await ctx.expect(ctx.getByText('Image Information:')).toBeVisible();
    await ctx.expect(ctx.getByText('Width: -')).toBeVisible();
    await ctx.expect(ctx.getByText('Height: -')).toBeVisible();
    await ctx.expect(ctx.getByText('Size: -')).toBeVisible();
    await ctx.expect(ctx.getByText('Last modified: -')).toBeVisible();
  });

  test('should display Editor tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Editor tab should be visible
    await ctx.expect(ctx.getByText('Editor')).toBeVisible();
    await ctx.expect(ctx.getByText('Editing Controls:')).toBeVisible();
    await ctx.expect(ctx.getByText('General:')).toBeVisible();
  });

  test('should show all edit controls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All editing controls should be visible using proper assertions
    await ctx.expect(ctx.getByText('Brightness: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Increase Brightness')).toBeVisible();
    await ctx.expect(ctx.getByText('Decrease Brightness')).toBeVisible();

    await ctx.expect(ctx.getByText('Contrast: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Increase Contrast')).toBeVisible();
    await ctx.expect(ctx.getByText('Decrease Contrast')).toBeVisible();

    await ctx.expect(ctx.getByText('Saturation: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Increase Saturation')).toBeVisible();
    await ctx.expect(ctx.getByText('Decrease Saturation')).toBeVisible();

    await ctx.expect(ctx.getByText('Hue: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Increase Hue')).toBeVisible();
    await ctx.expect(ctx.getByText('Decrease Hue')).toBeVisible();
  });

  test('should show zoom status', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom status should be visible
    await ctx.expect(ctx.getByText('Zoom: 100%')).toBeVisible();
  });

  test('should handle zoom in', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial zoom
    await ctx.expect(ctx.getByText('Zoom: 100%')).toBeVisible();

    // Click zoom in
    await ctx.getByText('Zoom In').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Zoom should increase to 110%
    await ctx.expect(ctx.getByText('Zoom: 110%')).toBeVisible();
  });

  test('should handle zoom out', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom in first
    await ctx.getByText('Zoom In').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Zoom: 110%')).toBeVisible();

    // Now zoom out
    await ctx.getByText('Zoom Out').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should be back to 100%
    await ctx.expect(ctx.getByText('Zoom: 100%')).toBeVisible();
  });

  test('should handle reset zoom', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom in multiple times
    await ctx.getByText('Zoom In').click();
    await new Promise(resolve => setTimeout(resolve, 50));
    await ctx.getByText('Zoom In').click();
    await new Promise(resolve => setTimeout(resolve, 50));
    await ctx.getByText('Zoom In').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reset zoom
    await ctx.getByText('Reset Zoom').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should be back to 100%
    await ctx.expect(ctx.getByText('Zoom: 100%')).toBeVisible();
  });

  test('should adjust brightness values correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial brightness
    await ctx.expect(ctx.getByText('Brightness: 0')).toBeVisible();

    // Increase brightness multiple times
    await ctx.getByText('Increase Brightness').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Brightness: 10')).toBeVisible();

    await ctx.getByText('Increase Brightness').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Brightness: 20')).toBeVisible();

    // Decrease brightness
    await ctx.getByText('Decrease Brightness').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Brightness: 10')).toBeVisible();
  });

  test('should adjust contrast values correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial contrast
    await ctx.expect(ctx.getByText('Contrast: 0')).toBeVisible();

    // Decrease contrast multiple times
    await ctx.getByText('Decrease Contrast').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Contrast: -10')).toBeVisible();

    await ctx.getByText('Decrease Contrast').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Contrast: -20')).toBeVisible();

    // Increase contrast back
    await ctx.getByText('Increase Contrast').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Contrast: -10')).toBeVisible();
  });

  test('should adjust saturation values correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial saturation
    await ctx.expect(ctx.getByText('Saturation: 0')).toBeVisible();

    // Increase saturation
    await ctx.getByText('Increase Saturation').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Saturation: 10')).toBeVisible();

    // Decrease saturation below zero
    await ctx.getByText('Decrease Saturation').click();
    await ctx.wait(50);
    await ctx.getByText('Decrease Saturation').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Saturation: -10')).toBeVisible();
  });

  test('should adjust hue values correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial hue
    await ctx.expect(ctx.getByText('Hue: 0')).toBeVisible();

    // Increase hue
    await ctx.getByText('Increase Hue').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Hue: 10')).toBeVisible();

    await ctx.getByText('Increase Hue').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Hue: 20')).toBeVisible();

    // Decrease hue
    await ctx.getByText('Decrease Hue').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Hue: 10')).toBeVisible();
  });

  test('should handle open image', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initially no image
    await ctx.expect(ctx.getByText('No image loaded')).toBeVisible();

    // Open image
    await ctx.getByText('Open').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Image info should be populated
    await ctx.expect(ctx.getByText('Width: 1920px')).toBeVisible();
    await ctx.expect(ctx.getByText('Height: 1080px')).toBeVisible();
  });

  test('should reset all edits to zero', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Adjust ALL parameters
    await ctx.getByText('Increase Brightness').click();
    await ctx.wait(50);
    await ctx.getByText('Increase Contrast').click();
    await ctx.wait(50);
    await ctx.getByText('Increase Saturation').click();
    await ctx.wait(50);
    await ctx.getByText('Increase Hue').click();
    await ctx.wait(100);

    // Verify they're all non-zero
    await ctx.expect(ctx.getByText('Brightness: 10')).toBeVisible();
    await ctx.expect(ctx.getByText('Contrast: 10')).toBeVisible();
    await ctx.expect(ctx.getByText('Saturation: 10')).toBeVisible();
    await ctx.expect(ctx.getByText('Hue: 10')).toBeVisible();

    // Reset edits
    await ctx.getByText('Reset Edits').click();
    await ctx.wait(100);

    // All parameters should be back to 0
    await ctx.expect(ctx.getByText('Brightness: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Contrast: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Saturation: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Hue: 0')).toBeVisible();
  });

  test('should handle complex editing sequence', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Load image
    await ctx.getByText('Open').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText('Width: 1920px')).toBeVisible();

    // Apply multiple edits
    await ctx.getByText('Increase Brightness').click();
    await ctx.wait(50);
    await ctx.getByText('Increase Brightness').click();
    await ctx.wait(50);
    await ctx.getByText('Increase Contrast').click();
    await ctx.wait(50);
    await ctx.getByText('Decrease Saturation').click();
    await ctx.wait(100);

    // Verify values
    await ctx.expect(ctx.getByText('Brightness: 20')).toBeVisible();
    await ctx.expect(ctx.getByText('Contrast: 10')).toBeVisible();
    await ctx.expect(ctx.getByText('Saturation: -10')).toBeVisible();

    // Zoom in
    await ctx.getByText('Zoom In').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 110%')).toBeVisible();

    // Reset edits (zoom should persist)
    await ctx.getByText('Reset Edits').click();
    await ctx.wait(100);

    // Edit values reset but zoom persists
    await ctx.expect(ctx.getByText('Brightness: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom: 110%')).toBeVisible();

    // Reset zoom
    await ctx.getByText('Reset Zoom').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 100%')).toBeVisible();
  });

  test('should maintain UI after multiple operations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Perform various operations
    await ctx.getByText('Open').click();
    await ctx.wait(50);
    await ctx.getByText('Zoom In').click();
    await ctx.wait(50);
    await ctx.getByText('Increase Brightness').click();
    await ctx.wait(50);
    await ctx.getByText('Reset Edits').click();
    await ctx.wait(100);

    // All UI elements should still be visible
    await ctx.expect(ctx.getByText('Open')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom In')).toBeVisible();
    await ctx.expect(ctx.getByText('Information')).toBeVisible();
    await ctx.expect(ctx.getByText('Editor')).toBeVisible();
  });
});
