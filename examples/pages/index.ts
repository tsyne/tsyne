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

      button('📝 Text Features (Paragraphs, Headings)').onClick(() => {
        browserContext.changePage('/text-features');
      });

      button('🔗 Hyperlinks & Navigation').onClick(() => {
        browserContext.changePage('/hyperlinks');
      });

      button('📜 Scrolling Demo').onClick(() => {
        browserContext.changePage('/scrolling');
      });

      button('🖼️  Images').onClick(() => {
        browserContext.changePage('/images');
      });

      button('📊 Tables').onClick(() => {
        browserContext.changePage('/table-demo');
      });

      button('📋 Lists').onClick(() => {
        browserContext.changePage('/list-demo');
      });

      label('');
      separator();
      label('');
      label('=== Forms & User Input ===');
      label('');

      button('📝 Form Demo (Inputs, Checkboxes, Selects)').onClick(() => {
        browserContext.changePage('/form');
      });

      button('📮 POST-Redirect-GET Pattern').onClick(() => {
        browserContext.changePage('/post-demo');
      });

      label('');
      separator();
      label('');
      label('=== Dynamic Features (AJAX / Web 2.0) ===');
      label('');

      button('⚡ Dynamic Updates (AJAX-like)').onClick(() => {
        browserContext.changePage('/dynamic-demo');
      });

      button('🔄 Session State Demo (Server-side)').onClick(() => {
        browserContext.changePage('/session-demo');
      });

      label('');
      separator();
      label('');
      label('=== Advanced Web Features ===');
      label('');

      button('# URL Fragments (Anchors)').onClick(() => {
        browserContext.changePage('/url-fragments');
      });

      button('⚠️  Alerts & Dialogs').onClick(() => {
        browserContext.changePage('/alerts-demo');
      });

      label('');
      separator();
      label('');
      label('=== Desktop UI Features (Beyond HTML) ===');
      label('');

      button('🎨 Fyne-Specific Widgets').onClick(() => {
        browserContext.changePage('/fyne-widgets');
      });

      button('🖱️  Context Menu Demo').onClick(() => {
        browserContext.changePage('/context-menu-demo');
      });

      button('📑 Menu Demo').onClick(() => {
        browserContext.changePage('/menu-demo');
      });

      label('');
      separator();
      label('');
      label('=== General ===');
      label('');

      button('ℹ️  About').onClick(() => {
        browserContext.changePage('/about');
      });

      button('✉️  Contact').onClick(() => {
        browserContext.changePage('/contact');
      });

      label('');
    });
  });
});
