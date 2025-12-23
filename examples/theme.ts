/**
 * Theme Example
 *
 * Demonstrates switching between light and dark themes,
 * applying preset color schemes, and using the theme editor.
 */

import { app, resolveTransport, window, vbox, hbox, label, button, entry, checkbox, slider, progressbar, radiogroup, select  } from '../core/src';

let statusLabel: any;
let themeLabel: any;

// Preset theme colors (matching the built-in theme editor presets)
// Ordered to maximize visual distinction between adjacent themes
const presetThemes: Record<string, { variant: string; colors: Record<string, string> }> = {
  // === DARK THEMES ===
  'Dracula': {
    variant: 'dark',
    colors: {
      background: '#282A36', foreground: '#F8F8F2', primary: '#BD93F9',
      button: '#44475A', hover: '#6272A4', focus: '#BD93F9',
      selection: '#44475A', inputBackground: '#21222C', inputBorder: '#6272A4',
      separator: '#44475A', error: '#FF5555', success: '#50FA7B',
      warning: '#FFB86C', hyperlink: '#8BE9FD',
      menuBackground: '#21222C', overlayBackground: '#282A36',
    }
  },
  'Nord': {
    variant: 'dark',
    colors: {
      background: '#2E3440', foreground: '#ECEFF4', primary: '#88C0D0',
      button: '#3B4252', hover: '#434C5E', focus: '#88C0D0',
      selection: '#434C5E', inputBackground: '#3B4252', inputBorder: '#4C566A',
      separator: '#4C566A', error: '#BF616A', success: '#A3BE8C',
      warning: '#EBCB8B', hyperlink: '#81A1C1',
      menuBackground: '#3B4252', overlayBackground: '#2E3440',
    }
  },
  'Gruvbox Dark': {
    variant: 'dark',
    colors: {
      background: '#282828', foreground: '#EBDBB2', primary: '#FABD2F',
      button: '#3C3836', hover: '#504945', focus: '#FABD2F',
      selection: '#504945', inputBackground: '#3C3836', inputBorder: '#665C54',
      separator: '#3C3836', error: '#FB4934', success: '#B8BB26',
      warning: '#FE8019', hyperlink: '#83A598',
      menuBackground: '#3C3836', overlayBackground: '#282828',
    }
  },
  'Solarized Dark': {
    variant: 'dark',
    colors: {
      background: '#002B36', foreground: '#839496', primary: '#268BD2',
      button: '#073642', hover: '#586E75', focus: '#268BD2',
      selection: '#073642', inputBackground: '#073642', inputBorder: '#586E75',
      separator: '#073642', error: '#DC322F', success: '#859900',
      warning: '#B58900', hyperlink: '#2AA198',
      menuBackground: '#073642', overlayBackground: '#002B36',
    }
  },
  'Tokyo Night': {
    variant: 'dark',
    colors: {
      background: '#1A1B26', foreground: '#A9B1D6', primary: '#7AA2F7',
      button: '#24283B', hover: '#33467C', focus: '#7AA2F7',
      selection: '#33467C', inputBackground: '#24283B', inputBorder: '#565F89',
      separator: '#24283B', error: '#F7768E', success: '#9ECE6A',
      warning: '#E0AF68', hyperlink: '#BB9AF7',
      menuBackground: '#16161E', overlayBackground: '#1A1B26',
    }
  },
  'Catppuccin Mocha': {
    variant: 'dark',
    colors: {
      background: '#1E1E2E', foreground: '#CDD6F4', primary: '#89B4FA',
      button: '#313244', hover: '#45475A', focus: '#89B4FA',
      selection: '#45475A', inputBackground: '#313244', inputBorder: '#6C7086',
      separator: '#313244', error: '#F38BA8', success: '#A6E3A1',
      warning: '#F9E2AF', hyperlink: '#CBA6F7',
      menuBackground: '#181825', overlayBackground: '#1E1E2E',
    }
  },
  'Catppuccin Frappé': {
    variant: 'dark',
    colors: {
      background: '#303446', foreground: '#C6D0F5', primary: '#8CAAEE',
      button: '#414559', hover: '#51576D', focus: '#8CAAEE',
      selection: '#51576D', inputBackground: '#414559', inputBorder: '#737994',
      separator: '#414559', error: '#E78284', success: '#A6D189',
      warning: '#E5C890', hyperlink: '#CA9EE6',
      menuBackground: '#292C3C', overlayBackground: '#303446',
    }
  },
  'Rosé Pine': {
    variant: 'dark',
    colors: {
      background: '#191724', foreground: '#E0DEF4', primary: '#EBBCBA',
      button: '#1F1D2E', hover: '#26233A', focus: '#EBBCBA',
      selection: '#403D52', inputBackground: '#1F1D2E', inputBorder: '#6E6A86',
      separator: '#26233A', error: '#EB6F92', success: '#9CCFD8',
      warning: '#F6C177', hyperlink: '#C4A7E7',
      menuBackground: '#1F1D2E', overlayBackground: '#191724',
    }
  },
  // === LIGHT THEMES ===
  'Kawaii Pink': {
    variant: 'light',
    colors: {
      background: '#FFF0F5', foreground: '#5D4954', primary: '#F075AB',
      button: '#FAD8CC', hover: '#F5A6CD', focus: '#F075AB',
      selection: '#F5A6CD', inputBackground: '#FFFFFF', inputBorder: '#D879C9',
      separator: '#F5A6CD', error: '#E74C3C', success: '#7068BD',
      warning: '#F2BD93', hyperlink: '#D879C9',
      menuBackground: '#FFF5F8', overlayBackground: '#FFF0F5',
    }
  },
  'Rosé Pine Dawn': {
    variant: 'light',
    colors: {
      background: '#FAF4ED', foreground: '#575279', primary: '#D7827E',
      button: '#F2E9E1', hover: '#DFDAD9', focus: '#D7827E',
      selection: '#DFDAD9', inputBackground: '#FFFAF3', inputBorder: '#9893A5',
      separator: '#F2E9E1', error: '#B4637A', success: '#56949F',
      warning: '#EA9D34', hyperlink: '#907AA9',
      menuBackground: '#FFFAF3', overlayBackground: '#FAF4ED',
    }
  },
  'Catppuccin Latte': {
    variant: 'light',
    colors: {
      background: '#EFF1F5', foreground: '#4C4F69', primary: '#1E66F5',
      button: '#DCE0E8', hover: '#CCD0DA', focus: '#1E66F5',
      selection: '#CCD0DA', inputBackground: '#DCE0E8', inputBorder: '#9CA0B0',
      separator: '#DCE0E8', error: '#D20F39', success: '#40A02B',
      warning: '#DF8E1D', hyperlink: '#8839EF',
      menuBackground: '#E6E9EF', overlayBackground: '#EFF1F5',
    }
  },
  'Solarized Light': {
    variant: 'light',
    colors: {
      background: '#FDF6E3', foreground: '#657B83', primary: '#268BD2',
      button: '#EEE8D5', hover: '#93A1A1', focus: '#268BD2',
      selection: '#EEE8D5', inputBackground: '#EEE8D5', inputBorder: '#93A1A1',
      separator: '#EEE8D5', error: '#DC322F', success: '#859900',
      warning: '#B58900', hyperlink: '#2AA198',
      menuBackground: '#EEE8D5', overlayBackground: '#FDF6E3',
    }
  },
  'GitHub Light': {
    variant: 'light',
    colors: {
      background: '#FFFFFF', foreground: '#24292F', primary: '#0969DA',
      button: '#F6F8FA', hover: '#EAEEF2', focus: '#0969DA',
      selection: '#DDFBE1', inputBackground: '#F6F8FA', inputBorder: '#D0D7DE',
      separator: '#D8DEE4', error: '#CF222E', success: '#1A7F37',
      warning: '#9A6700', hyperlink: '#0969DA',
      menuBackground: '#FFFFFF', overlayBackground: '#FFFFFF',
    }
  },
  'Tokyo Night Light': {
    variant: 'light',
    colors: {
      background: '#D5D6DB', foreground: '#343B58', primary: '#34548A',
      button: '#C4C5CA', hover: '#B4B5BA', focus: '#34548A',
      selection: '#B4B5BA', inputBackground: '#C4C5CA', inputBorder: '#9699A3',
      separator: '#C4C5CA', error: '#8C4351', success: '#485E30',
      warning: '#8F5E15', hyperlink: '#5A4A78',
      menuBackground: '#CBCCD1', overlayBackground: '#D5D6DB',
    }
  },
};

