/**
 * Window Sizing and Positioning Example
 *
 * Demonstrates window sizing, positioning, and fullscreen features.
 */

import { app, resolveTransport, window, vbox, hbox, label, button, entry  } from 'tsyne';

let win1: any;
let win2: any;
let statusLabel: any;
let widthEntry: any;
let heightEntry: any;

app(resolveTransport(), { title: 'Window Sizing Demo' }, () => {
  // Main window with initial size
  win1 = window({ title: 'Window Controls', width: 500, height: 400 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Window Sizing and Positioning');
        label('');

        // Status label
        statusLabel = label('Window size: 500x400');
        label('');

        // Size controls
        label('Window Size:');
        hbox(() => {
          label('Width:');
          widthEntry = entry('600');
          label('Height:');
          heightEntry = entry('450');
        });
        label('');

        hbox(() => {
          button('Resize Window').onClick(async () => {
            const width = parseInt(await widthEntry.getText());
            const height = parseInt(await heightEntry.getText());
            if (!isNaN(width) && !isNaN(height)) {
              await win.resize(width, height);
              statusLabel.setText(`Window resized to: ${width}x${height}`);
            } else {
              statusLabel.setText('Invalid width or height');
            }
          });

          button('Reset Size').onClick(async () => {
            await win.resize(500, 400);
            await widthEntry.setText('500');
            await heightEntry.setText('400');
            statusLabel.setText('Window reset to: 500x400');
          });
        });

        label('');
        label('');

        // Positioning controls
        label('Window Positioning:');
        label('');

        hbox(() => {
          button('Center Window').onClick(async () => {
            await win.centerOnScreen();
            statusLabel.setText('Window centered on screen');
          });

          button('Large Size').onClick(async () => {
            await win.resize(800, 600);
            await win.centerOnScreen();
            await widthEntry.setText('800');
            await heightEntry.setText('600');
            statusLabel.setText('Window set to 800x600 and centered');
          });
        });

        label('');

        hbox(() => {
          button('Small Size').onClick(async () => {
            await win.resize(400, 300);
            await win.centerOnScreen();
            await widthEntry.setText('400');
            await heightEntry.setText('300');
            statusLabel.setText('Window set to 400x300 and centered');
          });

          button('Compact Size').onClick(async () => {
            await win.resize(350, 250);
            await win.centerOnScreen();
            await widthEntry.setText('350');
            await heightEntry.setText('250');
            statusLabel.setText('Window set to 350x250 and centered');
          });
        });

        label('');
        label('');

        // Fullscreen controls
        label('Fullscreen Mode:');
        label('');

        hbox(() => {
          button('Enter Fullscreen').onClick(async () => {
            await win.setFullScreen(true);
            statusLabel.setText('Entered fullscreen mode');
          });

          button('Exit Fullscreen').onClick(async () => {
            await win.setFullScreen(false);
            statusLabel.setText('Exited fullscreen mode');
          });
        });

        label('');
        label('');

        // Second window controls
        label('Multiple Windows:');
        label('');

        button('Open Second Window').onClick(() => {
          if (!win2) {
            win2 = window({ title: 'Second Window', width: 400, height: 300 }, (secondWin) => {
              secondWin.setContent(() => {
                vbox(() => {
                  label('This is a second window');
                  label('');
                  label('Size: 400x300');
                  label('');
                  button('Center This Window').onClick(async () => {
                    await secondWin.centerOnScreen();
                  });
                  label('');
                  button('Resize to 500x350').onClick(async () => {
                    await secondWin.resize(500, 350);
                  });
                  label('');
                  button('Close Window').onClick(() => {
                    // Note: Closing windows programmatically requires additional bridge support
                    console.log('Window close requested');
                  });
                });
              });
              secondWin.show();
              secondWin.centerOnScreen();
            });
            statusLabel.setText('Second window opened');
          } else {
            statusLabel.setText('Second window already open');
          }
        });
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
