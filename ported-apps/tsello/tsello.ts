/**
 * Tsello - Kanban Board
 *
 * @tsyne-app:name Tsello
 * @tsyne-app:icon list
 * @tsyne-app:category Productivity
 * @tsyne-app:builder createTselloApp
 * @tsyne-app:args app,pouchdb,windowWidth,windowHeight
 *
 * A kanban board app ported from cl-trello-clone (Common Lisp / Caveman2 / HTMX).
 * Features:
 * - Multiple lists with cards
 * - CRUD for lists and cards
 * - Move cards between lists
 * - Observable store with sample data
 *
 * Original: github.com/rajasegar/cl-trello-clone
 * Portions copyright(c) 2021 Rajasegar Chandran
 * Portions copyright(c) 2026 Paul Hammant
 * License: MIT
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import * as path from 'path';
import * as os from 'os';
import type { App, Window } from 'tsyne';
import { KanbanStore } from './store';
import type { KanbanList, KanbanCard } from './store';

// ============================================================================
// UI
// ============================================================================

export class TselloUI {
  private store: KanbanStore;
  private statusLabel: any = null;
  private listBinding: any = null;
  private cardBindings: Map<string, any> = new Map();
  private listBackgrounds: Map<string, any> = new Map();
  private cardActionButtons: Map<string, { editBtn: any; deleteBtn: any }> = new Map();
  private selectedCardId: string | null = null;
  private a: App;
  private win: Window | null = null;

  constructor(a: App, store: KanbanStore) {
    this.a = a;
    this.store = store;
  }

  getStore(): KanbanStore {
    return this.store;
  }

  setupWindow = (win: Window): void => {
    this.win = win;
    win.setMainMenu([
      {
        label: 'Board',
        items: [
          { label: 'New List', onSelected: () => this.promptAddList() },
          { label: 'Clear All', onSelected: async () => { await this.store.clear(); } },
          { label: '', isSeparator: true },
          { label: 'Exit', onSelected: () => process.exit(0) },
        ],
      },
    ]);
  };

  private async promptAddList(): Promise<void> {
    if (!this.win) return;
    const result = await this.win.showForm('New List', [
      { name: 'title', label: 'Title', type: 'entry' as const },
    ]);
    if (result && result.submitted && result.values?.title) {
      this.store.addList(String(result.values.title));
    }
  }

  private async promptAddCard(listId: string): Promise<void> {
    if (!this.win) return;
    const result = await this.win.showForm('New Card', [
      { name: 'label', label: 'Label', type: 'entry' as const },
    ]);
    if (result && result.submitted && result.values?.label) {
      this.store.addCard(listId, String(result.values.label));
    }
  }

  private async promptEditCard(card: KanbanCard): Promise<void> {
    if (!this.win) return;
    const result = await this.win.showForm('Edit Card', [
      { name: 'label', label: 'Label', type: 'multiline' as const, value: card.label },
    ], { confirmText: 'Save', dismissText: 'Delete', confirmImportance: 'success', dismissImportance: 'danger' });
    if (result && result.submitted && result.values?.label) {
      this.store.updateCard(card.id, String(result.values.label));
    } else if (result && !result.submitted) {
      this.store.deleteCard(card.id);
    }
  }

  private async promptRenameList(list: KanbanList): Promise<void> {
    if (!this.win) return;
    const result = await this.win.showForm('Rename List', [
      { name: 'title', label: 'Title', type: 'entry' as const, value: list.title },
    ]);
    if (result && result.submitted && result.values?.title) {
      this.store.renameList(list.id, String(result.values.title));
    }
  }


  private selectCard(cardId: string): void {
    // Hide previous card's buttons
    if (this.selectedCardId && this.selectedCardId !== cardId) {
      const prev = this.cardActionButtons.get(this.selectedCardId);
      if (prev) {
        prev.editBtn.hide();
        prev.deleteBtn.hide();
      }
    }
    // Show this card's buttons
    const current = this.cardActionButtons.get(cardId);
    if (current) {
      current.editBtn.show();
      current.deleteBtn.show();
    }
    this.selectedCardId = cardId;
  }

  buildContent = (): void => {
    const a = this.a;

    a.border({
      top: () => {
        a.vbox(() => {
          a.hbox(() => {
            a.label('Tsello').withId('appTitle');
            a.spacer();
            this.statusLabel = a.label('').withId('statusLabel');
            a.spacer();
            a.button('+ Add List', {
              onClick: () => this.promptAddList(),
            }).withId('addListBtn');
          });
          a.separator();
        });
      },
      center: () => {
        // Blue backdrop fills entire remaining area
        a.stack(() => {
          a.canvasRectangle({ fillColor: '#0079BF' });
          a.border({
            top: () => {
              a.padded(() => {
                this.listBinding = a.hbox(() => {}).bindTo({
              items: () => this.store.getLists(),
              empty: () => {
                a.label('No lists yet. Click "+ Add List" to get started.');
              },
              render: (list: KanbanList) => {
                // Each list: opaque grey panel
                a.stack(() => {
                  const listBg = a.canvasRectangle({ fillColor: '#EBECF0' });
                  this.listBackgrounds.set(list.id, listBg);
                  a.padded(() => {
                    a.vbox(() => {
                      // List header: title + edit icon + delete
                      a.hbox(() => {
                        a.label(list.title, undefined, undefined, undefined, { bold: true }).withId(`listTitle-${list.id}`);
                        a.spacer();
                        a.button('✎', {
                          onClick: () => {
                            const current = this.store.getListById(list.id);
                            if (current) this.promptRenameList(current);
                          },
                        }).withId(`renameListBtn-${list.id}`);
                        a.button('X', {
                          onClick: () => this.store.deleteList(list.id),
                        }).withId(`deleteListBtn-${list.id}`);
                      });
                      a.separator();

                      // Cards (droppable list vbox for drag-drop between lists)
                      this.cardBindings.set(list.id, a.vbox(() => {}).makeDroppable({
                        onDrop: (dragData: string, _sourceId: string, dropIndex: number) => {
                          listBg.setFillColor('#EBECF0');
                          this.store.moveCard(dragData, list.id, dropIndex >= 0 ? dropIndex : undefined);
                        },
                        onDragEnter: () => {
                          listBg.setFillColor('#D6EAF8');
                        },
                        onDragLeave: () => {
                          listBg.setFillColor('#EBECF0');
                        },
                      }).bindTo({
                        items: () => this.store.getCardsForList(list.id),
                        empty: () => {
                          a.label('No cards');
                        },
                        render: (card: KanbanCard) => {
                          // Card: white background, draggable for moving between lists
                          const cardBg = { ref: null as any };
                          const editBtn = { ref: null as any };
                          const deleteBtn = { ref: null as any };
                          a.stack(() => {
                            cardBg.ref = a.canvasRectangle({ fillColor: '#FFFFFF' });
                            a.padded(() => {
                              a.hbox(() => {
                                a.label(card.label).withId(`cardLabel-${card.id}`);
                                a.spacer();
                                editBtn.ref = a.button('✎', {
                                  onClick: () => {
                                    const current = this.store.getCard(card.id);
                                    if (current) this.promptEditCard(current);
                                  },
                                }).withId(`editCardBtn-${card.id}`);
                                deleteBtn.ref = a.button('X', {
                                  onClick: () => this.store.deleteCard(card.id),
                                }).withId(`deleteCardBtn-${card.id}`);
                                // Hide buttons initially
                                editBtn.ref.hide();
                                deleteBtn.ref.hide();
                                this.cardActionButtons.set(card.id, { editBtn: editBtn.ref, deleteBtn: deleteBtn.ref });
                              });
                            });
                          }).makeDraggable({
                            dragData: card.id,
                            dragLabel: card.label,
                            onDragStart: () => { cardBg.ref?.setFillColor('#E0E0E0'); },
                            onDragEnd: () => { cardBg.ref?.setFillColor('#FFFFFF'); },
                            onDoubleTap: (cardId: string) => {
                              const current = this.store.getCard(cardId);
                              if (current) this.promptEditCard(current);
                            },
                            onTap: (cardId: string) => {
                              this.selectCard(cardId);
                            },
                          });
                        },
                        trackBy: (card: KanbanCard) => card.id,
                      }));

                      // Add card button
                      a.button('+ Add Card', {
                        onClick: () => this.promptAddCard(list.id),
                      }).withId(`addCardBtn-${list.id}`);
                    });
                  });
                });
              },
              trackBy: (list: KanbanList) => list.id,
            });
              });
            },
          });
        });
      },
    });
  };

  private async updateStatus(): Promise<void> {
    if (!this.statusLabel) return;
    const listCount = this.store.getListCount();
    const cardCount = this.store.getCardCount();
    await this.statusLabel.setText(`${listCount} lists, ${cardCount} cards`);
  }

  initialize = async (): Promise<void> => {
    // Load PouchDB data into cache (seeds if empty)
    await this.store.initialize();

    // Subscribe to store changes
    this.store.subscribe(async () => {
      await this.updateStatus();
      if (this.listBinding) {
        this.listBinding.update();
      }
      for (const binding of this.cardBindings.values()) {
        binding.update();
      }
    });

    // Initial render with loaded data
    await this.updateStatus();
    if (this.listBinding) {
      this.listBinding.update();
    }
  };
}

// ============================================================================
// App Factory
// ============================================================================

export function createTselloApp(
  a: App,
  pouchdb: PouchDB.Database,
  windowWidth?: number,
  windowHeight?: number
): TselloUI {
  const store = new KanbanStore(pouchdb);
  const ui = new TselloUI(a, store);

  a.window(
    { title: 'Tsello', width: windowWidth ?? 900, height: windowHeight ?? 500 },
    (win: Window) => {
      ui.setupWindow(win);
      win.setContent(() => ui.buildContent());
      win.show();
      setTimeout(() => ui.initialize(), 0);
    }
  );

  return ui;
}

export default createTselloApp;

// ============================================================================
// Standalone Entry Point
// ============================================================================

if (require.main === module) {
  const PouchDB = require('pouchdb');
  const dbPath = path.join(os.homedir(), '.tsyne', 'data', 'tsello');
  const pouchdb = new PouchDB(dbPath);
  const appInstance = app(
    resolveTransport(),
    { title: 'Tsello' },
    async (a: App) => {
      const ui = createTselloApp(a, pouchdb);
      await a.run();
      await ui.initialize();
    }
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
