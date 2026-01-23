/**
 * TsyneTest tests for Notes App
 * Tests the UI interactions and rendering
 */

import { TsyneTest, TestContext } from 'tsyne';
import { buildNotesApp } from './index';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';

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
    const title = await ctx.getById('notesTitle').getText();
    expect(title).toBe('Notes');
  }, 30000);

  test('should display add note button', async () => {
    await ctx.getById('notesAddBtn').within(500).shouldExist();
  }, 30000);

  test('should show empty state', async () => {
    const empty = await ctx.getById('notesEmpty').getText();
    expect(empty).toBe('No notes yet');
  }, 30000);

  test('should show editor empty message', async () => {
    const msg = await ctx.getById('notesEditorEmpty').getText();
    expect(msg).toBe('Select a note or create a new one');
  }, 30000);

  test('should have all required UI elements', async () => {
    await ctx.getById('notesTitle').within(500).shouldExist();
    await ctx.getById('notesAddBtn').within(500).shouldExist();
    await ctx.getById('notesEmpty').within(500).shouldExist();
    await ctx.getById('notesEditorEmpty').within(500).shouldExist();
  }, 30000);
});
