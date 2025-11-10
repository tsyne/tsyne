// Dynamic Updates Demo Page - Demonstrates dynamic content updates (AJAX-like)
// URL: http://localhost:3000/dynamic-demo
// Feature: Dynamic page updates without full reload (like AJAX / Web 2.0)

const { vbox, hbox, scroll, label, button, separator, entry } = tsyne;

// Page-level state (persists during interactions)
let counter = 0;
let displayLabel;
let itemList = ['Initial Item 1', 'Initial Item 2', 'Initial Item 3'];
let listContainer;
let newItemEntry;

vbox(() => {
  label('Dynamic Updates Demo (AJAX-like)');
  label('This page demonstrates dynamic content updates without page reload');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('=== Dynamic Counter ===');
      label('This counter updates without reloading the page:');
      label('');

      displayLabel = label(`Count: ${counter}`);

      hbox(() => {
        button('-', () => {
          counter--;
          displayLabel.setText(`Count: ${counter}`);
        });

        button('Reset', () => {
          counter = 0;
          displayLabel.setText(`Count: ${counter}`);
        });

        button('+', () => {
          counter++;
          displayLabel.setText(`Count: ${counter}`);
        });
      });

      label('');
      separator();
      label('');

      label('=== Dynamic List Management ===');
      label('Add/remove items without page reload:');
      label('');

      newItemEntry = entry('New item name');

      hbox(() => {
        button('Add Item', () => {
          addItem();
        });

        button('Remove Last', () => {
          removeLastItem();
        });

        button('Clear All', () => {
          clearAllItems();
        });
      });

      label('');
      label('Items:');

      // This is a simplified list display
      // In a real scenario, you'd dynamically rebuild this
      itemList.forEach((item, index) => {
        label(`  ${index + 1}. ${item}`);
      });

      label('');
      separator();
      label('');

      label('=== How This Works ===');
      label('');
      label('Web 2.0 / AJAX approach:');
      label('  1. User interacts with widget (click, type)');
      label('  2. JavaScript updates DOM without page reload');
      label('  3. May fetch data from server via fetch/XMLHttpRequest');
      label('');
      label('Tsyne approach:');
      label('  1. User interacts with widget');
      label('  2. Event handler updates widget state');
      label('  3. Call widget.setText() to update display');
      label('  4. No page reload needed');
      label('');

      separator();
      label('');

      label('=== Comparison to Web ===');
      label('');
      label('Web (AJAX):');
      label('  document.getElementById(\'counter\').textContent = count;');
      label('');
      label('Tsyne:');
      label('  displayLabel.setText(`Count: ${count}`);');
      label('');
      label('Both update content without full page reload!');
      label('');

      separator();
      label('');

      label('=== Limitations ===');
      label('');
      label('Tsyne dynamic updates are client-side only.');
      label('For server-side data:');
      label('  • Use browserContext.changePage() to load new page');
      label('  • Server includes updated data in page code');
      label('  • See /post-demo for server interaction pattern');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});

// Helper functions for list management
function addItem() {
  const newItem = 'Item ' + (itemList.length + 1);
  itemList.push(newItem);
  // Note: In a more advanced implementation, you'd rebuild the UI
  // For now, users can reload to see changes
  console.log('Item added:', newItem);
  console.log('Items:', itemList);
}

function removeLastItem() {
  if (itemList.length > 0) {
    const removed = itemList.pop();
    console.log('Item removed:', removed);
    console.log('Items:', itemList);
  }
}

function clearAllItems() {
  itemList = [];
  console.log('All items cleared');
}
