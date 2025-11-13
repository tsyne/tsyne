// Portions copyright Ryelang developers (Apache 2.0)
// Tabbed settings panel demonstrating tabs widget with multiple panes

import { app } from '../src';

app({ title: 'Settings Panel' }, (a) => {
  a.window({ title: 'Settings Panel', width: 400, height: 350 }, (win) => {
    let volumeLabel: any;

    win.setContent(() => {
      a.tabs(() => {
        // General tab
        a.tab('General', () => {
          a.vbox(() => {
            a.label('Audio Settings');
            a.separator();

            a.label('Volume:');
            volumeLabel = a.label('75%');

            a.slider(0, 100, (value: number) => {
              (async () => {
                await volumeLabel.setText(`${Math.round(value)}%`);
              })();
            });

            a.separator();
            a.label('Preferences:');

            a.checkbox('Enable notifications', (checked: boolean) => {
              console.log('Notifications:', checked);
            });

            a.checkbox('Auto-save documents', (checked: boolean) => {
              console.log('Auto-save:', checked);
            });
          });
        });

        // About tab
        a.tab('About', () => {
          a.vbox(() => {
            a.label('Tsyne Settings');
            a.separator();
            a.label('Version 0.1.0');
            a.label('');
            a.label('A demo settings panel showing');
            a.label('tabbed interface capabilities');
          });
        });
      });
    });

    // Set initial slider value (75%)
    (async () => {
      await volumeLabel.setText('75%');
    })();

    win.show();
  });
});
