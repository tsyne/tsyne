/**
 * Daily Checklist (MVVM Style)
 *
 * A simple daily checklist app for tracking recurring tasks.
 * - Items are stored in ~/.daily-checklist.txt (one per line)
 * - Auto-saves when you edit the list
 * - Checked state is held in memory only (resets each session)
 * - Unchecked items show in scarlet red with white bold text
 *
 * KEY DIFFERENCE FROM MVC VERSION:
 * - Render callback returns widget reference for reuse
 * - Uses if(existing) check to update vs create
 * - Manual update logic in the View (existing.bg.update(...))
 * - Smart diffing passes existing widget refs for efficiency
 *
 * Compare with daily-checklist-mvc.ts (MVC) to see the two approaches.
 *
 * @tsyne-app:name Daily Checklist
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 *   <path d="M9 11l3 3L22 4"/>
 *   <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
 * </svg>
 * SVG
 * @tsyne-app:category productivity
 * @tsyne-app:builder buildDailyChecklist
 * @tsyne-app:count one
 */

import { app, resolveTransport, App, Window, Label, MultiLineEntry, CanvasRectangle, CanvasText  } from '../core/src';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// File path for storing checklist items
const CHECKLIST_FILE = path.join(os.homedir(), '.daily-checklist.txt');

// Color constants
const SCARLET_COLOR = '#DC143C'; // Scarlet/Crimson for unchecked items

// ============================================================================
// Checklist Store - Observable state management
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
// UI Application
// ============================================================================

/**
 * Build the Daily Checklist app
 */
export function buildDailyChecklist(a: App) {
  const store = new ChecklistStore();

  // Widget references
  let itemsTextArea: MultiLineEntry;
  let statusLabel: Label;
  let editModeContainer: any;
  let checklistModeContainer: any;
  let emptyStateContainer: any;
  let boundList: any;

  // Map of background rectangles and text labels for reactive color updates
  const backgrounds = new Map<number, CanvasRectangle>();
  const textLabels = new Map<number, CanvasText>();

  // Mode flag
  let isEditMode = false;

  /**
   * Update status label with progress
   */
  async function updateStatusLabel(): Promise<void> {
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
   * Update empty state visibility
   */
  async function updateEmptyState(): Promise<void> {
    const hasItems = store.getItems().length > 0;
    if (hasItems) {
      await emptyStateContainer.hide();
    } else {
      await emptyStateContainer.show();
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
  a.window({ title: 'Daily Checklist', width: 400, height: 500 }, (win: Window) => {
    win.setContent(() => {
      // Use border layout at top level so center can expand
      a.border({
        top: () => {
          a.vbox(() => {
            // Header
            a.label('Daily Checklist').withId('title');
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
                // Stack for empty state overlay
                a.stack(() => {
                  // Empty state (shown when no items)
                  emptyStateContainer = a.vbox(() => {
                    a.label('No tasks configured.');
                    a.label('Click "Edit List" to add items.');
                  });

                  // Scrollable checklist with inline bindTo (ng-repeat style)
                  a.scroll(() => {
                    boundList = a.vbox(() => {
                      // Empty initially
                    }).bindTo(
                      () => store.getItems(),

                      // Render callback with smart update (existing = reuse, null = create)
                      (item: string, index: number, existing: { bg: CanvasRectangle; txt: CanvasText } | null) => {
                        const isChecked = store.isChecked(index);
                        if (existing) {
                          // Update existing - refresh background and text colors (no flicker!)
                          existing.bg.update({
                            fillColor: isChecked ? 'transparent' : SCARLET_COLOR
                          });
                          existing.txt.update({
                            color: isChecked ? '#000000' : '#FFFFFF'
                          });
                          backgrounds.set(index, existing.bg);
                          textLabels.set(index, existing.txt);
                          return existing;
                        } else {
                          // Create new widget - capture refs via closure
                          let bgRef: CanvasRectangle;
                          let txtRef: CanvasText;
                          a.max(() => {
                            bgRef = a.rectangle(
                              isChecked ? 'transparent' : SCARLET_COLOR
                            );
                            backgrounds.set(index, bgRef);

                            a.hbox(() => {
                              // Checkbox with empty label (just the checkmark)
                              a.checkbox('', async () => {
                                await store.toggleChecked(index);
                              }).withId(`checklist-item-${index}`);

                              // Canvas text for styled label
                              txtRef = a.canvasText(item, {
                                color: isChecked ? '#000000' : '#FFFFFF',
                                bold: !isChecked
                              });
                              textLabels.set(index, txtRef);
                            });
                          });
                          return { bg: bgRef!, txt: txtRef! };
                        }
                      },

                      // Delete callback - called when item removed
                      (item: string, index: number) => {
                        backgrounds.delete(index);
                        textLabels.delete(index);
                      },

                      // trackBy - use item value as key
                      (item: string) => item
                    );
                  });
                });
              },
              bottom: () => {
                a.vbox(() => {
                  a.separator();
                  // Action buttons
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

    // Reactive updates - smart diffing handles both item changes and state changes
    store.subscribe(async () => {
      // Smart update: if same items, just updates backgrounds (no flicker)
      // If items changed, rebuilds only what's needed
      boundList.update();
      await updateEmptyState();
      await updateStatusLabel();
    });

    // Initialize
    (async () => {
      await editModeContainer.hide();
      await updateEmptyState();
      await updateStatusLabel();
    })();
  });
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Daily Checklist' }, buildDailyChecklist);
}
