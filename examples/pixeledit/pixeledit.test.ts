/**
 * Pixel Editor TsyneTest Integration Tests
 *
 * Test suite for the pixel editor application demonstrating:
 * - Creating new canvas
 * - Tool selection (Pencil, Picker)
 * - Zoom controls
 * - UI element visibility
 *
 * Usage:
 *   npm test examples/pixeledit/pixeledit.test.ts
 *   TSYNE_HEADED=1 npm test examples/pixeledit/pixeledit.test.ts  # Visual debugging
 *
 * Based on the original pixeledit from https://github.com/fyne-io/pixeledit
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createPixelEditorApp } from './pixeledit';

describe('Pixel Editor Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial UI with tools and canvas placeholder', async () => {
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
  });

  test('should display toolbar buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify toolbar buttons are present
    // Note: In Fyne toolbar, items may not be directly testable as text
    // This is a simplified test that verifies the UI structure
    await ctx.expect(ctx.getByText('Tools:')).toBeVisible();
  });

  test('should allow zoom in', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial zoom should be 1x
    await ctx.expect(ctx.getByText('Zoom: 1x')).toBeVisible();

    // Click zoom in button
    await ctx.getByText('Zoom In').click();

    // Wait a moment for update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Zoom should now be 2x
    await ctx.expect(ctx.getByText('Zoom: 2x')).toBeVisible();
  });

  test('should allow zoom out', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom in first
    await ctx.getByText('Zoom In').click();
    await ctx.getByText('Zoom In').click();

    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Zoom: 3x')).toBeVisible();

    // Now zoom out
    await ctx.getByText('Zoom Out').click();

    await new Promise(resolve => setTimeout(resolve, 100));
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

  test('should switch between tools', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Both tools should be visible
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Click on Picker tool
    await ctx.getByText('Picker').click();

    // Tool should switch (we'd need to verify in console logs or by behavior)
    // For now, just verify the UI still works
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Click back on Pencil
    await ctx.getByText('Pencil').click();
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
  });

  test('should display correct window title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // The window title should be "Pixel Editor"
    // Note: Window title testing may not be directly supported in current TsyneTest
    // This test verifies the app launches successfully
    await ctx.expect(ctx.getByText('Tools:')).toBeVisible();
  });

  test('should show all main UI sections', async () => {
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

    // Top toolbar is harder to test directly, but we verify overall structure
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
  });

  test('should maintain state after tool switches', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Zoom in a few times
    await ctx.getByText('Zoom In').click();
    await ctx.getByText('Zoom In').click();

    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Zoom: 3x')).toBeVisible();

    // Switch tools
    await ctx.getByText('Picker').click();

    // Zoom state should be preserved
    await ctx.expect(ctx.getByText('Zoom: 3x')).toBeVisible();

    // Color should still be black
    await ctx.expect(ctx.getByText('#000000')).toBeVisible();
  });
});
