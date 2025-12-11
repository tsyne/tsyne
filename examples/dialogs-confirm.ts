/**
 * Confirm Dialog Example
 *
 * Demonstrates confirmation dialogs that return user's response
 * (Yes/No) for critical actions requiring user consent.
 */

import { app, window, vbox, hbox, label, button, entry } from '../core/src';

let itemsToDelete: string[] = ['Document1.txt', 'Image.png', 'Video.mp4'];
let statusLabel: any;
let itemList: any;

function updateItemList() {
  const listText = itemsToDelete.length > 0
    ? `Items: ${itemsToDelete.join(', ')}`
    : 'No items remaining';
  itemList.setText(listText);
}

app({ title: 'Confirm Dialogs Demo' }, () => {
  window({ title: 'Confirmation Dialogs', width: 450, height: 400 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Confirmation Dialog Examples');
        label('');

        // Status display
        statusLabel = label('Ready');
        itemList = label('');
        updateItemList();
        label('');

        // Basic confirm
        button('Simple Confirm').onClick(async () => {
          const confirmed = await win.showConfirm(
            'Confirm Action',
            'Are you sure you want to proceed?'
          );

          if (confirmed) {
            statusLabel.setText('User confirmed!');
          } else {
            statusLabel.setText('User cancelled');
          }
        });

        label('');

        // Delete confirmation
        button('Delete Item').onClick(async () => {
          if (itemsToDelete.length === 0) {
            await win.showInfo('No Items', 'There are no items to delete');
            return;
          }

          const confirmed = await win.showConfirm(
            'Delete File',
            `Are you sure you want to delete "${itemsToDelete[0]}"? This action cannot be undone.`
          );

          if (confirmed) {
            const deleted = itemsToDelete.shift();
            statusLabel.setText(`Deleted: ${deleted}`);
            updateItemList();
          } else {
            statusLabel.setText('Delete cancelled');
          }
        });

        label('');

        // Delete all confirmation
        button('Delete All Items').onClick(async () => {
          if (itemsToDelete.length === 0) {
            await win.showInfo('No Items', 'There are no items to delete');
            return;
          }

          const confirmed = await win.showConfirm(
            'Delete All',
            `Are you sure you want to delete all ${itemsToDelete.length} items? This action cannot be undone.`
          );

          if (confirmed) {
            const count = itemsToDelete.length;
            itemsToDelete = [];
            statusLabel.setText(`Deleted ${count} items`);
            updateItemList();
          } else {
            statusLabel.setText('Delete all cancelled');
          }
        });

        label('');

        // Exit confirmation
        button('Exit Application').onClick(async () => {
          const confirmed = await win.showConfirm(
            'Exit',
            'Are you sure you want to exit? Any unsaved changes will be lost.'
          );

          if (confirmed) {
            statusLabel.setText('Exiting...');
            // In a real app, you would call app.quit() here
            await win.showInfo('Demo Mode', 'In a real app, this would exit the application');
          } else {
            statusLabel.setText('Exit cancelled');
          }
        });

        label('');
        label('');

        // Reset button
        button('Reset Items').onClick(() => {
          itemsToDelete = ['Document1.txt', 'Image.png', 'Video.mp4'];
          updateItemList();
          statusLabel.setText('Items reset');
        });
      });
    });

    win.show();
  });
});
