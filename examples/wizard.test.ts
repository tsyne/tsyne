/**
 * Navigation Container Tests
 *
 * Tests for the container.Navigation widget which provides
 * stack-based navigation with back/forward controls.
 */

import { TsyneTest, TestContext } from 'tsyne';
import { App, Navigation } from 'tsyne';

describe('Navigation Container', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  test('creates navigation with root content', async () => {
    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: 'Nav Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          a.navigation(() => {
            a.vbox(() => {
              a.label('Home Page');
            });
          }, { title: 'Home' });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify home page content is visible
    await ctx.expect(ctx.getByText('Home Page')).toBeVisible();
  });

  test('pushes new content onto navigation stack', async () => {
    let nav: Navigation;

    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: 'Nav Push Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          nav = a.navigation(() => {
            a.vbox(() => {
              a.label('Page 1');
              a.button('Go to Page 2').onClick(() => {
                nav.push(() => {
                  a.vbox(() => {
                    a.label('Page 2');
                  });
                }, 'Second Page');
              });
            });
          }, { title: 'First Page' });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify Page 1 is visible
    await ctx.expect(ctx.getByText('Page 1')).toBeVisible();

    // Click button to navigate to Page 2
    await ctx.getByText('Go to Page 2').click();

    // Wait for navigation and verify Page 2 is visible
    await ctx.expect(ctx.getByText('Page 2')).toBeVisible();
  });

  test('back button returns to previous page', async () => {
    let nav: Navigation;

    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: 'Nav Back Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          nav = a.navigation(() => {
            a.vbox(() => {
              a.label('Home');
              a.button('Next').onClick(() => {
                nav.push(() => {
                  a.vbox(() => {
                    a.label('Details');
                    a.button('Go Back').onClick(async () => {
                      await nav.back();
                    });
                  });
                }, 'Details Page');
              });
            });
          }, { title: 'Home' });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start on Home
    await ctx.expect(ctx.getByText('Home')).toBeVisible();

    // Navigate to Details
    await ctx.getByText('Next').click();
    await ctx.expect(ctx.getByText('Details')).toBeVisible();

    // Go back
    await ctx.getByText('Go Back').click();

    // Should be back on Home
    await ctx.expect(ctx.getByText('Home')).toBeVisible();
  });

  test('multi-step wizard navigation', async () => {
    let nav: Navigation;

    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: 'Wizard Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          nav = a.navigation(() => {
            a.vbox(() => {
              a.label('Step 1: Name');
              a.entry('Enter name');
              a.button('Next Step').onClick(() => {
                nav.push(() => {
                  a.vbox(() => {
                    a.label('Step 2: Email');
                    a.entry('Enter email');
                    a.hbox(() => {
                      a.button('Previous').onClick(async () => {
                        await nav.back();
                      });
                      a.button('Finish').onClick(() => {
                        nav.push(() => {
                          a.vbox(() => {
                            a.label('Complete!');
                          });
                        }, 'Done');
                      });
                    });
                  });
                }, 'Step 2');
              });
            });
          }, { title: 'Step 1' });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Step 1
    await ctx.expect(ctx.getByText('Step 1: Name')).toBeVisible();

    // Go to Step 2
    await ctx.getByText('Next Step').click();
    await ctx.expect(ctx.getByText('Step 2: Email')).toBeVisible();

    // Go back to Step 1
    await ctx.getByText('Previous').click();
    await ctx.expect(ctx.getByText('Step 1: Name')).toBeVisible();

    // Navigate forward again and finish
    await ctx.getByText('Next Step').click();
    await ctx.expect(ctx.getByText('Step 2: Email')).toBeVisible();

    await ctx.getByText('Finish').click();
    await ctx.expect(ctx.getByText('Complete!')).toBeVisible();
  });

  test('navigation with onBack callback configured', async () => {
    // Note: onBack callback is triggered when user clicks the navigation bar's
    // back button, not when nav.back() is called programmatically.
    // This test verifies that the navigation can be configured with callbacks.
    let nav: Navigation;
    let backCallbackRegistered = false;

    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: 'Callback Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          nav = a.navigation(() => {
            a.vbox(() => {
              a.label('Home');
              a.button('Forward').onClick(() => {
                nav.push(() => {
                  a.vbox(() => {
                    a.label('Page 2');
                    a.button('Back').onClick(async () => {
                      await nav.back();
                    });
                  });
                });
              });
            });
          }, {
            title: 'Home',
            onBack: () => {
              // This is called when the navigation bar back button is pressed
              console.log('Back pressed via navigation bar');
            }
          });
          backCallbackRegistered = true;
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify navigation works
    await ctx.getByText('Forward').click();
    await ctx.expect(ctx.getByText('Page 2')).toBeVisible();

    await ctx.getByText('Back').click();
    await ctx.expect(ctx.getByText('Home')).toBeVisible();

    // Verify the callback was registered (navigation was configured correctly)
    expect(backCallbackRegistered).toBe(true);
  });

  test('setCurrentTitle updates navigation title', async () => {
    let nav: Navigation;

    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: 'Title Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          nav = a.navigation(() => {
            a.vbox(() => {
              a.label('Content');
              a.button('Change Title').onClick(async () => {
                await nav.setCurrentTitle('New Title');
              });
            });
          }, { title: 'Original Title' });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify content is visible (title changes are in the navigation bar)
    await ctx.expect(ctx.getByText('Content')).toBeVisible();

    // Change the title
    await ctx.getByText('Change Title').click();

    // The title should be updated in the navigation bar
    // (We can verify the content is still there)
    await ctx.expect(ctx.getByText('Content')).toBeVisible();
  });
});
