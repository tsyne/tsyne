/**
 * Daily Checklist
 *
 * A simple daily checklist app for tracking recurring tasks.
 * - Items are stored in ~/.daily-checklist.txt (one per line)
 * - Auto-saves when you edit the list
 * - Checked state is held in memory only (resets each session)
 * - Designed to nag you until everything is checked off
 *
 * @tsyne-app:name Daily Checklist
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
 * @tsyne-app:category productivity
 * @tsyne-app:builder buildDailyChecklist
 * @tsyne-app:count one
 */

import { app, App, Window, Checkbox, Label, MultiLineEntry, Button } from '../src';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// File path for storing checklist items
const CHECKLIST_FILE = path.join(os.homedir(), '.daily-checklist.txt');

// In-memory state for checked items (resets each session)
interface ChecklistState {
  items: string[];
  checked: Set<number>;
}

/**
 * Build the Daily Checklist app
 */
export function buildDailyChecklist(a: App) {
  // In-memory state
  const state: ChecklistState = {
    items: [],
    checked: new Set<number>()
  };

  // Widget references
  let itemsTextArea: MultiLineEntry;
  let checklistContainer: any;
  let statusLabel: Label;
  let editModeContainer: any;
  let checklistModeContainer: any;
  let saveButton: Button;

  // Mode flag
  let isEditMode = false;

  /**
   * Parse newline-delimited text into items array
   * Handles \n, \r\n, and \r line endings
   */
  function parseItems(text: string): string[] {
    return text
      .split(/\r?\n|\r/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Load items from ~/.daily-checklist.txt
   */
  function loadItems(): void {
    try {
      if (fs.existsSync(CHECKLIST_FILE)) {
        const saved = fs.readFileSync(CHECKLIST_FILE, 'utf-8');
        state.items = parseItems(saved);
      } else {
        state.items = [];
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
      state.items = [];
    }
    state.checked.clear();
  }

  /**
   * Save items to ~/.daily-checklist.txt (auto-save)
   */
  function saveItems(): void {
    try {
      const text = state.items.join('\n');
      fs.writeFileSync(CHECKLIST_FILE, text, 'utf-8');
    } catch (error) {
      console.error('Error saving checklist:', error);
    }
  }

  /**
   * Update status label with progress
   */
  async function updateStatus(): Promise<void> {
    const total = state.items.length;
    const done = state.checked.size;

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
   * Rebuild the checklist UI
   */
  function rebuildChecklist(): void {
    if (!checklistContainer) return;

    checklistContainer.removeAll();

    if (state.items.length === 0) {
      checklistContainer.add(() => {
        a.label('No tasks configured.');
        a.label('Click "Edit List" to add items.');
      });
    } else {
      state.items.forEach((item, index) => {
        checklistContainer.add(() => {
          const cb = a.checkbox(item, async (checked: boolean) => {
            if (checked) {
              state.checked.add(index);
            } else {
              state.checked.delete(index);
            }
            await updateStatus();
          }).withId(`checklist-item-${index}`);

          // Restore checked state if it was checked
          if (state.checked.has(index)) {
            cb.setChecked(true);
          }
        });
      });
    }

    checklistContainer.refresh();
  }

  /**
   * Switch to edit mode
   */
  async function enterEditMode(): Promise<void> {
    isEditMode = true;
    const text = state.items.join('\n');
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
      state.items = parseItems(text);
      state.checked.clear(); // Reset checked state when items change
      saveItems(); // Auto-save to ~/.daily-checklist.txt
      rebuildChecklist();
    }

    isEditMode = false;
    await editModeContainer.hide();
    await checklistModeContainer.show();
    await updateStatus();
  }

  /**
   * Reset all checkboxes
   */
  async function resetChecks(): Promise<void> {
    state.checked.clear();
    rebuildChecklist();
    await updateStatus();
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
                // Scrollable checklist
                a.scroll(() => {
                  checklistContainer = a.vbox(() => {
                    a.label('Loading...');
                  });
                });
              },
              bottom: () => {
                a.vbox(() => {
                  a.separator();
                  // Action buttons
                  a.hbox(() => {
                    a.button('Reset All').withId('resetBtn').onClick(async () => {
                      await resetChecks();
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

                saveButton = a.button('Save').withId('saveBtn').onClick(async () => {
                  await exitEditMode(true);
                });
              });
            });
          });
        }
      });
    });

    // Initialize
    (async () => {
      await editModeContainer.hide();
      loadItems();
      rebuildChecklist();
      await updateStatus();
    })();

    win.show();
  });
}

// Skip auto-run when imported by test framework or desktop
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app({ title: 'Daily Checklist' }, buildDailyChecklist);
}
