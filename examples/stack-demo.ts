import { app } from '../core/src/index';

/**
 * Stack Container Demo
 *
 * Demonstrates the Stack container which stacks widgets on top of each other.
 * Useful for creating overlapping UI elements like:
 * - Image overlays with text
 * - Loading indicators over content
 * - Watermarks
 * - Picture-in-picture displays
 */

app({ title: 'Stack Container Demo' }, (a) => {
  a.window({ title: 'Stack Demo', width: 600, height: 500 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Stack Container - Overlapping Widgets', undefined, 'center');
        a.separator();

        // Example 1: Text overlay on colored background
        a.label('Example 1: Text Overlay');
        a.stack(() => {
          // Background layer (bottom)
          a.rectangle('#3498db', 400, 100);

          // Text layer (on top)
          a.center(() => {
            a.vbox(() => {
              a.label('Stacked Content', undefined, 'center');
              a.label('Background + Text', undefined, 'center');
            });
          });
        });

        a.separator();

        // Example 2: Multiple stacked elements
        a.label('Example 2: Loading Overlay');
        a.stack(() => {
          // Content layer (bottom)
          a.vbox(() => {
            a.label('Main Content');
            a.label('This is the underlying content');
            a.button('Action Button').onClick(() => console.log('Clicked'));
          });

          // Overlay layer (top) - semi-transparent background with spinner
          a.center(() => {
            a.vbox(() => {
              const spinner = a.activity();
              spinner.start();
              a.label('Loading...', undefined, 'center');
            });
          });
        });

        a.separator();

        // Example 3: Picture-in-picture style
        a.label('Example 3: Corner Badge');
        a.stack(() => {
          // Main content
          a.rectangle('#2ecc71', 400, 150);

          // Badge in corner (using VBox with spacer to position)
          a.vbox(() => {
            a.hbox(() => {
              a.spacer();
              a.rectangle('#e74c3c', 60, 40);
            });
            a.spacer();
          });
        });

        a.separator();
        a.label('The Stack container allows overlapping widgets for rich UI effects.', undefined, 'center');
      });
    });

    win.show();
  });
});
