// Tests for dialog inspection via Fyne canvas overlays
import { TsyneTest, TestContext } from '../src/index-test';

describe('Dialog Inspection', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  describe('getActiveDialogs', () => {
    test('should return empty array when no dialogs are shown', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Dialog Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.label('No dialogs here');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      const dialogs = await ctx.getActiveDialogs();
      expect(dialogs).toHaveLength(0);
    });

    test('should detect showInfo dialog', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Info Dialog Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.button('Show Info', async () => {
              await win.showInfo('Test Title', 'This is an info message');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Initially no dialogs
      await ctx.assertNoDialogs();

      // Click to show info dialog
      await ctx.getByText('Show Info').click();
      await ctx.wait(100);

      // Should detect the info dialog
      const dialogs = await ctx.getActiveDialogs();
      expect(dialogs.length).toBeGreaterThan(0);
      expect(dialogs[0].type).toBe('info');
      expect(dialogs[0].texts).toContain('Test Title');
    });

    test('should detect showError dialog', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Error Dialog Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.button('Show Error', async () => {
              await win.showError('Error', 'Something went wrong');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Click to show error dialog
      await ctx.getByText('Show Error').click();
      await ctx.wait(100);

      // Should detect the error dialog
      const dialogs = await ctx.getActiveDialogs();
      expect(dialogs.length).toBeGreaterThan(0);
      expect(dialogs[0].type).toBe('error');
    });
  });

  describe('dismissActiveDialog', () => {
    test('should dismiss info dialog', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Dismiss Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.button('Show Info', async () => {
              await win.showInfo('Test', 'Click OK to dismiss');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Show dialog
      await ctx.getByText('Show Info').click();
      await ctx.wait(100);

      // Dialog should be visible
      let dialogs = await ctx.getActiveDialogs();
      expect(dialogs.length).toBeGreaterThan(0);

      // Dismiss the dialog
      await ctx.dismissActiveDialog();
      await ctx.wait(100);

      // Dialog should be gone
      dialogs = await ctx.getActiveDialogs();
      expect(dialogs).toHaveLength(0);
    });
  });

  describe('DialogLocator fluent API', () => {
    test('should use dialog().shouldExist()', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Fluent Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.button('Show Info', async () => {
              await win.showInfo('Hello', 'World');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Show dialog
      await ctx.getByText('Show Info').click();
      await ctx.wait(100);

      // Fluent assertion
      await ctx.dialog().shouldExist();
    });

    test('should use dialog().shouldNotExist()', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Fluent Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.label('No dialogs');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // No dialog should exist
      await ctx.dialog().shouldNotExist();
    });

    test('should use dialog().shouldBeInfo()', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Info Type Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.button('Show Info', async () => {
              await win.showInfo('Success', 'Operation completed');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('Show Info').click();
      await ctx.wait(100);

      await ctx.dialog().shouldBeInfo('Success');
    });

    test('should use dialog().shouldBeError()', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Error Type Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.button('Show Error', async () => {
              await win.showError('Error', 'Operation failed');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('Show Error').click();
      await ctx.wait(100);

      await ctx.dialog().shouldBeError('failed');
    });

    test('should use dialog().shouldContain()', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Contains Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.button('Show Info', async () => {
              await win.showInfo('Important', 'Please review the changes');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('Show Info').click();
      await ctx.wait(100);

      await ctx.dialog().shouldContain('review');
    });

    test('should use dialog().within() for polling', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Polling Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.button('Delayed Dialog', async () => {
              // Dialog appears after small delay
              setTimeout(async () => {
                await win.showInfo('Delayed', 'This appeared after delay');
              }, 50);
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('Delayed Dialog').click();

      // Use within() to poll for the dialog
      await ctx.dialog().within(500).shouldExist();
    });

    test('should use dialog().thenDismiss() for chaining', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Chain Test', width: 400, height: 300 }, (win) => {
          win.setContent(() => {
            app.button('Show Info', async () => {
              await win.showInfo('Chain Test', 'Will be dismissed');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByText('Show Info').click();
      await ctx.wait(100);

      // Assert and dismiss in one chain
      await ctx.dialog().shouldBeInfo('Chain Test').then(d => d.thenDismiss());
      await ctx.wait(100);

      // Dialog should be gone
      await ctx.dialog().shouldNotExist();
    });
  });
});
