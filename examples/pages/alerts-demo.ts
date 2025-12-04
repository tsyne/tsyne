// Alerts Demo - Demonstrates alert/dialog patterns
// URL: http://localhost:3000/alerts-demo
// Feature: Alert dialogs (like JavaScript alert(), confirm(), prompt())

const { vbox, scroll, label, button, separator, entry, hbox } = tsyne;

let inputEntry;

vbox(() => {
  label('Alerts & Dialogs Demo');
  label('Desktop UI dialogs for user interaction');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('=== What are Alerts? ===');
      label('');
      label('In web browsers:');
      label('  • alert("message") - Shows message, OK button');
      label('  • confirm("message") - Shows message, OK/Cancel');
      label('  • prompt("message") - Shows message, text input, OK/Cancel');
      label('');
      label('These are blocking modal dialogs.');
      label('');

      separator();
      label('');
      label('=== Tsyne Dialog Methods ===');
      label('');
      label('Tsyne provides native dialogs via window object:');
      label('  • window.showInfo(title, message) - Information dialog');
      label('  • window.showError(title, message) - Error dialog');
      label('  • window.showConfirm(title, message) - Confirmation dialog');
      label('  • window.showFileOpen() - File picker dialog');
      label('  • window.showFileSave() - File save dialog');
      label('');
      label('Note: In browser pages, window object is not directly accessible.');
      label('Instead, dialogs can be triggered via button callbacks.');
      label('');

      separator();
      label('');
      label('=== Information Alert ===');
      label('Web: alert("Hello World")');
      label('');

      button('Show Info Alert').onClick(() => {
        // Note: In a real implementation, this would need window reference
        // For demo purposes, we log to console
        console.log('INFO ALERT: Hello from Tsyne Browser!');
        console.log('In a real app: window.showInfo("Alert", "Hello from Tsyne Browser!")');
      });

      label('');
      label('Implementation:');
      label('  button(\'Show Alert\', async () => {');
      label('    await window.showInfo(\'Alert\', \'Hello from Tsyne!\');');
      label('  });');
      label('');

      separator();
      label('');
      label('=== Error Alert ===');
      label('Web: alert("Error: Something went wrong")');
      label('');

      button('Show Error Alert').onClick(() => {
        console.log('ERROR ALERT: Something went wrong!');
        console.log('In a real app: window.showError("Error", "Something went wrong!")');
      });

      label('');
      label('Implementation:');
      label('  button(\'Show Error\', async () => {');
      label('    await window.showError(\'Error\', \'Operation failed!\');');
      label('  });');
      label('');

      separator();
      label('');
      label('=== Confirmation Dialog ===');
      label('Web: confirm("Are you sure?")');
      label('');

      button('Show Confirm Dialog').onClick(() => {
        console.log('CONFIRM DIALOG: Are you sure you want to continue?');
        console.log('In a real app: const result = await window.showConfirm("Confirm", "Are you sure?")');
        console.log('Returns: true (OK) or false (Cancel)');
      });

      label('');
      label('Implementation:');
      label('  button(\'Delete Item\', async () => {');
      label('    const confirmed = await window.showConfirm(');
      label('      \'Delete\',');
      label('      \'Are you sure you want to delete this item?\'');
      label('    );');
      label('    if (confirmed) {');
      label('      // Delete the item');
      label('      console.log(\'Item deleted\');');
      label('    }');
      label('  });');
      label('');

      separator();
      label('');
      label('=== Prompt Dialog (Input) ===');
      label('Web: prompt("Enter your name")');
      label('');
      label('Tsyne doesn\'t have a built-in prompt dialog.');
      label('Instead, use a custom page with input:');
      label('');

      hbox(() => {
        inputEntry = entry('Enter your name');

        button('Submit').onClick(async () => {
          const value = await inputEntry.getText();
          console.log('Input value:', value);

          if (value) {
            console.log('Processing:', value);
            // Navigate to result page or update UI
          }
        });
      });

      label('');
      label('Or create a dedicated prompt page:');
      label('  browserContext.changePage(\'/prompt?message=Enter+name\');');
      label('  // Prompt page has input field and OK/Cancel buttons');
      label('  // On submit, navigate to /result?value=...');
      label('');

      separator();
      label('');
      label('=== Custom Alert Page ===');
      label('');
      label('For more control, create dedicated alert pages:');
      label('');

      button('Navigate to Custom Alert Page').onClick(() => {
        browserContext.changePage('/custom-alert?title=Warning&message=This+is+a+custom+alert');
      });

      label('');
      label('Custom alert page shows:');
      label('  • Title from query param');
      label('  • Message from query param');
      label('  • OK button that goes back');
      label('');

      separator();
      label('');
      label('=== In-Page Alerts ===');
      label('');
      label('Instead of modal dialogs, show alerts in the page:');
      label('');

      button('Show In-Page Alert').onClick(() => {
        console.log('Would display alert in page content area');
        // In a real implementation, update page state to show alert
      });

      label('');
      label('┌────────────────────────────────────┐');
      label('│ ⓘ Info: Operation completed       │');
      label('└────────────────────────────────────┘');
      label('');
      label('┌────────────────────────────────────┐');
      label('│ ⚠ Warning: Low disk space          │');
      label('└────────────────────────────────────┘');
      label('');
      label('┌────────────────────────────────────┐');
      label('│ ✗ Error: Connection failed         │');
      label('└────────────────────────────────────┘');
      label('');

      separator();
      label('');
      label('=== Toast Notifications ===');
      label('');
      label('Non-blocking notifications (like Android toasts):');
      label('');

      button('Show Toast (Simulated)').onClick(() => {
        console.log('TOAST: File saved successfully');
        console.log('Would show temporary notification at bottom of window');
      });

      label('');
      label('Toast notifications:');
      label('  • Appear at bottom/top of window');
      label('  • Auto-dismiss after 3-5 seconds');
      label('  • Don\'t block user interaction');
      label('  • Good for success messages');
      label('');

      separator();
      label('');
      label('=== Comparison to Web ===');
      label('');
      label('Web JavaScript:');
      label('  alert(\'Hello\');              // Blocking');
      label('  confirm(\'Sure?\');            // Returns boolean');
      label('  prompt(\'Name?\');             // Returns string or null');
      label('');
      label('Tsyne Browser:');
      label('  await window.showInfo(\'Alert\', \'Hello\');');
      label('  const ok = await window.showConfirm(\'Confirm\', \'Sure?\');');
      label('  // For input: use custom page or in-page entry widget');
      label('');

      separator();
      label('');
      label('=== Best Practices ===');
      label('');
      label('Use dialogs for:');
      label('  ✓ Critical confirmations (delete, logout)');
      label('  ✓ Important errors');
      label('  ✓ File selection');
      label('');
      label('Avoid dialogs for:');
      label('  ✗ Success messages (use toast)');
      label('  ✗ Progress updates (use progress bar)');
      label('  ✗ Frequent notifications (use in-page alerts)');
      label('  ✗ Complex forms (use dedicated pages)');
      label('');

      separator();
      label('');
      label('=== Implementation Examples ===');
      label('');
      label('Example 1: Delete confirmation');
      label('button(\'Delete\', async () => {');
      label('  const confirmed = await window.showConfirm(');
      label('    \'Delete Item\',');
      label('    \'This cannot be undone. Continue?\'');
      label('  );');
      label('  if (confirmed) {');
      label('    // Delete item');
      label('    await window.showInfo(\'Success\', \'Item deleted\');');
      label('  }');
      label('});');
      label('');

      separator();
      label('');
      label('Example 2: Error handling');
      label('button(\'Save\', async () => {');
      label('  try {');
      label('    await saveData();');
      label('    // Toast or in-page success message');
      label('  } catch (error) {');
      label('    await window.showError(\'Save Failed\', error.message);');
      label('  }');
      label('});');
      label('');

      separator();
      label('');
      label('Example 3: File selection');
      label('button(\'Open File\', async () => {');
      label('  const filePath = await window.showFileOpen();');
      label('  if (filePath) {');
      label('    console.log(\'Selected file:\', filePath);');
      label('    // Process file');
      label('  }');
      label('});');
      label('');
    });
  });

  separator();
  button('Back to Home').onClick(() => {
    browserContext.changePage('/');
  });
});
