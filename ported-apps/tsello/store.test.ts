/**
 * Tsello - KanbanStore Unit Tests
 */

import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
import { KanbanStore } from './store';

PouchDB.plugin(PouchDBMemoryAdapter);

let dbCounter = 0;

async function createTestStore(): Promise<KanbanStore> {
  const db = new PouchDB(`test-tsello-${Date.now()}-${dbCounter++}`, { adapter: 'memory' });
  const store = new KanbanStore(db);
  await store.initialize();
  return store;
}

describe('KanbanStore', () => {
  // ========== Initialization ==========

  describe('initialization', () => {
    test('starts with 3 default lists', async () => {
      const store = await createTestStore();
      expect(store.getListCount()).toBe(3);
    });

    test('default lists are To Do, Doing, Done', async () => {
      const store = await createTestStore();
      const lists = store.getLists();
      expect(lists.map((l) => l.title)).toEqual(['To Do', 'Doing', 'Done']);
    });

    test('starts with 7 seed cards', async () => {
      const store = await createTestStore();
      expect(store.getCardCount()).toBe(7);
    });

    test('To Do has 3 cards', async () => {
      const store = await createTestStore();
      const todoList = store.getLists()[0];
      expect(store.getCardsForList(todoList.id)).toHaveLength(3);
    });

    test('Done has 2 cards', async () => {
      const store = await createTestStore();
      const doneList = store.getLists()[2];
      expect(store.getCardsForList(doneList.id)).toHaveLength(2);
    });
  });

  // ========== List CRUD ==========

  describe('list CRUD', () => {
    test('addList creates a new list', async () => {
      const store = await createTestStore();
      store.addList('Backlog');
      expect(store.getListCount()).toBe(4);
    });

    test('addList returns the new list with correct title', async () => {
      const store = await createTestStore();
      const list = store.addList('Backlog');
      expect(list.title).toBe('Backlog');
      expect(list.id).toMatch(/^list-/);
    });

    test('addList appends to end', async () => {
      const store = await createTestStore();
      store.addList('Backlog');
      const lists = store.getLists();
      expect(lists[lists.length - 1].title).toBe('Backlog');
    });

    test('renameList changes the title', async () => {
      const store = await createTestStore();
      const listId = store.getLists()[0].id;
      store.renameList(listId, 'Backlog');
      expect(store.getListById(listId)?.title).toBe('Backlog');
    });

    test('renameList with invalid id is a no-op', async () => {
      const store = await createTestStore();
      store.renameList('nonexistent', 'Foo');
      expect(store.getListCount()).toBe(3);
    });

    test('deleteList removes the list', async () => {
      const store = await createTestStore();
      const listId = store.getLists()[0].id;
      store.deleteList(listId);
      expect(store.getListCount()).toBe(2);
    });

    test('deleteList cascades to remove cards', async () => {
      const store = await createTestStore();
      const todoList = store.getLists()[0];
      const cardsBefore = store.getCardCount();
      const todoCards = store.getCardsForList(todoList.id).length;
      store.deleteList(todoList.id);
      expect(store.getCardCount()).toBe(cardsBefore - todoCards);
    });

    test('deleteList with invalid id is a no-op', async () => {
      const store = await createTestStore();
      store.deleteList('nonexistent');
      expect(store.getListCount()).toBe(3);
    });

    test('getListById returns correct list', async () => {
      const store = await createTestStore();
      const lists = store.getLists();
      const found = store.getListById(lists[1].id);
      expect(found?.title).toBe('Doing');
    });

    test('getListById returns undefined for invalid id', async () => {
      const store = await createTestStore();
      expect(store.getListById('nonexistent')).toBeUndefined();
    });

    test('getLists returns defensive copies', async () => {
      const store = await createTestStore();
      const lists1 = store.getLists();
      lists1[0].title = 'MUTATED';
      const lists2 = store.getLists();
      expect(lists2[0].title).toBe('To Do');
    });
  });

  // ========== Card CRUD ==========

  describe('card CRUD', () => {
    test('addCard creates a card in the specified list', async () => {
      const store = await createTestStore();
      const listId = store.getLists()[0].id;
      const cardsBefore = store.getCardsForList(listId).length;
      store.addCard(listId, 'New task');
      expect(store.getCardsForList(listId)).toHaveLength(cardsBefore + 1);
    });

    test('addCard returns the new card', async () => {
      const store = await createTestStore();
      const listId = store.getLists()[0].id;
      const card = store.addCard(listId, 'New task');
      expect(card?.label).toBe('New task');
      expect(card?.listId).toBe(listId);
    });

    test('addCard to invalid list returns undefined', async () => {
      const store = await createTestStore();
      const card = store.addCard('nonexistent', 'Task');
      expect(card).toBeUndefined();
    });

    test('updateCard changes the label', async () => {
      const store = await createTestStore();
      const listId = store.getLists()[0].id;
      const cards = store.getCardsForList(listId);
      store.updateCard(cards[0].id, 'Updated label');
      expect(store.getCard(cards[0].id)?.label).toBe('Updated label');
    });

    test('updateCard with invalid id is a no-op', async () => {
      const store = await createTestStore();
      const countBefore = store.getCardCount();
      store.updateCard('nonexistent', 'Foo');
      expect(store.getCardCount()).toBe(countBefore);
    });

    test('deleteCard removes the card', async () => {
      const store = await createTestStore();
      const listId = store.getLists()[0].id;
      const cards = store.getCardsForList(listId);
      store.deleteCard(cards[0].id);
      expect(store.getCardsForList(listId)).toHaveLength(cards.length - 1);
    });

    test('deleteCard removes from card map', async () => {
      const store = await createTestStore();
      const listId = store.getLists()[0].id;
      const cards = store.getCardsForList(listId);
      const cardId = cards[0].id;
      store.deleteCard(cardId);
      expect(store.getCard(cardId)).toBeUndefined();
    });

    test('deleteCard with invalid id is a no-op', async () => {
      const store = await createTestStore();
      const countBefore = store.getCardCount();
      store.deleteCard('nonexistent');
      expect(store.getCardCount()).toBe(countBefore);
    });

    test('getCard returns defensive copy', async () => {
      const store = await createTestStore();
      const listId = store.getLists()[0].id;
      const cards = store.getCardsForList(listId);
      const card = store.getCard(cards[0].id);
      card!.label = 'MUTATED';
      expect(store.getCard(cards[0].id)?.label).not.toBe('MUTATED');
    });

    test('getCardsForList returns ordered by position', async () => {
      const store = await createTestStore();
      const listId = store.getLists()[0].id;
      store.addCard(listId, 'Extra 1');
      store.addCard(listId, 'Extra 2');
      const cards = store.getCardsForList(listId);
      // Last added should be at the end
      expect(cards[cards.length - 1].label).toBe('Extra 2');
      expect(cards[cards.length - 2].label).toBe('Extra 1');
    });
  });

  // ========== Move ==========

  describe('moveCard', () => {
    test('moves card between lists', async () => {
      const store = await createTestStore();
      const lists = store.getLists();
      const fromList = lists[0];
      const toList = lists[1];
      const card = store.getCardsForList(fromList.id)[0];

      store.moveCard(card.id, toList.id);

      expect(store.getCardsForList(fromList.id).find((c) => c.id === card.id)).toBeUndefined();
      expect(store.getCardsForList(toList.id).find((c) => c.id === card.id)).toBeDefined();
    });

    test('moved card has updated listId', async () => {
      const store = await createTestStore();
      const lists = store.getLists();
      const card = store.getCardsForList(lists[0].id)[0];

      store.moveCard(card.id, lists[2].id);

      expect(store.getCard(card.id)?.listId).toBe(lists[2].id);
    });

    test('moves to specific position', async () => {
      const store = await createTestStore();
      const lists = store.getLists();
      const card = store.getCardsForList(lists[0].id)[0];

      store.moveCard(card.id, lists[1].id, 0);

      const targetCards = store.getCardsForList(lists[1].id);
      expect(targetCards[0].id).toBe(card.id);
    });

    test('moves to end when position exceeds length', async () => {
      const store = await createTestStore();
      const lists = store.getLists();
      const card = store.getCardsForList(lists[0].id)[0];

      store.moveCard(card.id, lists[1].id, 999);

      const targetCards = store.getCardsForList(lists[1].id);
      expect(targetCards[targetCards.length - 1].id).toBe(card.id);
    });

    test('move within same list reorders', async () => {
      const store = await createTestStore();
      const list = store.getLists()[0];
      const cards = store.getCardsForList(list.id);
      const lastCard = cards[cards.length - 1];

      store.moveCard(lastCard.id, list.id, 0);

      const reordered = store.getCardsForList(list.id);
      expect(reordered[0].id).toBe(lastCard.id);
    });

    test('move with invalid card id is a no-op', async () => {
      const store = await createTestStore();
      const countBefore = store.getCardCount();
      store.moveCard('nonexistent', store.getLists()[0].id);
      expect(store.getCardCount()).toBe(countBefore);
    });
  });

  // ========== Observable ==========

  describe('observable', () => {
    test('subscribe receives notifications on addList', async () => {
      const store = await createTestStore();
      const fn = jest.fn();
      store.subscribe(fn);
      store.addList('New');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('subscribe receives notifications on deleteList', async () => {
      const store = await createTestStore();
      const fn = jest.fn();
      store.subscribe(fn);
      store.deleteList(store.getLists()[0].id);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('subscribe receives notifications on addCard', async () => {
      const store = await createTestStore();
      const fn = jest.fn();
      store.subscribe(fn);
      store.addCard(store.getLists()[0].id, 'Task');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('subscribe receives notifications on deleteCard', async () => {
      const store = await createTestStore();
      const fn = jest.fn();
      store.subscribe(fn);
      const card = store.getCardsForList(store.getLists()[0].id)[0];
      store.deleteCard(card.id);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('subscribe receives notifications on updateCard', async () => {
      const store = await createTestStore();
      const fn = jest.fn();
      store.subscribe(fn);
      const card = store.getCardsForList(store.getLists()[0].id)[0];
      store.updateCard(card.id, 'Updated');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('subscribe receives notifications on moveCard', async () => {
      const store = await createTestStore();
      const fn = jest.fn();
      store.subscribe(fn);
      const card = store.getCardsForList(store.getLists()[0].id)[0];
      store.moveCard(card.id, store.getLists()[1].id);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('subscribe receives notifications on renameList', async () => {
      const store = await createTestStore();
      const fn = jest.fn();
      store.subscribe(fn);
      store.renameList(store.getLists()[0].id, 'Renamed');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('unsubscribe stops notifications', async () => {
      const store = await createTestStore();
      const fn = jest.fn();
      const unsub = store.subscribe(fn);
      unsub();
      store.addList('New');
      expect(fn).not.toHaveBeenCalled();
    });

    test('multiple subscribers all receive notifications', async () => {
      const store = await createTestStore();
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      store.subscribe(fn1);
      store.subscribe(fn2);
      store.addList('New');
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });

  // ========== Data Integrity ==========

  describe('data integrity', () => {
    test('card count matches sum of all list card counts', async () => {
      const store = await createTestStore();
      store.addCard(store.getLists()[0].id, 'Extra');
      const lists = store.getLists();
      const sum = lists.reduce((acc, l) => acc + store.getCardsForList(l.id).length, 0);
      expect(sum).toBe(store.getCardCount());
    });

    test('each card references a valid list', async () => {
      const store = await createTestStore();
      const listIds = new Set(store.getLists().map((l) => l.id));
      for (const list of store.getLists()) {
        for (const card of store.getCardsForList(list.id)) {
          expect(listIds.has(card.listId)).toBe(true);
        }
      }
    });

    test('clear resets everything', async () => {
      const store = await createTestStore();
      await store.clear();
      expect(store.getListCount()).toBe(0);
      expect(store.getCardCount()).toBe(0);
    });
  });

  // ========== Edge Cases ==========

  describe('edge cases', () => {
    test('getCardsForList returns empty for invalid list', async () => {
      const store = await createTestStore();
      expect(store.getCardsForList('nonexistent')).toEqual([]);
    });

    test('addCard after clear with new list works', async () => {
      const store = await createTestStore();
      await store.clear();
      const list = store.addList('Fresh');
      const card = store.addCard(list.id, 'First card');
      expect(card?.label).toBe('First card');
      expect(store.getCardCount()).toBe(1);
    });

    test('move card to same list same position is stable', async () => {
      const store = await createTestStore();
      const list = store.getLists()[0];
      const cards = store.getCardsForList(list.id);
      const cardId = cards[0].id;
      store.moveCard(cardId, list.id, 0);
      const after = store.getCardsForList(list.id);
      expect(after[0].id).toBe(cardId);
    });

    test('sequential IDs are unique', async () => {
      const store = await createTestStore();
      const l1 = store.addList('A');
      const l2 = store.addList('B');
      expect(l1.id).not.toBe(l2.id);
      const c1 = store.addCard(l1.id, 'X');
      const c2 = store.addCard(l1.id, 'Y');
      expect(c1!.id).not.toBe(c2!.id);
    });
  });

  // ========== PouchDB Persistence ==========

  describe('persistence', () => {
    test('data survives reinitialization from same DB', async () => {
      const db = new PouchDB(`test-persist-${Date.now()}`, { adapter: 'memory' });
      const store1 = new KanbanStore(db);
      await store1.initialize();
      store1.addList('Persisted List');
      // Allow fire-and-forget writes to complete
      await new Promise((r) => setTimeout(r, 100));

      const store2 = new KanbanStore(db);
      await store2.initialize();
      expect(store2.getListCount()).toBe(4); // 3 seed + 1 added
      const lists = store2.getLists();
      expect(lists[lists.length - 1].title).toBe('Persisted List');
    });

    test('clear then reinitialize seeds fresh data', async () => {
      const db = new PouchDB(`test-clear-${Date.now()}`, { adapter: 'memory' });
      const store1 = new KanbanStore(db);
      await store1.initialize();
      await store1.clear();

      const store2 = new KanbanStore(db);
      await store2.initialize();
      // Should re-seed since DB is empty
      expect(store2.getListCount()).toBe(3);
      expect(store2.getCardCount()).toBe(7);
    });
  });
});
