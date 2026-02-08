/**
 * Tsello - Kanban Store
 *
 * Observable store for kanban board data.
 * Manages lists and cards with CRUD operations and card movement.
 * Uses PouchDB for persistence with an in-memory cache for synchronous reads.
 *
 * Ported from cl-trello-clone by Rajasegar Chandran
 * License: MIT
 */

// ============================================================================
// DATA MODELS
// ============================================================================

export interface KanbanCard {
  id: string;
  label: string;
  listId: string;
}

export interface KanbanList {
  id: string;
  title: string;
  cardIds: string[];
}

// ============================================================================
// POUCHDB DOCUMENT SHAPES
// ============================================================================

interface ListDoc {
  _id: string;
  _rev?: string;
  type: 'list';
  title: string;
  order: number;
}

interface CardDoc {
  _id: string;
  _rev?: string;
  type: 'card';
  listId: string;
  label: string;
  order: number;
}

interface CounterDoc {
  _id: 'counters';
  _rev?: string;
  nextListId: number;
  nextCardId: number;
}

type TselloDoc = ListDoc | CardDoc | CounterDoc;

// ============================================================================
// KANBAN STORE (Observable, PouchDB-backed)
// ============================================================================

type ChangeListener = () => void;

export class KanbanStore {
  private lists: KanbanList[] = [];
  private cards: Map<string, KanbanCard> = new Map();
  private nextListId = 1;
  private nextCardId = 1;
  private changeListeners: ChangeListener[] = [];
  private db: PouchDB.Database<TselloDoc>;
  private revCache: Map<string, string> = new Map();
  private initialized = false;

  constructor(db: PouchDB.Database) {
    this.db = db as PouchDB.Database<TselloDoc>;
  }

  // ========== Initialization ==========

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    // Load lists from PouchDB
    const listResult = await this.db.allDocs({
      include_docs: true,
      startkey: 'list-',
      endkey: 'list-\ufff0',
    });

    const listDocs: ListDoc[] = [];
    for (const row of listResult.rows) {
      if (row.doc) {
        const doc = row.doc as unknown as ListDoc;
        listDocs.push(doc);
        if (doc._rev) this.revCache.set(doc._id, doc._rev);
      }
    }

    // Load cards from PouchDB
    const cardResult = await this.db.allDocs({
      include_docs: true,
      startkey: 'card-',
      endkey: 'card-\ufff0',
    });

    const cardDocs: CardDoc[] = [];
    for (const row of cardResult.rows) {
      if (row.doc) {
        const doc = row.doc as unknown as CardDoc;
        cardDocs.push(doc);
        if (doc._rev) this.revCache.set(doc._id, doc._rev);
      }
    }

    // Load counters
    try {
      const counterDoc = await this.db.get('counters') as unknown as CounterDoc;
      this.nextListId = counterDoc.nextListId;
      this.nextCardId = counterDoc.nextCardId;
      if (counterDoc._rev) this.revCache.set('counters', counterDoc._rev);
    } catch (e: any) {
      if (e.status !== 404) throw e;
      // No counters doc yet — will be created on first write or seed
    }

    if (listDocs.length === 0) {
      // Empty DB — seed with default data
      await this.seed();
      return;
    }

    // Rebuild cache from loaded docs
    listDocs.sort((a, b) => a.order - b.order);
    cardDocs.sort((a, b) => a.order - b.order);

    for (const doc of listDocs) {
      this.lists.push({ id: doc._id, title: doc.title, cardIds: [] });
    }

