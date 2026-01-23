/**
 * Tabs (AppTabs) Example
 *
 * Demonstrates tabbed interface for organizing content
 * into multiple switchable panels.
 */

import { app, resolveTransport, window, vbox, hbox, label, button, entry, checkbox, slider, tabs  } from 'tsyne';

let statusLabel: any;

app(resolveTransport(), { title: 'Tabs Demo' }, () => {
  window({ title: 'Tabs Example', width: 500, height: 400 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Tabs Widget Example');
        label('');

        // Status label
        statusLabel = label('Switch between tabs to see different content');
        label('');

        // Create tabs with different content
        tabs([
          // Home tab
          {
            title: 'Home',
            builder: () => {
              vbox(() => {
                label('=== Welcome ===');
                label('');
                label('This is the Home tab.');
                label('');
                label('Use tabs to organize your UI into');
                label('logical sections that users can switch');
                label('between without leaving the window.');
                label('');
                button('Click Me').onClick(() => {
                  statusLabel.setText('Home tab button clicked!');
                });
                label('');
                label('Perfect for:');
                label('• Settings pages');
                label('• Multi-step forms');
                label('• Dashboard views');
                label('• Document editors');
              });
            }
          },
          // Profile tab
          {
            title: 'Profile',
            builder: () => {
              vbox(() => {
                label('=== User Profile ===');
                label('');
                label('Name:');
                entry('John Doe');
                label('');
                label('Email:');
                entry('john@example.com');
                label('');
                checkbox('Receive notifications', (checked) => {
                  statusLabel.setText(`Notifications: ${checked ? 'ON' : 'OFF'}`);
                });
                label('');
                button('Save Profile').onClick(() => {
                  statusLabel.setText('Profile saved successfully!');
                });
              });
            }
          },
          // Settings tab
          {
            title: 'Settings',
            builder: () => {
              vbox(() => {
                label('=== Settings ===');
                label('');
                label('Volume:');
                slider(0, 100, 50, (value) => {
                  statusLabel.setText(`Volume: ${Math.round(value)}`);
                });
                label('');
                label('Theme:');
                checkbox('Dark mode', (checked) => {
                  statusLabel.setText(`Dark mode: ${checked ? 'ON' : 'OFF'}`);
                });
                label('');
                checkbox('Auto-save', (checked) => {
                  statusLabel.setText(`Auto-save: ${checked ? 'ON' : 'OFF'}`);
                });
                label('');
                hbox(() => {
                  button('Apply').onClick(() => {
                    statusLabel.setText('Settings applied');
                  });
                  button('Reset').onClick(() => {
                    statusLabel.setText('Settings reset to defaults');
                  });
                });
              });
            }
          },
          // Data tab
          {
            title: 'Data',
            builder: () => {
              vbox(() => {
                label('=== Data Management ===');
                label('');
                label('Database connections: 3');
                label('Active sessions: 12');
                label('Cache size: 45 MB');
                label('');
                hbox(() => {
                  button('Clear Cache').onClick(async () => {
                    const confirmed = await win.showConfirm(
                      'Clear Cache',
                      'Are you sure you want to clear the cache?'
                    );
                    if (confirmed) {
                      statusLabel.setText('Cache cleared successfully');
                      await win.showInfo('Success', 'Cache has been cleared');
                    }
                  });
                  button('Export Data').onClick(() => {
                    statusLabel.setText('Exporting data...');
                  });
                });
                label('');
                label('Last backup: 2 hours ago');
                button('Backup Now').onClick(() => {
                  statusLabel.setText('Creating backup...');
                });
              });
            }
          },
          // About tab
          {
            title: 'About',
            builder: () => {
              vbox(() => {
                label('=== About ===');
                label('');
                label('Application Name: Tsyne Tabs Demo');
                label('Version: 1.0.0');
                label('');
                label('Tsyne is a TypeScript wrapper');
                label('for the Fyne UI toolkit.');
                label('');
                label('Features:');
                label('✓ Cross-platform');
                label('✓ Native performance');
                label('✓ Type-safe API');
                label('✓ Easy to use');
                label('');
                button('Visit Website').onClick(() => {
                  statusLabel.setText('Opening website...');
                  console.log('https://github.com/paul-hammant/tsyne');
                });
              });
            }
          }
        ], 'top'); // Tab location: 'top', 'bottom', 'leading', or 'trailing'
      });
    });

    win.show();
  });
});
