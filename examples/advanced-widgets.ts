/**
 * Advanced Widgets Example
 *
 * Demonstrates Card, Accordion, Form, and Center layout widgets.
 */

import { app, resolveTransport, window, vbox, hbox, label, entry, button, card, accordion, form, center  } from '../core/src';

let nameField: any;
let emailField: any;
let ageField: any;
let statusLabel: any;

app(resolveTransport(), { title: 'Advanced Widgets Demo' }, () => {
  window({ title: 'Advanced Widgets Example', width: 700, height: 750 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Advanced Widgets Example');
        label('');

        statusLabel = label('Explore cards, accordions, forms, and layouts!');
        label('');
        label('');

        // Card example
        label('Card Widget:');
        card('User Profile', 'Personal information card', () => {
          vbox(() => {
            label('Name: John Doe');
            label('Email: john@example.com');
            label('Role: Developer');
            label('');
            button('View Full Profile').onClick(() => {
              statusLabel.setText('Viewing full profile...');
            });
          });
        });

        label('');
        label('');

        // Accordion example
        label('Accordion Widget (Collapsible Sections):');
        accordion([
          {
            title: 'Getting Started',
            builder: () => {
              vbox(() => {
                label('Welcome to the application!');
                label('');
                label('To get started:');
                label('1. Fill out the form below');
                label('2. Click Submit to save your information');
                label('3. Explore the different sections');
              });
            }
          },
          {
            title: 'Features',
            builder: () => {
              vbox(() => {
                label('This application includes:');
                label('• Card containers for grouped content');
                label('• Accordion for collapsible sections');
                label('• Forms with submit/cancel buttons');
                label('• Center layout for alignment');
                label('• And much more!');
              });
            }
          },
          {
            title: 'Settings',
            builder: () => {
              vbox(() => {
                label('Configuration options:');
                label('');
                button('Reset to Defaults').onClick(() => {
                  statusLabel.setText('Settings reset to defaults');
                });
                button('Export Settings').onClick(() => {
                  statusLabel.setText('Settings exported');
                });
              });
            }
          },
          {
            title: 'Help & Support',
            builder: () => {
              vbox(() => {
                label('Need help?');
                label('');
                label('Visit our documentation at:');
                label('https://example.com/docs');
                label('');
                label('Contact support:');
                label('support@example.com');
              });
            }
          }
        ]);

        label('');
        label('');

        // Form example
        label('Form Widget (Structured Input):');

        nameField = entry('Enter your name');
        emailField = entry('Enter your email');
        ageField = entry('Enter your age');

        form(
          [
            { label: 'Full Name', widget: nameField },
            { label: 'Email Address', widget: emailField },
            { label: 'Age', widget: ageField }
          ],
          async () => {
            // On Submit
            const name = await nameField.getText();
            const email = await emailField.getText();
            const age = await ageField.getText();

            if (!name || !email || !age) {
              statusLabel.setText('Please fill out all fields!');
              return;
            }

            statusLabel.setText(`Form submitted: ${name}, ${email}, ${age}`);
          },
          async () => {
            // On Cancel
            await nameField.setText('');
            await emailField.setText('');
            await ageField.setText('');
            statusLabel.setText('Form cancelled and cleared');
          }
        );

        label('');
        label('');

        // Center layout example
        label('Center Layout:');
        center(() => {
          vbox(() => {
            label('This content is centered!');
            label('');
            button('Centered Button').onClick(() => {
              statusLabel.setText('Centered button clicked!');
            });
          });
        });

        label('');
        label('');

        // Widget features
        label('Widget Features Summary:');
        label('');
        label('Card:');
        label('  • Title and subtitle');
        label('  • Contains any widget content');
        label('  • Perfect for grouped information');
        label('');
        label('Accordion:');
        label('  • Collapsible sections');
        label('  • Saves vertical space');
        label('  • Organized content presentation');
        label('');
        label('Form:');
        label('  • Labeled input fields');
        label('  • Built-in Submit and Cancel buttons');
        label('  • Clean, structured layout');
        label('');
        label('Center:');
        label('  • Centers content horizontally and vertically');
        label('  • Perfect for dialogs and focused content');
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
