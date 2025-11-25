import { app, Label } from '../src/index';

/**
 * RadioGroup Horizontal Layout Demo
 *
 * Demonstrates the horizontal property for RadioGroup widgets.
 * Radio buttons can now be laid out horizontally instead of vertically, useful for:
 * - Compact forms with limited vertical space
 * - Toggle-like selections (Yes/No, On/Off)
 * - Rating systems
 * - Size selectors (S/M/L/XL)
 * - View mode toggles (List/Grid)
 */

app({ title: 'RadioGroup Horizontal Demo' }, (a) => {
  a.window({ title: 'RadioGroup Horizontal', width: 700, height: 650 }, (win) => {
    let selectedSize: string = 'Medium';
    let selectedView: string = 'List';
    let selectedRating: string = '3';
    let statusLabel: Label;

    const updateStatus = () => {
      statusLabel.setText(
        `Size: ${selectedSize} | View: ${selectedView} | Rating: ${selectedRating} stars`
      );
    };

    win.setContent(() => {
      a.vbox(() => {
        a.label('RadioGroup Horizontal Layout Demo', undefined, 'center');
        a.label('Compare vertical vs horizontal radio button layouts', undefined, 'center');
        a.separator();

        // Example 1: Vertical layout (default)
        a.label('Example 1: Default Vertical Layout');
        a.radiogroup(
          ['Small', 'Medium', 'Large', 'Extra Large'],
          'Medium',
          (selected) => console.log('Vertical:', selected)
        );

        a.separator();

        // Example 2: Horizontal layout
        a.label('Example 2: Horizontal Layout (horizontal: true)');
        a.radiogroup(
          ['Small', 'Medium', 'Large', 'Extra Large'],
          'Medium',
          (selected) => {
            selectedSize = selected;
            updateStatus();
          },
          true  // horizontal = true
        );

        a.separator();

        // Example 3: Yes/No toggle
        a.label('Example 3: Horizontal Yes/No Toggle');
        a.radiogroup(
          ['Yes', 'No'],
          'No',
          (selected) => console.log('Toggle:', selected),
          true
        );

        a.separator();

        // Example 4: View mode selector
        a.label('Example 4: View Mode Selector');
        a.radiogroup(
          ['List', 'Grid', 'Gallery'],
          'List',
          (selected) => {
            selectedView = selected;
            updateStatus();
          },
          true
        );

        a.separator();

        // Example 5: Rating selector
        a.label('Example 5: Star Rating (1-5)');
        a.radiogroup(
          ['1', '2', '3', '4', '5'],
          '3',
          (selected) => {
            selectedRating = selected;
            updateStatus();
          },
          true
        );

        a.separator();

        // Status display
        a.label('Current Selections:');
        statusLabel = a.label('Size: Medium | View: List | Rating: 3 stars');

        a.separator();

        a.label('💡 Benefits of Horizontal Layout:', undefined, undefined, undefined, { bold: true });
        a.label('• Saves vertical screen space');
        a.label('• Better for short option lists (2-5 items)');
        a.label('• More compact for Yes/No and On/Off toggles');
        a.label('• Ideal for ratings and size selectors');
      });
    });

    win.show();
  });
});
