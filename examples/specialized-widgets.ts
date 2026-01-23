/**
 * Specialized Widgets Example
 *
 * Demonstrates Tree, RichText, Image, Border layout, and GridWrap layout.
 */

import { app, resolveTransport, window, vbox, hbox, label, button, tree, richtext, image, border, gridwrap  } from 'tsyne';

let statusLabel: any;

app(resolveTransport(), { title: 'Specialized Widgets Demo' }, () => {
  window({ title: 'Specialized Widgets & Layouts', width: 800, height: 700 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Specialized Widgets & Layouts Example');
        label('');

        statusLabel = label('Explore Tree, RichText, Image, Border, and GridWrap!');
        label('');
        label('');

        // RichText example
        label('RichText Widget (Formatted Text):');
        richtext([
          { text: 'Welcome to Tsyne! ', bold: true },
          { text: 'This is ', italic: false },
          { text: 'formatted text ', italic: true },
          { text: 'with different ', bold: false },
          { text: 'styles', bold: true, italic: true },
          { text: '. You can have ', bold: false, italic: false },
          { text: 'monospace code', monospace: true },
          { text: ' too!', monospace: false }
        ]);

        label('');
        label('');

        // Tree example
        label('Tree Widget (Hierarchical Data):');
        label('Simple tree structure for organizing content');
        tree('Root Node');

        label('');
        label('');

        // GridWrap example
        label('GridWrap Layout (Wrapping Grid):');
        label('Items wrap automatically with fixed sizes');
        gridwrap(120, 50, () => {
          button('Item 1').onClick(() => statusLabel.setText('Item 1 clicked'));
          button('Item 2').onClick(() => statusLabel.setText('Item 2 clicked'));
          button('Item 3').onClick(() => statusLabel.setText('Item 3 clicked'));
          button('Item 4').onClick(() => statusLabel.setText('Item 4 clicked'));
          button('Item 5').onClick(() => statusLabel.setText('Item 5 clicked'));
          button('Item 6').onClick(() => statusLabel.setText('Item 6 clicked'));
          button('Item 7').onClick(() => statusLabel.setText('Item 7 clicked'));
          button('Item 8').onClick(() => statusLabel.setText('Item 8 clicked'));
        });

        label('');
        label('');

        // Border layout example
        label('Border Layout (Positioned Content):');
        label('Content positioned at edges and center');
        border({
          top: () => label('Top Area'),
          bottom: () => label('Bottom Area'),
          left: () => label('Left Sidebar'),
          right: () => label('Right Sidebar'),
          center: () => {
            vbox(() => {
              label('Center Content Area');
              label('This is where main content goes');
              button('Center Action').onClick(() => {
                statusLabel.setText('Center button clicked');
              });
            });
          }
        });

        label('');
        label('');

        // Widget features summary
        label('Widget Features:');
        label('');
        label('RichText:');
        label('  • Bold, italic, monospace formatting');
        label('  • Multiple text segments with different styles');
        label('  • Great for formatted documents and help text');
        label('');
        label('Tree:');
        label('  • Hierarchical data visualization');
        label('  • Collapsible/expandable branches');
        label('  • Perfect for file browsers, org charts');
        label('');
        label('Image:');
        label('  • Display images from file paths');
        label('  • Fill modes: contain, stretch, original');
        label('  • Supports common image formats');
        label('');
        label('Border Layout:');
        label('  • Position content at edges (top, bottom, left, right)');
        label('  • Center area for main content');
        label('  • Classic application layout pattern');
        label('');
        label('GridWrap:');
        label('  • Fixed-size items in wrapping grid');
        label('  • Automatically wraps to next row');
        label('  • Perfect for galleries, button grids');
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
