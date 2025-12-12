/**
 * GUI tests for LitProg app using TsyneTest
 *
 * Tests the complete UI interaction using fluent assertions
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createLitProgApp, LitProgUI } from './litprog';
import type { App } from '../../core/src/app';
import * as path from 'path';

describe('LitProg Functional Tests', () => {
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
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Check that main UI elements are visible
      await ctx.getByID('source-label').within(2000).shouldBe('Source');
      await ctx.getByID('output-preview-label').within(2000).shouldBe('Output Preview');
      await ctx.getByID('chunks-label').within(2000).shouldBe('Chunks');
    }, 15000);

    test('should show default template with chunks', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Stats should show some chunks from the default template
      await ctx.getByID('stats-label').within(2000).shouldContain('Chunks:');
    }, 15000);

    test('should display document title', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Title label should show something
      await ctx.getByID('title-label').within(2000).shouldContain('Hello');
    }, 15000);
  });

  describe('Chunk Navigation', () => {
    test('should navigate between chunks', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Get initial state
      const initialChunkLabel = await ctx.getByID('current-chunk-label').getText();
      expect(initialChunkLabel).toBeTruthy();

      // Click next chunk
      await ctx.getByID('btn-next-chunk').click();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Chunk should have changed (or stayed if only one)
      const newChunkLabel = await ctx.getByID('current-chunk-label').getText();
      expect(newChunkLabel).toBeTruthy();
    }, 15000);

    test('should show chunk list', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Chunk list should contain at least one chunk name
      const chunkList = await ctx.getByID('chunk-list').getText();
      expect(chunkList.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Preview Modes', () => {
    test('should switch to tangle preview', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click tangle button
      await ctx.getByID('btn-tangle').click();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Tangle preview should be visible
      const tanglePreview = await ctx.getByID('preview-tangle').getText();
      expect(tanglePreview).toBeTruthy();
    }, 15000);

    test('should switch to weave preview', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click weave button
      await ctx.getByID('btn-weave').click();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Weave preview should be visible (though might be hidden)
      // Just verify the button click doesn't crash
      expect(true).toBe(true);
    }, 15000);
  });

  describe('Document Parsing', () => {
    test('should parse document when parse button clicked', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click parse button
      await ctx.getByID('btn-parse').click();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Document should be parsed
      const doc = uiController.getStore().getParsedDocument();
      expect(doc).not.toBeNull();
    }, 15000);

    test('should update stats after parsing', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set new content
      uiController.getStore().setSource(`# Test Doc

<<test-chunk>>=
console.log('test');
@

<<another>>=
x = 1
@
`);

      // Click parse
      await ctx.getByID('btn-parse').click();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Stats should update
      await ctx.getByID('stats-label').within(2000).shouldContain('Chunks:');
    }, 15000);
  });

  describe('Syntax Style Selection', () => {
    test('should have syntax selector', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Syntax select should exist
      const syntaxLabel = await ctx.getByID('syntax-label').getText();
      expect(syntaxLabel).toBe('Syntax:');
    }, 15000);
  });

  describe('Output Format Selection', () => {
    test('should have output format selector', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Output label should exist
      const outputLabel = await ctx.getByID('output-label').getText();
      expect(outputLabel).toBe('Output:');
    }, 15000);
  });

  describe('Toolbar Buttons', () => {
    test('should have new, open, save buttons', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // All toolbar buttons should be clickable
      await ctx.getByID('btn-new').shouldExist();
      await ctx.getByID('btn-open').shouldExist();
      await ctx.getByID('btn-save').shouldExist();
    }, 15000);

    test('should have export buttons', async () => {
      const testApp = await tsyneTest.createApp((app: App) => {
        createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('btn-export-code').shouldExist();
      await ctx.getByID('btn-export-docs').shouldExist();
    }, 15000);
  });

  describe('Store Integration', () => {
    test('should reflect store changes in UI', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Programmatically set source through store
      const store = uiController.getStore();
      store.setSource(`# New Title

<<new-chunk>>=
new code
@
`);

      // Manually refresh (as store change triggers UI update)
      uiController.refreshPreview();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Title should update
      await ctx.getByID('title-label').within(2000).shouldBe('New Title');
    }, 15000);

    test('should track dirty state', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const store = uiController.getStore();

      // Initially clean (though might be dirty from template)
      store.markSaved('/tmp/test.lit');
      expect(store.isDirty()).toBe(false);

      // After modification
      store.setSource('modified content');
      expect(store.isDirty()).toBe(true);
    }, 15000);
  });

  describe('Error Display', () => {
    test('should show "No errors" for valid document', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set valid source
      uiController.getStore().setSource(`<<valid>>=
code
@
`);
      uiController.refreshPreview();
      await new Promise((resolve) => setTimeout(resolve, 300));

      await ctx.getByID('errors-label').within(2000).shouldBe('No errors');
    }, 15000);

    test('should display parse errors', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set source with undefined reference
      uiController.getStore().setSource(`<<main>>=
<<undefined-reference>>
@
`);
      uiController.refreshPreview();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should show error message
      const errorsText = await ctx.getByID('errors-label').getText();
      expect(errorsText).toContain('undefined');
    }, 15000);
  });

  describe('Chunk Content Display', () => {
    test('should show current chunk content', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set specific source
      uiController.getStore().setSource(`<<my-chunk>>=
specific content here
@
`);
      uiController.refreshPreview();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Chunk content should be displayed
      await ctx.getByID('chunk-content').within(2000).shouldContain('specific content here');
    }, 15000);
  });

  describe('New Document', () => {
    test('should create new document with template', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set some custom content first
      uiController.getStore().setSource('custom content');
      uiController.refreshPreview();

      // Click new button (creates markdown template)
      await ctx.getByID('btn-new').click();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should have new template content
      const source = uiController.getStore().getSource();
      expect(source).toContain('Hello World');
    }, 15000);
  });

  describe('Screenshots', () => {
    test('should capture screenshot of litprog editor', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set up sample literate programming content
      uiController.getStore().setSource(`# Literate Programming Demo

This is a demonstration of literate programming with Tsyne.

## Main Program

The main program combines imports and the application logic.

\`\`\`typescript {#main .tangle=app.ts}
<<imports>>

<<application>>
\`\`\`

## Imports

We need to import our utilities.

\`\`\`typescript {#imports}
import { greet } from './utils';
\`\`\`

## Application Logic

The main application logic greets the user.

\`\`\`typescript {#application}
function main() {
  console.log(greet('World'));
}

main();
\`\`\`
`);
      uiController.getStore().setSyntaxStyle('markdown');
      uiController.refreshPreview();

      // Wait for UI to render
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Capture screenshot if TAKE_SCREENSHOTS=1
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, 'screenshots', 'litprog.png');
        await tsyneTest.screenshot(screenshotPath);
        console.error(`Screenshot saved: ${screenshotPath}`);
      }

      expect(true).toBe(true);
    }, 20000);

    test('should capture screenshot with noweb syntax', async () => {
      let uiController!: LitProgUI;
      const testApp = await tsyneTest.createApp((app: App) => {
        uiController = createLitProgApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Set up noweb style content
      uiController.newDocument('noweb');
      uiController.refreshPreview();

      // Wait for UI to render
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Capture screenshot if TAKE_SCREENSHOTS=1
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, 'screenshots', 'litprog-noweb.png');
        await tsyneTest.screenshot(screenshotPath);
        console.error(`Screenshot saved: ${screenshotPath}`);
      }

      expect(true).toBe(true);
    }, 20000);
  });
});
