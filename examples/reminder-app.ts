/**
 * Reminder App - Desktop Notifications Demo
 *
 * Demonstrates the Notifications feature:
 * - Send desktop notifications with title and content
 * - Set reminders that trigger notifications after a delay
 * - Integration with system notification center
 */

import { app } from '../src/index';

interface Reminder {
  id: number;
  title: string;
  delaySeconds: number;
  timeoutId?: NodeJS.Timeout;
}

app({ title: 'Reminder App' }, (a) => {
  const reminders: Reminder[] = [];
  let nextId = 1;
  let reminderListLabel: any;

  a.window({ title: 'Reminder App', width: 500, height: 400 }, (win) => {
    let titleEntry: any;
    let delayEntry: any;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Desktop Notification Reminders', undefined, 'center', undefined, { bold: true });
        a.separator();

        // Input form
        a.hbox(() => {
          a.label('Title:');
          titleEntry = a.entry('Enter reminder title');
        });

        a.hbox(() => {
          a.label('Delay (seconds):');
          delayEntry = a.entry('10');
        });

        a.hbox(() => {
          a.button('Add Reminder').onClick(async () => {
            const title = await titleEntry.getText();
            const delayStr = await delayEntry.getText();
            const delay = parseInt(delayStr, 10) || 10;

            if (title) {
              const reminder: Reminder = {
                id: nextId++,
                title,
                delaySeconds: delay
              };

              // Set timeout for notification
              reminder.timeoutId = setTimeout(() => {
                a.sendNotification('Reminder', title);
                // Remove from list after firing
                const idx = reminders.findIndex(r => r.id === reminder.id);
                if (idx !== -1) {
                  reminders.splice(idx, 1);
                  updateReminderList();
                }
              }, delay * 1000);

              reminders.push(reminder);
              updateReminderList();

              // Clear inputs
              titleEntry.setText('');
              delayEntry.setText('10');

              // Show confirmation
              await a.sendNotification('Reminder Set', `"${title}" in ${delay} seconds`);
            }
          });

          a.button('Send Now').onClick(async () => {
            const title = await titleEntry.getText();
            if (title) {
              await a.sendNotification('Reminder', title);
              titleEntry.setText('');
            }
          });
        });

        a.separator();

        a.label('Active Reminders:', undefined, 'leading', undefined, { bold: true });

        // Reminder list
        reminderListLabel = a.label('No active reminders');

        a.separator();

        a.hbox(() => {
          a.button('Clear All Reminders').onClick(() => {
            for (const reminder of reminders) {
              if (reminder.timeoutId) {
                clearTimeout(reminder.timeoutId);
              }
            }
            reminders.length = 0;
            updateReminderList();
          });

          a.button('Test Notification').onClick(async () => {
            await a.sendNotification('Test', 'This is a test notification!');
          });
        });
      });
    });

    win.show();
  });

  function updateReminderList() {
    if (reminderListLabel) {
      if (reminders.length === 0) {
        reminderListLabel.setText('No active reminders');
      } else {
        const lines = reminders.map(r => `- "${r.title}" in ${r.delaySeconds}s`);
        reminderListLabel.setText(lines.join('\n'));
      }
    }
  }
});
