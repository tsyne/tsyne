// Home Page - TypeScript content for Tsyne Browser
// URL: http://localhost:3000/

const { vbox, scroll, label, button, separator } = tsyne;

vbox(() => {
  label('Welcome to Tsyne Browser!');
  label('Web features replicated in native desktop UI');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('Current URL: ' + browserContext.currentUrl);
      label('');

      separator();
      label('');
      label('=== Core Web/HTML Features ===');
      label('');

      button('📝 Text Features (Paragraphs, Headings)', () => {
        browserContext.changePage('/text-features');
      });

      button('🔗 Hyperlinks & Navigation', () => {
        browserContext.changePage('/hyperlinks');
      });

      button('📜 Scrolling Demo', () => {
        browserContext.changePage('/scrolling');
      });

      button('🖼️  Images', () => {
        browserContext.changePage('/images');
      });

      button('📊 Tables', () => {
        browserContext.changePage('/table-demo');
      });

      button('📋 Lists', () => {
        browserContext.changePage('/list-demo');
      });

      label('');
      separator();
      label('');
      label('=== Forms & User Input ===');
      label('');

      button('📝 Form Demo (Inputs, Checkboxes, Selects)', () => {
        browserContext.changePage('/form');
      });

      button('📮 POST-Redirect-GET Pattern', () => {
        browserContext.changePage('/post-demo');
      });

      label('');
      separator();
      label('');
      label('=== Dynamic Features (AJAX / Web 2.0) ===');
      label('');

      button('⚡ Dynamic Updates (AJAX-like)', () => {
        browserContext.changePage('/dynamic-demo');
      });

      button('🔄 Session State Demo (Server-side)', () => {
        browserContext.changePage('/session-demo');
      });

      label('');
      separator();
      label('');
      label('=== Desktop UI Features (Beyond HTML) ===');
      label('');

      button('🎨 Fyne-Specific Widgets', () => {
        browserContext.changePage('/fyne-widgets');
      });

      button('🖱️  Context Menu Demo', () => {
        browserContext.changePage('/context-menu-demo');
      });

      button('📑 Menu Demo', () => {
        browserContext.changePage('/menu-demo');
      });

      label('');
      separator();
      label('');
      label('=== General ===');
      label('');

      button('ℹ️  About', () => {
        browserContext.changePage('/about');
      });

      button('✉️  Contact', () => {
        browserContext.changePage('/contact');
      });

      label('');
    });
  });
});
