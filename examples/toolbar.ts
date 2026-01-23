/**
 * Toolbar Example
 *
 * Demonstrates creating and using toolbars with
 * actions, separators, and spacers.
 */

import { app, resolveTransport, window, vbox, label, entry, toolbar  } from 'tsyne';

let statusLabel: any;
let textEntry: any;
let history: string[] = [];

app(resolveTransport(), { title: 'Toolbar Demo' }, () => {
  window({ title: 'Toolbar Example', width: 600, height: 450 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        // Toolbar at the top
        toolbar([
          {
            type: 'action',
            label: 'New',
            onAction: async () => {
              const confirmed = await win.showConfirm(
                'New Document',
                'Clear current text?'
              );
              if (confirmed) {
                await textEntry.setText('');
                statusLabel.setText('New document created');
              }
            }
          },
          {
            type: 'action',
            label: 'Open',
            onAction: async () => {
              const filePath = await win.showFileOpen();
              if (filePath) {
                await textEntry.setText(`Content from: ${filePath}`);
                statusLabel.setText(`Opened: ${filePath}`);
              }
            }
          },
          {
            type: 'action',
            label: 'Save',
            onAction: async () => {
              const text = await textEntry.getText();
              history.push(text);
              statusLabel.setText('Document saved');
              await win.showInfo('Saved', 'Your document has been saved');
            }
          },
          {
            type: 'separator'
          },
          {
            type: 'action',
            label: 'Cut',
            onAction: () => {
              statusLabel.setText('Cut (not implemented)');
            }
          },
          {
            type: 'action',
            label: 'Copy',
            onAction: () => {
              statusLabel.setText('Copy (not implemented)');
            }
          },
          {
            type: 'action',
            label: 'Paste',
            onAction: () => {
              statusLabel.setText('Paste (not implemented)');
            }
          },
          {
            type: 'separator'
          },
          {
            type: 'action',
            label: 'Undo',
            onAction: async () => {
              if (history.length > 0) {
                const previousText = history.pop() || '';
                await textEntry.setText(previousText);
                statusLabel.setText('Undo performed');
              } else {
                statusLabel.setText('Nothing to undo');
              }
            }
          },
          {
            type: 'spacer'
          },
          {
            type: 'action',
            label: 'Help',
            onAction: async () => {
              await win.showInfo(
                'Toolbar Help',
                'Click toolbar buttons to perform actions:\n\n' +
                '• New - Create new document\n' +
                '• Open - Open file\n' +
                '• Save - Save document\n' +
                '• Cut/Copy/Paste - Edit operations\n' +
                '• Undo - Undo last save\n' +
                '• Help - Show this help'
              );
            }
          }
        ]);

        label('');

        // Main content area
        label('Toolbar Example');
        label('');
        label('Use the toolbar above to perform actions!');
        label('');

        // Status label
        statusLabel = label('Ready - Click toolbar buttons to begin');
        label('');

        // Text entry area
        label('Document Editor:');
        textEntry = entry('Type something here and use toolbar buttons...');
        label('');

        label('Features:');
        label('• New - Clear the document');
        label('• Open - Open a file dialog');
        label('• Save - Save to history');
        label('• Edit operations (Cut, Copy, Paste)');
        label('• Undo - Restore previous save');
        label('• Help - Show toolbar help');
        label('');

        label('The toolbar uses:');
        label('• Actions for clickable buttons');
        label('• Separators to group related actions');
        label('• Spacer to push Help to the right');
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
