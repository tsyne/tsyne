/**
 * Test to REPRODUCE the black screen bug
 *
 * Hypothesis: Creating a window with an EMPTY builder callback, then calling
 * setContent() later, results in a black screen even though setContent() is called.
 *
 * This is what the Browser constructor was doing after my "fix".
 */

const { App } = require('./dist/src/app');

async function testEmptyBuilder() {
  console.log('\n=== TEST: Empty Builder → Black Screen? ===');
  console.log('Hypothesis: Window with empty builder will show BLACK even after setContent()');
  console.log('');

  const app = new App({ title: 'Black Screen Test' }, false); // FALSE = headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button } = require('./dist/src/index');

  // Create window with EMPTY builder (like Browser was doing)
  console.log('Creating window with EMPTY builder...');
  const window = app.window(
    { title: 'Empty Builder Test', width: 400, height: 300 },
    (win) => {
      // EMPTY - no content set here
    }
  );

  await window.show();
  console.log('Window shown - should be BLACK now');
  console.log('LOOK: Is the window content area BLACK? (y/n)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Now try to set content
  console.log('Now calling setContent() to add content...');
  await window.setContent(() => {
    vbox(() => {
      label('This is content added AFTER window creation');
      label('');
      label('Can you see this text?');
      label('Or is it still BLACK?');
      button('Test Button', () => {});
    });
  });

  console.log('setContent() completed');
  console.log('LOOK: Do you see the text and button now?');
  console.log('Or is it STILL BLACK?');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Test complete - closing');
  process.exit(0);
}

async function testWithInitialContent() {
  console.log('\n=== CONTROL TEST: Builder WITH Content ===');
  console.log('This should work correctly (not black)');
  console.log('');

  const app = new App({ title: 'Control Test' }, false);
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, button } = require('./dist/src/index');

  // Create window with content in builder
  console.log('Creating window WITH content in builder...');
  const window = app.window(
    { title: 'With Content Test', width: 400, height: 300 },
    (win) => {
      // Content provided in builder
      vbox(() => {
        label('Initial content from builder');
        button('Button 1', () => {});
      });
    }
  );

  await window.show();
  console.log('Window shown with initial content');
  console.log('LOOK: Can you see "Initial content from builder"?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Replace content
  console.log('Now replacing content with setContent()...');
  await window.setContent(() => {
    vbox(() => {
      label('REPLACED content');
      label('This should appear correctly');
      button('Button 2', () => {});
    });
  });

  console.log('setContent() completed');
  console.log('LOOK: Can you see "REPLACED content"?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Test complete - closing');
  process.exit(0);
}

// Run test based on arg
const testType = process.argv[2] || 'empty';

if (testType === 'empty') {
  testEmptyBuilder().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} else if (testType === 'control') {
  testWithInitialContent().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} else {
  console.log('Usage: node test-empty-builder-black-screen.js [empty|control]');
  console.log('  empty   = Test empty builder (should be BLACK)');
  console.log('  control = Test with content in builder (should work)');
  process.exit(1);
}
