/**
 * Clip Container Example
 *
 * Demonstrates the container.Clip functionality which clips any content
 * that extends beyond the bounds of its child container. This is useful
 * for constraining overflow in layouts.
 *
 * The demo shows a side-by-side comparison of:
 * - Left: Unclipped content (text may overflow)
 * - Right: Clipped content (text is cut off at boundaries)
 */

import { app, resolveTransport  } from 'tsyne';

app(resolveTransport(), { title: 'Clip Demo' }, (a) => {
  a.window({ title: 'Clip Container Example', width: 600, height: 400 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Clip Container Demonstration');
        a.label('The clip container prevents content from overflowing its bounds.');
        a.separator();

        // Side-by-side comparison using a horizontal split
        a.hbox(() => {
          // Left side: Normal VBox (unclipped)
          a.vbox(() => {
            a.label('Normal Container:');
            a.label('Content can overflow...');

            // Create a fixed-size container with lots of content
            a.vbox(() => {
              for (let i = 1; i <= 10; i++) {
                a.label(`Line ${i}: This is some text content that might overflow the container bounds`);
              }
            });
          });

          a.separator();

          // Right side: Clipped container
          a.vbox(() => {
            a.label('Clipped Container:');
            a.label('Content is clipped to bounds');

            // Wrap in a clip container
            a.clip(() => {
              a.vbox(() => {
                for (let i = 1; i <= 10; i++) {
                  a.label(`Line ${i}: This is some text content that will be clipped at container bounds`);
                }
              });
            });
          });
        });

        a.separator();
        a.label('Notice how the clipped container constrains its content.');
      });
    });

    win.show();
  });
});
