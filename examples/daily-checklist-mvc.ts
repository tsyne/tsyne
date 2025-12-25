/**
 * Daily Checklist (MVC Style)
 *
 * Same functionality as daily-checklist.ts but using pure 1978 MVC pattern.
 *
 * KEY DIFFERENCE FROM MVVM VERSION:
 * - View is "dumb" - just declares bindings to Model
 * - Render callback returns void (not widget references)
 * - Uses bindFillColor() instead of manual update logic
 * - No if(existing) check - framework handles widget lifecycle
 * - refreshAllBindings() automatically updates all bound properties
 *
 * Compare with daily-checklist.ts (MVVM) to see the two approaches.
 *
 * @tsyne-app:name Daily Checklist MVC
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 *   <path d="M9 11l3 3L22 4"/>
 *   <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
 * </svg>
 * SVG
 * @tsyne-app:category productivity
 * @tsyne-app:builder buildDailyChecklistMVC
 * @tsyne-app:count one
 */

import { app, resolveTransport, App, Window, Label, MultiLineEntry, CanvasText  } from '../core/src';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// File path for storing checklist items
const CHECKLIST_FILE = path.join(os.homedir(), '.daily-checklist.txt');

// Color constants
const SCARLET_COLOR = '#DC143C'; // Scarlet/Crimson for unchecked items

// ============================================================================
// Checklist Store - Observable state management (MODEL)
// The Model knows nothing about the View - pure data and business logic
// ============================================================================

type ChangeListener = () => void | Promise<void>;

class ChecklistStore {
  private items: string[] = [];
  private checked: Set<number> = new Set();
  private changeListeners: ChangeListener[] = [];

  constructor() {
    this.load();
  }

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private async notifyChange(): Promise<void> {
    for (const listener of this.changeListeners) {
      await listener();
    }
  }

