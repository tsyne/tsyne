/**
 * Unstyled Form Example
 *
 * This is the base form without any custom styling applied.
 * Compare this with form-styled.ts to see the power of the styling system.
 */

import { app, window, vbox, hbox, label, entry, button } from '../core/src';

let nameEntry: any;
let emailEntry: any;
let phoneEntry: any;
let statusLabel: any;

app({ title: 'Form Demo' }, () => {
  window({ title: 'Registration Form (Unstyled)', width: 500, height: 450 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Registration Form');
        label('');

        label('Personal Information');
        label('Please fill out the form below');
        label('');

        label('Name:');
        nameEntry = entry('Enter your full name');
        label('');

        label('Email:');
        emailEntry = entry('Enter your email address');
        label('');

        label('Phone:');
        phoneEntry = entry('Enter your phone number');
        label('');
        label('');

        hbox(() => {
          button('Submit').onClick(async () => {
            const name = await nameEntry.getText();
            const email = await emailEntry.getText();
            const phone = await phoneEntry.getText();

            if (!name || !email || !phone) {
              statusLabel.setText('Please fill out all fields');
              return;
            }

            statusLabel.setText(`Submitted: ${name} | ${email} | ${phone}`);
          });

          button('Clear').onClick(async () => {
            await nameEntry.setText('');
            await emailEntry.setText('');
            await phoneEntry.setText('');
            statusLabel.setText('Form cleared');
          });
        });

        label('');
        statusLabel = label('Ready to submit');
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
