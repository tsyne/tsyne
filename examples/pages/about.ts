// About Page - TypeScript content for Tsyne Browser
// URL: http://localhost:3000/about

const { vbox, label, button, separator } = tsyne;

vbox(() => {
  label('About Tsyne Browser');
  separator();
  label('');
  label('Tsyne Browser is a Swiby-inspired browser that loads');
  label('TypeScript pages from web servers dynamically.');
  label('');
  label('Features:');
  label('• Pages are TypeScript code (not HTML)');
  label('• Server-side rendering from any language');
  label('• Native desktop widgets via Fyne');
  label('• Browser chrome with address bar and navigation');
  label('');

  button('Back to Home').onClick(() => {
    browserContext.changePage('/');
  });

  button('Browser Back').onClick(() => {
    browserContext.back();
  });
});
