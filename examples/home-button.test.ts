/**
 * TsyneTest for Home button widget
 *
 * This test verifies that Home button widgets can be created and clicked.
 * Full home navigation testing is done in browser-home.test.ts
 */

import { TsyneTest, TestContext } from '../src/index-test';

describe('Home Button Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create home button with icon', async () => {
    let homeClicked = false;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Home Button Test' }, (win) => {
        win.setContent(() => {
          const tsyne = require('../src/index');

          tsyne.vbox(() => {
            // Create home button with house icon
            const homeBtn = tsyne.button('🏠').onClick(() => {
              homeClicked = true;
            });
            homeBtn.id = 'home-button';

            tsyne.label('Home button test');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify home button exists
    const homeButton = ctx.getByID('home-button');
    await ctx.expect(homeButton).toBeVisible();

    // Click the home button
    await homeButton.click();

    // Verify callback was triggered
    expect(homeClicked).toBe(true);
  });

  test('should create multiple navigation buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Navigation Buttons Test' }, (win) => {
        win.setContent(() => {
          const tsyne = require('../src/index');

          tsyne.vbox(() => {
            tsyne.hbox(() => {
              const backBtn = tsyne.button('←').onClick(() => {});
              backBtn.id = 'back-btn';

              const forwardBtn = tsyne.button('→').onClick(() => {});
              forwardBtn.id = 'forward-btn';

              const reloadBtn = tsyne.button('⟳').onClick(() => {});
              reloadBtn.id = 'reload-btn';

              const homeBtn = tsyne.button('🏠').onClick(() => {});
              homeBtn.id = 'home-btn';
            });

            tsyne.label('All navigation buttons');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify all buttons exist
    await ctx.expect(ctx.getByID('back-btn')).toBeVisible();
    await ctx.expect(ctx.getByID('forward-btn')).toBeVisible();
    await ctx.expect(ctx.getByID('reload-btn')).toBeVisible();
    await ctx.expect(ctx.getByID('home-btn')).toBeVisible();
  });

  test('should handle button clicks in sequence', async () => {
    let clickOrder: string[] = [];

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Button Click Test' }, (win) => {
        win.setContent(() => {
          const tsyne = require('../src/index');

          tsyne.vbox(() => {
            const btn1 = tsyne.button('First').onClick(() => clickOrder.push('first'));
            btn1.id = 'btn1';

            const homeBtn = tsyne.button('🏠').onClick(() => clickOrder.push('home'));
            homeBtn.id = 'home-btn';

            const btn2 = tsyne.button('Last').onClick(() => clickOrder.push('last'));
            btn2.id = 'btn2';
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click buttons in order
    await ctx.getByID('btn1').click();
    await ctx.getByID('home-btn').click();
    await ctx.getByID('btn2').click();

    // Verify callbacks were called in order
    expect(clickOrder).toEqual(['first', 'home', 'last']);
  });
});