    for (const doc of cardDocs) {
      const card: KanbanCard = { id: doc._id, label: doc.label, listId: doc.listId };
      this.cards.set(doc._id, card);
      const list = this.lists.find((l) => l.id === doc.listId);
      if (list) {
        list.cardIds.push(doc._id);
      }
    }
  }

  // ========== Observable ==========

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((listener) => listener());
  }

  // ========== Seed Data ==========

  private async seed(): Promise<void> {
    const todoId = this.generateListId();
    const doingId = this.generateListId();
    const doneId = this.generateListId();

    this.lists = [
      { id: todoId, title: 'To Do', cardIds: [] },
      { id: doingId, title: 'Doing', cardIds: [] },
      { id: doneId, title: 'Done', cardIds: [] },
    ];

    const seedCards = [
      { label: 'Design wireframes', listId: todoId },
      { label: 'Set up CI pipeline', listId: todoId },
      { label: 'Write unit tests', listId: todoId },
      { label: 'Implement login page', listId: doingId },
      { label: 'Review pull requests', listId: doingId },
      { label: 'Create project repo', listId: doneId },
      { label: 'Define requirements', listId: doneId },
    ];

    const docs: TselloDoc[] = [];

    // List docs
    for (let i = 0; i < this.lists.length; i++) {
      const list = this.lists[i];
      docs.push({ _id: list.id, type: 'list', title: list.title, order: i });
    }

    // Card docs
    for (let i = 0; i < seedCards.length; i++) {
      const { label, listId } = seedCards[i];
      const cardId = this.generateCardId();
      this.cards.set(cardId, { id: cardId, label, listId });
      const list = this.lists.find((l) => l.id === listId)!;
      list.cardIds.push(cardId);
      docs.push({ _id: cardId, type: 'card', listId, label, order: list.cardIds.length - 1 });
    }

    // Counter doc
    docs.push({ _id: 'counters', nextListId: this.nextListId, nextCardId: this.nextCardId } as CounterDoc);

    const results = await this.db.bulkDocs(docs);
    for (const result of results) {
      if ('ok' in result && result.ok && result.rev) {
        this.revCache.set(result.id, result.rev);
      }
    }
  }

  private generateListId(): string {
    return `list-${String(this.nextListId++).padStart(3, '0')}`;
  }

  private generateCardId(): string {
    return `card-${String(this.nextCardId++).padStart(3, '0')}`;
  }

  // ========== PouchDB Helpers ==========

  private putDoc(doc: TselloDoc): void {
    const rev = this.revCache.get(doc._id);
    const toWrite = rev ? { ...doc, _rev: rev } : { ...doc };
    this.db.put(toWrite).then((result) => {
      if (result.ok && result.rev) {
        this.revCache.set(doc._id, result.rev);
      }
    }).catch(() => {
      // Fire-and-forget — cache is already updated
    });
  }

  private removeDoc(id: string): void {
    const rev = this.revCache.get(id);
    if (!rev) return;
    this.db.remove(id, rev).then((result) => {
      if (result.ok) {
        this.revCache.delete(id);
      }
    }).catch(() => {
      // Fire-and-forget
    });
  }

  private saveCounters(): void {
    this.putDoc({ _id: 'counters', nextListId: this.nextListId, nextCardId: this.nextCardId } as CounterDoc);
  }

  private reorderCardsInList(listId: string): void {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return;
    for (let i = 0; i < list.cardIds.length; i++) {
      const card = this.cards.get(list.cardIds[i]);
      if (card) {
        this.putDoc({ _id: card.id, type: 'card', listId: card.listId, label: card.label, order: i });
      }
    }
  }

  // ========== List CRUD ==========

  addList(title: string): KanbanList {
    const id = this.generateListId();
    const list: KanbanList = { id, title, cardIds: [] };
    this.lists.push(list);
    this.putDoc({ _id: id, type: 'list', title, order: this.lists.length - 1 });
    this.saveCounters();
    this.notifyChange();
    return { ...list, cardIds: [...list.cardIds] };
  }

  renameList(listId: string, newTitle: string): void {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return;
    list.title = newTitle;
    const order = this.lists.indexOf(list);
    this.putDoc({ _id: listId, type: 'list', title: newTitle, order });
    this.notifyChange();
  }

  deleteList(listId: string): void {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return;
    // Cascade: remove all cards in this list
    for (const cardId of list.cardIds) {
      this.cards.delete(cardId);
      this.removeDoc(cardId);
    }
    this.lists = this.lists.filter((l) => l.id !== listId);
    this.removeDoc(listId);
    this.notifyChange();
  }

  getLists(): KanbanList[] {
    return this.lists.map((l) => ({ ...l, cardIds: [...l.cardIds] }));
  }

  getListById(listId: string): KanbanList | undefined {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return undefined;
    return { ...list, cardIds: [...list.cardIds] };
  }

  // ========== Card CRUD ==========

  addCard(listId: string, label: string): KanbanCard | undefined {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return undefined;
    const id = this.generateCardId();
    const card: KanbanCard = { id, label, listId };
    this.cards.set(id, card);
    list.cardIds.push(id);
    this.putDoc({ _id: id, type: 'card', listId, label, order: list.cardIds.length - 1 });
    this.saveCounters();
    this.notifyChange();
    return { ...card };
  }

  updateCard(cardId: string, newLabel: string): void {
    const card = this.cards.get(cardId);
    if (!card) return;
    card.label = newLabel;
    const list = this.lists.find((l) => l.id === card.listId);
    const order = list ? list.cardIds.indexOf(cardId) : 0;
    this.putDoc({ _id: cardId, type: 'card', listId: card.listId, label: newLabel, order });
    this.notifyChange();
  }

  deleteCard(cardId: string): void {
    const card = this.cards.get(cardId);
    if (!card) return;
    const list = this.lists.find((l) => l.id === card.listId);
    if (list) {
      list.cardIds = list.cardIds.filter((id) => id !== cardId);
    }
    this.cards.delete(cardId);
    this.removeDoc(cardId);
    this.notifyChange();
  }

  getCard(cardId: string): KanbanCard | undefined {
    const card = this.cards.get(cardId);
    if (!card) return undefined;
    return { ...card };
  }

  getCardsForList(listId: string): KanbanCard[] {
    const list = this.lists.find((l) => l.id === listId);
    if (!list) return [];
    return list.cardIds
      .map((id) => this.cards.get(id))
      .filter((c): c is KanbanCard => c !== undefined)
      .map((c) => ({ ...c }));
  }

  // ========== Move ==========

  moveCard(cardId: string, toListId: string, position?: number): void {
    const card = this.cards.get(cardId);
    if (!card) return;
    const toList = this.lists.find((l) => l.id === toListId);
    if (!toList) return;

    const fromListId = card.listId;

    // Remove from source list
    const fromList = this.lists.find((l) => l.id === fromListId);
    if (fromList) {
      fromList.cardIds = fromList.cardIds.filter((id) => id !== cardId);
    }

    // Insert into target list
    const insertAt = position !== undefined
      ? Math.max(0, Math.min(position, toList.cardIds.length))
      : toList.cardIds.length;
    toList.cardIds.splice(insertAt, 0, cardId);

    // Update card's listId
    card.listId = toListId;

    // Persist reordering
    if (fromList && fromListId !== toListId) {
      this.reorderCardsInList(fromListId);
    }
    this.reorderCardsInList(toListId);

    this.notifyChange();
  }

  // ========== Analytics ==========

  getListCount(): number {
    return this.lists.length;
  }

  getCardCount(): number {
    return this.cards.size;
  }

  // ========== Clear ==========

  async clear(): Promise<void> {
    // Delete all docs from PouchDB
    const allResult = await this.db.allDocs();
    const toDelete = allResult.rows
      .filter((row) => !row.id.startsWith('_design'))
      .map((row) => ({ _id: row.id, _rev: row.value.rev, _deleted: true as const }));
    if (toDelete.length > 0) {
      await (this.db as PouchDB.Database).bulkDocs(toDelete as any);
    }

    // Clear cache
    this.lists = [];
    this.cards.clear();
    this.revCache.clear();
    this.nextListId = 1;
    this.nextCardId = 1;
    this.notifyChange();
  }
}
