/**
 * TsyneTest for Home button widget
 *
 * This test verifies that Home button widgets can be created and clicked.
 * Full home navigation testing is done in browser-home.test.ts
 */

import { TsyneTest, TestContext } from '../core/src/index-test';

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
          app.vbox(() => {
            // Create home button with house icon
            app.button('🏠').onClick(() => {
              homeClicked = true;
            }).withId('home-button');

            app.label('Home button test');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify home button exists
    const homeButton = ctx.getById('home-button');
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
          app.vbox(() => {
            app.hbox(() => {
              app.button('←').onClick(() => {}).withId('back-btn');
              app.button('→').onClick(() => {}).withId('forward-btn');
              app.button('⟳').onClick(() => {}).withId('reload-btn');
              app.button('🏠').onClick(() => {}).withId('home-btn');
            });

            app.label('All navigation buttons');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify all buttons exist
    await ctx.expect(ctx.getById('back-btn')).toBeVisible();
    await ctx.expect(ctx.getById('forward-btn')).toBeVisible();
    await ctx.expect(ctx.getById('reload-btn')).toBeVisible();
    await ctx.expect(ctx.getById('home-btn')).toBeVisible();
  });

  test('should handle button clicks in sequence', async () => {
    let clickOrder: string[] = [];

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Button Click Test' }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.button('First').onClick(() => { clickOrder.push('first'); }).withId('btn1');
            app.button('🏠').onClick(() => { clickOrder.push('home'); }).withId('home-btn');
            app.button('Last').onClick(() => { clickOrder.push('last'); }).withId('btn2');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click buttons in order
    await ctx.getById('btn1').click();
    await ctx.getById('home-btn').click();
    await ctx.getById('btn2').click();

    // Verify callbacks were called in order
    expect(clickOrder).toEqual(['first', 'home', 'last']);
  });
});
