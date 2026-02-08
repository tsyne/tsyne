/**
 * Tsello - TsyneTest Integration Tests
 */

import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
import { TsyneTest, TestContext } from 'tsyne';
import { createTselloApp, TselloUI } from './tsello';
import type { App } from 'tsyne';

PouchDB.plugin(PouchDBMemoryAdapter);

let dbCounter = 0;

describe('Tsello UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let ui: TselloUI;
  let pouchdb: PouchDB.Database;

  async function createApp(): Promise<void> {
    pouchdb = new PouchDB(`test-tsello-ui-${Date.now()}-${dbCounter++}`, { adapter: 'memory' });
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    const testApp = await tsyneTest.createApp((app: App) => {
      ui = createTselloApp(app, pouchdb);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ui.initialize();
  }

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
    if (pouchdb) {
      await pouchdb.destroy();
    }
  });

  test('renders app title', async () => {
    await createApp();
    await ctx.getById('appTitle').within(1000).shouldExist();
  }, 15000);

  test('shows status with counts', async () => {
    await createApp();
    const text = await ctx.getById('statusLabel').within(1000).getText();
    expect(text).toContain('3 lists');
    expect(text).toContain('7 cards');
  }, 15000);

  test('renders default list titles', async () => {
    await createApp();
    const lists = ui.getStore().getLists();
    for (const list of lists) {
      await ctx.getById(`listTitle-${list.id}`).within(1000).shouldExist();
    }
  }, 15000);

  test('renders add card buttons for each list', async () => {
    await createApp();
    const lists = ui.getStore().getLists();
    for (const list of lists) {
      await ctx.getById(`addCardBtn-${list.id}`).within(1000).shouldExist();
    }
  }, 15000);

  test('add card via store updates status', async () => {
    await createApp();
    const store = ui.getStore();
    const list = store.getLists()[0];
    store.addCard(list.id, 'Test card from store');

    // Wait for subscription to propagate
    await new Promise((r) => setTimeout(r, 200));

    const statusText = await ctx.getById('statusLabel').within(1000).getText();
    expect(statusText).toContain('8 cards');
  }, 15000);

  test('delete card via store updates UI', async () => {
    await createApp();
    const store = ui.getStore();
    const list = store.getLists()[0];
    const cards = store.getCardsForList(list.id);
    const cardId = cards[0].id;

    store.deleteCard(cardId);
    await new Promise((r) => setTimeout(r, 200));

    const statusText = await ctx.getById('statusLabel').within(1000).getText();
    expect(statusText).toContain('6 cards');
  }, 15000);

  test('delete list via store updates status', async () => {
    await createApp();
    const store = ui.getStore();
    const lists = store.getLists();
    store.deleteList(lists[0].id);
    await new Promise((r) => setTimeout(r, 200));

    const statusText = await ctx.getById('statusLabel').within(1000).getText();
    expect(statusText).toContain('2 lists');
  }, 15000);

  test('move card via store updates counts', async () => {
    await createApp();
    const store = ui.getStore();
    const lists = store.getLists();
    const card = store.getCardsForList(lists[0].id)[0];

    store.moveCard(card.id, lists[2].id);
    await new Promise((r) => setTimeout(r, 200));

    // Total cards unchanged
    const statusText = await ctx.getById('statusLabel').within(1000).getText();
    expect(statusText).toContain('7 cards');
  }, 15000);

  test('add list via store updates status', async () => {
    await createApp();
    const store = ui.getStore();
    store.addList('Backlog');
    await new Promise((r) => setTimeout(r, 200));

    const statusText = await ctx.getById('statusLabel').within(1000).getText();
    expect(statusText).toContain('4 lists');
  }, 15000);

  test('add list button exists', async () => {
    await createApp();
    await ctx.getById('addListBtn').within(1000).shouldExist();
  }, 15000);

  test('screenshot - board layout', async () => {
    await createApp();
    await ctx.getById('addListBtn').within(1000).shouldExist();
    await tsyneTest.screenshot('/tmp/tsello-board.png');
  }, 15000);
});
