/**
 * Test: Does setMainMenu() trigger window to show?
 */

const { App } = require('./dist/src/app');

async function testSetMainMenuShowsWindow() {
  console.log('\n=== TEST: Does setMainMenu() Show Window? ===');
  console.log('');

  const app = new App({ title: 'Menu Shows Window Test' }, false); // headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label } = require('./dist/src/index');

  console.log('Creating window...');
  const window = app.window(
    { title: 'Test', width: 400, height: 300 },
    (win) => {
      vbox(() => {
        label('INITIAL CONTENT');
      });
    }
  );

  console.log('Window created (no show() called yet)');
  console.log('LOOK: Is there a window visible? (should be NO)');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('');
  console.log('Now calling setMainMenu()...');
  await window.setMainMenu([
    { label: 'File', items: [{ label: 'Close', onSelected: () => {} }] }
  ]);

  console.log('setMainMenu() completed');
  console.log('LOOK: Is there a window visible NOW? (testing if setMainMenu shows it)');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete');
  process.exit(0);
}

testSetMainMenuShowsWindow().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
