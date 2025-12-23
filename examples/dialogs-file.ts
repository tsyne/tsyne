/**
 * File Dialog Example
 *
 * Demonstrates file open and save dialogs for file selection
 * and user-driven file operations.
 */

import { app, resolveTransport, window, vbox, hbox, label, button, entry  } from '../core/src';

app(resolveTransport(), { title: 'File Dialogs Demo' }, () => {
  window({ title: 'File Open/Save Dialogs', width: 500, height: 400 }, (win) => {
    let statusLabel: any;
    let filePathLabel: any;
    let filenameEntry: any;
    let currentFilePath: string | null = null;

    win.setContent(() => {
      vbox(() => {
        label('File Dialog Examples');
        label('');

        // Status display
        statusLabel = label('No file selected');
        filePathLabel = label('File path: (none)');
        label('');

        // Open file dialog
        button('Open File').onClick(async () => {
          statusLabel.setText('Opening file dialog...');

          const filePath = await win.showFileOpen();

          if (filePath) {
            currentFilePath = filePath;
            statusLabel.setText('File selected!');
            filePathLabel.setText(`File path: ${filePath}`);
          } else {
            statusLabel.setText('File open cancelled');
          }
        });

        label('');

        // Save file section
        label('Save File Options:');
        label('');

        label('Filename:');
        filenameEntry = entry('document.txt');
        label('');

        hbox(() => {
          button('Save File').onClick(async () => {
            const filename = await filenameEntry.getText();
            statusLabel.setText('Opening save dialog...');

            const filePath = await win.showFileSave(filename);

            if (filePath) {
              currentFilePath = filePath;
              statusLabel.setText('File location selected!');
              filePathLabel.setText(`Save to: ${filePath}`);
            } else {
              statusLabel.setText('File save cancelled');
            }
          });

          button('Save As...').onClick(async () => {
            const filename = currentFilePath
              ? currentFilePath.split('/').pop() || 'untitled.txt'
              : 'untitled.txt';

            statusLabel.setText('Opening save as dialog...');

            const filePath = await win.showFileSave(filename);

            if (filePath) {
              currentFilePath = filePath;
              statusLabel.setText('Save location updated!');
              filePathLabel.setText(`Save to: ${filePath}`);
            } else {
              statusLabel.setText('Save as cancelled');
            }
          });
        });

        label('');
        label('');

        // Practical workflow example
        label('Practical Workflow:');
        label('');

        button('Open and Process').onClick(async () => {
          const filePath = await win.showFileOpen();

          if (filePath) {
            statusLabel.setText('Processing file...');
            filePathLabel.setText(`Opened: ${filePath}`);

            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            await win.showInfo('Processing Complete', `File ${filePath} has been processed successfully!`);
            statusLabel.setText('Ready for next operation');
          } else {
            statusLabel.setText('Open cancelled');
          }
        });

        label('');

        button('Create New Document').onClick(async () => {
          const confirmed = await win.showConfirm(
            'Create New',
            'This will clear the current document. Continue?'
          );

          if (confirmed) {
            currentFilePath = null;
            statusLabel.setText('New document created');
            filePathLabel.setText('File path: (unsaved)');
            await filenameEntry.setText('untitled.txt');
          }
        });

        label('');

        button('Save Current Work').onClick(async () => {
          if (currentFilePath) {
            // Save to existing path
            await win.showInfo('Saved', `Document saved to ${currentFilePath}`);
            statusLabel.setText('Document saved');
          } else {
            // Show save dialog for new file
            const filename = await filenameEntry.getText();
            const filePath = await win.showFileSave(filename);

            if (filePath) {
              currentFilePath = filePath;
              statusLabel.setText('Document saved!');
              filePathLabel.setText(`Saved to: ${filePath}`);
              await win.showInfo('Success', `Document saved to ${filePath}`);
            }
          }
        });
      });
    });

    win.show();
  });
});
