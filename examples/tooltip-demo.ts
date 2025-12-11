// Tooltip and Popup Demo
// Demonstrates the Popup widget for tooltips, popovers, and floating overlays

import { app, Popup } from '../core/src';

app({ title: 'Popup Demo' }, (a) => {
  a.window({ title: 'Popup Demo', width: 600, height: 500 }, (win) => {
    // Create popups for different buttons (must be created after window context is set up)
    let tooltip1: Popup | null = null;
    let tooltip2: Popup | null = null;
    let tooltip3: Popup | null = null;
    let popover: Popup | null = null;
    let modalPopup: Popup | null = null;

    win.setContent(() => {
      a.vbox(() => {
        a.label('=== Popup Widget Demo ===', undefined, 'center', undefined, { bold: true });
        a.separator();

        a.label('Popups are floating overlays that can be positioned anywhere.');
        a.label('Hover over buttons to see tooltips, or click for popovers.');
        a.separator();

        // Section 1: Simple Tooltips
        a.label('--- Tooltips (appear on hover) ---');
        a.hbox(() => {
          const btn1 = a.button('Hover Me!').onClick(() => {});
          btn1.onMouseIn(() => {
            tooltip1?.showAt(50, 150);
          });
          btn1.onMouseOut(() => {
            tooltip1?.hide();
          });

          const btn2 = a.button('Hover Here Too').onClick(() => {});
          btn2.onMouseIn(() => {
            tooltip2?.showAt(200, 150);
          });
          btn2.onMouseOut(() => {
            tooltip2?.hide();
          });

          const btn3 = a.button('And Me!').onClick(() => {});
          btn3.onMouseIn(() => {
            tooltip3?.showAt(350, 150);
          });
          btn3.onMouseOut(() => {
            tooltip3?.hide();
          });
        });

        a.separator();

        // Section 2: Click Popover
        a.label('--- Popover (click to toggle) ---');
        let popoverVisible = false;
        a.button('Click for Details').onClick(() => {
          if (popoverVisible) {
            popover?.hide();
          } else {
            popover?.showAt(100, 280);
          }
          popoverVisible = !popoverVisible;
        });

        a.separator();

        // Section 3: Centered Modal-style Popup
        a.label('--- Modal Popup (centered) ---');
        a.button('Show Modal').onClick(() => {
          modalPopup?.show(); // Centered by default
        });

        a.separator();
        a.label('');
        a.label('Try hovering and clicking the buttons above!');
      });
    });

    // Create the tooltip popups (after setContent so window is ready)
    tooltip1 = a.popup(win.id, () => {
      a.card('Tooltip 1', '', () => {
        a.label('This is a simple tooltip!');
      });
    });

    tooltip2 = a.popup(win.id, () => {
      a.card('Tooltip 2', '', () => {
        a.vbox(() => {
          a.label('Multi-line tooltip');
          a.label('with more info.');
        });
      });
    });

    tooltip3 = a.popup(win.id, () => {
      a.vbox(() => {
        a.label('Quick tip: Press Escape to close');
      });
    });

    // Popover with more content
    popover = a.popup(win.id, () => {
      a.card('Details', 'More Information', () => {
        a.vbox(() => {
          a.label('This is a popover panel.');
          a.label('It stays visible until you click again.');
          a.separator();
          a.label('Features:');
          a.label('• Position anywhere');
          a.label('• Custom content');
          a.label('• Show/hide programmatically');
        });
      });
    });

    // Modal-style centered popup
    modalPopup = a.popup(win.id, () => {
      a.card('Modal Dialog', 'Centered Popup', () => {
        a.vbox(() => {
          a.label('This popup appears centered on screen.');
          a.separator();
          a.label('Use this for important messages or');
          a.label('quick actions that need attention.');
          a.separator();
          a.button('Close').onClick(() => {
            modalPopup?.hide();
          });
        });
      });
    });

    win.show();
  });
});

console.log('\n=== Popup Demo ===');
console.log('Demonstrating the Popup widget:');
console.log('• Tooltips that appear on hover');
console.log('• Popovers that toggle on click');
console.log('• Modal popups centered on screen');
console.log('==================\n');
