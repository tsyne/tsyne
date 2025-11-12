/**
 * Test: Same builder function called in constructor AND setContent()
 *
 * This mimics exactly what Browser does:
 * - Constructor builder calls buildContent() with state=NULL
 * - Later setContent() calls buildContent() with state=SET
 *
 * Testing if this pattern fails to update visually
 */

const { App } = require('./dist/src/app');

async function testSameBuilderTwice() {
  console.log('\n=== TEST: Same Builder Function Called Twice ===');
  console.log('');

  const app = new App({ title: 'Same Builder Test' }, false);
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button, hbox, entry, separator, border, scroll } = require('./dist/src/index');

  let currentPageBuilder = null;

  // This mimics Browser.buildWindowContent()
  function buildContent() {
    console.log('[buildContent] Called - currentPageBuilder:', currentPageBuilder !== null ? 'SET' : 'NULL');

    border({
      top: () => {
        hbox(() => {
          button('File', () => {});
          button('View', () => {});
          entry('url', 'http://localhost');
          button('Go', () => {});
        });
      },
      center: () => {
        scroll(() => {
          vbox(() => {
            if (currentPageBuilder !== null) {
              console.log('[buildContent] Rendering PAGE content');
              currentPageBuilder();
            } else {
              console.log('[buildContent] Rendering PLACEHOLDER');
              label('Tsyne Browser');
              label('');
              label('Enter a URL in the address bar and click Go to navigate.');
            }
          });
        });
      }
    });
  }

  console.log('Step 1: Create window with buildContent() in constructor...');
  console.log('(currentPageBuilder is NULL)');

  const window = app.window(
    { title: 'Test', width: 600, height: 400 },
    (win) => {
      // Mimic Browser constructor - call buildContent() directly
      buildContent();
    }
  );

  console.log('Step 2: Call setMainMenu()...');
  await window.setMainMenu([
    { label: 'File', items: [{ label: 'Close', onSelected: () => {} }] },
    { label: 'View', items: [{ label: 'Reload', onSelected: () => {} }] }
  ]);

  console.log('Step 3: Call show()...');
  await window.show();

  console.log('Window shown - should display PLACEHOLDER');
  console.log('LOOK: Do you see chrome at top and placeholder in center?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('');
  console.log('Step 4: Set currentPageBuilder to page content...');
  currentPageBuilder = () => {
    label('=== TEST PAGE ===');
    label('');
    label('This is the page content');
    button('Page Button', () => {});
  };

  console.log('Step 5: Call setContent() with SAME buildContent() function...');
  await window.setContent(() => {
    buildContent();
  });

  console.log('setContent() completed');
  console.log('');
  console.log('CRITICAL: Look at window NOW!');
  console.log('  Do you see "=== TEST PAGE ===" (correct)?');
  console.log('  Or still placeholder (BUG - this is the Browser issue!)?');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete');
  process.exit(0);
}

testSameBuilderTwice().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
