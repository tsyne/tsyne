/**
 * TsyneTest tests for Pixyne App
 * Tests the photo manager UI interactions
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { buildPixyneApp } from './index';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';

describe('Pixyne Photo Manager UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testApp: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Pixyne', width: 900, height: 700 }, (win: Window) => {
        buildPixyneApp(app, win);
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 30000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should render title', async () => {
    const title = await ctx.getById('pixyneTitle').getText();
    expect(title).toContain('Pixyne');
  }, 30000);

  test('should show marked count', async () => {
    const count = await ctx.getById('pixyneMarkedCount').getText();
    expect(count).toBe('Marked: 0');
  }, 30000);

  test('should show empty state', async () => {
    const empty = await ctx.getById('pixyneEmpty').getText();
    expect(empty).toBe('No photos loaded');
  }, 30000);

  test('should have load button', async () => {
    await ctx.getById('pixyneLoadBtn').within(500).shouldExist();
  }, 30000);

  test('should have all required UI elements', async () => {
    await ctx.getById('pixyneTitle').within(500).shouldExist();
    await ctx.getById('pixyneMarkedCount').within(500).shouldExist();
    await ctx.getById('pixyneEmpty').within(500).shouldExist();
    await ctx.getById('pixyneLoadBtn').within(500).shouldExist();
  }, 30000);
});
