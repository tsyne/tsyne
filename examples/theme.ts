/**
 * Theme Example
 *
 * Demonstrates switching between light and dark themes
 * and how widgets appear in different themes.
 */

import { app, window, vbox, hbox, label, button, entry, checkbox, slider, progressbar, radiogroup, select } from '../src';

let statusLabel: any;
let themeLabel: any;

app({ title: 'Theme Demo' }, () => {
  window({ title: 'Theme Example', width: 700, height: 600 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Theme Example');
        label('');

        // Theme status
        themeLabel = label('Current Theme: Light');
        label('');

        // Theme switching buttons
        hbox(() => {
          button('Switch to Dark Theme').onClick(async () => {
            const myApp = (win as any).ctx.bridge;
            await myApp.send('setTheme', { theme: 'dark' });
            themeLabel.setText('Current Theme: Dark');
            statusLabel.setText('Theme changed to Dark');
          });

          button('Switch to Light Theme').onClick(async () => {
            const myApp = (win as any).ctx.bridge;
            await myApp.send('setTheme', { theme: 'light' });
            themeLabel.setText('Current Theme: Light');
            statusLabel.setText('Theme changed to Light');
          });

          button('Get Current Theme').onClick(async () => {
            const myApp = (win as any).ctx.bridge;
            const result = await myApp.send('getTheme', {});
            const currentTheme = result.theme;
            themeLabel.setText(`Current Theme: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}`);
            statusLabel.setText(`Retrieved theme: ${currentTheme}`);
          });
        });

        label('');
        label('');

        // Status label
        statusLabel = label('Switch themes to see different widget styles');
        label('');
        label('');

        // Widget showcase
        label('Widget Showcase:');
        label('See how different widgets look in each theme');
        label('');

        // Text input
        label('Text Entry:');
        entry('Type something here...');
        label('');

        // Buttons
        label('Buttons:');
        hbox(() => {
          button('Primary').onClick(() => {
            statusLabel.setText('Primary button clicked');
          });
          button('Secondary').onClick(() => {
            statusLabel.setText('Secondary button clicked');
          });
          button('Action').onClick(() => {
            statusLabel.setText('Action button clicked');
          });
        });
        label('');

        // Checkbox
        label('Checkbox:');
        checkbox('Enable notifications', (checked) => {
          statusLabel.setText(`Notifications ${checked ? 'enabled' : 'disabled'}`);
        });
        checkbox('Dark mode by default', (checked) => {
          statusLabel.setText(`Dark mode default ${checked ? 'on' : 'off'}`);
        });
        label('');

        // Radio group
        label('Radio Group:');
        radiogroup(['Option 1', 'Option 2', 'Option 3'], 'Option 1', (selected) => {
          statusLabel.setText(`Selected: ${selected}`);
        });
        label('');

        // Select dropdown
        label('Dropdown Select:');
        select(['Red', 'Green', 'Blue', 'Yellow'], (selected) => {
          statusLabel.setText(`Color selected: ${selected}`);
        });
        label('');

        // Slider
        label('Slider:');
        slider(0, 100, 50, (value) => {
          statusLabel.setText(`Slider value: ${Math.round(value)}`);
        });
        label('');

        // Progress bar
        label('Progress Bar:');
        progressbar(0.65);
        label('');

        label('');
        label('Theme Features:');
        label('• Light theme: Bright background, dark text');
        label('• Dark theme: Dark background, light text');
        label('• All widgets automatically adapt to theme');
        label('• Theme persists across window operations');
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
