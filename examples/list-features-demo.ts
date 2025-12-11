import { app, Label, List } from '../core/src/index';

/**
 * List Features Demo
 *
 * Demonstrates new List widget features:
 * - OnUnselected event: Fires when a list item is deselected
 * - unselectAll() method: Programmatically clear all selections
 *
 * These features are useful for:
 * - Multi-selection list management
 * - Tracking selection changes
 * - Reset/clear functionality
 * - Form validation and state management
 */

app({ title: 'List Features Demo' }, (a) => {
  a.window({ title: 'List Features', width: 700, height: 600 }, (win) => {
    let selectedLabel: Label;
    let unselectedLabel: Label;
    let listWidget: List;
    let currentSelection: string | null = null;

    const items = [
      'Apple',
      'Banana',
      'Cherry',
      'Date',
      'Elderberry',
      'Fig',
      'Grape',
      'Honeydew'
    ];

    win.setContent(() => {
      a.vbox(() => {
        a.label('List Features Demo', undefined, 'center');
        a.label('New OnUnselected event and unselectAll() method', undefined, 'center');
        a.separator();

        a.label('Interactive List:');
        a.label('Click items to see selection and unselection events');

        // List with both onSelected and onUnselected callbacks
        listWidget = a.list(
          items,
          (index, item) => {
            currentSelection = item;
            selectedLabel.setText(`Selected: ${item} (index ${index})`);
            console.log('Selected:', item);
          },
          (index, item) => {
            unselectedLabel.setText(`Unselected: ${item} (index ${index})`);
            console.log('Unselected:', item);
          }
        );

        a.separator();

        // Event status displays
        a.label('Event Log:');
        selectedLabel = a.label('Selected: (none)');
        unselectedLabel = a.label('Unselected: (none)');

        a.separator();

        // Control buttons
        a.label('List Controls:');
        a.hbox(() => {
          a.button('Unselect All').onClick(async () => {
            await listWidget.unselectAll();
            currentSelection = null;
            selectedLabel.setText('Selected: (cleared programmatically)');
          });

          a.button('Show Selection').onClick(async () => {
            if (currentSelection) {
              await win.showInfo('Current Selection', `Currently selected: ${currentSelection}`);
            } else {
              await win.showInfo('Current Selection', 'No item selected');
            }
          });
        });

        a.separator();

        a.label('💡 Tips:', undefined, undefined, undefined, { bold: true });
        a.label('• Click an item to select it (fires OnSelected)');
        a.label('• Click another item to switch selection (fires OnUnselected then OnSelected)');
        a.label('• Use "Unselect All" to clear selection programmatically');
      });
    });

    win.show();
  });
});
