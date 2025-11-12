/**
 * Test to reproduce: Content provided in builder, then replaced via setContent()
 *
 * Hypothesis: When window builder provides content SYNCHRONOUSLY,
 * later calls to setContent() don't update the VISUAL display in headed mode.
 *
 * This mimics exactly what the Browser does now.
 */

const { App } = require('./dist/src/app');

async function testSyncBuilderThenSetContent() {
  console.log('\n=== TEST: Sync Builder Content → setContent() Replacement ===');
  console.log('This mimics the Browser pattern exactly');
  console.log('');

  const app = new App({ title: 'Sync Builder Test' }, false); // FALSE = headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button } = require('./dist/src/index');

  console.log('Creating window with SYNCHRONOUS content in builder...');

  // This is what Browser does now: call builder function in constructor
  const window = app.window(
    { title: 'Sync Builder Test', width: 400, height: 300 },
    (win) => {
      // Content provided SYNCHRONOUSLY in builder (like Browser.buildWindowContent())
      vbox(() => {
        label('INITIAL CONTENT FROM BUILDER');
        label('');
        label('This was set synchronously during window creation');
      });
    }
  );

  await window.show();
  console.log('Window shown with INITIAL content from builder');
  console.log('LOOK: Can you see "INITIAL CONTENT FROM BUILDER"?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Now replace content using setContent() (like Browser.renderPage() does)
  console.log('');
  console.log('Now calling setContent() to REPLACE content...');
  await window.setContent(() => {
    vbox(() => {
      label('REPLACED CONTENT VIA setContent()');
      label('');
      label('This should appear now');
      button('New Button', () => {});
    });
  });

  console.log('setContent() completed');
  console.log('LOOK: Do you see "REPLACED CONTENT VIA setContent()"?');
  console.log('Or do you still see "INITIAL CONTENT FROM BUILDER"?');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete - closing');
  process.exit(0);
}

testSyncBuilderThenSetContent().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
