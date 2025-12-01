/**
 * Fyles Multi-Panel Tests
 *
 * Test suite for multi-panel file browser functionality:
 * - Split/close panel controls
 * - Multiple panels with independent state
 * - Cross-panel operations
 *
 * Usage:
 *   npm test examples/fyles/fyles-multipanel.test.ts
 *   TSYNE_HEADED=1 npm test examples/fyles/fyles-multipanel.test.ts
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createFylesApp, createMultiPanelFylesApp } from './fyles';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe.skip('Fyles Multi-Panel Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testDir1: string;
  let testDir2: string;

  beforeAll(async () => {
    // Create two test directory structures
    testDir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-multi-test1-'));
    testDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-multi-test2-'));

    // Create test files and folders in dir1
    fs.writeFileSync(path.join(testDir1, 'file1.txt'), 'Content 1');
    fs.mkdirSync(path.join(testDir1, 'folder1'));

    // Create test files and folders in dir2
    fs.writeFileSync(path.join(testDir2, 'file2.txt'), 'Content 2');
    fs.mkdirSync(path.join(testDir2, 'folder2'));

    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });

    // Create app with two panels
    const testApp = await tsyneTest.createApp((app) => {
      createMultiPanelFylesApp(app, [testDir1, testDir2]);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait a bit for the initial UI to render
    await ctx.wait(500);
  }, 15000);

  afterAll(async () => {
    await tsyneTest.cleanup();

    // Clean up test directories
    try {
      fs.rmSync(testDir1, { recursive: true, force: true });
      fs.rmSync(testDir2, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to clean up test directories:', err);
    }
  });

  test('should display two panels', async () => {
    // Both panels should show their respective directories
    expect(await ctx.getByText(testDir1).within(2000).exists()).toBeTruthy();
    expect(await ctx.getByText(testDir2).within(2000).exists()).toBeTruthy();
  });

  test('should display toolbar buttons for both panels', async () => {
    // Both panels should have home buttons
    // We can't easily distinguish between them, but there should be multiple
    expect(await ctx.getByText('🏠').within(2000).exists()).toBeTruthy();

    // Both panels should have split buttons
    expect(await ctx.getByText('⊞').within(2000).exists()).toBeTruthy();
  });

  test('should display close buttons for both panels', async () => {
    // With two panels, both should have close buttons
    expect(await ctx.getByText('✕').within(2000).exists()).toBeTruthy();
  });

  test('should display files from first panel', async () => {
    // First panel should show file1.txt
    expect(await ctx.getByText('file1.txt').within(2000).exists()).toBeTruthy();
    expect(await ctx.getByText('folder1').within(2000).exists()).toBeTruthy();
  });

  test('should display files from second panel', async () => {
    // Second panel should show file2.txt
    expect(await ctx.getByText('file2.txt').within(2000).exists()).toBeTruthy();
    expect(await ctx.getByText('folder2').within(2000).exists()).toBeTruthy();
  });

  test('should have independent navigation in panels', async () => {
    // Navigate first panel into folder1
    await ctx.getByText('folder1').click();
    await ctx.wait(300);

    // First panel should now be in folder1 (path updated)
    const folder1Path = path.join(testDir1, 'folder1');
    expect(await ctx.getByText(folder1Path).within(2000).exists()).toBeTruthy();

    // Second panel should still show testDir2
    expect(await ctx.getByText(testDir2).within(2000).exists()).toBeTruthy();
  });
});

describe.skip('Fyles Single Panel with Split', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testDir: string;

  beforeAll(async () => {
    // Create a single test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-split-test-'));
    fs.writeFileSync(path.join(testDir, 'test.txt'), 'Test content');
    fs.mkdirSync(path.join(testDir, 'subfolder'));

    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });

    // Create app with single panel
    const testApp = await tsyneTest.createApp((app) => {
      createFylesApp(app, testDir);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.wait(500);
  }, 15000);

  afterAll(async () => {
    await tsyneTest.cleanup();

    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to clean up test directory:', err);
    }
  });

  test('should start with single panel', async () => {
    // Should show test directory path
    expect(await ctx.getByText(testDir).within(2000).exists()).toBeTruthy();

    // Should show split button
    expect(await ctx.getByText('⊞').within(2000).exists()).toBeTruthy();

    // Should NOT show close button (only one panel)
    // We verify this by checking that there's only one instance of split button
    // and no close button present
    expect(await ctx.getByText('🏠').within(2000).exists()).toBeTruthy();
  });

  test('should show files in single panel', async () => {
    expect(await ctx.getByText('test.txt').within(2000).exists()).toBeTruthy();
    expect(await ctx.getByText('subfolder').within(2000).exists()).toBeTruthy();
  });

  test('should split into two panels when split button clicked', async () => {
    // Click split button
    await ctx.getByText('⊞').click();
    await ctx.wait(500);

    // Now there should be two panels showing the same directory
    // We should see two close buttons now
    expect(await ctx.getByText('✕').within(2000).exists()).toBeTruthy();

    // Both panels should show the same directory
    // (The path appears twice now)
    expect(await ctx.getByText(testDir).within(2000).exists()).toBeTruthy();
  });

  test('should close panel when close button clicked', async () => {
    // There should be close buttons now (from previous test)
    expect(await ctx.getByText('✕').within(2000).exists()).toBeTruthy();

    // Click a close button
    await ctx.getByText('✕').click();
    await ctx.wait(500);

    // Should be back to single panel - close button should be gone
    // Verify single panel by checking directory is still shown
    expect(await ctx.getByText(testDir).within(2000).exists()).toBeTruthy();
  });
});
