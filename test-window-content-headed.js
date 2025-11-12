/**
 * HEADED test for window content replacement
 * This will show actual windows so we can see if content is visible or black
 */

const { App } = require('./dist/src/app');

async function test1_SimpleReplacement() {
  console.log('\n=== TEST 1: Simple Placeholder → Form ===');

  const app = new App({ title: 'Content Test 1' }, false); // FALSE = headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, label, entry, button, separator } = require('./dist/src/index');

  // Create window with initial placeholder
  const window = app.window(
    { title: 'Test 1: Initial Placeholder', width: 400, height: 300 },
    (win) => {
      win.setContent(() => {
        vbox(() => {
          label('Welcome!');
          label('Please wait while content loads...');
        });
      });
    }
  );

  await window.show();
  console.log('Window shown with PLACEHOLDER content');
  console.log('LOOK AT WINDOW: Do you see "Welcome!" and "Please wait..." text?');
  console.log('Or is it BLACK?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Replace with form
  await window.setContent(() => {
    vbox(() => {
      label('User Registration Form');
      separator();
      label('Name:');
      entry('name-entry', 'Enter your name');
      label('Email:');
      entry('email-entry', 'Enter your email');
      button('Submit', () => {});
      button('Cancel', () => {});
    });
  });

  console.log('Content REPLACED with FORM');
  console.log('LOOK AT WINDOW: Do you see the registration form?');
  console.log('Or is it still showing placeholder? Or BLACK?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Test 1 complete - window will close');
  process.exit(0);
}

async function test2_BrowserPattern() {
  console.log('\n=== TEST 2: Browser Pattern (Chrome + Content) ===');

  const app = new App({ title: 'Content Test 2' }, false); // FALSE = headed mode
  const { __setGlobalContext } = require('./dist/src/index');
  __setGlobalContext(app, app.ctx);

  const { vbox, hbox, label, entry, button, separator, border } = require('./dist/src/index');

  let currentPageBuilder = null;

  // Create window with browser-like structure
  const window = app.window(
    { title: 'Test 2: Browser Pattern', width: 600, height: 400 },
    (win) => {
      win.setContent(() => {
        border({
          top: () => {
            vbox(() => {
              hbox(() => {
                button('File', () => {});
                button('View', () => {});
              });
              separator();
              hbox(() => {
                button('←', () => {});
                button('→', () => {});
                entry('url-bar', 'http://localhost:3000');
                button('Go', () => {});
              });
            });
          },
          center: () => {
            vbox(() => {
              if (currentPageBuilder) {
                currentPageBuilder();
              } else {
                label('Tsyne Browser');
                label('');
                label('Enter a URL in the address bar and click Go to navigate.');
              }
            });
          }
        });
      });
    }
  );

  await window.show();
  console.log('Window shown with CHROME + PLACEHOLDER');
  console.log('LOOK AT WINDOW:');
  console.log('  - Top: Do you see File, View buttons and address bar?');
  console.log('  - Center: Do you see "Tsyne Browser" placeholder text?');
  console.log('  - Or is it all BLACK?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Navigate to "page"
  currentPageBuilder = () => {
    label('Contact Us');
    separator();
    label('Name:');
    entry('contact-name', '');
    label('Email:');
    entry('contact-email', '');
    button('Send Message', () => {});
  };

  await window.setContent(() => {
    border({
      top: () => {
        vbox(() => {
          hbox(() => {
            button('File', () => {});
            button('View', () => {});
          });
          separator();
          hbox(() => {
            button('←', () => {});
            button('→', () => {});
            entry('url-bar', 'http://localhost:3000/contact');
            button('Go', () => {});
          });
        });
      },
      center: () => {
        vbox(() => {
          if (currentPageBuilder) {
            currentPageBuilder();
          } else {
            label('Enter a URL in the address bar and click Go to navigate.');
          }
        });
      }
    });
  });

  console.log('Content REPLACED - navigated to "page"');
  console.log('LOOK AT WINDOW:');
  console.log('  - Top: Chrome should STILL be there');
  console.log('  - Center: Should show "Contact Us" form, NOT placeholder');
  console.log('  - What do you actually see?');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Test 2 complete - window will close');
  process.exit(0);
}

// Run test based on command line arg
const testNum = process.argv[2] || '1';

if (testNum === '1') {
  test1_SimpleReplacement().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} else if (testNum === '2') {
  test2_BrowserPattern().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} else {
  console.log('Usage: node test-window-content-headed.js [1|2]');
  console.log('  1 = Simple replacement test');
  console.log('  2 = Browser pattern test');
  process.exit(1);
}