app(resolveTransport(), { title: 'Theme Demo' }, () => {
  window({ title: 'Theme Example', width: 700, height: 650 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Theme Example');
        label('');

        // Theme status
        themeLabel = label('Current Theme: Default Light');
        label('');

        // Basic theme switching
        label('Basic Theme Variant:');
        hbox(() => {
          button('Dark').onClick(async () => {
            const myApp = (win as any).ctx.bridge;
            await myApp.send('setTheme', { theme: 'dark' });
            await myApp.send('clearCustomTheme', {});
            themeLabel.setText('Current Theme: Default Dark');
            statusLabel.setText('Switched to default dark theme');
          });

          button('Light').onClick(async () => {
            const myApp = (win as any).ctx.bridge;
            await myApp.send('setTheme', { theme: 'light' });
            await myApp.send('clearCustomTheme', {});
            themeLabel.setText('Current Theme: Default Light');
            statusLabel.setText('Switched to default light theme');
          });
        });

        label('');
        label('Preset Color Schemes:');

        // Preset theme selector
        select(Object.keys(presetThemes), async (themeName) => {
          const preset = presetThemes[themeName];
          if (!preset) return;

          const myApp = (win as any).ctx.bridge;
          await myApp.send('setTheme', { theme: preset.variant });
          await myApp.send('setCustomTheme', { colors: preset.colors });
          themeLabel.setText(`Current Theme: ${themeName}`);
          statusLabel.setText(`Applied ${themeName} color scheme`);
        });

        label('');
        label('');
        label('Tip: Press Ctrl+Shift+T to open the full Theme Editor');

        label('');
        statusLabel = label('Select a theme to see different color schemes');
        label('');

        // Widget showcase
        label('Widget Showcase:');

        // Text input
        entry('Type something here...');

        // Buttons
        hbox(() => {
          button('Primary').onClick(() => statusLabel.setText('Primary clicked'));
          button('Secondary').onClick(() => statusLabel.setText('Secondary clicked'));
          button('Action').onClick(() => statusLabel.setText('Action clicked'));
        });

        // Checkbox
        checkbox('Enable notifications', (checked) => {
          statusLabel.setText(`Notifications ${checked ? 'enabled' : 'disabled'}`);
        });

        // Radio group
        radiogroup(['Option 1', 'Option 2', 'Option 3'], 'Option 1', (selected) => {
          statusLabel.setText(`Selected: ${selected}`);
        });

        // Slider
        slider(0, 100, 50, (value) => {
          statusLabel.setText(`Slider: ${Math.round(value)}`);
        });

        // Progress bar
        progressbar(0.65);
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
