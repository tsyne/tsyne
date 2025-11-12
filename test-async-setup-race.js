/**
 * Test: Async setup function called without await in constructor
 *
 * Hypothesis: Browser calls setupMenuBar() async without await in constructor.
 * Then changePage() is called immediately, which does setContent() + show().
 * Maybe there's a race condition with setMainMenu() happening async?
 */

const { App } = require('./dist/src/app');

async function testAsyncSetupRace() {
  console.log('\n=== TEST: Async Setup Race Condition ===');
  console.log('Mimicking Browser pattern: async setup without await');
  console.log('');

  const app = new App({ title: 'Async Setup Test' }, false); // headed mode
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

  // Async setup function that calls setMainMenu()
  async function asyncSetup(window) {
    console.log('[asyncSetup] Starting...');

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

    console.log('[asyncSetup] Completed');
  }

  console.log('STEP 1: Create window (currentPageBuilder = NULL)...');
  const window = app.window(
    { title: 'Async Setup Test', width: 600, height: 400 },
    (win) => {
      buildWindowContent();
    }
  );

  console.log('STEP 2: Call asyncSetup() WITHOUT await (mimics Browser constructor)...');
  asyncSetup(window);  // NO AWAIT - runs in background!

  console.log('STEP 3: Immediately proceed (asyncSetup still running in background)...');
  console.log('');

  console.log('STEP 4: Simulate user navigation - set currentPageBuilder...');
  currentPageBuilder = () => {
    label('=== LOADED PAGE ===');
    label('');
    label('This is the page content');
    label('asyncSetup() might still be running!');
    button('Page Button', () => {});
  };

  console.log('STEP 5: Call setContent() while asyncSetup() may still be running...');
  await window.setContent(() => {
    buildWindowContent();
  });

  console.log('setContent() completed');
  console.log('');

  console.log('STEP 6: Call show()...');
  await window.show();

  console.log('show() completed');
  console.log('');
  console.log('CRITICAL: Look at window NOW!');
  console.log('  Do you see "=== LOADED PAGE ===" (correct)?');
  console.log('  Or still placeholder (BUG - race condition!)?');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete');
  process.exit(0);
}

testAsyncSetupRace().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
