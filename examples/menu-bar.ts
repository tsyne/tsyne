/**
 * Menu Bar Example
 *
 * Demonstrates creating and using menu bars with
 * File, Edit, and Help menus.
 */

import { app, window, vbox, label, entry } from '../core/src';

let statusLabel: any;
let textEntry: any;
let savedText: string = '';

app({ title: 'Menu Bar Demo' }, () => {
  window({ title: 'Menu Bar Example', width: 600, height: 400 }, (win) => {
    // Set up the main menu
    win.setMainMenu([
      // File menu
      {
        label: 'File',
        items: [
          {
            label: 'New',
            onSelected: async () => {
              const confirmed = await win.showConfirm(
                'New File',
                'This will clear the current text. Continue?'
              );
              if (confirmed) {
                await textEntry.setText('');
                savedText = '';
                statusLabel.setText('New file created');
              }
            }
          },
          {
            label: 'Open...',
            onSelected: async () => {
              const filePath = await win.showFileOpen();
              if (filePath) {
                statusLabel.setText(`Opened: ${filePath}`);
                await textEntry.setText(`Content from: ${filePath}`);
              } else {
                statusLabel.setText('Open cancelled');
              }
            }
          },
          {
            label: 'Save',
            onSelected: async () => {
              savedText = await textEntry.getText();
              statusLabel.setText('File saved');
              await win.showInfo('Saved', 'Your changes have been saved');
            }
          },
          {
            label: 'Save As...',
            onSelected: async () => {
              const filePath = await win.showFileSave('document.txt');
              if (filePath) {
                savedText = await textEntry.getText();
                statusLabel.setText(`Saved as: ${filePath}`);
                await win.showInfo('Saved', `File saved to ${filePath}`);
              } else {
                statusLabel.setText('Save cancelled');
              }
            }
          },
          {
            isSeparator: true
          },
          {
            label: 'Exit',
            onSelected: async () => {
              const confirmed = await win.showConfirm(
                'Exit',
                'Are you sure you want to exit?'
              );
              if (confirmed) {
                statusLabel.setText('Exiting...');
                // In a real app, you would call app.quit() here
              }
            }
          }
        ]
      },
      // Edit menu
      {
        label: 'Edit',
        items: [
          {
            label: 'Cut',
            onSelected: () => {
              statusLabel.setText('Cut operation (not implemented)');
            }
          },
          {
            label: 'Copy',
            onSelected: () => {
              statusLabel.setText('Copy operation (not implemented)');
            }
          },
          {
            label: 'Paste',
            onSelected: () => {
              statusLabel.setText('Paste operation (not implemented)');
            }
          },
          {
            isSeparator: true
          },
          {
            label: 'Select All',
            onSelected: () => {
              statusLabel.setText('Select All (not implemented)');
            }
          },
          {
            isSeparator: true
          },
          {
            label: 'Preferences',
            onSelected: () => {
              statusLabel.setText('Opening preferences...');
            }
          }
        ]
      },
      // View menu
      {
        label: 'View',
        items: [
          {
            label: 'Fullscreen',
            checked: false,
            onSelected: async () => {
              await win.setFullScreen(true);
              statusLabel.setText('Entered fullscreen mode');
            }
          },
          {
            label: 'Exit Fullscreen',
            onSelected: async () => {
              await win.setFullScreen(false);
              statusLabel.setText('Exited fullscreen mode');
            }
          },
          {
            isSeparator: true
          },
          {
            label: 'Zoom In',
            onSelected: () => {
              statusLabel.setText('Zoom in (not implemented)');
            }
          },
          {
            label: 'Zoom Out',
            onSelected: () => {
              statusLabel.setText('Zoom out (not implemented)');
            }
          },
          {
            label: 'Reset Zoom',
            onSelected: () => {
              statusLabel.setText('Reset zoom (not implemented)');
            }
          }
        ]
      },
      // Help menu
      {
        label: 'Help',
        items: [
          {
            label: 'Documentation',
            onSelected: () => {
              statusLabel.setText('Opening documentation...');
            }
          },
          {
            label: 'About',
            onSelected: async () => {
              await win.showInfo(
                'About Tsyne',
                'Tsyne Menu Bar Demo\nVersion 1.0.0\n\nA demonstration of menu bar functionality.'
              );
            }
          }
        ]
      }
    ]);

    win.setContent(() => {
      vbox(() => {
        label('Menu Bar Example');
        label('');
        label('Try using the menu bar above!');
        label('File > New, Open, Save, Exit');
        label('Edit > Cut, Copy, Paste, Select All');
        label('View > Fullscreen, Zoom');
        label('Help > Documentation, About');
        label('');

        // Status label
        statusLabel = label('Ready');
        label('');

        // Text entry area
        label('Text Editor:');
        textEntry = entry('Type something here...');
        label('');

        label('Use File menu to save or load text');
        label('Use Edit menu for editing operations');
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
