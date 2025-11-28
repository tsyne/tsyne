/**
 * Functional tests for Slydes app using TsyneTest
 *
 * Tests the complete UI interaction using fluent assertions
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createSlydesApp, SlydesUI } from './slydes';
import type { App } from '../../src/app';
import * as path from 'path';

describe('Slydes Functional Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  describe('Initial UI State', () => {
    test('should display editor and preview on startup', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Check that main UI elements are visible
      await ctx.getByID('editor-label').within(2000).shouldBe('Markdown Editor');
      await ctx.getByID('preview-label').within(2000).shouldBe('Preview');
      await ctx.getByID('slide-count').within(2000).shouldContain('slides');
    }, 10000);

    test('should show default slide content', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Check preview shows first slide
      await ctx.getByID('current-slide').within(2000).shouldContain('Slide 1');
    }, 10000);
  });

  describe('Editor Functionality', () => {
    test('should update preview when markdown is set', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Use the store directly to set markdown
      uiController.getStore().setMarkdown('# Testing\n\nTest content');

      // Wait a moment for update
      await new Promise(resolve => setTimeout(resolve, 300));

      // Preview should update
      await ctx.getByID('preview-heading').within(2000).shouldBe('Testing');
    }, 10000);

    test('should parse multiple slides', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Use the store to set multi-slide markdown
      uiController.getStore().setMarkdown('# Slide 1\n---\n# Slide 2\n---\n# Slide 3');

      await new Promise(resolve => setTimeout(resolve, 300));

      // Should show 3 slides
      await ctx.getByID('slide-count').within(2000).shouldBe('3 slides');
    }, 10000);
  });

  describe('Navigation Controls', () => {
    test('should navigate to next slide', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set up multi-slide content
      uiController.getStore().setMarkdown('# First\n---\n# Second\n---\n# Third');

      await new Promise(resolve => setTimeout(resolve, 300));

      // Initially on slide 1
      await ctx.getByID('preview-heading').within(2000).shouldBe('First');
      await ctx.getByID('current-slide').within(2000).shouldContain('Slide 1 of 3');

      // Click next
      await ctx.getByID('preview-next').click();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should be on slide 2
      await ctx.getByID('preview-heading').within(2000).shouldBe('Second');
      await ctx.getByID('current-slide').within(2000).shouldContain('Slide 2 of 3');
    }, 10000);

    test('should navigate to previous slide', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set up multi-slide content
      uiController.getStore().setMarkdown('# First\n---\n# Second\n---\n# Third');

      await new Promise(resolve => setTimeout(resolve, 300));

      // Go to slide 2
      await ctx.getByID('preview-next').click();
      await new Promise(resolve => setTimeout(resolve, 200));

      await ctx.getByID('preview-heading').within(2000).shouldBe('Second');

      // Go back to slide 1
      await ctx.getByID('preview-prev').click();
      await new Promise(resolve => setTimeout(resolve, 200));

      await ctx.getByID('preview-heading').within(2000).shouldBe('First');
      await ctx.getByID('current-slide').within(2000).shouldContain('Slide 1 of 3');
    }, 10000);

    test('should handle navigation boundaries', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set up 2 slides
      uiController.getStore().setMarkdown('# First\n---\n# Second');

      await new Promise(resolve => setTimeout(resolve, 300));

      // Try to go previous from first slide (should stay on first)
      await ctx.getByID('preview-prev').click();
      await new Promise(resolve => setTimeout(resolve, 200));

      await ctx.getByID('preview-heading').within(2000).shouldBe('First');

      // Go to last slide
      await ctx.getByID('preview-next').click();
      await new Promise(resolve => setTimeout(resolve, 200));

      await ctx.getByID('preview-heading').within(2000).shouldBe('Second');

      // Try to go next from last slide (should stay on last)
      await ctx.getByID('preview-next').click();
      await new Promise(resolve => setTimeout(resolve, 200));

      await ctx.getByID('preview-heading').within(2000).shouldBe('Second');
    }, 10000);
  });

  describe('Button Actions', () => {
    test('should create new presentation', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click New button
      await ctx.getByID('btn-new').click();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should show new presentation content
      await ctx.getByID('preview-heading').within(2000).shouldBe('New Presentation');
    }, 10000);

    test('should add new slide', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Start with simple content
      uiController.getStore().setMarkdown('# Only Slide');

      await new Promise(resolve => setTimeout(resolve, 300));

      await ctx.getByID('slide-count').within(2000).shouldBe('1 slides');

      // Add a slide
      await ctx.getByID('btn-add-slide').click();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should now have 2 slides
      await ctx.getByID('slide-count').within(2000).shouldBe('2 slides');
    }, 10000);
  });

  describe('Heading and Subheading Display', () => {
    test('should display heading and subheading', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      uiController.getStore().setMarkdown('# Main Title\n## Subtitle\n\nContent here');

      await new Promise(resolve => setTimeout(resolve, 300));

      await ctx.getByID('preview-heading').within(2000).shouldBe('Main Title');
      await ctx.getByID('preview-subheading').within(2000).shouldBe('Subtitle');
      await ctx.getByID('preview-content').within(2000).shouldContain('Content here');
    }, 10000);

    test('should hide subheading when not present', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      uiController.getStore().setMarkdown('# Just Title\n\nContent');

      await new Promise(resolve => setTimeout(resolve, 300));

      await ctx.getByID('preview-heading').within(2000).shouldBe('Just Title');
      // Subheading should be hidden (empty text)
      await ctx.getByID('preview-subheading').within(2000).shouldBe('');
    }, 10000);
  });

  describe('Presentation Mode', () => {
    test('should open presentation window', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set up content
      uiController.getStore().setMarkdown('# Presentation Test\n\nTest content');

      await new Promise(resolve => setTimeout(resolve, 300));

      // Click Present button
      await ctx.getByID('btn-present').click();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Presentation window should show content
      await ctx.getByID('presentation-heading').within(2000).shouldBe('Presentation Test');
      await ctx.getByID('presentation-status').within(2000).shouldMatch(/1 \/ \d+/);
    }, 10000);

    test('should navigate in presentation mode', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set up multi-slide content
      uiController.getStore().setMarkdown('# Slide A\n---\n# Slide B');

      await new Promise(resolve => setTimeout(resolve, 300));

      // Open presentation
      await ctx.getByID('btn-present').click();
      await new Promise(resolve => setTimeout(resolve, 500));

      await ctx.getByID('presentation-heading').within(2000).shouldBe('Slide A');

      // Navigate to next
      await ctx.getByID('btn-next').click();
      await new Promise(resolve => setTimeout(resolve, 200));

      await ctx.getByID('presentation-heading').within(2000).shouldBe('Slide B');

      // Navigate back
      await ctx.getByID('btn-prev').click();
      await new Promise(resolve => setTimeout(resolve, 200));

      await ctx.getByID('presentation-heading').within(2000).shouldBe('Slide A');
    }, 10000);
  });

  describe('Screenshots', () => {
    test('should capture screenshot', async () => {
      let uiController!: SlydesUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createSlydesApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set up sample presentation content
      uiController.getStore().setMarkdown('# Welcome to Slydes\n## A Markdown Presentation App\n\nCreate beautiful presentations with simple markdown syntax.\n---\n# Features\n\n- Write in Markdown\n- Live preview\n- Full-screen presentation mode');

      // Wait for UI to render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Capture screenshot if TAKE_SCREENSHOTS=1
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, '../screenshots', 'slydes.png');
        await tsyneTest.screenshot(screenshotPath);
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      }

      expect(true).toBe(true);
    }, 15000);
  });
});
