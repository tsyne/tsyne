/**
 * Settings App - Preferences Demo
 *
 * Demonstrates the Preferences feature:
 * - Save and load user preferences
 * - String, number, and boolean settings
 * - Persistent storage across app restarts
 * - Settings categories with tabs
 */

import { app } from '../src/index';

app({ title: 'Settings App' }, (a) => {
  let statusLabel: any;

  // Setting widgets (we'll populate these after loading)
  let usernameEntry: any;
  let emailEntry: any;
  let ageEntry: any;
  let volumeSlider: any;
  let notificationsCheckbox: any;
  let darkModeCheckbox: any;
  let autoSaveCheckbox: any;

  a.window({ title: 'Settings', width: 500, height: 550 }, async (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Application Settings', undefined, 'center', undefined, { bold: true });
        a.separator();

        a.tabs([
          {
            title: 'Profile',
            builder: () => {
              a.vbox(() => {
                a.label('User Profile', undefined, 'leading', undefined, { bold: true });

                a.hbox(() => {
                  a.label('Username:');
                  usernameEntry = a.entry('Enter username');
                });

                a.hbox(() => {
                  a.label('Email:');
                  emailEntry = a.entry('Enter email');
                });

                a.hbox(() => {
                  a.label('Age:');
                  ageEntry = a.entry('Enter age');
                });
              });
            }
          },
          {
            title: 'Preferences',
            builder: () => {
              a.vbox(() => {
                a.label('App Preferences', undefined, 'leading', undefined, { bold: true });

                a.hbox(() => {
                  a.label('Volume:');
                  volumeSlider = a.slider(0, 100, 50);
                });

                notificationsCheckbox = a.checkbox('Enable Notifications');
                darkModeCheckbox = a.checkbox('Dark Mode');
                autoSaveCheckbox = a.checkbox('Auto-save Settings');
              });
            }
          },
          {
            title: 'About',
            builder: () => {
              a.vbox(() => {
                a.label('Settings App', undefined, 'center', undefined, { bold: true });
                a.label('Version 1.0.0', undefined, 'center');
                a.separator();
                a.label('This demo shows how to use the');
                a.label('Preferences API to save and load');
                a.label('user settings persistently.');
              });
            }
          }
        ]);

        a.separator();

        // Action buttons
        a.hbox(() => {
          a.button('Load Settings').onClick(async () => {
            await loadSettings();
            statusLabel.setText('Settings loaded!');
          });

          a.button('Save Settings').onClick(async () => {
            await saveSettings();
            statusLabel.setText('Settings saved!');
          });

          a.button('Reset to Defaults').onClick(async () => {
            await resetSettings();
            statusLabel.setText('Settings reset to defaults!');
          });
        });

        a.separator();

        // Status bar
        statusLabel = a.label('Ready');

        a.separator();

        // Debug section
        a.label('Debug:', undefined, 'leading', undefined, { bold: true });
        a.hbox(() => {
          a.button('Show Current Values').onClick(async () => {
            const username = await a.getPreference('username', '');
            const email = await a.getPreference('email', '');
            const age = await a.getPreferenceInt('age', 0);
            const volume = await a.getPreferenceInt('volume', 50);
            const notifications = await a.getPreferenceBool('notifications', true);
            const darkMode = await a.getPreferenceBool('darkMode', false);
            const autoSave = await a.getPreferenceBool('autoSave', true);

            const info = [
              `Username: ${username || '(not set)'}`,
              `Email: ${email || '(not set)'}`,
              `Age: ${age}`,
              `Volume: ${volume}`,
              `Notifications: ${notifications}`,
              `Dark Mode: ${darkMode}`,
              `Auto-save: ${autoSave}`
            ].join(' | ');

            statusLabel.setText(info);
          });
        });
      });
    });

    // Load settings on startup
    await loadSettings();
    statusLabel.setText('Settings loaded from storage');

    win.show();
  });

  async function loadSettings() {
    // Load string preferences
    const username = await a.getPreference('username', '');
    const email = await a.getPreference('email', '');

    // Load numeric preferences
    const age = await a.getPreferenceInt('age', 0);
    const volume = await a.getPreferenceInt('volume', 50);

    // Load boolean preferences
    const notifications = await a.getPreferenceBool('notifications', true);
    const darkMode = await a.getPreferenceBool('darkMode', false);
    const autoSave = await a.getPreferenceBool('autoSave', true);

    // Apply to widgets
    if (usernameEntry) usernameEntry.setText(username);
    if (emailEntry) emailEntry.setText(email);
    if (ageEntry) ageEntry.setText(age.toString());
    if (volumeSlider) volumeSlider.setValue(volume);
    if (notificationsCheckbox) notificationsCheckbox.setChecked(notifications);
    if (darkModeCheckbox) darkModeCheckbox.setChecked(darkMode);
    if (autoSaveCheckbox) autoSaveCheckbox.setChecked(autoSave);
  }

  async function saveSettings() {
    // Save string preferences
    if (usernameEntry) {
      const username = await usernameEntry.getText();
      await a.setPreference('username', username);
    }
    if (emailEntry) {
      const email = await emailEntry.getText();
      await a.setPreference('email', email);
    }

    // Save numeric preferences
    if (ageEntry) {
      const ageStr = await ageEntry.getText();
      const age = parseInt(ageStr, 10) || 0;
      await a.setPreference('age', age);
    }
    if (volumeSlider) {
      const volume = await volumeSlider.getValue();
      await a.setPreference('volume', volume);
    }

    // Save boolean preferences
    if (notificationsCheckbox) {
      const notifications = await notificationsCheckbox.getChecked();
      await a.setPreference('notifications', notifications);
    }
    if (darkModeCheckbox) {
      const darkMode = await darkModeCheckbox.getChecked();
      await a.setPreference('darkMode', darkMode);
    }
    if (autoSaveCheckbox) {
      const autoSave = await autoSaveCheckbox.getChecked();
      await a.setPreference('autoSave', autoSave);
    }
  }

  async function resetSettings() {
    // Remove all preferences
    await a.removePreference('username');
    await a.removePreference('email');
    await a.removePreference('age');
    await a.removePreference('volume');
    await a.removePreference('notifications');
    await a.removePreference('darkMode');
    await a.removePreference('autoSave');

    // Reset widgets to defaults
    if (usernameEntry) usernameEntry.setText('');
    if (emailEntry) emailEntry.setText('');
    if (ageEntry) ageEntry.setText('');
    if (volumeSlider) volumeSlider.setValue(50);
    if (notificationsCheckbox) notificationsCheckbox.setChecked(true);
    if (darkModeCheckbox) darkModeCheckbox.setChecked(false);
    if (autoSaveCheckbox) autoSaveCheckbox.setChecked(true);
  }
});
