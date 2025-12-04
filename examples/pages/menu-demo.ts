// Menu Demo Page - Demonstrates custom page menus
// URL: http://localhost:3000/menu-demo

const { vbox, label, button, separator } = tsyne;

// Add custom page menu
browserContext.addPageMenu('Tools', [
  {
    label: 'Say Hello',
    onSelected: () => {
      console.log('Hello from page menu!');
    }
  },
  {
    label: 'Count Items',
    onSelected: () => {
      console.log('Total items: 3');
    }
  },
  {
    label: 'Disabled Item',
    onSelected: () => {},
    disabled: true
  }
]);

// Add another custom menu
browserContext.addPageMenu('Settings', [
  {
    label: 'Enable Feature',
    checked: false,
    onSelected: () => {
      console.log('Feature toggled');
    }
  },
  {
    label: 'Reset to Defaults',
    onSelected: () => {
      console.log('Settings reset');
    }
  }
]);

vbox(() => {
  label('Custom Menu Demo');
  separator();
  label('');
  label('This page adds custom menus to the browser menu bar.');
  label('');
  label('Check the menu bar for:');
  label('  • Tools menu - Custom page actions');
  label('  • Settings menu - Page-specific settings');
  label('');
  label('Note: These menus only appear when this page is loaded.');
  label('');

  button('Back to Home').onClick(() => {
    browserContext.changePage('/');
  });
});
