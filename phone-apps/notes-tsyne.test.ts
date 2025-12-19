/**
 * TsyneTest tests for Notes App
 * Tests the UI interactions and rendering
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildNotesApp } from './notes';
import type { App } from './app';
import type { Window } from './window';

describe('Notes App UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testApp: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Notes', width: 600, height: 800 }, (win: Window) => {
        buildNotesApp(app, win);
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 30000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should render notes title', async () => {
    const title = await ctx.getByID('notesTitle').getText();
    expect(title).toBe('Notes');
  }, 30000);

  test('should display add note button', async () => {
    await ctx.getByID('notesAddBtn').within(500).shouldExist();
  }, 30000);

  test('should show empty state', async () => {
    const empty = await ctx.getByID('notesEmpty').getText();
    expect(empty).toBe('No notes yet');
  }, 30000);

  test('should show editor empty message', async () => {
    const msg = await ctx.getByID('notesEditorEmpty').getText();
    expect(msg).toBe('Select a note or create a new one');
  }, 30000);

  test('should have all required UI elements', async () => {
    await ctx.getByID('notesTitle').within(500).shouldExist();
    await ctx.getByID('notesAddBtn').within(500).shouldExist();
    await ctx.getByID('notesEmpty').within(500).shouldExist();
    await ctx.getByID('notesEditorEmpty').within(500).shouldExist();
  }, 30000);
});
