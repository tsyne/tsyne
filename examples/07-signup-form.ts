// Portions copyright Ryelang developers (Apache 2.0)
// Signup form with validation and conditional button enabling

import { app, resolveTransport, dialog  } from '../core/src';

app(resolveTransport(), { title: 'Signup Form' }, (a) => {
  a.window({ title: 'Form', width: 400, height: 350 }, (win) => {
    let usernameEntry: any;
    let passwordEntry: any;
    let termsCheckbox: any;
    let signupButton: any;
    let agreeChecked = false;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Create Account');
        a.separator();

        a.form(() => {
          a.label('Username:');
          usernameEntry = a.entry('Enter username', () => {}, 200);

          a.label('Password:');
          passwordEntry = a.passwordentry('Enter password', () => {}, 200);

          a.label('Terms:');
          termsCheckbox = a.checkbox('I fully agree', async (checked: boolean) => {
            agreeChecked = checked;
            if (checked) {
              await signupButton.enable();
            } else {
              await signupButton.disable();
            }
          });

          a.label(''); // Spacer
          signupButton = a.button('Sign up').onClick(async () => {
            const username = await usernameEntry.getText();
            const password = await passwordEntry.getText();

            if (username && password && agreeChecked) {
              dialog.showInformation(
                win,
                'Success',
                `Welcome ${username}! You rock!`
              );
            }
          });
        });
      });
    });

    // Initially disable the button
    (async () => {
      await signupButton.disable();
    })();

    win.show();
  });
});
