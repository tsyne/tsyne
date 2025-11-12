/**
 * Test: Window auto-shows in headed mode, then setContent()
 *
 * Hypothesis: In headed mode, window auto-shows with builder content.
 * Then setContent() updates widget tree but visual display doesn't refresh
 * because show() was not called again.
 *
 * This is what happens in Browser when testMode=false.
 */

const { App } = require('./dist/src/app');

async function testAutoShowThenSetContent() {
  console.log('\n=== TEST: Auto-show + setContent() Without Manual show() ===');
  console.log('Testing if auto-shown window fails to update visually');
  console.log('');

  const app = new App({ title: 'Auto Show Test' }, false); // FALSE = headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button } = require('./dist/src/index');

  console.log('Creating window with placeholder in builder...');

  const window = app.window(
    { title: 'Auto Show Test', width: 400, height: 300 },
    (win) => {
      vbox(() => {
        label('PLACEHOLDER CONTENT');
        label('This is initial content');
        label('Window should auto-show this in headed mode');
      });
    }
  );

  console.log('Window created');
  console.log('In headed mode, window should auto-show now');
  console.log('');
  console.log('LOOK: Can you see the window with placeholder?');
  console.log('(If yes, window auto-showed)');

  // Wait for auto-show
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('');
  console.log('Now calling setContent() to replace content...');
  console.log('BUT NOT calling show() afterwards');

  await window.setContent(() => {
    vbox(() => {
      label('REPLACED CONTENT');
      label('This was set via setContent()');
      label('WITHOUT calling show() again');
      button('Test Button', () => {});
    });
  });

  console.log('setContent() completed');
  console.log('');
  console.log('LOOK AT WINDOW NOW:');
  console.log('  Do you see "REPLACED CONTENT" (correct)?');
  console.log('  Or still "PLACEHOLDER CONTENT" (BUG - this is the Browser issue!)?');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete - closing');
  process.exit(0);
}

testAutoShowThenSetContent().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
