/**
 * Inspector Demo - shows how to use the visual widget inspector
 */
import { app, Inspector } from '../src';

app({ title: 'Inspector Demo' }, async (a) => {
  // Create an Inspector instance
  const inspector = new Inspector(a.bridge);

  // Store window ID for inspector
  let mainWindowId = '';

  a.window({ title: 'Inspector Demo', width: 500, height: 400 }, (win) => {
    mainWindowId = win.id;

    win.setContent(() => {
      a.vbox(() => {
        // Header with padding
        a.padded(() => {
          a.label('Widget Inspector Demo').withId('header');
        }, { p: 20 });

        // Some widgets to inspect
        a.hbox(() => {
          a.padded(() => {
            a.vbox(() => {
              a.label('Column 1');
              a.button('Button A').onClick(() => {
                console.log('Button A clicked');
              }).withId('btn-a');
              a.button('Button B').onClick(() => {
                console.log('Button B clicked');
              }).withId('btn-b');
            });
          }, { pt: 10, pr: 20, pb: 10, pl: 20 }).withId('col1');

          a.padded(() => {
            a.vbox(() => {
              a.label('Column 2');
              a.checkbox('Check me', false, (checked) => {
                console.log('Checkbox:', checked);
              }).withId('checkbox');
              a.entry('', 'Type here...').withId('entry');
            });
          }, { p: 15 }).withId('col2');
        });

        // Separator
        a.separator();

        // Inspector controls
        a.padded(() => {
          a.hbox(() => {
            a.button('Open Inspector').onClick(async () => {
              // Open the visual inspector for this window
              console.log('Open Inspector clicked, windowId:', mainWindowId);
              await inspector.openVisualInspector(mainWindowId);
              console.log('Inspector opened');
            }).withId('open-inspector-btn');

            a.button('Print Tree').onClick(async () => {
              // Get and print the tree to console
              const tree = await inspector.getWindowTree(mainWindowId);
              console.log('\n=== Widget Tree ===');
              inspector.print(tree);
              console.log(`Total widgets: ${inspector.count(tree)}`);
              console.log(`Tree depth: ${inspector.depth(tree)}`);
            }).withId('print-tree-btn');

            a.button('Find Labels').onClick(async () => {
              // Find all labels in the tree
              const tree = await inspector.getWindowTree(mainWindowId);
              const labels = inspector.findByType(tree, 'label');
              console.log(`\nFound ${labels.length} labels:`);
              labels.forEach(label => {
                console.log(`  - ${label.text || '(no text)'} at (${label.x}, ${label.y})`);
              });
            }).withId('find-labels-btn');
          });
        }, { p: 10 });
      });
    });

    win.show();
  });

  // Show available windows
  const windows = await inspector.listWindows();
  console.log('Available windows:', windows);
});
