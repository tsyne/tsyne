// Table Demo Page - Demonstrates table widget
// URL: http://localhost:3000/table-demo
// Feature: Tables (like HTML <table>)

const { vbox, scroll, label, button, separator, table } = tsyne;

vbox(() => {
  label('Table Demo');
  label('This page demonstrates tables, similar to HTML <table> elements');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('=== Simple Table ===');
      label('');

      // Create a simple table
      table(
        ['Name', 'Age', 'City'],
        [
          ['Alice', '25', 'New York'],
          ['Bob', '30', 'San Francisco'],
          ['Charlie', '35', 'Seattle'],
          ['Diana', '28', 'Boston'],
          ['Eve', '32', 'Austin']
        ]
      );

      label('');
      separator();
      label('');

      label('=== Product Table ===');
      label('');

      table(
        ['Product', 'Price', 'Stock', 'Category'],
        [
          ['Laptop', '$999', '15', 'Electronics'],
          ['Mouse', '$25', '150', 'Accessories'],
          ['Keyboard', '$75', '80', 'Accessories'],
          ['Monitor', '$350', '25', 'Electronics'],
          ['Headphones', '$120', '60', 'Audio']
        ]
      );

      label('');
      separator();
      label('');

      label('=== Table Usage ===');
      label('');
      label('Creating a table in Tsyne:');
      label('');
      label('const { table } = tsyne;');
      label('table(');
      label('  [\'Header1\', \'Header2\', \'Header3\'],  // Headers');
      label('  [');
      label('    [\'Row1Col1\', \'Row1Col2\', \'Row1Col3\'],  // Row 1');
      label('    [\'Row2Col1\', \'Row2Col2\', \'Row2Col3\'],  // Row 2');
      label('  ]');
      label(');');
      label('');

      separator();
      label('');

      label('=== Comparison to HTML ===');
      label('');
      label('HTML:');
      label('<table>');
      label('  <thead><tr><th>Name</th><th>Age</th></tr></thead>');
      label('  <tbody><tr><td>Alice</td><td>25</td></tr></tbody>');
      label('</table>');
      label('');
      label('Tsyne:');
      label('table([\'Name\', \'Age\'], [[\'Alice\', \'25\']])');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
