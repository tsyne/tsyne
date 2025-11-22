// Preferences demo app - demonstrates CheckGroup widget for grouped options
// This example shows how to use CheckGroup for a settings panel with multiple selections

import { app } from '../src';

app({ title: 'Preferences' }, (a) => {
  a.window({ title: 'Application Preferences', width: 500, height: 450 }, (win) => {
    // Track selections
    let notificationTypes: string[] = ['Email', 'Push'];
    let features: string[] = ['Auto-save'];
    let statusLabel: any;

    const updateStatus = () => {
      const notificationText = notificationTypes.length > 0
        ? `Notifications: ${notificationTypes.join(', ')}`
        : 'Notifications: None';
      const featuresText = features.length > 0
        ? `Features: ${features.join(', ')}`
        : 'Features: None';
      statusLabel?.setText(`${notificationText}\n${featuresText}`);
    };

    win.setContent(() => {
      a.vbox(() => {
        a.label('Application Preferences', undefined, 'center', undefined, { bold: true });
        a.separator();

        // Notification settings group
        a.card('Notifications', 'Choose how you want to be notified', () => {
          a.vbox(() => {
            a.checkgroup(
              ['Email', 'Push', 'SMS', 'In-App'],
              notificationTypes,
              (selected) => {
                notificationTypes = selected;
                updateStatus();
              }
            );
          });
        });

        // Feature toggles group
        a.card('Features', 'Enable or disable application features', () => {
          a.vbox(() => {
            a.checkgroup(
              ['Auto-save', 'Dark Mode', 'Spell Check', 'Analytics'],
              features,
              (selected) => {
                features = selected;
                updateStatus();
              }
            );
          });
        });

        a.separator();

        // Status display
        statusLabel = a.label('', undefined, 'leading', 'word');
        updateStatus();

        // Action buttons
        a.hbox(() => {
          a.button('Reset to Defaults', async () => {
            notificationTypes = ['Email', 'Push'];
            features = ['Auto-save'];
            // Note: In a real app, you'd update the checkgroups' selected state
            updateStatus();
          });
          a.button('Save Preferences', () => {
            console.log('Saving preferences:', { notificationTypes, features });
          });
        });
      });
    });

    win.show();
  });
});
