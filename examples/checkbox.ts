/**
 * Checkbox Widget Example
 *
 * Demonstrates the checkbox widget with state tracking and interaction.
 */

import { app, window, vbox, hbox, label, checkbox, button, screenshotIfRequested } from '../src';

let termsCheckbox: any;
let newsletterCheckbox: any;
let statusLabel: any;

app({ title: 'Checkbox Demo' }, () => {
  window({ title: 'Checkbox Example', width: 400, height: 300 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Checkbox Widget Example');
        label('');

        // Simple checkboxes with change callbacks
        termsCheckbox = checkbox('I accept the terms and conditions', (checked) => {
// console.log('Terms checkbox:', checked);
          updateStatus();
        });

        newsletterCheckbox = checkbox('Subscribe to newsletter', (checked) => {
// console.log('Newsletter checkbox:', checked);
          updateStatus();
        });

        label('');

        // Status display
        statusLabel = label('Please accept the terms to continue');

        label('');

        // Action buttons
        hbox(() => {
          button('Check All', async () => {
            await termsCheckbox.setChecked(true);
            await newsletterCheckbox.setChecked(true);
            updateStatus();
          });

          button('Uncheck All', async () => {
            await termsCheckbox.setChecked(false);
            await newsletterCheckbox.setChecked(false);
            updateStatus();
          });

          button('Submit', async () => {
            const termsAccepted = await termsCheckbox.getChecked();
            const newsletterSubscribed = await newsletterCheckbox.getChecked();

            if (termsAccepted) {
              statusLabel.setText(
                `✓ Submitted! Newsletter: ${newsletterSubscribed ? 'Yes' : 'No'}`
              );
            } else {
              statusLabel.setText('⚠ Please accept the terms first');
            }
          });
        });
      });
    });

    win.show();
    screenshotIfRequested(win);
  });
});

async function updateStatus() {
  const termsAccepted = await termsCheckbox.getChecked();
  const newsletterSubscribed = await newsletterCheckbox.getChecked();

  if (termsAccepted) {
    statusLabel.setText(
      `✓ Terms accepted${newsletterSubscribed ? ', newsletter enabled' : ''}`
    );
  } else {
    statusLabel.setText('Please accept the terms to continue');
  }
}
