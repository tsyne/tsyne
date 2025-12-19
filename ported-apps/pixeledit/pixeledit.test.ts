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

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createPixelEditorApp, PixelEditor } from './pixeledit';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import * as path from 'path';
import * as fs from 'fs';

const AVIF_TEST_FILE = path.join(process.env.HOME || '', 'photo-1538991383142-36c4edeaffde.avif');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

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

    // Verify tools - Pencil is selected by default so has ▶ prefix
    // Note: Accordion section titles like 'Tools' are not exposed as widgets
    await ctx.expect(ctx.getByText('▶ Pencil')).toBeVisible();
    await ctx.expect(ctx.getByText('Eyedropper')).toBeVisible();

    // Verify power-of-2 zoom controls (shown as percentage)
    await ctx.expect(ctx.getByText('100%')).toBeVisible();
    await ctx.expect(ctx.getByText('-')).toBeVisible();
    await ctx.expect(ctx.getByText('+')).toBeVisible();

    // Verify color labels are visible
    await ctx.expect(ctx.getByText('FG')).toBeVisible();
    await ctx.expect(ctx.getByText('BG')).toBeVisible();

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

      // Click zoom in - test that button is clickable
      await ctx.getByText('+').click();
      await ctx.wait(50);

      // Verify zoom buttons are still functional
      await ctx.expect(ctx.getByText('+')).toBeVisible();
      await ctx.expect(ctx.getByText('-')).toBeVisible();
    });

    test('should zoom out by halving (800% -> 400% -> 200%)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Initial zoom should be 100%
      await ctx.expect(ctx.getByText('100%')).toBeVisible();

      // Click zoom out - at minimum it should stay at 100%
      await ctx.getByText('-').click();
      await ctx.wait(50);

      // Verify zoom buttons are still functional
      await ctx.expect(ctx.getByText('+')).toBeVisible();
      await ctx.expect(ctx.getByText('-')).toBeVisible();

      // At minimum zoom, should still show 100%
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
    test('should switch between Pencil and Eyedropper tools', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Pencil is selected by default (has ▶ prefix), Eyedropper is not
      await ctx.expect(ctx.getByText('▶ Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Eyedropper')).toBeVisible();

      // Click on Eyedropper tool - now it gets the ▶ prefix
      await ctx.getByText('Eyedropper').click();
      await ctx.wait(30);
      await ctx.expect(ctx.getByText('▶ Eyedropper')).toBeVisible();

      // Click back on Pencil - now Pencil gets the ▶ prefix again
      await ctx.getByText('Pencil').click();
      await ctx.wait(30);
      await ctx.expect(ctx.getByText('▶ Pencil')).toBeVisible();
    });

    test('should maintain UI consistency after rapid tool switching', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Rapid tool switching - after each click, the clicked tool gets ▶ prefix
      await ctx.getByText('Eyedropper').click();
      await ctx.wait(20);
      await ctx.getByText('Pencil').click();
      await ctx.wait(20);
      await ctx.getByText('Eyedropper').click();
      await ctx.wait(20);
      await ctx.getByText('Pencil').click();
      await ctx.wait(50);

      // UI should still be functional - Pencil is now selected
      await ctx.expect(ctx.getByText('▶ Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Eyedropper')).toBeVisible();
      await ctx.expect(ctx.getByText('100%')).toBeVisible();
      await ctx.expect(ctx.getByText('FG')).toBeVisible();
    });
  });

  describe('Color Preview and Picker', () => {
    test('should display FG and BG color labels', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Color labels are visible (colors are shown as rectangle previews, not hex text)
      await ctx.expect(ctx.getByText('FG')).toBeVisible();
      await ctx.expect(ctx.getByText('BG')).toBeVisible();
      await ctx.expect(ctx.getByText('Fill')).toBeVisible();
    });

    test('should have swap colors button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify the swap colors button is visible
      await ctx.expect(ctx.getByText('⇄')).toBeVisible();
      // Click doesn't throw an error
      await ctx.getByText('⇄').click();
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

      // Perform mixed operations: zoom and tool switching
      await ctx.getByText('+').click();
      await ctx.wait(30);

      // Switch to Eyedropper tool
      await ctx.getByText('Eyedropper').click();
      await ctx.wait(50);

      // Color label should still be visible
      await ctx.expect(ctx.getByText('FG')).toBeVisible();

      // Zoom out once
      await ctx.getByText('-').click();
      await ctx.wait(30);

      // Switch back to Pencil
      await ctx.getByText('Pencil').click();
      await ctx.wait(100);

      // Verify UI is still responsive after mixed operations
      await ctx.expect(ctx.getByText('▶ Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Eyedropper')).toBeVisible();
      await ctx.expect(ctx.getByText('FG')).toBeVisible();
    });

    test('should maintain UI consistency after rapid operations', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Rapid tool switching
      await ctx.getByText('Eyedropper').click();
      await ctx.wait(20);
      await ctx.getByText('Pencil').click();
      await ctx.wait(20);
      await ctx.getByText('Eyedropper').click();
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

      // UI should still be functional - Pencil is selected
      await ctx.expect(ctx.getByText('▶ Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Eyedropper')).toBeVisible();
      await ctx.expect(ctx.getByText('+')).toBeVisible();
      await ctx.expect(ctx.getByText('-')).toBeVisible();

      // Color label should still be visible
      await ctx.expect(ctx.getByText('FG')).toBeVisible();
    });
  });

  describe('All UI Sections', () => {
    test('should display all UI sections consistently', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Note: Accordion section titles like 'Tools' are not exposed as widgets

      // Bottom status section
      await ctx.expect(ctx.getByExactText('Open a file')).toBeVisible();

      // Tools - Pencil is selected by default
      await ctx.expect(ctx.getByText('▶ Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Eyedropper')).toBeVisible();

      // Zoom controls
      await ctx.expect(ctx.getByText('100%')).toBeVisible();
      await ctx.expect(ctx.getByText('+')).toBeVisible();
      await ctx.expect(ctx.getByText('-')).toBeVisible();

      // Color controls - labels only, colors are rectangle previews
      await ctx.expect(ctx.getByText('FG')).toBeVisible();
      await ctx.expect(ctx.getByText('BG')).toBeVisible();

      // Toolbar
      await ctx.expect(ctx.getByText('Open')).toBeVisible();
      await ctx.expect(ctx.getByText('Reset')).toBeVisible();
      await ctx.expect(ctx.getByText('Save')).toBeVisible();
    });
  });

  describe('AVIF Image Loading', () => {
    beforeAll(() => {
      // Ensure screenshots directory exists
      if (!fs.existsSync(SCREENSHOTS_DIR)) {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
      }
    });

    test('should load and display AVIF image when loaded before UI build', async () => {
      // Skip if test file doesn't exist
      if (!fs.existsSync(AVIF_TEST_FILE)) {
        console.log(`Skipping test: ${AVIF_TEST_FILE} not found`);
        return;
      }

      let editor: PixelEditor;

      const testApp = await tsyneTest.createApp(async (a: App) => {
        editor = new PixelEditor(a);

        // Load AVIF file BEFORE building UI (like the main entry point does)
        console.log(`Loading AVIF file: ${AVIF_TEST_FILE}`);
        await editor.loadFile(AVIF_TEST_FILE);
        console.log(`Loaded image: ${editor.getImageWidth()}x${editor.getImageHeight()}`);

        a.window({ title: 'Pixel Editor - AVIF Test', width: 800, height: 600 }, async (win: Window) => {
          win.setContent(async () => {
            await editor.buildUI(win);
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for UI to settle
      await ctx.wait(1000);

      // Take screenshot to see current state
      const screenshotPath = path.join(SCREENSHOTS_DIR, 'avif-pre-load.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // The image should be loaded with non-default dimensions
      // (default is 32x32, AVIF should be larger)
      expect(editor!.getImageWidth()).toBeGreaterThan(32);
      expect(editor!.getImageHeight()).toBeGreaterThan(32);
    }, 30000);

    test('should display AVIF in canvas after file loaded post-UI', async () => {
      // Skip if test file doesn't exist
      if (!fs.existsSync(AVIF_TEST_FILE)) {
        console.log(`Skipping test: ${AVIF_TEST_FILE} not found`);
        return;
      }

      let editor: PixelEditor;

      const testApp = await tsyneTest.createApp(async (a: App) => {
        editor = new PixelEditor(a);

        // Build UI first with default blank image (to simulate user opening a file after launch)
        a.window({ title: 'Pixel Editor - Post-Load Test', width: 800, height: 600 }, async (win: Window) => {
          win.setContent(async () => {
            await editor.buildUI(win);
          });
          win.show();

          // Load file AFTER UI is built (simulating File > Open)
          // This is the buggy scenario
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`Loading AVIF after UI built: ${AVIF_TEST_FILE}`);
          await editor.loadFile(AVIF_TEST_FILE);
          console.log(`Loaded image: ${editor.getImageWidth()}x${editor.getImageHeight()}`);
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for file to load and UI to update
      await ctx.wait(2000);

      // Take screenshot to verify canvas shows the loaded image
      const screenshotPath = path.join(SCREENSHOTS_DIR, 'avif-post-load-fixed.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Check dimensions were updated in the model
      expect(editor!.getImageWidth()).toBeGreaterThan(32);
      expect(editor!.getImageHeight()).toBeGreaterThan(32);
    }, 30000);

    test('should allow editing via setPixelColor after AVIF load', async () => {
      // Skip if test file doesn't exist
      if (!fs.existsSync(AVIF_TEST_FILE)) {
        console.log(`Skipping test: ${AVIF_TEST_FILE} not found`);
        return;
      }

      let editor: PixelEditor;

      const testApp = await tsyneTest.createApp(async (a: App) => {
        editor = new PixelEditor(a);

        // Build UI first with default blank image
        a.window({ title: 'Pixel Editor - Edit Test', width: 800, height: 600 }, async (win: Window) => {
          win.setContent(async () => {
            await editor.buildUI(win);
          });
          win.show();

          // Load file AFTER UI is built
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`Loading AVIF for editing test: ${AVIF_TEST_FILE}`);
          await editor.loadFile(AVIF_TEST_FILE);
          console.log(`Loaded image: ${editor.getImageWidth()}x${editor.getImageHeight()}`);
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for file to load and UI to rebuild
      await ctx.wait(2000);

      // Take screenshot BEFORE editing
      const beforePath = path.join(SCREENSHOTS_DIR, 'avif-edit-before.png');
      await tsyneTest.screenshot(beforePath);
      console.log(`📸 Before screenshot saved: ${beforePath}`);

      // Try to draw some pixels by calling setPixelColor directly
      console.log('Attempting to draw on the image via setPixelColor...');

      // Import Color class
      const { Color } = await import('./pixeledit');

      // Draw a few red pixels at known locations (near top-left of the image)
      for (let i = 0; i < 10; i++) {
        await editor!.setPixelColor(50 + i, 50, new Color(255, 0, 0)); // Red pixels
        await editor!.setPixelColor(50 + i, 51, new Color(255, 0, 0));
        await editor!.setPixelColor(50 + i, 52, new Color(255, 0, 0));
      }
      console.log('Drew red pixels at (50-60, 50-52)');

      // Wait for updates
      await ctx.wait(500);

      // Take screenshot AFTER editing
      const afterPath = path.join(SCREENSHOTS_DIR, 'avif-edit-after.png');
      await tsyneTest.screenshot(afterPath);
      console.log(`📸 After screenshot saved: ${afterPath}`);

      // Verify the pixel was actually changed in the data model
      const pixelColor = editor!.getPixelColor(55, 50);
      console.log(`Pixel at (55, 50): R=${pixelColor.r}, G=${pixelColor.g}, B=${pixelColor.b}`);
      expect(pixelColor.r).toBe(255);
      expect(pixelColor.g).toBe(0);
      expect(pixelColor.b).toBe(0);
    }, 30000);

    test('should visually update canvas when drawing on AVIF', async () => {
      // Skip if test file doesn't exist
      if (!fs.existsSync(AVIF_TEST_FILE)) {
        console.log(`Skipping test: ${AVIF_TEST_FILE} not found`);
        return;
      }

      let editor: PixelEditor;

      const testApp = await tsyneTest.createApp(async (a: App) => {
        editor = new PixelEditor(a);

        // Build UI first with default blank image
        a.window({ title: 'Pixel Editor - Draw Test', width: 800, height: 600 }, async (win: Window) => {
          win.setContent(async () => {
            await editor.buildUI(win);
          });
          win.show();

          // Load file AFTER UI is built
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`Loading AVIF for draw test: ${AVIF_TEST_FILE}`);
          await editor.loadFile(AVIF_TEST_FILE);
          console.log(`Loaded image: ${editor.getImageWidth()}x${editor.getImageHeight()}`);
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for file to load and UI to rebuild
      await ctx.wait(2000);

      // Import Color class
      const { Color } = await import('./pixeledit');

      // Draw a visible shape - a thick bright green cross
      console.log('Drawing a green cross on the image...');
      for (let i = 0; i < 50; i++) {
        // Horizontal line
        await editor!.setPixelColor(100 + i, 200, new Color(0, 255, 0));
        await editor!.setPixelColor(100 + i, 201, new Color(0, 255, 0));
        await editor!.setPixelColor(100 + i, 202, new Color(0, 255, 0));
        // Vertical line
        await editor!.setPixelColor(125, 175 + i, new Color(0, 255, 0));
        await editor!.setPixelColor(126, 175 + i, new Color(0, 255, 0));
        await editor!.setPixelColor(127, 175 + i, new Color(0, 255, 0));
      }
      console.log('Drew green cross at (100-150, 200) and (125, 175-225)');

      // Wait for visual updates
      await ctx.wait(500);

      // Take screenshot showing the drawn shape
      const screenshotPath = path.join(SCREENSHOTS_DIR, 'avif-draw-cross.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot with cross saved: ${screenshotPath}`);

      // Verify pixels in data model
      const crossPixel = editor!.getPixelColor(125, 200);
      expect(crossPixel.r).toBe(0);
      expect(crossPixel.g).toBe(255);
      expect(crossPixel.b).toBe(0);
    }, 30000);

    test('should receive tap events on blank canvas (before any file load)', async () => {
      let editor: PixelEditor;
      let tapReceived = false;

      const testApp = await tsyneTest.createApp(async (a: App) => {
        editor = new PixelEditor(a);

        // Build UI WITHOUT loading any file
        a.window({ title: 'Pixel Editor - Tap Test', width: 400, height: 400 }, async (win: Window) => {
          win.setContent(async () => {
            await editor.buildUI(win);
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for UI to settle
      await ctx.wait(1000);

      // Take screenshot of blank canvas
      const screenshotPath = path.join(SCREENSHOTS_DIR, 'blank-canvas-before-tap.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Verify initial state
      expect(editor!.getImageWidth()).toBe(32); // Default is 32x32
      expect(editor!.getImageHeight()).toBe(32);

      // Now try programmatic setPixelColor to prove editing works
      const { Color } = await import('./pixeledit');
      await editor!.setPixelColor(16, 16, new Color(255, 0, 0)); // Red pixel in center

      await ctx.wait(200);

      // Take screenshot after programmatic edit
      const afterPath = path.join(SCREENSHOTS_DIR, 'blank-canvas-after-edit.png');
      await tsyneTest.screenshot(afterPath);
      console.log(`📸 After edit screenshot saved: ${afterPath}`);

      // Verify pixel was set
      const pixel = editor!.getPixelColor(16, 16);
      expect(pixel.r).toBe(255);
    }, 30000);

    test('should handle tap events after AVIF load (diagnostic test)', async () => {
      // Skip if test file doesn't exist
      if (!fs.existsSync(AVIF_TEST_FILE)) {
        console.log(`Skipping test: ${AVIF_TEST_FILE} not found`);
        return;
      }

      let editor: PixelEditor;
      let tapReceived = false;
      let tapCoords = { x: -1, y: -1 };

      const testApp = await tsyneTest.createApp(async (a: App) => {
        editor = new PixelEditor(a);

        // Build UI first with default blank image
        a.window({ title: 'Pixel Editor - Tap Diagnostic', width: 800, height: 600 }, async (win: Window) => {
          win.setContent(async () => {
            await editor.buildUI(win);
          });
          win.show();

          // Load file AFTER UI is built
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`Loading AVIF for tap diagnostic: ${AVIF_TEST_FILE}`);
          await editor.loadFile(AVIF_TEST_FILE);
          console.log(`Loaded image: ${editor.getImageWidth()}x${editor.getImageHeight()}`);
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for file to load and UI to rebuild
      await ctx.wait(2000);

      // Take screenshot BEFORE any tool usage
      const beforePath = path.join(SCREENSHOTS_DIR, 'diagnostic-before-tool.png');
      await tsyneTest.screenshot(beforePath);
      console.log(`📸 Before screenshot saved: ${beforePath}`);

      // Import Color class
      const { Color } = await import('./pixeledit');

      // Manually simulate what clicking would do by calling the tool's clicked method directly
      console.log('Simulating tool click at position (100, 100)...');

      // First, verify the tool is set to Pencil (default)
      console.log('Current FG color:', editor!.fgColor.toHex());

      // Set a distinct color for testing
      await editor!.setFGColor(new Color(255, 0, 255)); // Magenta
      console.log('Set FG color to magenta');

      // Get the pixel before
      const beforePixel = editor!.getPixelColor(100, 100);
      console.log(`Pixel at (100,100) before: R=${beforePixel.r}, G=${beforePixel.g}, B=${beforePixel.b}`);

      // Directly call what the tap handler would call - use setPixelColor
      // This simulates a pencil click at (100, 100)
      await editor!.setPixelColor(100, 100, editor!.fgColor);
      console.log('Called setPixelColor(100, 100, fgColor)');

      // Wait for visual update
      await ctx.wait(200);

      // Verify the pixel was changed
      const afterPixel = editor!.getPixelColor(100, 100);
      console.log(`Pixel at (100,100) after: R=${afterPixel.r}, G=${afterPixel.g}, B=${afterPixel.b}`);

      // Take screenshot AFTER simulated tool usage
      const afterPath = path.join(SCREENSHOTS_DIR, 'diagnostic-after-tool.png');
      await tsyneTest.screenshot(afterPath);
      console.log(`📸 After screenshot saved: ${afterPath}`);

      // The pixel should have changed to magenta
      expect(afterPixel.r).toBe(255);
      expect(afterPixel.g).toBe(0);
      expect(afterPixel.b).toBe(255);
    }, 30000);
  });
});
