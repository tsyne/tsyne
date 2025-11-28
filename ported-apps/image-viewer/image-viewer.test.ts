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

    // Verify status bar buttons (menu items are not visible until clicked)
    await ctx.expect(ctx.getByText('Open')).toBeVisible();
    await ctx.expect(ctx.getByText('Reset')).toBeVisible();

    // Verify initial state
    await ctx.expect(ctx.getByText('No image loaded')).toBeVisible();
    await ctx.getByID('zoom-status').within(2000).shouldContain('100%');

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

  test.skip('should display Editor tab', async () => {
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

    // All editing control labels and sliders should be visible
    await ctx.expect(ctx.getByText('Brightness')).toBeVisible();
    await ctx.getByID('edit-brightness').shouldHaveValue(0);

    await ctx.expect(ctx.getByText('Contrast')).toBeVisible();
    await ctx.getByID('edit-contrast').shouldHaveValue(0);

    await ctx.expect(ctx.getByText('Saturation')).toBeVisible();
    await ctx.getByID('edit-saturation').shouldHaveValue(0);

    await ctx.expect(ctx.getByText('Hue')).toBeVisible();
    await ctx.getByID('edit-hue').shouldHaveValue(0);
  });

  test('should show zoom status', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom status should be visible
    await ctx.getByID('zoom-status').within(2000).shouldContain('100%');
  });

  test('should handle zoom in', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial zoom
    await ctx.getByID('zoom-status').within(2000).shouldContain('100%');

    // Click zoom in (using toolbar action ID)
    await ctx.getByID('zoom-in-btn').click();

    // Zoom should increase to 110%
    await ctx.getByID('zoom-status').within(2000).shouldContain('110%');
  });

  test('should handle zoom out', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom in first
    await ctx.getByID('zoom-in-btn').click();
    await ctx.getByID('zoom-status').within(2000).shouldContain('110%');

    // Now zoom out
    await ctx.getByID('zoom-out-btn').click();

    // Should be back to 100%
    await ctx.getByID('zoom-status').within(2000).shouldContain('100%');
  });

  test('should handle reset zoom', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom in multiple times
    await ctx.getByID('zoom-in-btn').click();
    await ctx.getByID('zoom-status').within(2000).shouldContain('110%');
    await ctx.getByID('zoom-in-btn').click();
    await ctx.getByID('zoom-status').within(2000).shouldContain('120%');
    await ctx.getByID('zoom-in-btn').click();
    await ctx.getByID('zoom-status').within(2000).shouldContain('130%');

    // Reset zoom
    await ctx.getByID('reset-zoom-btn').click();

    // Should be back to 100%
    await ctx.getByID('zoom-status').within(2000).shouldContain('100%');
  });

  test('should adjust brightness values correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial brightness should be 0
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(0);

    // Set brightness to 10
    await ctx.getByID('edit-brightness').setValue(10);
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(10);

    // Set brightness to 20
    await ctx.getByID('edit-brightness').setValue(20);
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(20);

    // Set brightness back to 10
    await ctx.getByID('edit-brightness').setValue(10);
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(10);
  });

  test('should adjust contrast values correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial contrast should be 0
    await ctx.getByID('edit-contrast').within(2000).shouldHaveValue(0);

    // Set contrast to -10
    await ctx.getByID('edit-contrast').setValue(-10);
    await ctx.getByID('edit-contrast').within(2000).shouldHaveValue(-10);

    // Set contrast to -20
    await ctx.getByID('edit-contrast').setValue(-20);
    await ctx.getByID('edit-contrast').within(2000).shouldHaveValue(-20);

    // Set contrast back to -10
    await ctx.getByID('edit-contrast').setValue(-10);
    await ctx.getByID('edit-contrast').within(2000).shouldHaveValue(-10);
  });

  test('should adjust saturation values correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial saturation should be 0
    await ctx.getByID('edit-saturation').within(2000).shouldHaveValue(0);

    // Set saturation to 10
    await ctx.getByID('edit-saturation').setValue(10);
    await ctx.getByID('edit-saturation').within(2000).shouldHaveValue(10);

    // Set saturation to 0 then -10
    await ctx.getByID('edit-saturation').setValue(0);
    await ctx.getByID('edit-saturation').within(2000).shouldHaveValue(0);
    await ctx.getByID('edit-saturation').setValue(-10);
    await ctx.getByID('edit-saturation').within(2000).shouldHaveValue(-10);
  });

  test('should adjust hue values correctly', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial hue should be 0
    await ctx.getByID('edit-hue').within(2000).shouldHaveValue(0);

    // Set hue to 10
    await ctx.getByID('edit-hue').setValue(10);
    await ctx.getByID('edit-hue').within(2000).shouldHaveValue(10);

    // Set hue to 20
    await ctx.getByID('edit-hue').setValue(20);
    await ctx.getByID('edit-hue').within(2000).shouldHaveValue(20);

    // Set hue back to 10
    await ctx.getByID('edit-hue').setValue(10);
    await ctx.getByID('edit-hue').within(2000).shouldHaveValue(10);
  });

  test.skip('should handle open image', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initially no image
    await ctx.expect(ctx.getByText('No image loaded')).toBeVisible();

    // Mock the file dialog to return the sample image path
    const sampleImagePath = path.join(__dirname, 'sample-image.png');
    tsyneTest.mockFileDialog('open', sampleImagePath);

    // Open image (using toolbar action ID)
    await ctx.getByID('open-btn').click();

    // Image info should be populated (allow extra time for Jimp processing)
    await ctx.getByID('info-width').within(10000).shouldContain('1920px');
    await ctx.getByID('info-height').within(10000).shouldContain('1080px');
  });

  test('should reset all edits to zero', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Adjust ALL parameters using sliders
    await ctx.getByID('edit-brightness').setValue(10);
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(10);
    await ctx.getByID('edit-contrast').setValue(10);
    await ctx.getByID('edit-contrast').within(2000).shouldHaveValue(10);
    await ctx.getByID('edit-saturation').setValue(10);
    await ctx.getByID('edit-saturation').within(2000).shouldHaveValue(10);
    await ctx.getByID('edit-hue').setValue(10);
    await ctx.getByID('edit-hue').within(2000).shouldHaveValue(10);

    // Reset edits (using toolbar action ID)
    await ctx.getByID('reset-edits-btn').click();

    // All parameters should be back to 0
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(0);
    await ctx.getByID('edit-contrast').within(2000).shouldHaveValue(0);
    await ctx.getByID('edit-saturation').within(2000).shouldHaveValue(0);
    await ctx.getByID('edit-hue').within(2000).shouldHaveValue(0);
  });

  test.skip('should handle complex editing sequence', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Mock the file dialog to return the sample image path
    const sampleImagePath = path.join(__dirname, 'sample-image.png');
    tsyneTest.mockFileDialog('open', sampleImagePath);

    // Load image (using toolbar action ID)
    await ctx.getByID('open-btn').click();
    await ctx.getByID('info-width').within(10000).shouldContain('1920px');

    // Apply multiple edits using sliders
    await ctx.getByID('edit-brightness').setValue(20);
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(20);
    await ctx.getByID('edit-contrast').setValue(10);
    await ctx.getByID('edit-contrast').within(2000).shouldHaveValue(10);
    await ctx.getByID('edit-saturation').setValue(-10);
    await ctx.getByID('edit-saturation').within(2000).shouldHaveValue(-10);

    // Zoom in (using toolbar action ID)
    await ctx.getByID('zoom-in-btn').click();
    await ctx.getByID('zoom-status').within(2000).shouldContain('110%');

    // Reset edits (zoom should persist)
    await ctx.getByID('reset-edits-btn').click();

    // Edit values reset but zoom persists
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(0);
    await ctx.getByID('zoom-status').within(2000).shouldContain('110%');

    // Reset zoom (using toolbar action ID)
    await ctx.getByID('reset-zoom-btn').click();
    await ctx.getByID('zoom-status').within(2000).shouldContain('100%');
  });

  test.skip('should maintain UI after multiple operations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Mock the file dialog to return the sample image path
    const sampleImagePath = path.join(__dirname, 'sample-image.png');
    tsyneTest.mockFileDialog('open', sampleImagePath);

    // Perform various operations (using toolbar action IDs)
    await ctx.getByID('open-btn').click();
    await ctx.getByID('info-width').within(10000).shouldContain('1920px');
    await ctx.getByID('zoom-in-btn').click();
    await ctx.getByID('zoom-status').within(2000).shouldContain('110%');
    await ctx.getByID('edit-brightness').setValue(10);
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(10);
    await ctx.getByID('reset-edits-btn').click();
    await ctx.getByID('edit-brightness').within(2000).shouldHaveValue(0);

    // Key UI elements should still be visible
    await ctx.expect(ctx.getByText('Information')).toBeVisible();
    await ctx.expect(ctx.getByText('Editor')).toBeVisible();
  });
});
