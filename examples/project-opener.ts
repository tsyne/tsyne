/**
 * Project Opener Example
 *
 * Demonstrates the folder open dialog for selecting project directories.
 * This is useful for IDEs, file managers, or any app that needs to
 * work with project folders.
 */

import { app, window, vbox, hbox, label, button } from '../core/src';

app({ title: 'Project Opener' }, () => {
  window({ title: 'Project Opener', width: 500, height: 350 }, (win) => {
    let statusLabel: any;
    let projectPathLabel: any;
    let projectNameLabel: any;
    let currentProjectPath: string | null = null;

    win.setContent(() => {
      vbox(() => {
        label('Project Opener');
        label('Select a folder to open as a project');
        label('');

        // Status display
        statusLabel = label('No project opened');
        projectPathLabel = label('Path: (none)');
        projectNameLabel = label('Project: (none)');
        label('');

        // Open folder dialog
        hbox(() => {
          button('Open Project Folder').onClick(async () => {
            statusLabel.setText('Opening folder dialog...');

            const folderPath = await win.showFolderOpen();

            if (folderPath) {
              currentProjectPath = folderPath;
              const projectName = folderPath.split('/').pop() || folderPath;
              statusLabel.setText('Project opened!');
              projectPathLabel.setText(`Path: ${folderPath}`);
              projectNameLabel.setText(`Project: ${projectName}`);
            } else {
              statusLabel.setText('Folder selection cancelled');
            }
          });

          button('Close Project').onClick(async () => {
            if (currentProjectPath) {
              const confirmed = await win.showConfirm(
                'Close Project',
                `Close project "${currentProjectPath.split('/').pop()}"?`
              );

              if (confirmed) {
                currentProjectPath = null;
                statusLabel.setText('Project closed');
                projectPathLabel.setText('Path: (none)');
                projectNameLabel.setText('Project: (none)');
              }
            } else {
              await win.showInfo('No Project', 'No project is currently open.');
            }
          });
        });

        label('');
        label('Recent Projects:');
        label('');

        // Simulate recent projects list
        button('  /home/user/my-project').onClick(async () => {
          currentProjectPath = '/home/user/my-project';
          statusLabel.setText('Project opened from recent!');
          projectPathLabel.setText('Path: /home/user/my-project');
          projectNameLabel.setText('Project: my-project');
        });

        button('  /home/user/another-app').onClick(async () => {
          currentProjectPath = '/home/user/another-app';
          statusLabel.setText('Project opened from recent!');
          projectPathLabel.setText('Path: /home/user/another-app');
          projectNameLabel.setText('Project: another-app');
        });

        label('');
        label('');

        // Project info button
        button('Show Project Info').onClick(async () => {
          if (currentProjectPath) {
            await win.showInfo(
              'Project Information',
              `Project: ${currentProjectPath.split('/').pop()}\nPath: ${currentProjectPath}`
            );
          } else {
            await win.showError('Error', 'No project is currently open.');
          }
        });
      });
    });

    win.show();
  });
});
