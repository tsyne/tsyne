/**
 * Test: show() first, THEN setContent() - does visual update?
 *
 * Testing if show() displays a snapshot that setContent() can't update
 */

const { App } = require('./dist/src/app');

async function testShowBeforeSetContent() {
  console.log('\n=== TEST: show() BEFORE setContent() ===');
  console.log('');

  const app = new App({ title: 'Show Before Test' }, false);
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button } = require('./dist/src/index');

  console.log('Step 1: Create window with placeholder in builder...');
  const window = app.window(
    { title: 'Test', width: 400, height: 300 },
    (win) => {
      vbox(() => {
        label('PLACEHOLDER CONTENT');
        label('This is initial');
      });
    }
  );

  console.log('Step 2: Call show() BEFORE any setContent()...');
  await window.show();

  console.log('Window shown - should display PLACEHOLDER');
  console.log('LOOK: Do you see "PLACEHOLDER CONTENT"?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('');
  console.log('Step 3: NOW call setContent() to replace content...');
  await window.setContent(() => {
    vbox(() => {
      label('REPLACED CONTENT');
      label('Set AFTER show() was called');
      button('Button', () => {});
    });
  });

  console.log('setContent() completed');
  console.log('LOOK: Do you see "REPLACED CONTENT" now?');
  console.log('Or still "PLACEHOLDER CONTENT" (BUG!)?');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete');
  process.exit(0);
}

testShowBeforeSetContent().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
