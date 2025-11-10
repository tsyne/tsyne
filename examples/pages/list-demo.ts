// List Demo Page - Demonstrates list widget
// URL: http://localhost:3000/list-demo
// Feature: Lists (like HTML <ul> and <ol>)

const { vbox, scroll, label, button, separator, list } = tsyne;

let selectionLabel;

vbox(() => {
  label('List Demo');
  label('This page demonstrates lists, similar to HTML <ul> and <ol> elements');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('=== Simple List ===');
      label('Click an item to select it:');
      label('');

      list(
        [
          'Apple',
          'Banana',
          'Cherry',
          'Date',
          'Elderberry',
          'Fig',
          'Grape'
        ],
        (index, item) => {
          console.log('Selected:', index, item);
          selectionLabel.setText(`Selected: ${item} (index ${index})`);
        }
      );

      label('');
      selectionLabel = label('Selected: (none)');
      label('');

      separator();
      label('');

      label('=== Task List ===');
      label('');

      list([
        '☐ Buy groceries',
        '☐ Write code',
        '☐ Read documentation',
        '☑ Completed task',
        '☐ Exercise',
        '☐ Call dentist'
      ]);

      label('');
      separator();
      label('');

      label('=== List Usage ===');
      label('');
      label('Creating a list in Tsyne:');
      label('');
      label('const { list } = tsyne;');
      label('list(');
      label('  [\'Item 1\', \'Item 2\', \'Item 3\'],  // Items');
      label('  (index, item) => {  // Selection callback (optional)');
      label('    console.log(\'Selected:\', item);');
      label('  }');
      label(');');
      label('');

      separator();
      label('');

      label('=== Comparison to HTML ===');
      label('');
      label('HTML Unordered List:');
      label('<ul>');
      label('  <li>Item 1</li>');
      label('  <li>Item 2</li>');
      label('  <li>Item 3</li>');
      label('</ul>');
      label('');
      label('HTML Ordered List:');
      label('<ol>');
      label('  <li>First</li>');
      label('  <li>Second</li>');
      label('  <li>Third</li>');
      label('</ol>');
      label('');
      label('Tsyne:');
      label('list([\'Item 1\', \'Item 2\', \'Item 3\'])');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
