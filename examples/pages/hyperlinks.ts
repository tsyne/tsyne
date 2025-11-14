// Hyperlinks Demo Page - Demonstrates hyperlink navigation
// URL: http://localhost:3000/hyperlinks
// Feature: Hyperlinks and navigation (like HTML <a> tags)

const { vbox, scroll, label, button, separator, hyperlink, hbox } = tsyne;

vbox(() => {
  label('Hyperlinks & Navigation Demo');
  label('This page demonstrates hyperlinks, similar to HTML <a> tags');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('=== Internal Navigation Hyperlinks ===');
      label('Hyperlinks for navigating within the app (blue & underlined):');
      label('');

      hyperlink('About Page', '/about');
      hyperlink('Text Features', '/text-features');
      hyperlink('Form Demo', '/form');

      label('');
      separator();
      label('');

      label('=== External Hyperlinks ===');
      label('Hyperlinks that open in external browser:');
      label('');

      hyperlink('Visit Tsyne GitHub Repository', 'https://github.com/anthropics/tsyne');
      hyperlink('Visit Fyne (Go UI Toolkit)', 'https://fyne.io');
      hyperlink('Learn TypeScript', 'https://www.typescriptlang.org');

      label('');
      label('Note: Hyperlinks open in your default web browser');
      label('');

      separator();
      label('');

      label('=== Navigation Functions ===');
      label('The browserContext provides navigation functions:');
      label('');
      label('  • browserContext.changePage(url) - Navigate to a page');
      label('  • browserContext.back() - Go back in history');
      label('  • browserContext.forward() - Go forward in history');
      label('  • browserContext.reload() - Reload current page');
      label('');

      separator();
      label('');

      label('=== History Navigation ===');
      label('Try these navigation buttons:');
      label('');

      hbox(() => {
        button('← Back', () => {
          browserContext.back();
        });

        button('Forward →', () => {
          browserContext.forward();
        });

        button('⟳ Reload', () => {
          browserContext.reload();
        });
      });

      label('');
      separator();
      label('');

      label('=== Comparison to HTML ===');
      label('');
      label('HTML: <a href="/about">About</a>');
      label('Tsyne: button(\'About\', () => browserContext.changePage(\'/about\'))');
      label('');
      label('HTML: <a href="https://example.com" target="_blank">Link</a>');
      label('Tsyne: hyperlink(\'Link\', \'https://example.com\')');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
