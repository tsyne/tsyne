/**
 * Test: Dual execution with context switching
 *
 * Browser does:
 * 1. Discovery pass - execute page code once with discovery context
 * 2. Render pass - switch global context, execute page code again
 *
 * Testing if this dual execution + context switching breaks visual updates
 */

const { App } = require('./dist/src/app');

async function testDualExecution() {
  console.log('\n=== TEST: Dual Execution with Context Switching ===');
  console.log('Mimicking Browser resource discovery pattern');
  console.log('');

  const app = new App({ title: 'Dual Execution Test' }, false); // headed mode
  let { __setGlobalContext } = require('./dist/src/index');
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

  console.log('STEP 1: Create window with placeholder...');
  const window = app.window(
    { title: 'Dual Execution Test', width: 600, height: 400 },
    (win) => {
      buildWindowContent();
    }
  );

  // Set menu WITHOUT await (like Browser)
  window.setMainMenu([
    { label: 'File', items: [{ label: 'Close', onSelected: () => process.exit(0) }] }
  ]);

  console.log('');
  console.log('STEP 2: Simulate page loading with dual execution...');

  // Page code to execute
  const pageCode = `
    const { vbox, label, button } = tsyne;
    vbox(() => {
      label('=== DUAL EXECUTION PAGE ===');
      label('');
      label('This page was loaded with dual execution');
      button('Test Button', () => {});
    });
  `;

  //=== DISCOVERY PASS ===
  console.log('[Discovery] Starting discovery pass...');
  const { ResourceDiscoveryContext, createDiscoveryAPI } = require('./dist/src/resource-discovery');
  const discoveryContext = new ResourceDiscoveryContext();
  const discoveryTsyne = createDiscoveryAPI(discoveryContext);

  try {
    const discoveryFunction = new Function('tsyne', pageCode);
    discoveryFunction(discoveryTsyne);
  } catch (error) {
    console.log('[Discovery] Error (non-fatal):', error);
  }
  console.log('[Discovery] Complete');

  //=== RENDER PASS ===
  console.log('[Render] Starting render pass WITHOUT context switch...');

  // FIX: Don't create a new Context! Just use the existing one
  // The bug was: new Context has empty windowStack, so widgets can't find their parent window
  const appContext = app.ctx;

  console.log('[Render] Using EXISTING context (no switch)...');
  // No need to switch context - just use the existing one
  // If we had resources, we could update appContext's resourceMap here

  const tsyne = require('./dist/src/index');

  console.log('[Render] Creating currentPageBuilder...');
  currentPageBuilder = () => {
    console.log('[Render] Executing page builder with new context...');
    const pageFunction = new Function('tsyne', pageCode);
    pageFunction(tsyne);
    console.log('[Render] Page builder executed');
  };

  console.log('[Render] Calling setContent()...');
  await window.setContent(() => {
    console.log('[Render] Inside setContent - calling buildWindowContent()');
    buildWindowContent();
    console.log('[Render] buildWindowContent() done');
  });

  console.log('[Render] Calling show()...');
  await window.show();
  console.log('[Render] Complete');
  console.log('');
  console.log('CRITICAL: Look at window!');
  console.log('  Do you see "=== DUAL EXECUTION PAGE ===" (correct)?');
  console.log('  Or placeholder (BUG - dual execution broke it!)?');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete');
  process.exit(0);
}

testDualExecution().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
