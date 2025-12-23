/**
 * Test: Window Content Replacement
 *
 * This test verifies that Fyne/bridge properly supports replacing complex,
 * heterogeneous widget structures with completely different ones.
 *
 * This is critical for browser functionality where we need to:
 * - Show initial browser chrome with placeholder text
 * - Replace with complex form pages (entries, buttons, checkboxes)
 * - Replace with data-heavy pages (tables, lists)
 * - Replace with different layouts entirely
 *
 * The bug we're testing against: old widgets accumulated in bridge maps,
 * causing both memory leaks and visual rendering to show wrong content.
 */

import { App, resolveTransport } from '../app';
import { Window } from '../window';

describe('Window Content Replacement', () => {
  let app: App;
  let window: Window;

  beforeEach(() => {
    // Create app in test mode
    app = new App(resolveTransport(), { title: 'Content Replacement Test' }, true);

    // Set global context
    const { __setGlobalContext } = require('../index');
    __setGlobalContext(app, (app as any).ctx);
  });

  afterEach(async () => {
    // Clean up - force shutdown to clean up all resources
    if (app) {
      const bridge = app.getBridge() as any;
      if (bridge) {
        // Trigger graceful quit (doesn't return a promise)
        try {
          bridge.quit?.();
        } catch (err) {
          // Quit may fail, that's OK
        }

        // Immediately shutdown (removes listeners, clears handlers, kills process)
        try {
          bridge.shutdown?.();
        } catch (err) {
          // Shutdown may fail, that's OK
        }
      }

      // Brief wait for process cleanup
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  // Set timeout for all tests in this suite to 60 seconds
  jest.setTimeout(60000);

  test('should replace simple placeholder with complex form', async () => {
    const { vbox, label, entry, button, checkbox, separator } = require('../index');
    const bridge = app.getBridge();

    // Initial: simple placeholder (like browser "Enter a URL..." state)
    window = app.window(
      { title: 'Test Window', width: 400, height: 300 },
      (win) => {
        win.setContent(() => {
          vbox(() => {
            label('Welcome!');
            label('Please wait while content loads...');
          });
        });
      }
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify placeholder exists
    let response = await bridge.send('getAllWidgets', {}) as any;
    let allWidgets = response.widgets;
    expect(allWidgets.filter((w: any) => w.type === 'label').length).toBe(2);
    expect(allWidgets.filter((w: any) => w.type === 'entry').length).toBe(0);
    expect(allWidgets.filter((w: any) => w.type === 'button').length).toBe(0);

    // Replace with: complex form with multiple widget types
    await window.setContent(() => {
      vbox(() => {
        label('User Registration Form');
        separator();
        label('Name:');
        entry('name-entry', 'Enter your name');
        label('Email:');
        entry('email-entry', 'Enter your email');
        label('Password:');
        entry('password-entry', 'Enter password');
        checkbox('terms-check', 'I agree to terms', false, () => {});
        button('Submit').onClick(() => {});
        button('Cancel').onClick(() => {});
      });
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify: old placeholder gone, new form present
    response = await bridge.send('getAllWidgets', {}) as any;
    allWidgets = response.widgets;
    const labels = allWidgets.filter((w: any) => w.type === 'label');
    const entries = allWidgets.filter((w: any) => w.type === 'entry');
    const buttons = allWidgets.filter((w: any) => w.type === 'button');
    const checkboxes = allWidgets.filter((w: any) => w.type === 'checkbox');

    // Old placeholder labels should be gone
    expect(labels.find((l: any) => l.text === 'Welcome!')).toBeUndefined();
    expect(labels.find((l: any) => l.text === 'Please wait while content loads...')).toBeUndefined();

    // New form widgets should exist
    expect(labels.find((l: any) => l.text === 'User Registration Form')).toBeDefined();
    expect(entries.length).toBe(3);
    expect(buttons.length).toBe(2);
    expect(checkboxes.length).toBe(1);

// console.log('✓ Placeholder replaced with complex form - old widgets removed');
  });

  test('should replace form with data table', async () => {
    const { vbox, label, entry, button, table } = require('../index');
    const bridge = app.getBridge();

    // Initial: form for data entry
    window = app.window(
      { title: 'Test Window', width: 400, height: 300 },
      (win) => {
        win.setContent(() => {
          vbox(() => {
            label('Add New User');
            entry('name-input', 'Name');
            entry('role-input', 'Role');
            button('Add User').onClick(() => {});
          });
        });
      }
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify form exists
    let response = await bridge.send('getAllWidgets', {}) as any;
    let allWidgets = response.widgets;
    expect(allWidgets.filter((w: any) => w.type === 'entry').length).toBe(2);
    expect(allWidgets.filter((w: any) => w.type === 'button').length).toBe(1);
    expect(allWidgets.filter((w: any) => w.type === 'table').length).toBe(0);

    // Replace with: table showing data
    await window.setContent(() => {
      vbox(() => {
        label('User Directory');
        table(['Name', 'Role'], [
          ['John Doe', 'Admin'],
          ['Jane Smith', 'User'],
          ['Bob Johnson', 'Editor']
        ]);
        button('Back to Form').onClick(() => {});
      });
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify: form gone, table present
    response = await bridge.send('getAllWidgets', {}) as any;
    allWidgets = response.widgets;
    const labels = allWidgets.filter((w: any) => w.type === 'label');
    const entries = allWidgets.filter((w: any) => w.type === 'entry');
    const tables = allWidgets.filter((w: any) => w.type === 'table');
    const buttons = allWidgets.filter((w: any) => w.type === 'button');

    // Old form should be gone
    expect(labels.find((l: any) => l.text === 'Add New User')).toBeUndefined();
    expect(entries.length).toBe(0);

    // New table view should exist
    expect(labels.find((l: any) => l.text === 'User Directory')).toBeDefined();
    expect(tables.length).toBe(1);
    expect(buttons.find((b: any) => b.text === 'Back to Form')).toBeDefined();

// console.log('✓ Form replaced with table - old form widgets removed');
  });

  test('should replace table with different complex layout', async () => {
    const { vbox, hbox, label, table, button, checkbox, separator } = require('../index');
    const bridge = app.getBridge();

    // Initial: data table
    window = app.window(
      { title: 'Test Window', width: 400, height: 300 },
      (win) => {
        win.setContent(() => {
          vbox(() => {
            label('Sales Report');
            table(['Quarter', 'Revenue'], [
              ['Q1', '$10000'],
              ['Q2', '$12000'],
              ['Q3', '$15000']
            ]);
          });
        });
      }
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // Replace with: settings page (completely different widget types/layout)
    await window.setContent(() => {
      vbox(() => {
        label('Application Settings');
        separator();
        hbox(() => {
          label('Dark Mode:');
          checkbox('dark-mode', '', false, () => {});
        });
        hbox(() => {
          label('Notifications:');
          checkbox('notifications', '', true, () => {});
        });
        hbox(() => {
          label('Auto Save:');
          checkbox('auto-save', '', true, () => {});
        });
        separator();
        hbox(() => {
          button('Save Settings').onClick(() => {});
          button('Reset to Defaults').onClick(() => {});
        });
      });
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify: table gone, settings page present
    const response = await bridge.send('getAllWidgets', {}) as any;
    const allWidgets = response.widgets;
    const labels = allWidgets.filter((w: any) => w.type === 'label');
    const tables = allWidgets.filter((w: any) => w.type === 'table');
    const checkboxes = allWidgets.filter((w: any) => w.type === 'checkbox');
    const buttons = allWidgets.filter((w: any) => w.type === 'button');

    // Old table should be gone
    expect(labels.find((l: any) => l.text === 'Sales Report')).toBeUndefined();
    expect(tables.length).toBe(0);

    // New settings page should exist
    expect(labels.find((l: any) => l.text === 'Application Settings')).toBeDefined();
    expect(checkboxes.length).toBe(3);
    expect(buttons.length).toBe(2);

// console.log('✓ Table replaced with settings layout - old table removed');
  });

  test('should handle browser-like pattern: chrome + placeholder → chrome + form → chrome + results', async () => {
    const { vbox, hbox, label, button, entry, border, separator, table } = require('../index');
    const bridge = app.getBridge();

    // This test simulates the EXACT browser pattern that was failing:
    // 1. Browser chrome (menu, address bar, etc.) + "Enter a URL..." placeholder
    // 2. Navigate to form page → chrome stays, content area changes to form
    // 3. Submit form → chrome stays, content area changes to results

    let currentPageBuilder: (() => void) | null = null;

    // Initial: Browser chrome with placeholder
    window = app.window(
      { title: 'Browser Test', width: 800, height: 600 },
      (win) => {
        win.setContent(() => {
          border({
            top: () => {
              vbox(() => {
                // Menu bar
                hbox(() => {
                  button('File').onClick(() => {});
                  button('View').onClick(() => {});
                  button('History').onClick(() => {});
                });
                separator();
                // Address bar
                hbox(() => {
                  button('←').onClick(() => {});
                  button('→').onClick(() => {});
                  entry('url-bar', 'http://localhost:3000');
                  button('Go').onClick(() => {});
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

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify initial state: chrome + placeholder
    let response = await bridge.send('getAllWidgets', {}) as any;
    let allWidgets = response.widgets;
    let labels = allWidgets.filter((w: any) => w.type === 'label');
    expect(labels.find((l: any) => l.text === 'Enter a URL in the address bar and click Go to navigate.')).toBeDefined();
    expect(allWidgets.filter((w: any) => w.type === 'entry').length).toBe(1); // Just URL bar
// console.log('✓ Initial state: browser chrome + placeholder');

    // Navigate to form page
    currentPageBuilder = () => {
      label('Contact Us');
      separator();
      label('Name:');
      entry('contact-name', '');
      label('Email:');
      entry('contact-email', '');
      label('Message:');
      entry('contact-message', '');
      button('Send Message').onClick(() => {});
    };

    await window.setContent(() => {
      border({
        top: () => {
          vbox(() => {
            hbox(() => {
              button('File').onClick(() => {});
              button('View').onClick(() => {});
              button('History').onClick(() => {});
            });
            separator();
            hbox(() => {
              button('←').onClick(() => {});
              button('→').onClick(() => {});
              entry('url-bar', 'http://localhost:3000/contact');
              button('Go').onClick(() => {});
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

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify: chrome still there, placeholder gone, form present
    response = await bridge.send('getAllWidgets', {}) as any;
    allWidgets = response.widgets;
    labels = allWidgets.filter((w: any) => w.type === 'label');
    const entries = allWidgets.filter((w: any) => w.type === 'entry');
    const buttons = allWidgets.filter((w: any) => w.type === 'button');

    // Placeholder should be gone
    expect(labels.find((l: any) => l.text === 'Enter a URL in the address bar and click Go to navigate.')).toBeUndefined();

    // Chrome should still be there
    expect(buttons.find((b: any) => b.text === 'File')).toBeDefined();
    expect(buttons.find((b: any) => b.text === 'Go')).toBeDefined();

    // Form should be present (URL bar + 3 form entries = 4 total)
    expect(labels.find((l: any) => l.text === 'Contact Us')).toBeDefined();
    expect(entries.length).toBe(4);
    expect(buttons.find((b: any) => b.text === 'Send Message')).toBeDefined();

// console.log('✓ Form page loaded: chrome preserved, placeholder replaced with form');

    // Navigate to results page
    currentPageBuilder = () => {
      label('Message Sent Successfully!');
      separator();
      label('Your submissions:');
      table(['Date', 'Type', 'Status'], [
        ['2025-11-12', 'Contact Form', 'Delivered'],
        ['2025-11-10', 'Feedback', 'Delivered']
      ]);
      button('Send Another Message').onClick(() => {});
    };

    await window.setContent(() => {
      border({
        top: () => {
          vbox(() => {
            hbox(() => {
              button('File').onClick(() => {});
              button('View').onClick(() => {});
              button('History').onClick(() => {});
            });
            separator();
            hbox(() => {
              button('←').onClick(() => {});
              button('→').onClick(() => {});
              entry('url-bar', 'http://localhost:3000/contact/success');
              button('Go').onClick(() => {});
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

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify: chrome still there, form gone, results present
    response = await bridge.send('getAllWidgets', {}) as any;
    allWidgets = response.widgets;
    labels = allWidgets.filter((w: any) => w.type === 'label');
    const finalEntries = allWidgets.filter((w: any) => w.type === 'entry');
    const finalButtons = allWidgets.filter((w: any) => w.type === 'button');
    const tables = allWidgets.filter((w: any) => w.type === 'table');

    // Form should be gone
    expect(labels.find((l: any) => l.text === 'Contact Us')).toBeUndefined();
    expect(labels.find((l: any) => l.text === 'Name:')).toBeUndefined();

    // Chrome should still be there
    expect(finalButtons.find((b: any) => b.text === 'File')).toBeDefined();
    expect(finalButtons.find((b: any) => b.text === 'Go')).toBeDefined();

    // Results should be present (only URL bar entry now)
    expect(labels.find((l: any) => l.text === 'Message Sent Successfully!')).toBeDefined();
    expect(finalEntries.length).toBe(1); // Just URL bar
    expect(tables.length).toBe(1);
    expect(finalButtons.find((b: any) => b.text === 'Send Another Message')).toBeDefined();

// console.log('✓ Results page loaded: chrome preserved, form replaced with results table');
// console.log('✓ Full browser navigation cycle complete - all old widgets properly removed');
  });
});
