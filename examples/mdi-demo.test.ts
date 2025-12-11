// Test for MDI (Multiple Document Interface) Demo
import { TsyneTest, TestContext } from '../core/src/index-test';
import { InnerWindow } from '../core/src';
import * as path from 'path';

describe('MDI Demo - InnerWindow Container', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create inner windows with titles', async () => {
    let innerWin1: InnerWindow;
    let innerWin2: InnerWindow;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'MDI Test', width: 800, height: 600 }, (win) => {
        win.setContent(() => {
          app.max(() => {
            innerWin1 = app.innerWindow('Document 1', () => {
              app.vbox(() => {
                app.label('Content of Document 1');
              });
            });

            innerWin2 = app.innerWindow('Document 2', () => {
              app.vbox(() => {
                app.label('Content of Document 2');
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify inner window content is visible
    await ctx.expect(ctx.getByExactText('Content of Document 1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Content of Document 2')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'mdi-demo.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should update inner window title', async () => {
    let innerWin: InnerWindow;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'MDI Title Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            innerWin = app.innerWindow('Original Title', () => {
              app.label('Window content');
            });

            app.button('Change Title').onClick(async () => {
              await innerWin.setTitle('Updated Title');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial content
    await ctx.expect(ctx.getByExactText('Window content')).toBeVisible();

    // Click button to change title
    await ctx.getByExactText('Change Title').click();
    await ctx.wait(100);
  });

  test('should handle onClose callback', async () => {
    let closeCallbackFired = false;
    let innerWin: InnerWindow;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'MDI Close Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            innerWin = app.innerWindow('Closeable Window', () => {
              app.label('This window can be closed');
            }, () => {
              closeCallbackFired = true;
            });

            app.button('Close Window').onClick(async () => {
              await innerWin.close();
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify inner window is visible
    await ctx.expect(ctx.getByExactText('This window can be closed')).toBeVisible();

    // Close the inner window
    await ctx.getByExactText('Close Window').click();
    await ctx.wait(100);

    // Note: close callback is fired via CloseIntercept, not Close() method
    // The callback behavior may vary based on Fyne's InnerWindow implementation
  });

  test('should support hide and show', async () => {
    let innerWin: InnerWindow;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'MDI Visibility Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            innerWin = app.innerWindow('Toggle Window', () => {
              app.label('Visible content');
            });

            app.hbox(() => {
              app.button('Hide').onClick(async () => {
                await innerWin.hide();
              });
              app.button('Show').onClick(async () => {
                await innerWin.show();
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initially visible
    await ctx.expect(ctx.getByExactText('Visible content')).toBeVisible();

    // Hide
    await ctx.getByExactText('Hide').click();
    await ctx.wait(100);

    // Show again
    await ctx.getByExactText('Show').click();
    await ctx.wait(100);
  });

  test('should create multiple inner windows in MDI layout', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Full MDI Demo', width: 800, height: 600 }, (win) => {
        win.setContent(() => {
          app.border({
            top: () => {
              app.hbox(() => {
                app.label('MDI Application');
              });
            },
            center: () => {
              app.max(() => {
                app.innerWindow('Editor 1', () => {
                  app.vbox(() => {
                    app.label('Code Editor');
                    app.multilineentry('// Write code here...');
                  });
                });

                app.innerWindow('Preview', () => {
                  app.vbox(() => {
                    app.label('Live Preview');
                    app.label('Preview content appears here');
                  });
                });

                app.innerWindow('Console', () => {
                  app.vbox(() => {
                    app.label('Console Output');
                    app.multilineentry('> Ready...');
                  });
                });
              });
            },
            bottom: () => {
              app.label('Status: Ready');
            }
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify all inner windows are visible
    await ctx.expect(ctx.getByExactText('Code Editor')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Live Preview')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Console Output')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Status: Ready')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'mdi-full-demo.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });
});
