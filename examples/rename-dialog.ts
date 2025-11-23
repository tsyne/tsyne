// Entry dialog demo - demonstrates showEntryDialog for quick text input
// This example shows a list of files that can be renamed using the entry dialog

import { app, Label } from '../src';

interface FileItem {
  id: number;
  name: string;
}

// Simple file list model
const files: FileItem[] = [
  { id: 1, name: 'document.txt' },
  { id: 2, name: 'photo.jpg' },
  { id: 3, name: 'notes.md' },
];

app({ title: 'Rename Dialog Demo' }, (a) => {
  a.window({ title: 'File Renamer', width: 400, height: 300 }, (win) => {
    // Track labels so we can update them
    const fileLabels: Map<number, Label> = new Map();
    let statusLabel: Label;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Click "Rename" to rename a file using the entry dialog:');
        a.separator();

        // Render each file with a rename button
        for (const file of files) {
          a.hbox(() => {
            const label = a.label(file.name);
            fileLabels.set(file.id, label);

            a.button('Rename', async () => {
              const newName = await win.showEntryDialog(
                'Rename File',
                `Enter new name for "${file.name}":`
              );

              if (newName) {
                const oldName = file.name;
                file.name = newName;
                await label.setText(newName);
                await statusLabel.setText(`Renamed "${oldName}" to "${newName}"`);
              } else {
                await statusLabel.setText('Rename cancelled');
              }
            });
          });
        }

        a.separator();
        statusLabel = a.label('Ready');
      });
    });
    win.show();
  });
});
