// Home Page - TypeScript content for Tsyne Browser
// URL: http://localhost:3000/

const { vbox, label, button } = tsyne;

vbox(() => {
  label('Welcome to Tsyne Browser!');
  label('');
  label('This is a TypeScript page loaded from the server.');
  label('Current URL: ' + browserContext.currentUrl);
  label('');

  button('Go to About', () => {
    browserContext.changePage('/about');
  });

  button('Go to Contact', () => {
    browserContext.changePage('/contact');
  });

  button('Go to Form Demo', () => {
    browserContext.changePage('/form');
  });

  button('Go to Menu Demo', () => {
    browserContext.changePage('/menu-demo');
  });

  button('Go to Context Menu Demo', () => {
    browserContext.changePage('/context-menu-demo');
  });
});
