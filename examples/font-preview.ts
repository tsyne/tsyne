/**
 * Font Preview Demo
 *
 * Demonstrates custom font support in Tsyne:
 * - Load custom TTF/OTF fonts
 * - Apply fonts to different text styles
 * - Font scale adjustment
 * - Preview sample text with custom fonts
 */

import { app, window, vbox, hbox, label, button, entry, slider, separator, select, setCustomFont, clearCustomFont, setFontScale, getAvailableFonts, multilineentry } from '../src';

let statusLabel: any;
let fontPathEntry: any;
let sampleLabel: any;
let scaleLabel: any;

// Common sample texts for font preview
const sampleTexts = [
  'The quick brown fox jumps over the lazy dog.',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  '!@#$%^&*()_+-=[]{}|;:\'",.<>?/',
  'Pack my box with five dozen liquor jugs.',
  'How vexingly quick daft zebras jump!',
];

app({ title: 'Font Preview' }, () => {
  window({ title: 'Custom Font Preview', width: 800, height: 700 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        // Header
        label('Custom Font Preview');
        label('Load and preview custom TTF/OTF fonts');
        separator();

        // Font loading section
        label('Load Custom Font:');
        label('');

        hbox(() => {
          label('Font Path:');
          fontPathEntry = entry('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
        });

        label('');
        label('Font Style:');
        const styleSelect = select(
          ['regular', 'bold', 'italic', 'boldItalic', 'monospace'],
          async (selected) => {
            statusLabel.setText(`Selected style: ${selected}`);
          }
        );

        label('');
        hbox(() => {
          button('Load Font', async () => {
            const path = await fontPathEntry.getText();
            const style = await styleSelect.getSelected();
            try {
              await setCustomFont(path, style as any);
              statusLabel.setText(`Loaded font: ${path} (${style})`);
            } catch (error: any) {
              statusLabel.setText(`Error: ${error.message || 'Failed to load font'}`);
            }
          });

          button('Clear Font', async () => {
            const style = await styleSelect.getSelected();
            await clearCustomFont(style as any);
            statusLabel.setText(`Cleared ${style} font`);
          });

          button('Clear All Fonts', async () => {
            await clearCustomFont('all');
            statusLabel.setText('Cleared all custom fonts');
          });
        });

        separator();
        label('');

        // Font scale section
        label('Font Scale:');
        hbox(() => {
          scaleLabel = label('Scale: 1.0x');
          slider(0.5, 2.0, 1.0, async (value) => {
            scaleLabel.setText(`Scale: ${value.toFixed(2)}x`);
            await setFontScale(value);
          });
        });

        hbox(() => {
          button('Small (0.75x)', async () => {
            await setFontScale(0.75);
            scaleLabel.setText('Scale: 0.75x');
            statusLabel.setText('Font scale set to 0.75x (small)');
          });
          button('Normal (1.0x)', async () => {
            await setFontScale(1.0);
            scaleLabel.setText('Scale: 1.0x');
            statusLabel.setText('Font scale set to 1.0x (normal)');
          });
          button('Large (1.5x)', async () => {
            await setFontScale(1.5);
            scaleLabel.setText('Scale: 1.5x');
            statusLabel.setText('Font scale set to 1.5x (large)');
          });
        });

        separator();
        label('');

        // Sample text preview
        label('Sample Text Preview:');
        label('');

        // Display sample texts
        for (const text of sampleTexts.slice(0, 4)) {
          label(text);
        }

        label('');

        // Bold sample (requires bold font loaded)
        label('Regular text sample');

        separator();
        label('');

        // Font info section
        label('Font Information:');
        button('Show Font Locations', async () => {
          try {
            const fontInfo = await getAvailableFonts();
            const platform = process.platform === 'darwin' ? 'darwin'
                           : process.platform === 'win32' ? 'windows'
                           : 'linux';
            const locations = fontInfo.commonLocations[platform as keyof typeof fontInfo.commonLocations];
            statusLabel.setText(`Font locations: ${locations.join(', ')}`);
          } catch (error: any) {
            statusLabel.setText(`Error: ${error.message || 'Failed to get font info'}`);
          }
        });

        separator();

        // Status
        statusLabel = label('Ready. Enter a font path and click "Load Font" to apply.');

        separator();
        label('');

        // Help text
        label('Supported font formats: .ttf, .otf');
        label('');
        label('Common font paths:');
        label('  Linux: /usr/share/fonts/truetype/');
        label('  macOS: /System/Library/Fonts/');
        label('  Windows: C:\\Windows\\Fonts\\');
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
