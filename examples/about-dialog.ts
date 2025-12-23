// About Dialog - Demonstrates custom dialogs with arbitrary content
// This example shows how to use showCustom() and showCustomConfirm()

import { app, resolveTransport  } from '../core/src';

const APP_NAME = 'My Awesome App';
const APP_VERSION = '1.0.0';
const APP_DESCRIPTION = 'A demonstration of custom dialogs in Tsyne. Custom dialogs allow you to display arbitrary widget content in a modal dialog.';

app(resolveTransport(), { title: 'About Dialog Demo' }, (a) => {
  a.window({ title: 'About Dialog Demo', width: 400, height: 300 }, (win) => {
    let statusLabel: any;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Custom Dialog Examples', undefined, 'center', undefined, { bold: true });
        a.separator();

        statusLabel = a.label('Click a button to see a custom dialog');

        a.separator();

        // Button to show a simple About dialog
        a.button('Show About Dialog').onClick(async () => {
          await win.showCustom('About ' + APP_NAME, () => {
            a.vbox(() => {
              a.center(() => {
                a.vbox(() => {
                  a.label(APP_NAME, undefined, 'center', undefined, { bold: true });
                  a.label(`Version ${APP_VERSION}`, undefined, 'center');
                  a.separator();
                  a.label(APP_DESCRIPTION, undefined, 'center', 'word');
                  a.separator();
                  a.label('Built with Tsyne + Fyne', undefined, 'center', undefined, { italic: true });
                });
              });
            });
          });
          await statusLabel.setText('About dialog was closed');
        });

        // Button to show a custom confirm dialog
        a.button('Show License Agreement').onClick(async () => {
          const accepted = await win.showCustomConfirm(
            'License Agreement',
            () => {
              a.vbox(() => {
                a.label('End User License Agreement', undefined, 'center', undefined, { bold: true });
                a.separator();
                a.scroll(() => {
                  a.vbox(() => {
                    a.label('Terms and Conditions:', undefined, 'leading', undefined, { bold: true });
                    a.label('1. You may use this software for any purpose.');
                    a.label('2. You may modify this software.');
                    a.label('3. You must include this license.');
                    a.label('4. The software is provided "as is".');
                    a.separator();
                    a.label('By clicking Accept, you agree to these terms.');
                  });
                });
              });
            },
            {
              confirmText: 'Accept',
              dismissText: 'Decline'
            }
          );

          if (accepted) {
            await statusLabel.setText('License agreement accepted!');
          } else {
            await statusLabel.setText('License agreement declined');
          }
        });

        // Button to show a feature dialog with rich content
        a.button('Show Features').onClick(async () => {
          await win.showCustom(
            'Features',
            () => {
              a.vbox(() => {
                a.label('Key Features', undefined, 'center', undefined, { bold: true });
                a.separator();
                a.accordion([
                  {
                    title: 'Custom Content',
                    builder: () => {
                      a.label('Create dialogs with any widget content - labels, buttons, forms, and more!');
                    }
                  },
                  {
                    title: 'Callbacks',
                    builder: () => {
                      a.label('Get notified when dialogs are closed or confirmed.');
                    }
                  },
                  {
                    title: 'Customizable Buttons',
                    builder: () => {
                      a.label('Set custom text for confirm and dismiss buttons.');
                    }
                  }
                ]);
              });
            },
            { dismissText: 'Got it!' }
          );
          await statusLabel.setText('Features dialog closed');
        });

        a.separator();

        // Button to show a settings-like dialog
        a.button('Edit Settings').onClick(async () => {
          const confirmed = await win.showCustomConfirm(
            'Settings',
            () => {
              a.vbox(() => {
                a.checkbox('Enable notifications', () => {});
                a.checkbox('Dark mode', () => {});
                a.checkbox('Auto-save', () => {});
                a.separator();
                a.hbox(() => {
                  a.label('Language:');
                  a.select(['English', 'Spanish', 'French', 'German'], () => {});
                });
              });
            },
            {
              confirmText: 'Save',
              dismissText: 'Cancel'
            }
          );

          if (confirmed) {
            await statusLabel.setText('Settings saved!');
          } else {
            await statusLabel.setText('Settings cancelled');
          }
        });
      });
    });

    win.show();
  });
});
