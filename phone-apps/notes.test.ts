/**
 * TsyneTest UI tests for Notes app
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { createNotesApp } from './notes';
import { MockStorageService } from './services';

describe('Notes App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let storage: MockStorageService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    storage = new MockStorageService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display Notes header', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createNotesApp(app, storage);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByText('Notes').within(500).shouldExist();
  });

  test('should have new note button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createNotesApp(app, storage);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('btn-new-note').within(500).shouldExist();
  });

  test('should show empty state message', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createNotesApp(app, storage);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Empty state when no notes
    await ctx.getByText('No notes yet').within(500).shouldExist();
  });

  test('should show select note message when no note selected', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createNotesApp(app, storage);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByText('Select a note or create a new one').within(500).shouldExist();
  });
});
