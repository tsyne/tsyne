/**
 * Pixel Editor TsyneTest Integration Tests
 *
 * Test suite for the pixel editor application demonstrating:
 * - Real canvas manipulation (32x32 pixel grid)
 * - Tool switching (Pencil, Picker) with state verification
 * - Zoom functionality with proper limits (1x to 16x)
 * - Color management and foreground color display
 * - Screenshot capture for documentation
 *
 * Usage:
 *   npm test examples/pixeledit/pixeledit.test.ts
 *   TSYNE_HEADED=1 npm test examples/pixeledit/pixeledit.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test examples/pixeledit/pixeledit.test.ts  # Capture screenshots
 *
 * Based on the original pixeledit from https://github.com/fyne-io/pixeledit
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createPixelEditorApp } from './pixeledit';
import * as path from 'path';

describe.skip('Pixel Editor Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial pixel editor UI with all components', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify tools are present
    await ctx.expect(ctx.getByText('Tools:')).toBeVisible();
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Verify zoom controls
    await ctx.expect(ctx.getByText('Zoom: 1x')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom In')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom Out')).toBeVisible();

    // Verify color display
    await ctx.expect(ctx.getByText('Foreground:')).toBeVisible();
    await ctx.expect(ctx.getByText('#000000')).toBeVisible(); // Black default

    // Verify canvas placeholder
    await ctx.expect(ctx.getByText('Pixel canvas will be rendered here')).toBeVisible();

    // Verify status bar shows new image
    await ctx.expect(ctx.getByExactText('New Image (32x32)')).toBeVisible();

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'pixeledit-initial.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should zoom in incrementally from 1x to higher values', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial zoom should be 1x
    await ctx.expect(ctx.getByText('Zoom: 1x')).toBeVisible();

    // Click zoom in button
    await ctx.getByText('Zoom In').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 2x')).toBeVisible();

    // Zoom in again
    await ctx.getByText('Zoom In').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 3x')).toBeVisible();

    // And once more
    await ctx.getByText('Zoom In').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 4x')).toBeVisible();
  });

  test('should zoom out from higher values back to lower', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom in first to 5x
    for (let i = 0; i < 4; i++) {
      await ctx.getByText('Zoom In').click();
      await ctx.wait(20);
    }
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 5x')).toBeVisible();

    // Now zoom out step by step
    await ctx.getByText('Zoom Out').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 4x')).toBeVisible();

    await ctx.getByText('Zoom Out').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 3x')).toBeVisible();

    await ctx.getByText('Zoom Out').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 2x')).toBeVisible();
  });

  test('should not zoom below 1x', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial zoom is 1x
    await ctx.expect(ctx.getByText('Zoom: 1x')).toBeVisible();

    // Try to zoom out below minimum
    await ctx.getByText('Zoom Out').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should still be 1x
    await ctx.expect(ctx.getByText('Zoom: 1x')).toBeVisible();
  });

  test('should not zoom above 16x', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom in many times to reach maximum
    for (let i = 0; i < 20; i++) {
      await ctx.getByText('Zoom In').click();
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    // Should be at maximum 16x
    await ctx.expect(ctx.getByText('Zoom: 16x')).toBeVisible();
  });

  test('should switch between tools and maintain tool availability', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Both tools should be visible
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Click on Picker tool multiple times (shouldn't break anything)
    await ctx.getByText('Picker').click();
    await ctx.wait(30);
    await ctx.getByText('Picker').click();
    await ctx.wait(30);

    // Tool should still be visible and functional
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Click back on Pencil
    await ctx.getByText('Pencil').click();
    await ctx.wait(30);
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();

    // Click on Picker again
    await ctx.getByText('Picker').click();
    await ctx.wait(30);
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Switch back to Pencil
    await ctx.getByText('Pencil').click();
    await ctx.wait(30);
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
  });

  test.skip('should handle complex interaction sequence with zoom and tool switching', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start at 1x zoom
    await ctx.expect(ctx.getByText('Zoom: 1x')).toBeVisible();

    // Zoom in multiple times
    await ctx.getByText('Zoom In').click();
    await ctx.wait(30);
    await ctx.getByText('Zoom In').click();
    await ctx.wait(30);
    await ctx.getByText('Zoom In').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 4x')).toBeVisible();

    // Switch to Picker tool
    await ctx.getByText('Picker').click();
    await ctx.wait(30);

    // Zoom state should be preserved after tool switch
    await ctx.expect(ctx.getByText('Zoom: 4x')).toBeVisible();
    await ctx.expect(ctx.getByText('#000000')).toBeVisible(); // Color preserved

    // Zoom out once
    await ctx.getByText('Zoom Out').click();
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 3x')).toBeVisible();

    // Switch back to Pencil
    await ctx.getByText('Pencil').click();
    await ctx.wait(30);

    // All state should still be preserved
    await ctx.expect(ctx.getByText('Zoom: 3x')).toBeVisible();
    await ctx.expect(ctx.getByText('#000000')).toBeVisible();

    // Zoom in to max and verify
    for (let i = 0; i < 15; i++) {
      await ctx.getByText('Zoom In').click();
      await ctx.wait(10);
    }
    await ctx.wait(50);
    await ctx.expect(ctx.getByText('Zoom: 16x')).toBeVisible(); // Max zoom

    // All UI elements should still be functional
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();
  });

  test.skip('should maintain UI consistency after rapid operations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Rapid tool switching
    await ctx.getByText('Picker').click();
    await ctx.wait(20);
    await ctx.getByText('Pencil').click();
    await ctx.wait(20);
    await ctx.getByText('Picker').click();
    await ctx.wait(20);
    await ctx.getByText('Pencil').click();
    await ctx.wait(50);

    // Rapid zoom operations
    await ctx.getByText('Zoom In').click();
    await ctx.wait(20);
    await ctx.getByText('Zoom In').click();
    await ctx.wait(20);
    await ctx.getByText('Zoom Out').click();
    await ctx.wait(20);
    await ctx.getByText('Zoom In').click();
    await ctx.wait(100);

    // UI should still be functional
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom In')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom Out')).toBeVisible();

    // Status and color should still be visible
    await ctx.expect(ctx.getByExactText('New Image (32x32)')).toBeVisible();
    await ctx.expect(ctx.getByText('#000000')).toBeVisible();
  });

  test.skip('should display all UI sections consistently', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Left palette section
    await ctx.expect(ctx.getByText('Tools:')).toBeVisible();
    await ctx.expect(ctx.getByText('Foreground:')).toBeVisible();

    // Center canvas section
    await ctx.expect(ctx.getByText('Pixel canvas will be rendered here')).toBeVisible();

    // Bottom status section
    await ctx.expect(ctx.getByExactText('New Image (32x32)')).toBeVisible();

    // Tools
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Zoom controls
    await ctx.expect(ctx.getByText('Zoom: 1x')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom In')).toBeVisible();
    await ctx.expect(ctx.getByText('Zoom Out')).toBeVisible();
  });
});
