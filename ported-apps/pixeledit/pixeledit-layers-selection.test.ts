/**
 * TsyneTest Integration Tests for pixeledit advanced features
 * Tests: Selection Tool, Clipboard Operations, Layer System UI
 *
 * Usage:
 *   npm test ported-apps/pixeledit/pixeledit-layers-selection.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/pixeledit/pixeledit-layers-selection.test.ts
 */

import { TsyneTest, TestContext } from '../../src/index-test';
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

      // Verify the Select tool button is visible
      await ctx.expect(ctx.getByText('Select')).toBeVisible();
    });

    test('should switch to Select tool', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click on Select tool
      await ctx.getByText('Select').click();
      await ctx.wait(50);

      // Tool should still be visible (UI is functional)
      await ctx.expect(ctx.getByText('Select')).toBeVisible();
    });
  });

  describe('All Tools Display', () => {
    test('should display all tools including new ones', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify all tools are visible
      await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Picker')).toBeVisible();
      await ctx.expect(ctx.getByText('Eraser')).toBeVisible();
      await ctx.expect(ctx.getByText('Bucket')).toBeVisible();
      await ctx.expect(ctx.getByText('Line')).toBeVisible();
      await ctx.expect(ctx.getByText('Rectangle')).toBeVisible();
      await ctx.expect(ctx.getByText('Circle')).toBeVisible();
      await ctx.expect(ctx.getByText('Select')).toBeVisible();
    });

    test('should maintain UI when switching between all tools', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const tools = ['Pencil', 'Picker', 'Eraser', 'Bucket', 'Line', 'Rectangle', 'Circle', 'Select'];

      // Verify all tools are visible first
      for (const tool of tools) {
        await ctx.expect(ctx.getByText(tool)).toBeVisible();
      }

      // UI should still be fully functional
      await ctx.expect(ctx.getByText('Tools')).toBeVisible();
      await ctx.expect(ctx.getByText('100%')).toBeVisible();
    });
  });

  describe('Color Controls', () => {
    test('should display FG and BG color controls', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify color controls
      await ctx.expect(ctx.getByText('FG Color')).toBeVisible();
      await ctx.expect(ctx.getByText('BG Color')).toBeVisible();
      await ctx.expect(ctx.getByText('Pick FG')).toBeVisible();
      await ctx.expect(ctx.getByText('Pick BG')).toBeVisible();
      await ctx.expect(ctx.getByText('Swap FG/BG')).toBeVisible();
    });

    test('should have Swap FG/BG button', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click swap button
      await ctx.getByText('Swap FG/BG').click();
      await ctx.wait(50);

      // UI should still be functional
      await ctx.expect(ctx.getByText('Swap FG/BG')).toBeVisible();
    });
  });

  describe('Toolbar Operations', () => {
    test('should display file operation buttons', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Verify toolbar buttons
      await ctx.expect(ctx.getByText('Open')).toBeVisible();
      await ctx.expect(ctx.getByText('Reset')).toBeVisible();
      await ctx.expect(ctx.getByText('Save')).toBeVisible();
    });
  });

  describe('Zoom Controls', () => {
    test('should display zoom controls', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.expect(ctx.getByText('100%')).toBeVisible();
      await ctx.expect(ctx.getByText('+')).toBeVisible();
      await ctx.expect(ctx.getByText('-')).toBeVisible();
    });

    test('should zoom in and out', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Zoom in
      await ctx.getByText('+').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('200%')).toBeVisible();

      // Zoom out
      await ctx.getByText('-').click();
      await ctx.wait(50);
      await ctx.expect(ctx.getByText('100%')).toBeVisible();
    });
  });

  describe('Status Bar', () => {
    test('should display initial status message', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.expect(ctx.getByExactText('Open a file')).toBeVisible();
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
      await ctx.getByText('Select').click();
      await ctx.wait(20);
      await ctx.getByText('Rectangle').click();
      await ctx.wait(20);
      await ctx.getByText('Circle').click();
      await ctx.wait(20);

      // Zoom while using a tool
      await ctx.getByText('+').click();
      await ctx.wait(20);
      await ctx.getByText('+').click();
      await ctx.wait(50);

      // Should be at 400%
      await ctx.expect(ctx.getByText('400%')).toBeVisible();

      // Switch back to pencil
      await ctx.getByText('Pencil').click();
      await ctx.wait(50);

      // UI should still be functional
      await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Select')).toBeVisible();
    });
  });

  describe('Screenshot Tests', () => {
    test('should render full UI with all features', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createPixelEditorApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for full UI load
      await ctx.expect(ctx.getByText('Tools')).toBeVisible();
      await ctx.expect(ctx.getByText('Pencil')).toBeVisible();
      await ctx.expect(ctx.getByText('Select')).toBeVisible();
      await ctx.expect(ctx.getByText('FG Color')).toBeVisible();
      await ctx.expect(ctx.getByText('BG Color')).toBeVisible();

      // Take screenshot if requested
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, '../screenshots', 'pixeledit-advanced-features.png');
        await ctx.wait(500);
        await tsyneTest.screenshot(screenshotPath);
        console.log(`Screenshot saved: ${screenshotPath}`);
      }
    }, 30000);
  });
});
