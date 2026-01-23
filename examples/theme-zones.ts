/**
 * Theme Zones Demo
 *
 * Demonstrates the ThemeOverride container which allows different
 * regions of the UI to have different themes (dark/light).
 *
 * Run with: npx tsx examples/theme-zones.ts
 */

import { app, resolveTransport  } from 'tsyne';

app(resolveTransport(), { title: 'Theme Zones' }, (a) => {
  a.window({ title: 'Theme Zones Demo', width: 700, height: 500 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('Theme Zones Demo', undefined, 'center', undefined, { bold: true });
        a.label('Each section below uses a different theme variant', undefined, 'center');
        a.separator();

        // Main content with theme zones
        a.hbox(() => {
          // Left side - Dark theme zone
          a.themeoverride('dark', () => {
            a.vbox(() => {
              a.card('Dark Zone', 'Theme: Dark', () => {
                a.vbox(() => {
                  a.label('This area uses the dark theme');
                  a.separator();
                  a.button('Dark Button').onClick(() => {
                    console.log('Dark button clicked');
                  });
                  a.entry('Type here...');
                  a.checkbox('Dark Checkbox', (checked) => {
                    console.log('Dark checkbox:', checked);
                  });
                  a.slider(0, 100, 50);
                  a.progressbar(0.7);
                });
              });
            });
          });

          // Right side - Light theme zone
          a.themeoverride('light', () => {
            a.vbox(() => {
              a.card('Light Zone', 'Theme: Light', () => {
                a.vbox(() => {
                  a.label('This area uses the light theme');
                  a.separator();
                  a.button('Light Button').onClick(() => {
                    console.log('Light button clicked');
                  });
                  a.entry('Type here...');
                  a.checkbox('Light Checkbox', (checked) => {
                    console.log('Light checkbox:', checked);
                  });
                  a.slider(0, 100, 50);
                  a.progressbar(0.7);
                });
              });
            });
          });
        });

        a.separator();

        // Nested theme zones demo
        a.label('Nested Theme Zones', undefined, 'center', undefined, { bold: true });

        a.themeoverride('dark', () => {
          a.vbox(() => {
            a.hbox(() => {
              a.label('Outer Dark Zone: ');
              a.button('Dark Button');

              // Nested light zone inside dark zone
              a.themeoverride('light', () => {
                a.hbox(() => {
                  a.label('Inner Light Zone: ');
                  a.button('Light Button');
                });
              });
            });
          });
        });
      });
    });
    win.show();
  });
});
