/**
 * Test for dynamic container.Add() rendering issue
 *
 * This tests whether objects added via container.Add() after initial render
 * are properly displayed. The hypothesis is that OpenGL mode doesn't render
 * dynamically added objects while software mode (TsyneTest) does.
 */

import { TsyneTest } from '../tsyne-test';
import { App } from '../app';
import { CanvasStack } from '../widgets/containers_layout';
import { cosyne, CosyneContext } from '../../../cosyne/src';

describe('Dynamic container.Add() rendering', () => {
  let tsyneTest: TsyneTest;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('shows colored rectangles after clicking Show button', async () => {
    let testApp: App;
    let canvasStack: CanvasStack;
    let showRects = false;

    const render = async () => {
      console.log(`[render] showRects=${showRects}`);
      await canvasStack.rebuild(() => {
        cosyne(testApp, (c: CosyneContext) => {
          c.rect(0, 0, 400, 250, { fillColor: '#1a1a2e' });

          if (showRects) {
            console.log('[render] Drawing 4 colored rectangles');
            c.rect(10, 10, 180, 110, { fillColor: '#ff0000' });
            c.rect(210, 10, 180, 110, { fillColor: '#00ff00' });
            c.rect(10, 130, 180, 110, { fillColor: '#0000ff' });
            c.rect(210, 130, 180, 110, { fillColor: '#ffff00' });
          }
        });
      });
    };

    const createTestApp = (app: App) => {
      testApp = app;
      app.window({ title: 'Dynamic Add Test', width: 500, height: 400 }, (win: any) => {
        win.setContent(() => {
          app.vbox(() => {
            app.hbox(() => {
              app.button('Show Rectangles')
                .onClick(async () => {
                  showRects = true;
                  await render();
                })
                .withId('showBtn');
              app.button('Hide Rectangles')
                .onClick(async () => {
                  showRects = false;
                  await render();
                })
                .withId('hideBtn');
            });

            app.separator();

            canvasStack = app.canvasStack(() => {
              cosyne(app, (c: CosyneContext) => {
                c.rect(0, 0, 400, 250, { fillColor: '#1a1a2e' });
              });
            });
          });
        });
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp(createTestApp);
    await testApp!.run();

    // Initial state - dark background only
    await new Promise(resolve => setTimeout(resolve, 500));
    await tsyneTest.screenshot('/tmp/dynamic-add-1-initial.png');

    // Click Show Rectangles
    const ctx = tsyneTest.getContext();
    await ctx.getById('showBtn').click();

    await new Promise(resolve => setTimeout(resolve, 500));
    await tsyneTest.screenshot('/tmp/dynamic-add-2-after-show.png');

    // Click Hide Rectangles
    await ctx.getById('hideBtn').click();

    await new Promise(resolve => setTimeout(resolve, 500));
    await tsyneTest.screenshot('/tmp/dynamic-add-3-after-hide.png');

    // Click Show again
    await ctx.getById('showBtn').click();

    await new Promise(resolve => setTimeout(resolve, 500));
    await tsyneTest.screenshot('/tmp/dynamic-add-4-show-again.png');

    // Verify rectangles are shown
    expect(showRects).toBe(true);
  });
});
