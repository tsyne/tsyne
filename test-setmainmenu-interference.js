/**
 * Test: Does setMainMenu() interfere with setContent() updates?
 *
 * Browser sequence:
 * 1. Create window with builder (buildWindowContent - placeholder)
 * 2. Call setupMenuBar() which calls setMainMenu()
 * 3. Later: setContent() to update content
 *
 * Testing if step 2 breaks step 3.
 */

const { App } = require('./dist/src/app');

async function testSetMainMenuInterference() {
  console.log('\n=== TEST: setMainMenu() Interference ===');
  console.log('Testing if setMainMenu() prevents setContent() from updating display');
  console.log('');

  const app = new App({ title: 'Menu Interference Test' }, false); // FALSE = headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button } = require('./dist/src/index');

  console.log('Step 1: Creating window with initial placeholder in builder...');

  const window = app.window(
    { title: 'Menu Test', width: 400, height: 300 },
    (win) => {
      vbox(() => {
        label('INITIAL PLACEHOLDER');
        label('This is the initial content');
      });
    }
  );

  await window.show();
  console.log('Window shown with placeholder');
  console.log('LOOK: Can you see "INITIAL PLACEHOLDER"?');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('');
  console.log('Step 2: Calling setMainMenu() (like Browser.setupMenuBar)...');

  await window.setMainMenu([
    {
      label: 'File',
      items: [
        {
          label: 'Close',
          onSelected: () => process.exit(0)
        }
      ]
    },
    {
      label: 'View',
      items: [
        {
          label: 'Reload',
          onSelected: () => console.log('Reload clicked')
        }
      ]
    }
  ]);

  console.log('setMainMenu() completed - menu bar should be visible');
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('');
  console.log('Step 3: Calling setContent() to replace content...');

  await window.setContent(() => {
    vbox(() => {
      label('REPLACED CONTENT');
      label('This should appear after setMainMenu()');
      label('');
      button('Test Button', () => {});
    });
  });

  console.log('setContent() completed');
  console.log('');
  console.log('LOOK AT WINDOW:');
  console.log('  Do you see "REPLACED CONTENT" (correct)?');
  console.log('  Or still "INITIAL PLACEHOLDER" (BUG!)?');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('');
  console.log('Test complete - closing');
  process.exit(0);
}

testSetMainMenuInterference().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
