// Layout Demo Page - Demonstrates all layout containers
// URL: http://localhost:3000/layout-demo
// Tests: Grid, GridWrap, Border, Center, Split, Form, Tree

const { vbox, hbox, label, button, separator, grid, gridwrap, center, border, hsplit, vsplit, form, tree, entry, card } = tsyne;

vbox(() => {
  label('Layout & Container Demo');
  label('Desktop UI features that go beyond traditional HTML');
  separator();

  // ===== GRID LAYOUT =====
  label('');
  label('=== Grid Layout (2 columns) ===');
  label('Items arranged in a fixed-column grid:');

  grid(2, () => {
    button('Cell 1').onClick(() => console.log('Cell 1 clicked'));
    button('Cell 2').onClick(() => console.log('Cell 2 clicked'));
    button('Cell 3').onClick(() => console.log('Cell 3 clicked'));
    button('Cell 4').onClick(() => console.log('Cell 4 clicked'));
    label('Text cell');
    label('Another text');
  });

  separator();

  // ===== GRID WRAP LAYOUT =====
  label('');
  label('=== Grid Wrap Layout ===');
  label('Items wrap to next row with fixed item sizes:');

  gridwrap(100, 40, () => {
    button('Item 1').onClick(() => {});
    button('Item 2').onClick(() => {});
    button('Item 3').onClick(() => {});
    button('Item 4').onClick(() => {});
    button('Item 5').onClick(() => {});
  });

  separator();

  // ===== CENTER LAYOUT =====
  label('');
  label('=== Center Layout ===');
  label('Content centered in available space:');

  center(() => {
    card('Centered Card', 'This card is centered', () => {
      label('Card content is centered in the container');
    });
  });

  separator();

  // ===== BORDER LAYOUT =====
  label('');
  label('=== Border Layout ===');
  label('Content positioned at edges and center:');

  border({
    top: () => label('Top section'),
    left: () => label('Left'),
    center: () => label('Center content'),
    right: () => label('Right'),
    bottom: () => label('Bottom section')
  });

  separator();

  // ===== HORIZONTAL SPLIT =====
  label('');
  label('=== Horizontal Split ===');
  label('Resizable split pane:');

  hsplit(
    () => {
      vbox(() => {
        label('Left Pane');
        label('Resizable');
      });
    },
    () => {
      vbox(() => {
        label('Right Pane');
        label('Drag divider to resize');
      });
    },
    0.5 // 50% split
  );

  separator();

  // ===== VERTICAL SPLIT =====
  label('');
  label('=== Vertical Split ===');

  vsplit(
    () => label('Top Pane'),
    () => label('Bottom Pane'),
    0.3 // 30/70 split
  );

  separator();

  // ===== FORM LAYOUT =====
  label('');
  label('=== Form Layout ===');
  label('Labeled form fields with submit/cancel:');

  const nameEntry = entry('Enter name');
  const emailEntry = entry('Enter email');

  form(
    [
      { label: 'Name:', widget: nameEntry },
      { label: 'Email:', widget: emailEntry }
    ],
    () => {
      console.log('Form submitted');
    },
    () => {
      console.log('Form cancelled');
    }
  );

  separator();

  // ===== TREE WIDGET =====
  label('');
  label('=== Tree Widget ===');
  label('Hierarchical tree structure:');

  tree('Root Node');
  label('(Tree nodes can be expanded/collapsed)');

  separator();
  label('');

  button('Back to Home').onClick(() => {
    browserContext.changePage('/');
  });
});
