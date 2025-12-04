// Fyne-Specific Widgets Demo - Features beyond HTML
// URL: http://localhost:3000/fyne-widgets
// Feature: Widgets that Fyne provides that HTML/web browsers don't have

const { vbox, hbox, scroll, label, button, separator, progressbar, slider,
        accordion, card, toolbar, tabs, hsplit, vsplit, richtext, tree } = tsyne;

let progressBar;
let progressValue = 0;

vbox(() => {
  label('Fyne-Specific Widgets Demo');
  label('Desktop UI features that go beyond traditional HTML');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('=== What Makes Desktop UI Different ===');
      label('');
      label('Traditional web browsers are limited by HTML/CSS/DOM.');
      label('Desktop UI frameworks like Fyne (and Swing, Qt, WPF) offer:');
      label('  • Native widgets with platform look-and-feel');
      label('  • Split panes with user-resizable dividers');
      label('  • Accordions for collapsible sections');
      label('  • Toolbars with icons and actions');
      label('  • Tree widgets for hierarchical data');
      label('  • Rich text with mixed formatting');
      label('  • Card layouts for organized content');
      label('  • Tab containers with multiple views');
      label('');

      separator();
      label('');
      label('=== 1. Split Panes (Resizable Dividers) ===');
      label('');
      label('HTML limitation: No native resizable split panes');
      label('Desktop solution: Built-in split containers');
      label('');
      label('Horizontal Split:');
      label('  hsplit(leftBuilder, rightBuilder, 0.5)');
      label('');
      label('Vertical Split:');
      label('  vsplit(topBuilder, bottomBuilder, 0.5)');
      label('');
      label('User can drag divider to resize panels!');
      label('');

      separator();
      label('');
      label('=== 2. Accordion (Collapsible Sections) ===');
      label('');
      label('Try expanding/collapsing these sections:');
      label('');

      accordion([
        {
          title: 'Section 1: Introduction',
          builder: () => {
            vbox(() => {
              label('This is the content of section 1.');
              label('Click the title to collapse this section.');
            });
          }
        },
        {
          title: 'Section 2: Details',
          builder: () => {
            vbox(() => {
              label('More detailed information here.');
              label('Accordions save vertical space.');
            });
          }
        },
        {
          title: 'Section 3: Advanced',
          builder: () => {
            vbox(() => {
              label('Advanced topics and features.');
              label('Each section can contain any widgets.');
            });
          }
        }
      ]);

      label('');
      label('HTML has <details>/<summary> but it\'s limited.');
      label('Fyne accordions are richer and more flexible.');
      label('');

      separator();
      label('');
      label('=== 3. Card Containers ===');
      label('');

      card('User Profile', 'John Doe', () => {
        vbox(() => {
          label('Email: john@example.com');
          label('Role: Administrator');
          label('Status: Active');
        });
      });

      label('');
      label('Cards provide title, subtitle, and content in one widget.');
      label('Much cleaner than HTML <div class="card">!');
      label('');

      separator();
      label('');
      label('=== 4. Toolbar (Action Bar) ===');
      label('');
      label('Desktop apps have toolbars with icons and actions:');
      label('');

      toolbar([
        {
          type: 'action',
          label: 'New',
          onAction: () => {
            console.log('New clicked');
          }
        },
        {
          type: 'action',
          label: 'Open',
          onAction: () => {
            console.log('Open clicked');
          }
        },
        {
          type: 'action',
          label: 'Save',
          onAction: () => {
            console.log('Save clicked');
          }
        },
        {
          type: 'separator'
        },
        {
          type: 'action',
          label: 'Help',
          onAction: () => {
            console.log('Help clicked');
          }
        },
        {
          type: 'spacer'
        }
      ]);

      label('');
      label('HTML toolbars are just styled <div>s.');
      label('Fyne toolbars are native UI elements.');
      label('');

      separator();
      label('');
      label('=== 5. Tab Containers ===');
      label('');
      label('Native tab switching (better than CSS hacks):');
      label('');

      tabs([
        {
          title: 'Tab 1',
          builder: () => {
            vbox(() => {
              label('Content of Tab 1');
              label('Click other tabs to switch views.');
            });
          }
        },
        {
          title: 'Tab 2',
          builder: () => {
            vbox(() => {
              label('Content of Tab 2');
              label('Tabs can be positioned: top, bottom, left, right.');
            });
          }
        },
        {
          title: 'Tab 3',
          builder: () => {
            vbox(() => {
              label('Content of Tab 3');
              label('Each tab can contain complex layouts.');
            });
          }
        }
      ]);

      label('');

      separator();
      label('');
      label('=== 6. Tree Widget (Hierarchical Data) ===');
      label('');
      label('For file browsers, org charts, nested data:');
      label('');
      label('tree(\'Root Node\')');
      label('');
      label('HTML has no native tree widget.');
      label('Web apps use JavaScript libraries (jsTree, Fancy Tree).');
      label('Desktop frameworks have built-in tree support.');
      label('');

      separator();
      label('');
      label('=== 7. Rich Text (Mixed Formatting) ===');
      label('');
      label('Display text with mixed bold, italic, monospace:');
      label('');

      richtext([
        { text: 'Bold text', bold: true },
        { text: ' normal ', bold: false },
        { text: 'italic', italic: true },
        { text: ' and ', italic: false },
        { text: 'monospace code', monospace: true }
      ]);

      label('');
      label('HTML requires <strong>, <em>, <code> tags.');
      label('Fyne has a unified rich text widget.');
      label('');

      separator();
      label('');
      label('=== 8. Progress Indicators ===');
      label('');
      label('Determinate progress (0-100%):');

      progressBar = progressbar(0.3);

      hbox(() => {
        button('Start').onClick(() => {
          simulateProgress();
        });

        button('Reset').onClick(() => {
          progressValue = 0;
          progressBar.setProgress(0);
        });
      });

      label('');
      label('Indeterminate progress (spinner):');
      progressbar(0, true);
      label('');

      separator();
      label('');
      label('=== 9. Icon + Text Dropdowns ===');
      label('');
      label('Reference: https://paulhammant.com/2012/04/15/application-development-glass-ceilings/');
      label('');
      label('Traditional HTML <select> limitations:');
      label('  • Only text in options (no icons)');
      label('  • Limited styling');
      label('  • No custom rendering');
      label('');
      label('Desktop UI advantages:');
      label('  • Icons + text in dropdown options');
      label('  • Custom cell renderers');
      label('  • Rich formatting per item');
      label('  • Tooltips on options');
      label('');
      label('Example use cases:');
      label('  • File type selector with file icons');
      label('  • User selector with avatars');
      label('  • Status dropdown with colored indicators');
      label('  • Font picker with font previews');
      label('');
      label('While Fyne\'s select() currently uses text,');
      label('desktop frameworks generally support richer dropdowns');
      label('than HTML <select> ever could.');
      label('');

      separator();
      label('');
      label('=== 10. Native Features ===');
      label('');
      label('Desktop apps have access to:');
      label('  • Native file dialogs');
      label('  • Native color pickers');
      label('  • Native date pickers');
      label('  • System tray integration');
      label('  • Native notifications');
      label('  • Multi-window management');
      label('  • Menu bars (File, Edit, etc.)');
      label('  • Keyboard shortcuts');
      label('  • Drag and drop');
      label('');
      label('Web browsers require:');
      label('  • <input type="file"> (limited)');
      label('  • <input type="color"> (limited)');
      label('  • JavaScript libraries for everything else');
      label('  • No system tray');
      label('  • Limited notifications (Notification API)');
      label('  • Pop-up blockers prevent multi-window');
      label('');

      separator();
      label('');
      label('=== The Glass Ceiling Concept ===');
      label('');
      label('From Paul Hammant\'s blog post:');
      label('');
      label('Web development hits a "glass ceiling" where:');
      label('  1. HTML/CSS/DOM are fundamentally limited');
      label('  2. Workarounds become increasingly complex');
      label('  3. Performance suffers with heavy JavaScript');
      label('  4. User experience feels "web-like" not native');
      label('');
      label('Desktop frameworks (Swing, Qt, WPF, Fyne):');
      label('  1. Native widgets by default');
      label('  2. Rich component libraries built-in');
      label('  3. Direct OS integration');
      label('  4. Better performance (no DOM overhead)');
      label('  5. Familiar desktop UX patterns');
      label('');
      label('Tsyne brings Fyne\'s power to TypeScript,');
      label('breaking through the web\'s glass ceiling!');
      label('');
    });
  });

  separator();
  button('Back to Home').onClick(() => {
    browserContext.changePage('/');
  });
});

// Simulate progress bar animation
function simulateProgress() {
  progressValue = 0;
  const interval = setInterval(() => {
    progressValue += 0.1;
    progressBar.setProgress(progressValue);

    if (progressValue >= 1.0) {
      clearInterval(interval);
    }
  }, 200);
}
