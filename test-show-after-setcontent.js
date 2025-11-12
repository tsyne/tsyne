/**
 * Test: Does calling show() AFTER setContent() break visual updates?
 *
 * Browser does: builder → setContent() → show()
 * Simple test does: builder → show() → setContent()
 *
 * This tests if show() after setContent() is the problem.
 */

const { App } = require('./dist/src/app');

async function testShowAfterSetContent() {
  console.log('\n=== TEST: show() AFTER setContent() ===');
  console.log('Testing if show() after setContent() prevents visual update');
  console.log('');

  const app = new App({ title: 'Show After SetContent Test' }, false); // FALSE = headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button } = require('./dist/src/index');

  console.log('Creating window with initial content in builder...');

  const window = app.window(
    { title: 'Show After Test', width: 400, height: 300 },
    (win) => {
      vbox(() => {
        label('INITIAL PLACEHOLDER');
        label('This is the initial content');
      });
    }
  );

  console.log('Window created (not shown yet)');
  console.log('');
  console.log('Now calling setContent() to replace content...');

  await window.setContent(() => {
    vbox(() => {
      label('REPLACED CONTENT');
      label('This was set via setContent()');
      label('BEFORE show() was called');
      button('Test Button', () => {});
    });
  });

  console.log('setContent() completed');
  console.log('');
  console.log('NOW calling show() for the first time...');

  await window.show();

  console.log('show() completed');
  console.log('');
  console.log('LOOK AT WINDOW:');
  console.log('  Do you see "REPLACED CONTENT" (correct)?');
  console.log('  Or "INITIAL PLACEHOLDER" (wrong)?');
  console.log('');
  console.log('This tests if show() displays the setContent() result');
  console.log('or if it displays the builder content');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete - closing');
  process.exit(0);
}

testShowAfterSetContent().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
