/**
 * Pixel Editor TsyneTest Integration Tests
 *
 * Test suite for the pixel editor application demonstrating:
 * - Main menu with File operations
 * - Power-of-2 zoom (100%, 200%, 400%, 800%, 1600%)
 * - FG color preview rectangle
 * - Tool switching (Pencil, Picker)
 * - Color picker button
 * - Status bar updates
 *
 * Usage:
 *   npm test ported-apps/pixeledit/pixeledit.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/pixeledit/pixeledit.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test ported-apps/pixeledit/pixeledit.test.ts  # Capture screenshots
 *
 * Based on the original pixeledit from https://github.com/fyne-io/pixeledit
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createPixelEditorApp } from './pixeledit';
import * as path from 'path';

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

  test('should display initial pixel editor UI with all components', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createPixelEditorApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify tools section
    await ctx.expect(ctx.getByText('Tools')).toBeVisible();
    await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Picker')).toBeVisible();

    // Verify power-of-2 zoom controls (shown as percentage)
    await ctx.expect(ctx.getByText('100%')).toBeVisible();
    await ctx.expect(ctx.getByText('-')).toBeVisible();
    await ctx.expect(ctx.getByText('+')).toBeVisible();

    // Verify color preview and picker button
    await ctx.expect(ctx.getByText('#000000')).toBeVisible(); // Black default
    await ctx.expect(ctx.getByText('Pick FG')).toBeVisible();

    // Verify status bar shows initial message
    await ctx.expect(ctx.getByExactText('Open a file')).toBeVisible();

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, '../screenshots', 'pixeledit.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);
    }
  });

  describe('Power-of-2 Zoom', () => {
    test('should zoom in by doubling (100% -> 200% -> 400%)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Initial zoom should be 100%
      await ctx.expect(ctx.getByText('100%')).toBeVisible();

      // Click zoom in button (doubles zoom)
      await ctx.getByText('+').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('200%')).toBeVisible();

      // Zoom in again (doubles to 400%)
      await ctx.getByText('+').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('400%')).toBeVisible();

      // And once more (doubles to 800%)
      await ctx.getByText('+').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('800%')).toBeVisible();
    });

    test('should zoom out by halving (800% -> 400% -> 200%)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Zoom in to 800% first
      await ctx.getByText('+').click();
      await ctx.wait(20);
      await ctx.getByText('+').click();
      await ctx.wait(20);
      await ctx.getByText('+').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('800%')).toBeVisible();

      // Now zoom out (halves to 400%)
      await ctx.getByText('-').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('400%')).toBeVisible();

      // Zoom out again (halves to 200%)
      await ctx.getByText('-').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('200%')).toBeVisible();

      // Zoom out once more (halves to 100%)
      await ctx.getByText('-').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('100%')).toBeVisible();
    });

    test('should not zoom below 100%', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Initial zoom is 100%
      await ctx.expect(ctx.getByText('100%')).toBeVisible();

      // Try to zoom out below minimum
      await ctx.getByText('-').click();
      await ctx.wait(100);

      // Should still be 100%
      await ctx.expect(ctx.getByText('100%')).toBeVisible();
    });

    test('should not zoom above 1600%', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Zoom in many times to reach maximum (1 -> 2 -> 4 -> 8 -> 16)
      for (let i = 0; i < 10; i++) {
        await ctx.getByText('+').click();
        await ctx.wait(20);
      }
      await ctx.wait(100);

      // Should be at maximum 1600%
      await ctx.expect(ctx.getByText('1600%')).toBeVisible();
    });
  });

  describe('Tool Switching', () => {
    test('should switch between Pencil and Picker tools', async () => {
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
      await ctx.wait(30);
      await ctx.expect(ctx.getByText('Picker')).toBeVisible();

      // Click back on Pencil
      await ctx.getByText('Pencil').click();
      await ctx.wait(30);
      await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
    });

    test('should maintain UI consistency after rapid tool switching', async () => {
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

      // UI should still be functional
      await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Picker')).toBeVisible();
      await ctx.expect(ctx.getByText('100%')).toBeVisible();
      await ctx.expect(ctx.getByText('#000000')).toBeVisible();
    });
  });

  describe('Color Preview and Picker', () => {
    test('should display FG color preview and hex value', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Default foreground color is black (#000000)
      await ctx.expect(ctx.getByText('#000000')).toBeVisible();
      await ctx.expect(ctx.getByText('Pick FG')).toBeVisible();
    });

    test('should have clickable Pick FG button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify the Pick FG button is visible and can be clicked
      // (Note: Actually opening the color picker would require dialog interaction)
      await ctx.expect(ctx.getByText('Pick FG')).toBeVisible();
      // Click doesn't throw an error
      await ctx.getByText('Pick FG').click();
      await ctx.wait(50);
    });
  });

  describe('Toolbar', () => {
    test('should display toolbar buttons', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Toolbar should have Open, Reset, Save buttons
      await ctx.expect(ctx.getByText('Open')).toBeVisible();
      await ctx.expect(ctx.getByText('Reset')).toBeVisible();
      await ctx.expect(ctx.getByText('Save')).toBeVisible();
    });
  });

  describe('Status Bar', () => {
    test('should display initial status message', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Initial status should say "Open a file"
      await ctx.expect(ctx.getByExactText('Open a file')).toBeVisible();
    });
  });

  describe('Complex Interaction Sequence', () => {
    test('should handle zoom and tool switching together', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Start at 100% zoom
      await ctx.expect(ctx.getByText('100%')).toBeVisible();

      // Zoom in to 400%
      await ctx.getByText('+').click();
      await ctx.wait(30);
      await ctx.getByText('+').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('400%')).toBeVisible();

      // Switch to Picker tool
      await ctx.getByText('Picker').click();
      await ctx.wait(30);

      // Zoom state should be preserved after tool switch
      await ctx.expect(ctx.getByText('400%')).toBeVisible();
      await ctx.expect(ctx.getByText('#000000')).toBeVisible(); // Color preserved

      // Zoom out once (halves to 200%)
      await ctx.getByText('-').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('200%')).toBeVisible();

      // Switch back to Pencil
      await ctx.getByText('Pencil').click();
      await ctx.wait(30);

      // All state should still be preserved
      await ctx.expect(ctx.getByText('200%')).toBeVisible();
      await ctx.expect(ctx.getByText('#000000')).toBeVisible();
    });

    test('should maintain UI consistency after rapid operations', async () => {
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
      await ctx.getByText('+').click();
      await ctx.wait(20);
      await ctx.getByText('+').click();
      await ctx.wait(20);
      await ctx.getByText('-').click();
      await ctx.wait(20);
      await ctx.getByText('+').click();
      await ctx.wait(100);

      // UI should still be functional
      await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Picker')).toBeVisible();
      await ctx.expect(ctx.getByText('+')).toBeVisible();
      await ctx.expect(ctx.getByText('-')).toBeVisible();

      // Color should still be visible
      await ctx.expect(ctx.getByText('#000000')).toBeVisible();
    });
  });

  describe('All UI Sections', () => {
    test('should display all UI sections consistently', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Left palette section
      await ctx.expect(ctx.getByText('Tools')).toBeVisible();

      // Bottom status section
      await ctx.expect(ctx.getByExactText('Open a file')).toBeVisible();

      // Tools
      await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Picker')).toBeVisible();

      // Zoom controls
      await ctx.expect(ctx.getByText('100%')).toBeVisible();
      await ctx.expect(ctx.getByText('+')).toBeVisible();
      await ctx.expect(ctx.getByText('-')).toBeVisible();

      // Color controls
      await ctx.expect(ctx.getByText('#000000')).toBeVisible();
      await ctx.expect(ctx.getByText('Pick FG')).toBeVisible();

      // Toolbar
      await ctx.expect(ctx.getByText('Open')).toBeVisible();
      await ctx.expect(ctx.getByText('Reset')).toBeVisible();
      await ctx.expect(ctx.getByText('Save')).toBeVisible();
    });
  });
});
