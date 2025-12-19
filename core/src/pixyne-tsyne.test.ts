/**
 * TsyneTest tests for Pixyne App
 * Tests the photo manager UI interactions
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildPixyneApp } from './pixyne';
import type { App } from './app';
import type { Window } from './window';

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
    const title = await ctx.getByID('pixyneTitle').getText();
    expect(title).toContain('Pixyne');
  }, 30000);

  test('should show marked count', async () => {
    const count = await ctx.getByID('pixyneMarkedCount').getText();
    expect(count).toBe('Marked: 0');
  }, 30000);

  test('should show empty state', async () => {
    const empty = await ctx.getByID('pixyneEmpty').getText();
    expect(empty).toBe('No photos loaded');
  }, 30000);

  test('should have load button', async () => {
    await ctx.getByID('pixyneLoadBtn').within(500).shouldExist();
  }, 30000);

  test('should have all required UI elements', async () => {
    await ctx.getByID('pixyneTitle').within(500).shouldExist();
    await ctx.getByID('pixyneMarkedCount').within(500).shouldExist();
    await ctx.getByID('pixyneEmpty').within(500).shouldExist();
    await ctx.getByID('pixyneLoadBtn').within(500).shouldExist();
  }, 30000);
});
