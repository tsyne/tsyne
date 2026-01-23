/**
 * Info and Error Dialog Example
 *
 * Demonstrates how to show information and error dialogs
 * for user notifications and error reporting.
 */

import { app, resolveTransport, window, vbox, hbox, label, button, entry  } from 'tsyne';

app(resolveTransport(), { title: 'Info/Error Dialogs Demo' }, () => {
  window({ title: 'Info and Error Dialogs', width: 400, height: 300 }, (win) => {
    let messageEntry: any;
    let statusLabel: any;

    win.setContent(() => {
      vbox(() => {
        label('Info and Error Dialog Examples');
        label('');

        // Message input
        label('Enter a message:');
        messageEntry = entry('Hello, World!');
        label('');

        // Status label
        statusLabel = label('Click buttons to show dialogs');
        label('');

        // Info dialog buttons
        hbox(() => {
          button('Show Info').onClick(async () => {
            const message = await messageEntry.getText();
            await win.showInfo('Information', message);
            statusLabel.setText('Info dialog shown');
          });

          button('Show Success').onClick(async () => {
            await win.showInfo('Success', 'Operation completed successfully!');
            statusLabel.setText('Success dialog shown');
          });
        });

        label('');

        // Error dialog buttons
        hbox(() => {
          button('Show Error').onClick(async () => {
            const message = await messageEntry.getText();
            await win.showError('Error', message);
            statusLabel.setText('Error dialog shown');
          });

          button('Show Warning').onClick(async () => {
            await win.showInfo('Warning', 'This action cannot be undone!');
            statusLabel.setText('Warning dialog shown');
          });
        });

        label('');

        // Practical examples
        label('Practical Examples:');
        label('');

        hbox(() => {
          button('Save Success').onClick(async () => {
            await win.showInfo('Save Complete', 'Your document has been saved successfully.');
          });

          button('Connection Error').onClick(async () => {
            await win.showError('Connection Failed', 'Unable to connect to server. Please check your network connection.');
          });
        });
      });
    });

    win.show();
  });
});
