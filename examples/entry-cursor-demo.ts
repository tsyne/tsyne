import { app, Label } from '../core/src/index';

/**
 * Entry OnCursorChanged Demo
 *
 * Demonstrates the OnCursorChanged event for Entry widgets.
 * This event fires whenever the text cursor position changes, useful for:
 * - Real-time position tracking
 * - Character/word counting at cursor
 * - Context-aware autocomplete
 * - Cursor position indicators
 * - Navigation tracking in text editors
 */

app({ title: 'Entry Cursor Demo' }, (a) => {
  a.window({ title: 'Entry OnCursorChanged', width: 700, height: 550 }, (win) => {
    let cursorMoveCount = 0;
    let statusLabel: Label;

    const updateCursorStatus = () => {
      cursorMoveCount++;
      const timestamp = new Date().toLocaleTimeString();
      statusLabel.setText(`Cursor moved ${cursorMoveCount} times (last at ${timestamp})`);
    };

    win.setContent(() => {
      a.vbox(() => {
        a.label('Entry OnCursorChanged Demo', undefined, 'center');
        a.label('Track cursor position changes in real-time', undefined, 'center');
        a.separator();

        // Entry with OnCursorChanged event
        a.label('Type or navigate with arrow keys:');
        a.entry(
          'Start typing or use arrow keys...',
          (text) => console.log('Submitted:', text),
          400,
          undefined,
          (text) => console.log('Changed:', text),
          () => updateCursorStatus()
        );

        a.separator();

        // Status display
        a.label('Cursor Activity:');
        statusLabel = a.label('Cursor has not moved yet');

        a.separator();

        // Example use cases
        a.label('Use Cases for OnCursorChanged:', undefined, undefined, undefined, { bold: true });
        a.label('• Text editor with cursor position indicator');
        a.label('• Character counter at current position');
        a.label('• Context-aware autocomplete suggestions');
        a.label('• Code editor with syntax help at cursor');
        a.label('• Navigation tracking in form fields');

        a.separator();

        // Multiple entries to demonstrate
        a.label('Try These Examples:');
        a.label('Example 1: Navigate with Arrow Keys');
        a.entry(
          'Use ← → arrow keys to move cursor',
          undefined,
          400,
          undefined,
          undefined,
          () => console.log('Cursor moved in example 1')
        );

        a.label('Example 2: Click to Position Cursor');
        a.entry(
          'Click different positions in this text',
          undefined,
          400,
          undefined,
          undefined,
          () => console.log('Cursor moved in example 2')
        );

        a.separator();
        a.label('💡 Tip: Arrow keys, mouse clicks, and Home/End keys all trigger OnCursorChanged', undefined, 'center');
      });
    });

    win.show();
  });
});
