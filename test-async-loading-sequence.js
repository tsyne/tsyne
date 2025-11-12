/**
 * Test: Async page loading sequence with delays
 *
 * Browser does:
 * 1. Constructor: window + setMainMenu (sync)
 * 2. changePage() starts async fetch/parse
 * 3. During async operations, currentPageBuilder is NULL
 * 4. After async completes, set currentPageBuilder
 * 5. Call setContent() then show()
 *
 * Testing if async delays cause visual update issues
 */

const { App } = require('./dist/src/app');

async function testAsyncLoadingSequence() {
  console.log('\n=== TEST: Async Loading Sequence with Delays ===');
  console.log('Simulating Browser\'s async fetch → parse → render flow');
  console.log('');

  const app = new App({ title: 'Async Loading Test' }, false); // headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button, hbox, entry, border, scroll } = require('./dist/src/index');

  let currentPageBuilder = null;

  function buildWindowContent() {
    console.log('[buildWindowContent] Called - currentPageBuilder:', currentPageBuilder !== null ? 'SET' : 'NULL');

    border({
      top: () => {
        hbox(() => {
          button('File', () => {});
          entry('url', 'http://localhost');
          button('Go', () => {});
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

  console.log('STEP 1: Create window (currentPageBuilder = NULL)...');
  const window = app.window(
    { title: 'Async Loading Test', width: 600, height: 400 },
    (win) => {
      buildWindowContent();
    }
  );

  console.log('STEP 2: Set menu bar...');
  await window.setMainMenu([
    { label: 'File', items: [{ label: 'Close', onSelected: () => process.exit(0) }] }
  ]);

  console.log('Browser constructed - window exists but not shown yet');
  console.log('');

  // Simulate user navigation
  console.log('STEP 3: User navigates to page - START async loading...');
  console.log('(Simulating fetch + parse with delays)');

  // Simulate async fetch delay
  console.log('  - Fetching URL...');
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('  - Parsing content...');
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('  - Building page widgets...');
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('  - Async loading complete!');
  console.log('');

  console.log('STEP 4: Set currentPageBuilder after async operations...');
  currentPageBuilder = () => {
    label('=== LOADED PAGE ===');
    label('');
    label('This page was loaded asynchronously');
    label('After fetch → parse → delay');
    button('Page Button', () => {});
  };

  console.log('STEP 5: Call setContent() with buildWindowContent()...');
  await window.setContent(() => {
    buildWindowContent();
  });

  console.log('setContent() completed');
  console.log('');

  console.log('STEP 6: Call show() (first page load)...');
  await window.show();

  console.log('show() completed');
  console.log('');
  console.log('LOOK AT WINDOW:');
  console.log('  Do you see "=== LOADED PAGE ===" (correct)?');
  console.log('  Or still placeholder (BUG!)?');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete');
  process.exit(0);
}

testAsyncLoadingSequence().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
