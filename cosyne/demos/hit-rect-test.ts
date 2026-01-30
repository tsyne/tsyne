/**
 * Isolate: Is it the transparent hit-test rectangles?
 *
 * Test steps:
 * 1. Colored rects only - should work
 * 2. Colored rects + text labels - should work
 * 3. Colored rects + transparent hit rects - does this break it?
 *
 * Run with: ./scripts/tsyne cosyne/demos/hit-rect-test.ts
 */

import { app, resolveTransport, App, CanvasStack } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling } from 'cosyne';

app(resolveTransport(), { title: 'Hit Rect Test', width: 900, height: 600 }, (a: App) => {
  a.window({ title: 'Hit Rect Test', width: 900, height: 600 }, (win: any) => {
    let canvasStack: CanvasStack;
    let mode = 0; // 0=none, 1=rects only, 2=rects+labels, 3=rects+hit
    const canvasWidth = 800;
    const canvasHeight = 500;

    const rects = [
      { id: '1', x: 4, y: 4, w: 396, h: 246, color: '#db5757', name: 'a.txt' },
      { id: '2', x: 4, y: 250, w: 396, h: 246, color: '#d0db57', name: 'b.ini' },
      { id: '3', x: 400, y: 4, w: 396, h: 246, color: '#dbdb57', name: 'c.json' },
      { id: '4', x: 400, y: 250, w: 396, h: 246, color: '#5783db', name: 'd.py' },
    ];

    const render = () => {
      console.log(`[render] mode=${mode}`);
      canvasStack.rebuild(() => {
        cosyne(a, (c: CosyneContext) => {
          c.rect(0, 0, canvasWidth, canvasHeight, { fillColor: '#1a1a2e' });

          if (mode >= 1) {
            // Draw colored rectangles
            for (const rect of rects) {
              c.rect(rect.x, rect.y, rect.w, rect.h, { fillColor: rect.color });
            }
          }

          if (mode >= 2) {
            // Add text labels
            for (const rect of rects) {
              c.text(rect.x + 4, rect.y + 14, rect.name).fill('#ffffff').stroke('none', 0);
            }
          }

          if (mode >= 3) {
            // Add transparent hit-test rectangles
            for (const rect of rects) {
              c.rect(rect.x, rect.y, rect.w, rect.h, { fillColor: 'transparent' });
            }
          }

          enableEventHandling(c, a, { width: canvasWidth, height: canvasHeight });
        });
      });
    };

    win.setContent(() => {
      a.vbox(() => {
        a.hbox(() => {
          a.button('1: Rects Only').onClick(() => { mode = 1; render(); });
          a.button('2: + Labels').onClick(() => { mode = 2; render(); });
          a.button('3: + Hit Rects').onClick(() => { mode = 3; render(); });
          a.button('Clear').onClick(() => { mode = 0; render(); });
        });

        a.separator();

        canvasStack = a.canvasStack(() => {
          cosyne(a, (c: CosyneContext) => {
            c.rect(0, 0, canvasWidth, canvasHeight, { fillColor: '#1a1a2e' });
            enableEventHandling(c, a, { width: canvasWidth, height: canvasHeight });
          });
        }, canvasWidth, canvasHeight);
      });
    });

    win.show();
  });
});
