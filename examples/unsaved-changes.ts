// Unsaved changes example demonstrating Window.setCloseIntercept
// This example shows how to prompt the user before closing a window

import { app } from '../core/src';

app({ title: 'Unsaved Changes Demo' }, (a) => {
  a.window({ title: 'Document Editor', width: 500, height: 400 }, (win) => {
    let hasUnsavedChanges = false;
    let statusLabel: any;

    // Set up close intercept to prompt before closing
    win.setCloseIntercept(async () => {
      if (hasUnsavedChanges) {
        // Show confirmation dialog
        const shouldClose = await win.showConfirm(
          'Unsaved Changes',
          'You have unsaved changes. Are you sure you want to close?'
        );
        return shouldClose;
      }
      // No unsaved changes, allow close
      return true;
    });

    win.setContent(() => {
      a.vbox(() => {
        a.label('Document Editor');
        a.label('Try closing the window after making changes!');
        a.separator();

        // Multiline entry to simulate document editing
        const editor = a.multilineentry('Type your document here...');

        a.hbox(() => {
          a.button('Mark as Modified').onClick(async () => {
            hasUnsavedChanges = true;
            await statusLabel.setText('Status: Modified (unsaved)');
          });

          a.button('Save Document').onClick(async () => {
            hasUnsavedChanges = false;
            await statusLabel.setText('Status: Saved');
          });
        });

        a.separator();
        statusLabel = a.label('Status: No changes');
      });
    });
    win.show();
  });
});
