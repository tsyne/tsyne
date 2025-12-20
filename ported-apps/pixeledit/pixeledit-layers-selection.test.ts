/**
 * TsyneTest Integration Tests for pixeledit advanced features
 * Tests: Selection Tool, Clipboard Operations, Layer System UI
 *
 * Usage:
 *   npm test ported-apps/pixeledit/pixeledit-layers-selection.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/pixeledit/pixeledit-layers-selection.test.ts
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createPixelEditorApp } from './pixeledit';
import * as path from 'path';

describe('Pixel Editor - Selection and Layers', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  describe('Selection Tool', () => {
    test('should display Select tool in toolbar', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('Select').within(2000).shouldExist();
    });

    test('should switch to Select tool', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('Select').within(2000).click();
      await ctx.getByText('Select').within(500).shouldExist();
    });
  });

  describe('All Tools Display', () => {
    test('should display all tools including new ones', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('Pencil').within(2000).shouldExist();
      await ctx.getByText('Eyedropper').within(500).shouldExist();
      await ctx.getByText('Eraser').within(500).shouldExist();
      await ctx.getByText('Bucket').within(500).shouldExist();
      await ctx.getByText('Line').within(500).shouldExist();
      await ctx.getByText('Rectangle').within(500).shouldExist();
      await ctx.getByText('Circle').within(500).shouldExist();
      await ctx.getByText('Select').within(500).shouldExist();
    });

    test('should maintain UI when switching between all tools', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const tools = ['Pencil', 'Eyedropper', 'Eraser', 'Bucket', 'Line', 'Rectangle', 'Circle', 'Select'];

      // Verify all tools are visible (first one gets longer timeout for app startup)
      await ctx.getByText(tools[0]).within(2000).shouldExist();
      for (const tool of tools.slice(1)) {
        await ctx.getByText(tool).within(500).shouldExist();
      }

      await ctx.getByID('zoom-level').within(1000).shouldExist();
    });
  });

  describe('Color Controls', () => {
    test('should display FG and BG color controls', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('FG').within(2000).shouldExist();
      await ctx.getByText('BG').within(500).shouldExist();
      await ctx.getByText('Fill').within(500).shouldExist();
    });

    test('should have swap colors button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // The swap button uses ⇄ symbol
      await ctx.getByText('⇄').within(2000).click();
      await ctx.getByText('⇄').within(500).shouldExist();
    });
  });

  describe('Toolbar Operations', () => {
    test('should display file operation buttons', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('Open').within(2000).shouldExist();
      await ctx.getByText('Reset').within(500).shouldExist();
      await ctx.getByText('Save').within(500).shouldExist();
    });
  });

  describe('Zoom Controls', () => {
    test('should display zoom controls', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('zoom-level').within(2000).shouldExist();
      await ctx.getByID('zoom-in').within(500).shouldExist();
      await ctx.getByID('zoom-out').within(500).shouldExist();
    });

    test('should zoom in and out', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('zoom-in').within(2000).click();
      await ctx.getByID('zoom-level').within(1000).shouldBe('200%');

      await ctx.getByID('zoom-out').within(500).click();
      await ctx.getByID('zoom-level').within(1000).shouldBe('100%');
    });
  });

  describe('Status Bar', () => {
    test('should display initial status message', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByExactText('Open a file').within(2000).shouldExist();
    });
  });

  describe('Complex Interactions', () => {
    test('should handle rapid tool switching with zoom', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Rapid tool switching
      await ctx.getByText('Select').within(2000).click();
      await ctx.getByText('Rectangle').within(500).click();
      await ctx.getByText('Circle').within(500).click();

      // Zoom while using a tool
      await ctx.getByID('zoom-in').within(500).click();
      await ctx.getByID('zoom-level').within(1000).shouldBe('200%');
      await ctx.getByID('zoom-in').within(500).click();

      // Should be at 400%
      await ctx.getByID('zoom-level').within(1000).shouldBe('400%');

      // Switch back to pencil
      await ctx.getByText('Pencil').within(500).click();

      // UI should still be functional
      await ctx.getByText('Pencil').within(500).shouldExist();
      await ctx.getByText('Select').within(500).shouldExist();
    });
  });

  describe('Screenshot Tests', () => {
    test('should render full UI with all features', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for full UI load - wait for first tool button and color labels
      await ctx.getByText('Pencil').within(2000).shouldExist();
      await ctx.getByText('Select').within(500).shouldExist();
      await ctx.getByText('FG').within(500).shouldExist();
      await ctx.getByText('BG').within(500).shouldExist();

      // Take screenshot if requested
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, 'screenshots', 'pixeledit-advanced-features.png');
        await tsyneTest.screenshot(screenshotPath);
        console.error(`Screenshot saved: ${screenshotPath}`);
      }
    }, 30000);

    test('should load image from URL for README screenshot', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        const editor = createPixelEditorApp(app);
        // Load NGA artwork after UI is built
        setTimeout(async () => {
          await editor.loadFromURL('https://api.nga.gov/iiif/382f0d18-13f7-4d42-8a39-053b781541e3/full/!400,400/0/default.jpg');
        }, 500);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for image to load - check for "Loaded:" in status
      await ctx.getByText('Loaded:').within(10000).shouldExist();

      // Take screenshot for README
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, 'screenshots', 'pixeledit-readme.png');
        await tsyneTest.screenshot(screenshotPath);
        console.error(`README screenshot saved: ${screenshotPath}`);
      }
    }, 30000);
  });
});
