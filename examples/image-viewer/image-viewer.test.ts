/**
 * Image Viewer TsyneTest Integration Tests
 *
 * Test suite for the image viewer demonstrating:
 * - Application initialization and UI
 * - Toolbar controls (Open, Reset, Zoom)
 * - Side panel tabs (Information, Editor)
 * - Edit controls (Brightness, Contrast, Saturation, Hue)
 * - Status bar and zoom display
 *
 * Usage:
 *   npm test examples/image-viewer/image-viewer.test.ts
 *   TSYNE_HEADED=1 npm test examples/image-viewer/image-viewer.test.ts  # Visual debugging
 *
 * Based on the original image viewer from https://github.com/Palexer/image-viewer
 *
 * NOTE: All assertions use proper TsyneTest API (ctx.expect().toBeVisible())
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createImageViewerApp } from './image-viewer';

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

  test('should display initial UI with toolbar', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify toolbar buttons using proper TsyneTest assertions
    await ctx.expect(ctx.getByText('Open')).toBeVisible();
    await ctx.expect(ctx.getByText('Reset Edits')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom In')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom Out')).toBeVisible();
    await ctx.expect(ctx.getByText('Reset Zoom')).toBeVisible();
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

  test('should handle brightness adjustment', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial brightness
    await ctx.expect(ctx.getByText('Brightness: 0')).toBeVisible();

    // Increase brightness
    await ctx.getByText('Increase Brightness').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Brightness should increase
    await ctx.expect(ctx.getByText('Brightness: 10')).toBeVisible();
  });

  test('should handle contrast adjustment', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial contrast
    await ctx.expect(ctx.getByText('Contrast: 0')).toBeVisible();

    // Decrease contrast
    await ctx.getByText('Decrease Contrast').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Contrast should decrease
    await ctx.expect(ctx.getByText('Contrast: -10')).toBeVisible();
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

  test('should handle reset edits', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Adjust some parameters
    await ctx.getByText('Increase Brightness').click();
    await new Promise(resolve => setTimeout(resolve, 50));
    await ctx.getByText('Increase Contrast').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reset edits
    await ctx.getByText('Reset Edits').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // All parameters should be back to 0
    await ctx.expect(ctx.getByText('Brightness: 0')).toBeVisible();
    await ctx.expect(ctx.getByText('Contrast: 0')).toBeVisible();
  });

  test('should preserve UI after multiple operations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createImageViewerApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Do several operations
    await ctx.getByText('Open').click();
    await new Promise(resolve => setTimeout(resolve, 50));

    await ctx.getByText('Zoom In').click();
    await new Promise(resolve => setTimeout(resolve, 50));

    await ctx.getByText('Increase Brightness').click();
    await new Promise(resolve => setTimeout(resolve, 50));

    await ctx.getByText('Reset Edits').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // All UI elements should still be visible using proper assertions
    await ctx.expect(ctx.getByText('Open')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom In')).toBeVisible();
    await ctx.expect(ctx.getByText('Information')).toBeVisible();
    await ctx.expect(ctx.getByText('Editor')).toBeVisible();
  });
});
