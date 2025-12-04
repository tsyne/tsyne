/**
 * RadioGroup Widget Example
 *
 * Demonstrates radio button groups for selecting one option
 * from a list of mutually exclusive choices.
 */

import { app, window, vbox, hbox, label, button, radiogroup, screenshotIfRequested } from '../src';

let themeRadio: any;
let languageRadio: any;
let sizeRadio: any;
let statusLabel: any;

app({ title: 'RadioGroup Demo' }, () => {
  window({ title: 'RadioGroup Example', width: 400, height: 450 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('RadioGroup Widget Example');
        label('');

        // Theme selection
        label('Choose Theme:');
        themeRadio = radiogroup(
          ['Light', 'Dark', 'System'],
          'Light',
          (selected) => {
            statusLabel.setText(`Theme changed to: ${selected}`);
            console.log('Selected theme:', selected);
          }
        );
        label('');

        // Language selection
        label('Choose Language:');
        languageRadio = radiogroup(
          ['English', 'Spanish', 'French', 'German', 'Japanese'],
          'English',
          (selected) => {
            statusLabel.setText(`Language changed to: ${selected}`);
            console.log('Selected language:', selected);
          }
        );
        label('');

        // Size selection
        label('Choose Size:');
        sizeRadio = radiogroup(
          ['Small', 'Medium', 'Large', 'X-Large'],
          'Medium',
          (selected) => {
            statusLabel.setText(`Size changed to: ${selected}`);
            console.log('Selected size:', selected);
          }
        );
        label('');

        // Status label
        statusLabel = label('Select an option');
        label('');

        // Control buttons
        hbox(() => {
          button('Get Selections').onClick(async () => {
            const theme = await themeRadio.getSelected();
            const language = await languageRadio.getSelected();
            const size = await sizeRadio.getSelected();
            const message = `Theme: ${theme}, Language: ${language}, Size: ${size}`;
            statusLabel.setText(message);
            console.log(message);
          });

          button('Reset to Defaults').onClick(async () => {
            await themeRadio.setSelected('Light');
            await languageRadio.setSelected('English');
            await sizeRadio.setSelected('Medium');
            statusLabel.setText('Reset to defaults');
          });
        });

        label('');

        // Practical example: Difficulty selection
        label('Game Difficulty:');
        radiogroup(
          ['Easy', 'Normal', 'Hard', 'Expert'],
          'Normal',
          async (selected) => {
            const messages: Record<string, string> = {
              'Easy': 'Good for beginners!',
              'Normal': 'Standard challenge',
              'Hard': 'For experienced players',
              'Expert': 'Maximum difficulty!'
            };
            statusLabel.setText(messages[selected] || selected);

            if (selected === 'Expert') {
              const confirmed = await win.showConfirm(
                'Expert Mode',
                'Expert mode is very challenging. Are you sure?'
              );
              if (confirmed) {
                await win.showInfo('Challenge Accepted', 'Good luck!');
              }
            }
          }
        );
      });
    });

    win.show();
    screenshotIfRequested(win);
  });
});
