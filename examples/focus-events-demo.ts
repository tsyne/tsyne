import { app, Label } from '../src/index';

/**
 * Focus Events Demo
 *
 * Demonstrates OnFocus and OnBlur events for Checkbox, Slider, and Select widgets.
 * These events allow tracking when widgets gain or lose keyboard focus, useful for:
 * - Form validation feedback
 * - Visual focus indicators
 * - Accessibility enhancements
 * - Tracking user navigation through UI
 */

app({ title: 'Focus Events Demo' }, (a) => {
  a.window({ title: 'Focus Events', width: 600, height: 600 }, (win) => {
    let focusLog: string[] = [];
    let statusLabel: Label;

    const updateStatus = () => {
      const recent = focusLog.slice(-5).reverse().join('\n');
      statusLabel.setText(recent || 'No focus events yet');
    };

    const logFocus = (widget: string, event: 'focus' | 'blur') => {
      const timestamp = new Date().toLocaleTimeString();
      focusLog.push(`[${timestamp}] ${widget} ${event === 'focus' ? 'gained' : 'lost'} focus`);
      updateStatus();
    };

    win.setContent(() => {
      a.vbox(() => {
        a.label('Focus Events Demo', undefined, 'center');
        a.label('Tab through widgets to see focus events', undefined, 'center');
        a.separator();

        // Checkbox with focus events
        a.label('Checkbox Focus Events:');
        a.checkbox(
          'Enable notifications',
          (checked) => console.log('Checked:', checked),
          () => logFocus('Checkbox', 'focus'),
          () => logFocus('Checkbox', 'blur')
        );

        a.separator();

        // Slider with focus events
        a.label('Slider Focus Events:');
        a.slider(
          0,
          100,
          50,
          (value) => console.log('Value:', value),
          () => logFocus('Slider', 'focus'),
          () => logFocus('Slider', 'blur')
        );

        a.separator();

        // Select with focus events
        a.label('Select Focus Events:');
        a.select(
          ['Option 1', 'Option 2', 'Option 3'],
          (selected) => console.log('Selected:', selected),
          () => logFocus('Select', 'focus'),
          () => logFocus('Select', 'blur')
        );

        a.separator();

        // Multiple widgets to tab between
        a.label('Additional Widgets for Testing:');
        a.hbox(() => {
          a.button('Button 1').onClick(() => console.log('Button 1'));
          a.button('Button 2').onClick(() => console.log('Button 2'));
        });

        a.separator();

        // Status display
        a.label('Recent Focus Events (newest first):');
        statusLabel = a.label('No focus events yet');

        a.separator();
        a.label('💡 Tip: Use Tab key to navigate between widgets', undefined, 'center');
      });
    });

    win.show();
  });
});
