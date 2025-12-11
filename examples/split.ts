/**
 * Split Container Example
 *
 * Demonstrates horizontal and vertical split containers
 * for creating resizable panes in the UI.
 */

import { app, window, vbox, hbox, label, button, entry, scroll, hsplit, vsplit } from '../core/src';

app({ title: 'Split Container Demo' }, () => {
  window({ title: 'Split Container Example', width: 600, height: 500 }, (win) => {
    win.setContent(() => {
      // Main vertical split: sidebar on left, content on right
      vsplit(
        // Left sidebar (top of vertical split)
        () => {
          vbox(() => {
            label('=== Sidebar ===');
            label('');
            label('This is the sidebar area');
            label('with navigation items.');
            label('');
            button('Home').onClick(() => console.log('Home clicked'));
            button('Settings').onClick(() => console.log('Settings clicked'));
            button('About').onClick(() => console.log('About clicked'));
            label('');
            label('You can resize this');
            label('pane by dragging');
            label('the divider.');
          });
        },
        // Right content area (bottom of vertical split)
        () => {
          vbox(() => {
            label('=== Main Content Area ===');
            label('');

            // Nested horizontal split in the content area
            hsplit(
              // Left content panel
              () => {
                scroll(() => {
                  vbox(() => {
                    label('Left Panel');
                    label('');
                    label('This panel contains scrollable content.');
                    label('');

                    for (let i = 1; i <= 20; i++) {
                      label(`Content item ${i}`);
                    }
                  });
                });
              },
              // Right content panel
              () => {
                vbox(() => {
                  label('Right Panel');
                  label('');
                  label('This is a separate resizable panel.');
                  label('');
                  label('You can put any content here:');
                  label('');
                  entry('Enter text here...');
                  label('');
                  button('Submit').onClick(() => {
                    console.log('Submit clicked');
                  });
                  label('');
                  label('The horizontal split allows');
                  label('independent resizing of');
                  label('these two sections.');
                });
              },
              0.6 // Initial offset (60% left, 40% right)
            );
          });
        },
        0.3 // Initial offset (30% top, 70% bottom)
      );
    });

    win.show();
  });
});
