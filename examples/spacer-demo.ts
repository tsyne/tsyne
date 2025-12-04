// Demo: Spacer widget for flexible spacing in layouts
// Demonstrates the use of layout.NewSpacer() via a.spacer()

import { app } from '../src';

app({ title: 'Spacer Demo' }, (a) => {
  a.window({ title: 'Spacer Layout Demo', width: 400, height: 300 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Spacer Demo - Flexible Layout Spacing');
        a.separator();

        // Horizontal layout with spacers
        a.label('Horizontal spacers (buttons pushed to edges):');
        a.hbox(() => {
          a.button('Left').onClick(() => {});
          a.spacer(); // Pushes content to edges
          a.button('Right').onClick(() => {});
        });

        a.separator();

        // Multiple spacers for even distribution
        a.label('Multiple spacers (evenly distributed):');
        a.hbox(() => {
          a.spacer();
          a.button('A').onClick(() => {});
          a.spacer();
          a.button('B').onClick(() => {});
          a.spacer();
          a.button('C').onClick(() => {});
          a.spacer();
        });

        a.separator();

        // Vertical spacer example
        a.label('Vertical spacer pushes content down:');
        a.vbox(() => {
          a.label('Top content');
          a.spacer(); // Fills vertical space
          a.label('Bottom content');
        });

        a.separator();

        // Toolbar-style layout
        a.label('Toolbar style (actions right-aligned):');
        a.hbox(() => {
          a.label('File: document.txt');
          a.spacer();
          a.button('Save').onClick(() => {});
          a.button('Cancel').onClick(() => {});
        });
      });
    });
    win.show();
  });
});
