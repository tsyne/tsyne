// Portions copyright Ryelang developers (Apache 2.0)
// Interactive shopping list with add, check, and delete functionality

import { app } from '../src';

interface ShoppingItem {
  id: number;
  text: string;
  checked: boolean;
}

app({ title: 'Shopping List' }, (a) => {
  a.window({ title: 'Shopping List', width: 300, height: 400 }, (win) => {
    let nextId = 1;
    const items: ShoppingItem[] = [
      { id: nextId++, text: 'Cheese', checked: false },
      { id: nextId++, text: 'Eggs', checked: false },
      { id: nextId++, text: 'Oats', checked: false },
      { id: nextId++, text: 'Anchovies', checked: false },
      { id: nextId++, text: 'Bread', checked: false },
      { id: nextId++, text: 'Paper', checked: false },
    ];

    let inputEntry: any;
    let listContainer: any;

    const renderList = () => {
      listContainer.removeAll();

      items.forEach((item) => {
        listContainer.add(() => {
          a.hbox(() => {
            const checkbox = a.checkbox(item.text, async (checked: boolean) => {
              item.checked = checked;
            });
            (async () => {
              await checkbox.setChecked(item.checked);
            })();

            a.button('Delete', async () => {
              const index = items.findIndex(i => i.id === item.id);
              if (index !== -1) {
                items.splice(index, 1);
                renderList();
              }
            });
          });
        });
      });

      listContainer.refresh();
    };

    win.setContent(() => {
      a.vbox(() => {
        a.label('Shopping List');
        a.separator();

        inputEntry = a.entry('Add to list here ...', async () => {
          const text = await inputEntry.getText();
          if (text && text.trim()) {
            items.push({ id: nextId++, text: text.trim(), checked: false });
            await inputEntry.setText('');
            renderList();
          }
        }, 250);

        a.separator();

        listContainer = a.scroll(() => {
          a.vbox(() => {
            // Items will be added here
          });
        });
      });
    });

    // Initial render
    renderList();

    win.show();
  });
});
