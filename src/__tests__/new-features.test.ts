import { TsyneTest, TestContext } from '../index-test';
import { App } from '../index';

describe('New Features', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(() => {
    if (tsyneTest) {
      tsyneTest.cleanup();
    }
  });

  describe('MultipleWindows Container', () => {
    it('should create a MultipleWindows container', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'MDI Test' }, (win) => {
          win.setContent(() => {
            app.multipleWindows(() => {
              app.innerWindow('Window 1', () => {
                app.label('Content 1');
              });
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'multiplewindows')).toBe(true);
      expect(widgetInfo.some((w: any) => w.type === 'innerwindow')).toBe(true);
    });

    it('should create an empty MultipleWindows container', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Empty MDI Test' }, (win) => {
          win.setContent(() => {
            app.multipleWindows();
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'multiplewindows')).toBe(true);
    });

    it('should create MultipleWindows with multiple inner windows', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Multiple Inner Windows Test' }, (win) => {
          win.setContent(() => {
            app.multipleWindows(() => {
              app.innerWindow('Doc 1', () => {
                app.label('Document 1 Content');
              });
              app.innerWindow('Doc 2', () => {
                app.label('Document 2 Content');
              });
              app.innerWindow('Doc 3', () => {
                app.label('Document 3 Content');
              });
            });
          });
          win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'multiplewindows')).toBe(true);
      const innerWindows = widgetInfo.filter((w: any) => w.type === 'innerwindow');
      expect(innerWindows.length).toBe(3);
    });
  });

  describe('showCustomWithoutButtons Dialog', () => {
    it('should show a custom dialog without buttons', async () => {
      let dialogShown = false;
      let dialogHidden = false;

      const createTestApp = (app: App) => {
        app.window({ title: 'Dialog Test' }, async (win) => {
          win.setContent(() => {
            app.button('Show Dialog').onClick(async () => {
              const dialog = await win.showCustomWithoutButtons(
                'Loading',
                () => {
                  app.label('Loading...');
                }
              );
              dialogShown = true;

              // Hide after short delay
              setTimeout(async () => {
                await dialog.hide();
                dialogHidden = true;
              }, 100);
            });
          });
          await win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click the button to show the dialog
      const button = ctx.getByText('Show Dialog');
      await button.click();

      // Wait for dialog to show and hide
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(dialogShown).toBe(true);
      expect(dialogHidden).toBe(true);
    });

    it('should show dialog with custom content', async () => {
      const createTestApp = (app: App) => {
        app.window({ title: 'Content Dialog Test' }, async (win) => {
          win.setContent(() => {
            app.button('Show Custom Dialog').onClick(async () => {
              const dialog = await win.showCustomWithoutButtons(
                'Processing',
                () => {
                  app.vbox(() => {
                    app.label('Please wait...');
                    app.progressbarInfinite();
                  });
                }
              );

              setTimeout(async () => {
                await dialog.hide();
              }, 100);
            });
          });
          await win.show();
        });
      };

      tsyneTest = new TsyneTest({ headed: false });
      const testApp = await tsyneTest.createApp(createTestApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Just verify the app runs without errors
      const widgetInfo = await ctx.getAllWidgets();
      expect(widgetInfo.some((w: any) => w.type === 'button')).toBe(true);
    });
  });
});
