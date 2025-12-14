/**
 * File Browser - Simple file browser with icons
 *
 * This example demonstrates the FileIcon widget which displays
 * appropriate icons based on file type/extension.
 *
 * Run: npx tsx examples/file-browser.ts
 */
import { app } from '../core/src/index';

// Sample file entries with different types
const sampleFiles = [
  { name: 'Documents', path: '/home/user/Documents', isFolder: true },
  { name: 'Pictures', path: '/home/user/Pictures', isFolder: true },
  { name: 'Music', path: '/home/user/Music', isFolder: true },
  { name: 'Videos', path: '/home/user/Videos', isFolder: true },
  { name: 'report.pdf', path: '/home/user/report.pdf', isFolder: false },
  { name: 'notes.txt', path: '/home/user/notes.txt', isFolder: false },
  { name: 'photo.jpg', path: '/home/user/photo.jpg', isFolder: false },
  { name: 'song.mp3', path: '/home/user/song.mp3', isFolder: false },
  { name: 'movie.mp4', path: '/home/user/movie.mp4', isFolder: false },
  { name: 'script.py', path: '/home/user/script.py', isFolder: false },
  { name: 'app.exe', path: '/home/user/app.exe', isFolder: false },
  { name: 'data.json', path: '/home/user/data.json', isFolder: false },
  { name: 'styles.css', path: '/home/user/styles.css', isFolder: false },
  { name: 'index.html', path: '/home/user/index.html', isFolder: false },
  { name: 'README.md', path: '/home/user/README.md', isFolder: false },
];

app({ title: 'Tsyne File Browser' }, (a) => {
  a.window({ title: 'File Browser', width: 600, height: 500 }, (win) => {
    let selectedFile: string | null = null;
    let statusLabel: any;

    win.setContent(() => {
      a.vbox(() => {
        // Header with current path
        a.hbox(() => {
          a.icon('folder');
          a.label('/home/user', undefined, 'leading', undefined, { bold: true });
        });

        a.separator();

        // File list
        a.scroll(() => {
          a.vbox(() => {
            for (const file of sampleFiles) {
              a.hbox(() => {
                // File icon based on path/type
                const fileIcon = a.fileicon(file.path);

                // File name as clickable button
                a.button(file.name).onClick(async () => {
                  // Deselect previous
                  selectedFile = file.path;
                  await fileIcon.setSelected(true);

                  // Update status
                  if (statusLabel) {
                    await statusLabel.setText(`Selected: ${file.name}`);
                  }
                });
              });
            }
          });
        });

        a.separator();

        // Status bar
        a.hbox(() => {
          a.icon('info');
          statusLabel = a.label('Click a file to select it');
        });

        // Action buttons
        a.hbox(() => {
          a.button('Open').onClick(() => {
            if (selectedFile) {
              console.log(`Opening: ${selectedFile}`);
            }
          });
          a.button('Delete').onClick(() => {
            if (selectedFile) {
              console.log(`Deleting: ${selectedFile}`);
            }
          });
          a.button('New Folder').onClick(() => {
            console.log('Creating new folder...');
          });
        });
      });
    });
    win.show();
  });
});
