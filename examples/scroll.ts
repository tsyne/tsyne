/**
 * Scroll Container Example
 *
 * Demonstrates scrollable containers for handling long content
 * that doesn't fit in the visible area.
 */

import { app, window, vbox, label, button, scroll } from '../core/src';

app({ title: 'Scroll Demo' }, () => {
  window({ title: 'Scroll Container Example', width: 400, height: 300 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Scroll Container Example');
        label('Content below is scrollable:');
        label('');

        // Scrollable content
        scroll(() => {
          vbox(() => {
            label('=== Long Content List ===');
            label('');

            // Generate lots of content to demonstrate scrolling
            for (let i = 1; i <= 50; i++) {
              label(`Item ${i}: This is a list item that demonstrates scrolling`);
            }

            label('');
            label('=== End of List ===');
            label('');
            button('Button at Bottom').onClick(() => {
              console.log('Bottom button clicked!');
            });
          });
        });
      });
    });

    win.show();
  });
});
