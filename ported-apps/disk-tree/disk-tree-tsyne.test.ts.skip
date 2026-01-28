/**
 * TsyneTest tests for Disk Tree App
 * Tests UI interactions and tree rendering
 */

import { TsyneTest, TestContext } from 'tsyne';
import { buildDiskTreeApp } from './disk-tree';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';

describe('Disk Tree UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testApp: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Disk Tree', width: 800, height: 600 }, (win: Window) => {
        buildDiskTreeApp(app, win);
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 30000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should render initial UI with title', async () => {
    // Verify title
    const title = await ctx.getById('diskTreeTitle').getText();
    expect(title).toBe('Disk Tree - Visualize Disk Usage');
  }, 30000);

  test('should have control buttons', async () => {
    // Verify open folder button
    const openBtn = await ctx.getById('diskTreeOpenBtn').getText();
    expect(openBtn).toBe('Open Folder');

    // Verify sort button
    const sortBtn = await ctx.getById('diskTreeSortBtn').getText();
    expect(sortBtn).toMatch(/Sort by (Name|Size)/);
  }, 30000);

  test('should display status information', async () => {
    // Verify status label exists
    const status = await ctx.getById('diskTreeStatus').getText();
    expect(status).toBe('No folder selected');

    // Verify stats label exists
    const stats = await ctx.getById('diskTreeStats').getText();
    expect(stats).toMatch(/Files: 0 \| Dirs: 0 \| Total: 0 B/);
  }, 30000);

  test('should display placeholder when no folder selected', async () => {
    // Verify placeholder text
    const placeholder = await ctx.getById('diskTreePlaceholder').getText();
    expect(placeholder).toBe('Select a folder to analyze disk usage');
  }, 30000);

  test('should have all required UI elements', async () => {
    // Check all elements exist
    await ctx.getById('diskTreeTitle').within(500).shouldExist();
    await ctx.getById('diskTreeOpenBtn').within(500).shouldExist();
    await ctx.getById('diskTreeSortBtn').within(500).shouldExist();
    await ctx.getById('diskTreeStatus').within(500).shouldExist();
    await ctx.getById('diskTreeStats').within(500).shouldExist();
    await ctx.getById('diskTreePlaceholder').within(500).shouldExist();
  }, 30000);
});
