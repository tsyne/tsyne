/**
 * Test that EXACTLY replicates Browser's sequence
 *
 * Browser does:
 * 1. Constructor: window with buildWindowContent() in builder (currentPageBuilder = null)
 * 2. Constructor: setupMenuBar() → setMainMenu()
 * 3. Later: changePage() → renderPage() → setContent() with currentPageBuilder set
 */

const { App } = require('./dist/src/app');

async function testExactBrowserSequence() {
  console.log('\n=== TEST: Exact Browser Sequence ===');
  console.log('Replicating Browser constructor + navigation pattern');
  console.log('');

  const app = new App({ title: 'Exact Browser Test' }, false); // FALSE = headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button, hbox, entry, separator, border, scroll } = require('./dist/src/index');

  let currentPageBuilder = null;

  // Function that mimics Browser.buildWindowContent()
  function buildWindowContent() {
    console.log('[buildWindowContent] Called - currentPageBuilder:', currentPageBuilder !== null ? 'SET' : 'NULL');

    border({
      top: () => {
        vbox(() => {
          hbox(() => {
            button('File', () => {});
            button('View', () => {});
          });
          separator();
          hbox(() => {
            button('←', () => {});
            button('→', () => {});
            entry('url-bar', 'http://localhost:3000');
            button('Go', () => {});
          });
        });
      },
      center: () => {
        scroll(() => {
          vbox(() => {
            if (currentPageBuilder !== null) {
              console.log('[buildWindowContent] Rendering page content');
              currentPageBuilder();
            } else {
              console.log('[buildWindowContent] Rendering placeholder');
              label('Tsyne Browser');
              label('');
              label('Enter a URL in the address bar and click Go to navigate.');
            }
          });
        });
      }
    });
  }

  console.log('STEP 1: Creating window with buildWindowContent() in builder...');
  console.log('(currentPageBuilder is NULL at this point)');

  const window = app.window(
    { title: 'Exact Browser Test', width: 600, height: 400 },
    (win) => {
      // Mimic Browser constructor: call buildWindowContent() in builder
      buildWindowContent();
    }
  );

  console.log('');
  console.log('STEP 2: Setting up menu bar...');

  await window.setMainMenu([
    {
      label: 'File',
      items: [{ label: 'Close', onSelected: () => process.exit(0) }]
    },
    {
      label: 'View',
      items: [{ label: 'Reload', onSelected: () => {} }]
    }
  ]);

  console.log('Menu bar set');
  console.log('');
  console.log('Browser "constructed" - window should show placeholder');
  console.log('LOOK: Can you see placeholder text?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('');
  console.log('STEP 3: "Navigating" to page (mimic changePage → renderPage)...');
  console.log('Setting currentPageBuilder to page content...');

  // Mimic renderPage: set currentPageBuilder
  currentPageBuilder = () => {
    label('=== TEST PAGE ===');
    label('');
    label('This is the page content');
    label('Loaded via "navigation"');
    button('Page Button', () => {});
  };

  console.log('Calling setContent() with updated buildWindowContent()...');

  await window.setContent(() => {
    buildWindowContent();
  });

  console.log('setContent() completed');
  console.log('');
  console.log('Calling show() (mimic first page load)...');

  await window.show();

  console.log('show() completed');
  console.log('');
  console.log('LOOK AT WINDOW:');
  console.log('  Do you see "=== TEST PAGE ===" (correct)?');
  console.log('  Or still placeholder text (BUG!)?');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete - closing');
  process.exit(0);
}

testExactBrowserSequence().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
