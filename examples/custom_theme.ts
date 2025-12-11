/**
 * Custom Theme Example
 *
 * This example demonstrates how to define and apply a completely
 * custom color theme to your Tsyne application.
 */

import { app } from '../core/src';
import { CustomThemeColors } from '../core/src/app';

// Define our custom "Solarized Dark" theme colors
const solarizedDark: CustomThemeColors = {
  background: '#002b36',
  foreground: '#839496',
  primary: '#268bd2',
  button: '#073642',
  hover: '#586e75',
  focus: '#2aa198',
  selection: '#586e75',
  shadow: '#000000',
};

app({ title: 'Custom Theme Demo' }, (a) => {
  a.window({ title: 'Custom Theme Example', width: 700, height: 600 }, (win) => {
    let themeLabel: any;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Custom Theme Example');
        themeLabel = a.label('Current Theme: Light');

        a.hbox(() => {
          a.button('Light Theme').onClick(async () => {
            await a.clearCustomTheme();
            await a.setTheme('light');
            themeLabel.setText('Current Theme: Light');
          });
          a.button('Dark Theme').onClick(async () => {
            await a.clearCustomTheme();
            await a.setTheme('dark');
            themeLabel.setText('Current Theme: Dark');
          });
          a.button('Solarized Dark').onClick(async () => {
            await a.setCustomTheme(solarizedDark);
            themeLabel.setText('Current Theme: Solarized Dark');
          });
        });

        a.separator();

        // Widget showcase to demonstrate the theme
        a.card('Widget Showcase', 'A variety of widgets in the current theme', () => {
          a.vbox(() => {
            a.entry('An entry field');
            a.passwordentry('A password field');
            a.multilineentry('A multiline\nentry field');
            a.hyperlink('A hyperlink', 'https://tsyne.org');
            a.checkbox('A checkbox');
            a.radiogroup(['Radio 1', 'Radio 2']);
            a.select(['Select 1', 'Select 2']);
            a.slider(0, 100);
            a.progressbar(0.7);
          });
        });
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
