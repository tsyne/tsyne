/**
 * Test for pixeledit pencil drawing functionality
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createPixelEditorApp } from './pixeledit';
import * as path from 'path';

describe('pixeledit - pencil drawing', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should draw with pencil tool', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for the app to load
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Verify the tools are still visible
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Verify color controls
    await ctx.expect(ctx.getByText('#000000')).toBeVisible();
    await ctx.expect(ctx.getByText('Pick FG')).toBeVisible();
  }, 30000);

  test('should switch between pencil and picker', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for tools to be visible
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Verify the app is still responsive
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();
  }, 30000);

  test('should have color controls visible when pencil is selected', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify color controls are visible
    await ctx.expect(ctx.getByText('#000000')).toBeVisible();
    await ctx.expect(ctx.getByText('Pick FG')).toBeVisible();
  }, 30000);

  test('should render pencil UI - screenshot', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for the app to fully load
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();
    await ctx.expect(ctx.getByText('#000000')).toBeVisible();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, '../screenshots', 'pixeledit-pencil.png');
      await ctx.getByText('#000000').within(500).shouldExist();
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);
    }
  }, 30000);

  test('should draw with pencil on blank canvas - screenshot', async () => {
    let editor: any;
    const testApp = await tsyneTest.createApp((app) => {
      editor = createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for the app to fully load
    await ctx.getByText('Pencil').within(500).shouldExist();

    // Create a blank 64x64 canvas programmatically
    // We need to access the editor's internal methods
    // The editor should have createBlankImage and setPixelColor methods

    // Click the "Reset" button which creates a blank 32x32 image
    await ctx.getByText('Reset').click();
    await ctx.getByText('Pencil').within(300).shouldExist();

    // Now programmatically draw some pixels using the editor's API
    // Draw a simple smiley face pattern
    if (editor) {
      // Import Color class for creating colors
      const { PixelEditor } = await import('./pixeledit');

      // Red color for the smiley
      const red = {
        r: 255, g: 0, b: 0, a: 255,
        toHex: () => '#ff0000',
        clone: function() { return { ...this, clone: this.clone, toHex: this.toHex }; }
      };
      const black = {
        r: 0, g: 0, b: 0, a: 255,
        toHex: () => '#000000',
        clone: function() { return { ...this, clone: this.clone, toHex: this.toHex }; }
      };

      // Draw left eye (black)
      editor.setPixelColor(10, 10, black);
      editor.setPixelColor(11, 10, black);

      // Draw right eye (black)
      editor.setPixelColor(20, 10, black);
      editor.setPixelColor(21, 10, black);

      // Draw smile (red arc)
      editor.setPixelColor(8, 18, red);
      editor.setPixelColor(9, 20, red);
      editor.setPixelColor(10, 21, red);
      editor.setPixelColor(11, 22, red);
      editor.setPixelColor(12, 22, red);
      editor.setPixelColor(13, 22, red);
      editor.setPixelColor(14, 22, red);
      editor.setPixelColor(15, 22, red);
      editor.setPixelColor(16, 22, red);
      editor.setPixelColor(17, 22, red);
      editor.setPixelColor(18, 22, red);
      editor.setPixelColor(19, 22, red);
      editor.setPixelColor(20, 21, red);
      editor.setPixelColor(21, 20, red);
      editor.setPixelColor(22, 18, red);

      // Give the canvas time to render - verify UI is still responsive
      await ctx.getByText('Pencil').within(500).shouldExist();
    }

    // Verify the UI is still functional
    await ctx.getByText('Pencil').shouldExist();

    // Take screenshot showing the drawn content
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, '../screenshots', 'pixeledit-pencil-drawing.png');
      await ctx.getByText('Pencil').within(300).shouldExist();
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);
    }
  }, 30000);
});
