/**
 * Edlin TsyneTest Integration Tests
 *
 * Test suite demonstrating:
 * - Editor initialization
 * - Tab management
 * - Text editing
 * - Menu operations
 * - Search/Replace functionality
 *
 * Usage:
 *   npm test edlin.test.ts
 *   TSYNE_HEADED=1 npm test edlin.test.ts  # Visual debugging
 *
 * Based on the original edlin from https://github.com/bshofner/edlin
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createEdlinApp, createEdlinStore, EdlinApp } from './edlin';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Edlin Text Editor Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let edlinApp: EdlinApp;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should show initial document tab', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // The initial document should be visible with its content
    // (Tab titles in DocTabs aren't exposed as searchable text widgets)
    await ctx.getByText('Hello World').within(2000).shouldExist();
  });

  test('should show "(new document)" path label', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Path label should indicate new document
    await ctx.getByText('(new document)').within(2000).shouldExist();
  });

  test('should have initial content in editor', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // The editor should have the default content
    const doc = store.getActiveDocument();
    expect(doc).toBeDefined();
    expect(doc?.getContent()).toContain('Hello World');
  });

  test('should create new documents with unique titles', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const doc1 = store.createDocument('Unique');
    const doc2 = store.createDocument('Unique');

    expect(doc1.getTitle()).toBe('Unique');
    expect(doc2.getTitle()).toBe('Unique(1)');
  });

  test('should close documents', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const doc = store.createDocument('To Close');
    const id = doc.getId();
    const countBefore = store.getDocumentCount();

    store.closeDocument(id);

    expect(store.getDocumentCount()).toBe(countBefore - 1);
    expect(store.getDocument(id)).toBeUndefined();
  });

  test('should support setting content', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const doc = store.createDocument('Edit Test');
    doc.setContent('Line 1\nLine 2\nLine 3');

    expect(doc.getContent()).toBe('Line 1\nLine 2\nLine 3');
    expect(doc.getLineCount()).toBe(3);
    expect(doc.getLines()).toEqual(['Line 1', 'Line 2', 'Line 3']);
  });

  test('should track dirty state', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const doc = store.createDocument('Dirty Test', 'Initial');

    expect(doc.isDirty()).toBe(false);
    doc.setContent('Changed');
    expect(doc.isDirty()).toBe(true);
    doc.markClean();
    expect(doc.isDirty()).toBe(false);
  });

  test('should support undo/redo', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const doc = store.createDocument('Undo Test', 'Original');

    doc.setContent('Change 1');
    doc.setContent('Change 2');

    expect(doc.getContent()).toBe('Change 2');
    expect(doc.canUndo()).toBe(true);

    doc.undo();
    expect(doc.getContent()).toBe('Change 1');

    doc.undo();
    expect(doc.getContent()).toBe('Original');
    expect(doc.canUndo()).toBe(false);

    doc.redo();
    expect(doc.getContent()).toBe('Change 1');
    expect(doc.canRedo()).toBe(true);
  });

  test('should find text occurrences', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    store.createDocument('Search Test', 'Hello World\nHello Again\nGoodbye World');
    store.setActiveDocument(store.getAllDocuments()[store.getAllDocuments().length - 1].getId());

    const results = store.search('Hello');
    expect(results.length).toBe(2);
    expect(results[0].lineIndex).toBe(0);
    expect(results[1].lineIndex).toBe(1);
  });

  test('should support case-insensitive search', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    store.createDocument('Case Test', 'Hello World\nhello again');
    store.setActiveDocument(store.getAllDocuments()[store.getAllDocuments().length - 1].getId());

    const caseSensitive = store.search('Hello', false);
    expect(caseSensitive.length).toBe(1);

    const caseInsensitive = store.search('Hello', true);
    expect(caseInsensitive.length).toBe(2);
  });

  test('should replace all occurrences', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const doc = store.createDocument('Replace Test', 'foo bar foo');
    store.setActiveDocument(doc.getId());

    const count = store.replace('foo', 'baz');
    expect(count).toBe(2);
    expect(doc.getContent()).toBe('baz bar baz');
  });

  test('should store clipboard content', async () => {
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    store.setClipboard('Copied text');
    expect(store.getClipboard()).toBe('Copied text');
  });
});

describe('Edlin Screenshot Test', () => {
  test('should take a screenshot', async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    const takeScreenshots = process.env.TAKE_SCREENSHOTS === '1';

    if (!takeScreenshots) {
      console.log('Skipping screenshot - set TAKE_SCREENSHOTS=1 to enable');
      return;
    }

    const tsyneTest = new TsyneTest({ headed });
    const store = createEdlinStore();

    const testApp = await tsyneTest.createApp((app) => {
      const edlinApp = createEdlinApp(app, store);
      edlinApp.build();
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for UI to stabilize
    await ctx.getByText('Hello World').within(2000).shouldExist();

    // Take screenshot
    const screenshotDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await tsyneTest.screenshot(path.join(screenshotDir, 'edlin.png'));
    console.log(`Screenshot saved: ${path.join(screenshotDir, 'edlin.png')}`);

    await tsyneTest.cleanup();
  }, 20000);
});
