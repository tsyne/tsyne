// Multi-window example demonstrating multiple Window instances
// This example shows how to create and manage multiple windows

import { app } from '../src';

app({ title: 'Multi-Window Demo' }, (a) => {
  let windowCount = 0;
  const windows: any[] = [];

  // Create the main window
  a.window({ title: 'Main Window', width: 400, height: 300 }, (mainWin) => {
    let statusLabel: any;

    mainWin.setContent(() => {
      a.vbox(() => {
        a.label('Multi-Window Demo');
        a.label('Create and manage multiple windows');
        a.separator();

        statusLabel = a.label(`Open windows: ${windowCount + 1}`);

        a.button('Open New Window', () => {
          windowCount++;
          const winId = windowCount;

          // Create a secondary window
          a.window({ title: `Window ${winId}`, width: 300, height: 200 }, (newWin) => {
            windows.push(newWin);

            newWin.setContent(() => {
              a.vbox(() => {
                a.label(`This is Window ${winId}`);
                a.separator();

                a.button('Show Info', () => {
                  newWin.showInfo('Window Info', `You are in Window ${winId}`);
                });

                a.button('Close This Window', async () => {
                  await newWin.close();
                  statusLabel.setText(`Open windows: ${windows.length}`);
                });
              });
            });

            newWin.show();
            statusLabel.setText(`Open windows: ${windowCount + 1}`);
          });
        });

        a.separator();

        a.button('Show All Windows Info', () => {
          mainWin.showInfo(
            'Windows Info',
            `Main window + ${windowCount} secondary windows created`
          );
        });
      });
    });
    mainWin.show();
  });
});
