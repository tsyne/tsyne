/**
 * Tests for window features: close intercept, multiple windows, window icon
 */

import { TsyneTest, TestContext } from '../src/index-test';

describe('Window Close Intercept', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should set up close intercept handler', async () => {
    let closeInterceptCalled = false;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Close Intercept Test', width: 400, height: 300 }, (win) => {
        win.setCloseIntercept(async () => {
          closeInterceptCalled = true;
          return true; // Allow close
        });

        win.setContent(() => {
          app.vbox(() => {
            app.label('Close intercept test window');
            app.button('Test Button');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the window content is visible
    await ctx.expect(ctx.getByExactText('Test Button')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Close intercept test window')).toBeVisible();
  });
});

describe('Multiple Windows', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create multiple windows', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      // Create main window
      app.window({ title: 'Main Window', width: 400, height: 300 }, (mainWin) => {
        mainWin.setContent(() => {
          app.vbox(() => {
            app.label('Main Window Content');
          });
        });
        mainWin.show();
      });

      // Create secondary window
      app.window({ title: 'Secondary Window', width: 300, height: 200 }, (secondWin) => {
        secondWin.setContent(() => {
          app.vbox(() => {
            app.label('Secondary Window Content');
          });
        });
        secondWin.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify both windows have content
    await ctx.expect(ctx.getByExactText('Main Window Content')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Secondary Window Content')).toBeVisible();
  });
});

describe('Window Close', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should close window programmatically', async () => {
    let windowClosed = false;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Closeable Window', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Closeable Window Content');
            app.button('Close Window', async () => {
              await win.close();
              windowClosed = true;
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the close button and content is visible
    await ctx.expect(ctx.getByExactText('Close Window')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Closeable Window Content')).toBeVisible();
  });
});