  load(): void {
    try {
      if (fs.existsSync(CHECKLIST_FILE)) {
        const saved = fs.readFileSync(CHECKLIST_FILE, 'utf-8');
        this.items = this.parseItems(saved);
      } else {
        this.items = [];
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
      this.items = [];
    }
    this.checked.clear();
  }

  save(): void {
    try {
      const text = this.items.join('\n');
      fs.writeFileSync(CHECKLIST_FILE, text, 'utf-8');
    } catch (error) {
      console.error('Error saving checklist:', error);
    }
  }

  private parseItems(text: string): string[] {
    return text
      .split(/\r?\n|\r/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  getItems(): string[] {
    return this.items;
  }

  async setItems(items: string[]): Promise<void> {
    this.items = items;
    this.checked.clear();
    this.save();
    await this.notifyChange();
  }

  isChecked(index: number): boolean {
    return this.checked.has(index);
  }

  async toggleChecked(index: number): Promise<void> {
    if (this.checked.has(index)) {
      this.checked.delete(index);
    } else {
      this.checked.add(index);
    }
    await this.notifyChange();
  }

  async resetAll(): Promise<void> {
    this.checked.clear();
    await this.notifyChange();
  }

  getActiveCount(): number {
    return this.items.length - this.checked.size;
  }

  getTotalCount(): number {
    return this.items.length;
  }

  getCheckedCount(): number {
    return this.checked.size;
  }
}

// ============================================================================
// UI Application (VIEW)
// Pure MVC: View just declares bindings to Model, no update logic
// ============================================================================

/**
 * Build the Daily Checklist app (MVC style)
 */
export function buildDailyChecklistMVC(a: App) {
  const store = new ChecklistStore();

  // Widget references
  let itemsTextArea: MultiLineEntry;
  let statusLabel: Label;
  let editModeContainer: any;
  let checklistModeContainer: any;
  let boundList: any;

  // Mode flag
  let isEditMode = false;

  /**
   * Update status label with progress
   */
  async function updateStatusLabel(): Promise<void> {
    if (!statusLabel) return; // Guard for phone mode
    const total = store.getTotalCount();
    const done = store.getCheckedCount();

    if (total === 0) {
      await statusLabel.setText('No items configured. Click "Edit List" to add tasks.');
    } else if (done === total) {
      await statusLabel.setText(`All done! ${done}/${total} items checked.`);
    } else {
      const remaining = total - done;
      const itemWord = remaining === 1 ? 'item' : 'items';
      await statusLabel.setText(`${remaining} ${itemWord} remaining (${done}/${total} done)`);
    }
  }

  /**
   * Switch to edit mode
   */
  async function enterEditMode(): Promise<void> {
    isEditMode = true;
    const text = store.getItems().join('\n');
    await itemsTextArea.setText(text);
    await editModeContainer.show();
    await checklistModeContainer.hide();
  }

  /**
   * Switch to checklist mode, saving changes
   */
  async function exitEditMode(save: boolean): Promise<void> {
    if (save) {
      const text = await itemsTextArea.getText();
      const items = text
        .split(/\r?\n|\r/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      await store.setItems(items);
    }

    isEditMode = false;
    await editModeContainer.hide();
    await checklistModeContainer.show();
  }

  // Build the UI
  a.window({ title: 'Daily Checklist (MVC)', width: 400, height: 500 }, (win: Window) => {
    win.setContent(() => {
      // Use border layout at top level so center can expand
      a.border({
        top: () => {
          a.vbox(() => {
            // Header
            a.label('Daily Checklist (MVC)').withId('title');
            a.separator();

            // Status bar
            statusLabel = a.label('Loading...').withId('statusLabel');
            a.separator();
          });
        },
        center: () => {
          // Stack allows overlaying the two mode containers (one visible at a time)
          a.stack(() => {
            // Checklist mode container - use border so scroll in center expands
            checklistModeContainer = a.border({
              center: () => {
                // ============================================================
                // PURE MVC STYLE - single bindTo with empty state
                // Compare this to daily-checklist.ts (MVVM) to see the difference
                // ============================================================
                a.scroll(() => {
                  boundList = a.vbox(() => {}).bindTo({
                    items: () => store.getItems(),

                    // Empty state - shown when no items
                    empty: () => {
                      a.label('No tasks configured.');
                      a.label('Click "Edit List" to add items.');
                    },

                    // MVC: Render runs ONCE per item, sets up bindings
                    // Returns void - framework handles widget lifecycle
                    render: (item: string, index: number) => {
                      a.max(() => {
                        // Background color bound to Model state
                        a.rectangle(SCARLET_COLOR).bindFillColor(() =>
                          store.isChecked(index) ? 'transparent' : SCARLET_COLOR
                        );

                        a.hbox(() => {
                          a.checkbox('', async () => {
                            await store.toggleChecked(index);
                          }).withId(`checklist-item-${index}`);

                          a.canvasText(item, { bold: true }).bindColor(() =>
                            store.isChecked(index) ? '#000000' : '#FFFFFF'
                          );
                        });
                      });
                    },

                    trackBy: (item: string) => item
                  });
                });
              },
              bottom: () => {
                a.vbox(() => {
                  a.separator();
                  // Action buttons (Controller - forwards user actions to Model)
                  a.hbox(() => {
                    a.button('Reset All').withId('resetBtn').onClick(async () => {
                      await store.resetAll();
                    });

                    a.spacer();

                    a.button('Edit List').withId('editBtn').onClick(async () => {
                      await enterEditMode();
                    });
                  });
                });
              }
            });

            // Edit mode container (hidden by default)
            editModeContainer = a.vbox(() => {
              a.label('Enter tasks (one per line):');

              itemsTextArea = a.multilineentry('Task 1\nTask 2\nTask 3')
                .withId('itemsTextArea');

              a.spacer();
              a.separator();

              a.hbox(() => {
                a.button('Cancel').withId('cancelBtn').onClick(async () => {
                  await exitEditMode(false);
                });

                a.spacer();

                a.button('Save').withId('saveBtn').onClick(async () => {
                  await exitEditMode(true);
                });
              });
            });
          });
        }
      });
    });

    win.show();

    // MVC: Model changes trigger binding refresh
    // No manual update logic in View - bindings handle it automatically
    store.subscribe(async () => {
      boundList.update(); // Triggers refreshAllBindings() in MVC mode (including when() bindings)
      await updateStatusLabel();
    });

    // Initialize - guard for phone mode where content may not be built yet
    (async () => {
      if (editModeContainer) {
        await editModeContainer.hide();
      }
      await updateStatusLabel();
    })();
  });
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Daily Checklist (MVC)' }, buildDailyChecklistMVC);
}
