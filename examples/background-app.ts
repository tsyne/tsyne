/**
 * Background App - System Tray Demo
 *
 * Demonstrates the System Tray feature:
 * - App runs in background with system tray icon
 * - Tray menu to show/hide window
 * - Tray menu to quit application
 *
 * This example shows how to create an app that can be minimized
 * to the system tray and continue running in the background.
 */

import { app } from '../core/src/index';

app({ title: 'Background App' }, (a) => {
  let mainWindow: any;
  let isHidden = false;

  a.window({ title: 'Background App', width: 400, height: 300 }, (win) => {
    mainWindow = win;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Background App Demo', undefined, 'center', undefined, { bold: true });
        a.separator();

        a.label('This app can run in the background.', undefined, 'center');
        a.label('Close the window to minimize to tray.', undefined, 'center');

        a.separator();

        a.hbox(() => {
          a.button('Hide to Tray').onClick(async () => {
            isHidden = true;
            await win.resize(0, 0); // Minimize by resizing
          });

          a.button('Send Test Notification').onClick(async () => {
            await a.sendNotification('Background App', 'Hello from the background!');
          });
        });

        a.separator();

        a.label('Status: Running', undefined, 'center');
      });
    });

    win.show();
  });

  // Set up system tray
  a.setSystemTray({
    menuItems: [
      {
        label: 'Show Window',
        onClick: () => {
          if (mainWindow) {
            mainWindow.resize(400, 300);
            mainWindow.show();
            isHidden = false;
          }
        }
      },
      {
        label: 'Hide Window',
        onClick: () => {
          if (mainWindow) {
            mainWindow.resize(0, 0);
            isHidden = true;
          }
        }
      },
      { label: '', isSeparator: true },
      {
        label: 'Send Notification',
        onClick: () => {
          a.sendNotification('Tray Notification', 'Sent from the system tray!');
        }
      },
      { label: '', isSeparator: true },
      {
        label: 'Quit',
        onClick: () => {
          a.quit();
        }
      }
    ]
  });
});
