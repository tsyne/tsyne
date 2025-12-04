/**
 * Theme Creator Demo
 *
 * Demonstrates custom theme support in Tsyne:
 * - Define custom color schemes
 * - Live preview theme changes
 * - Switch between preset themes
 * - Reset to default theme
 */

import { app, window, vbox, hbox, label, button, entry, checkbox, slider, progressbar, radiogroup, select, separator, setCustomTheme, clearCustomTheme, setTheme, CustomThemeColors } from '../src';

// Preset themes
const presetThemes: Record<string, CustomThemeColors> = {
  ocean: {
    background: '#0a1929',
    foreground: '#b2bac2',
    primary: '#1976d2',
    button: '#1565c0',
    hover: '#1e88e5',
    focus: '#42a5f5',
    inputBackground: '#132f4c',
    inputBorder: '#1e4976',
    separator: '#1e4976',
    selection: '#1976d2',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    hyperlink: '#90caf9',
  },
  forest: {
    background: '#1a2e1a',
    foreground: '#c8e6c9',
    primary: '#4caf50',
    button: '#388e3c',
    hover: '#66bb6a',
    focus: '#81c784',
    inputBackground: '#2e4a2e',
    inputBorder: '#4a7c4a',
    separator: '#4a7c4a',
    selection: '#4caf50',
    success: '#66bb6a',
    warning: '#ffa726',
    error: '#ef5350',
    hyperlink: '#a5d6a7',
  },
  sunset: {
    background: '#2d1b1b',
    foreground: '#ffccbc',
    primary: '#ff7043',
    button: '#f4511e',
    hover: '#ff8a65',
    focus: '#ffab91',
    inputBackground: '#4a2c2c',
    inputBorder: '#8d5b5b',
    separator: '#8d5b5b',
    selection: '#ff7043',
    success: '#66bb6a',
    warning: '#ffb74d',
    error: '#ef5350',
    hyperlink: '#ffab91',
  },
  purple: {
    background: '#1a1a2e',
    foreground: '#e1bee7',
    primary: '#9c27b0',
    button: '#7b1fa2',
    hover: '#ab47bc',
    focus: '#ba68c8',
    inputBackground: '#2d2d4a',
    inputBorder: '#5c4d7a',
    separator: '#5c4d7a',
    selection: '#9c27b0',
    success: '#66bb6a',
    warning: '#ffa726',
    error: '#ef5350',
    hyperlink: '#ce93d8',
  },
  monochrome: {
    background: '#121212',
    foreground: '#e0e0e0',
    primary: '#ffffff',
    button: '#424242',
    hover: '#616161',
    focus: '#757575',
    inputBackground: '#1e1e1e',
    inputBorder: '#424242',
    separator: '#424242',
    selection: '#616161',
    success: '#a0a0a0',
    warning: '#808080',
    error: '#606060',
    hyperlink: '#ffffff',
  },
  light: {
    background: '#ffffff',
    foreground: '#212121',
    primary: '#1976d2',
    button: '#e0e0e0',
    hover: '#f5f5f5',
    focus: '#90caf9',
    inputBackground: '#fafafa',
    inputBorder: '#e0e0e0',
    separator: '#e0e0e0',
    selection: '#bbdefb',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    hyperlink: '#1976d2',
  }
};

// Current custom colors (editable)
let currentColors: CustomThemeColors = { ...presetThemes.ocean };
let statusLabel: any;

app({ title: 'Theme Creator' }, () => {
  window({ title: 'Custom Theme Creator', width: 900, height: 700 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        // Header
        label('Custom Theme Creator');
        label('Build and preview custom color schemes for your Tsyne applications');
        separator();

        hbox(() => {
          // Left panel - Theme controls
          vbox(() => {
            label('Preset Themes:');

            // Preset theme buttons
            hbox(() => {
              button('Ocean').onClick(async () => {
                currentColors = { ...presetThemes.ocean };
                await setCustomTheme(currentColors);
                statusLabel.setText('Applied Ocean theme');
              });
              button('Forest').onClick(async () => {
                currentColors = { ...presetThemes.forest };
                await setCustomTheme(currentColors);
                statusLabel.setText('Applied Forest theme');
              });
              button('Sunset').onClick(async () => {
                currentColors = { ...presetThemes.sunset };
                await setCustomTheme(currentColors);
                statusLabel.setText('Applied Sunset theme');
              });
            });

            hbox(() => {
              button('Purple').onClick(async () => {
                currentColors = { ...presetThemes.purple };
                await setCustomTheme(currentColors);
                statusLabel.setText('Applied Purple theme');
              });
              button('Monochrome').onClick(async () => {
                currentColors = { ...presetThemes.monochrome };
                await setCustomTheme(currentColors);
                statusLabel.setText('Applied Monochrome theme');
              });
              button('Light').onClick(async () => {
                currentColors = { ...presetThemes.light };
                await setCustomTheme(currentColors);
                statusLabel.setText('Applied Light theme');
              });
            });

            separator();
            label('');

            // Built-in theme toggle
            label('Built-in Themes:');
            hbox(() => {
              button('Dark Theme').onClick(async () => {
                await clearCustomTheme();
                await setTheme('dark');
                statusLabel.setText('Switched to built-in Dark theme');
              });
              button('Light Theme').onClick(async () => {
                await clearCustomTheme();
                await setTheme('light');
                statusLabel.setText('Switched to built-in Light theme');
              });
            });

            separator();
            label('');

            // Reset button
            button('Reset to Default').onClick(async () => {
              await clearCustomTheme();
              statusLabel.setText('Reset to default theme');
            });
          });

          separator();

          // Right panel - Widget preview
          vbox(() => {
            label('Widget Preview:');
            separator();

            // Sample widgets to preview theme
            label('Sample Text Label');
            label('');

            label('Buttons:');
            hbox(() => {
              button('Primary').onClick(() => statusLabel.setText('Primary clicked'));
              button('Secondary').onClick(() => statusLabel.setText('Secondary clicked'));
              button('Action').onClick(() => statusLabel.setText('Action clicked'));
            });

            label('');
            label('Input Fields:');
            entry('Type something here...');

            label('');
            label('Checkbox:');
            checkbox('Enable feature', (checked) => {
              statusLabel.setText(`Feature ${checked ? 'enabled' : 'disabled'}`);
            });

            label('');
            label('Radio Group:');
            radiogroup(['Option A', 'Option B', 'Option C'], 'Option A', (selected) => {
              statusLabel.setText(`Selected: ${selected}`);
            });

            label('');
            label('Dropdown:');
            select(['Red', 'Green', 'Blue'], (selected) => {
              statusLabel.setText(`Color: ${selected}`);
            });

            label('');
            label('Slider:');
            slider(0, 100, 50, (value) => {
              statusLabel.setText(`Slider: ${Math.round(value)}%`);
            });

            label('');
            label('Progress Bar:');
            progressbar(0.7);
          });
        });

        separator();

        // Status bar
        statusLabel = label('Select a preset theme or customize colors');

        separator();
        label('');

        // Theme colors info
        label('Theme Colors Available:');
        label('background, foreground, primary, button, hover, focus,');
        label('inputBackground, inputBorder, separator, selection,');
        label('success, warning, error, hyperlink, and more...');
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
