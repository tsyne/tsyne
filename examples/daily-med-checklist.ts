/**
 * Daily Medication Checklist
 *
 * A simple daily checklist app for medication reminders.
 * - Items are stored as CR-delimited text (persisted across restarts)
 * - Checked state is held in memory only (resets each session)
 * - Designed to nag you until everything is checked off
 *
 * @tsyne-app:name Daily Meds
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5L9.04 7.96a2.5 2.5 0 000 3.54L12 14.5l2.96-2.96a2.5 2.5 0 000-3.54Z"/></svg>
 * @tsyne-app:category health
 * @tsyne-app:builder buildDailyMedChecklist
 * @tsyne-app:count one
 */

import { app, App, Window, Checkbox, Label, MultiLineEntry, Button } from '../src';

// Preference key for storing checklist items
const PREF_KEY_ITEMS = 'daily-med-checklist.items';

// In-memory state for checked items (resets each session)
interface ChecklistState {
  items: string[];
  checked: Set<number>;
}

/**
 * Build the Daily Medication Checklist app
 */
export function buildDailyMedChecklist(a: App) {
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
   * Load items from preferences
   */
  async function loadItems(): Promise<void> {
    const saved = await a.getPreference(PREF_KEY_ITEMS, '');
    state.items = parseItems(saved);
    state.checked.clear();
  }

  /**
   * Save items to preferences
   */
  async function saveItems(): Promise<void> {
    const text = state.items.join('\n');
    await a.setPreference(PREF_KEY_ITEMS, text);
  }

  /**
   * Update status label with progress
   */
  async function updateStatus(): Promise<void> {
    const total = state.items.length;
    const done = state.checked.size;

    if (total === 0) {
      await statusLabel.setText('No items configured. Click "Edit List" to add medications.');
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
        a.label('No medications configured.');
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
          }).withId(`med-item-${index}`);

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
      await saveItems();
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
  a.window({ title: 'Daily Medication Checklist', width: 400, height: 500 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('Daily Medication Checklist').withId('title');
        a.separator();

        // Status bar
        statusLabel = a.label('Loading...').withId('statusLabel');
        a.separator();

        // Checklist mode container
        checklistModeContainer = a.vbox(() => {
          // Scrollable checklist
          a.scroll(() => {
            checklistContainer = a.vbox(() => {
              a.label('Loading...');
            });
          });

          a.spacer();
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

        // Edit mode container (hidden by default)
        editModeContainer = a.vbox(() => {
          a.label('Enter medications (one per line):');

          itemsTextArea = a.multilineentry('Morning pill\nEvening pill\nVitamins')
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
    });

    // Initialize
    (async () => {
      await editModeContainer.hide();
      await loadItems();
      rebuildChecklist();
      await updateStatus();
    })();

    win.show();
  });
}

// Skip auto-run when imported by test framework or desktop
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app({ title: 'Daily Medication Checklist' }, buildDailyMedChecklist);
}
