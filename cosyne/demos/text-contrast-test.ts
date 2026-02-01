/**
 * Text Contrast Test - Verify canvas text is readable
 * Also compares cosyne canvas text with classic Tsyne label/entry widgets
 *
 * NOTE: c.foreign() is not yet implemented for actual rendering,
 * so we use side-by-side hbox layout instead.
 */

import { App, asRenderTarget , standaloneShutdownStrategy } from 'tsyne';
import type { Window, ITsyneWindow, IRenderTarget } from 'tsyne';
import { CosyneContext, cosyne } from '../src';

export function buildTextContrastDemo(a: App, target: IRenderTarget): void {
  target.setContent(() => {
    // Use stack to layer canvas behind widgets
    a.stack(() => {
      // BOTTOM LAYER: Full-width striped canvas background
      a.canvasStack(() => {
        cosyne(a, (c: CosyneContext) => {
          // Striped background spanning full window
          const stripeWidth = 20;
          const canvasWidth = 700;
          const canvasHeight = 350;
          for (let x = 0; x < canvasWidth; x += stripeWidth * 2) {
            c.rect(x, 0, stripeWidth, canvasHeight)
              .fill('#1a1a2e');
            c.rect(x + stripeWidth, 0, stripeWidth, canvasHeight)
              .fill('#252545');
          }

          // LEFT SIDE: Canvas text primitives
          c.text(20, 30, 'Cosyne Canvas Text:')
            .fill('#ffffff')
            .withId('canvas-header');

          c.text(50, 70, 'White text #ffffff')
            .fill('#ffffff')
            .withId('white-text');

          c.text(50, 110, 'Gray text #cccccc')
            .fill('#cccccc')
            .withId('gray-text');

          c.text(50, 150, 'Dark gray #888888')
            .fill('#888888')
            .withId('darkgray-text');

          c.text(50, 190, 'Yellow text #ffff00')
            .fill('#ffff00')
            .withId('yellow-text');
        });
      });

      // TOP LAYER: Tsyne widgets floating on top (dark theme for contrast)
      a.hbox(() => {
        a.spacer(); // Push widgets to the right
        a.themeoverride('dark', () => {
          a.vbox(() => {
            a.label('Classic Tsyne Widgets:');
            a.label('This is a Tsyne label');
            a.entry('Type here...', {
              onChanged: (text) => console.log('Entry changed:', text),
            });
            a.label('Compare text rendering');
            a.label('between canvas and widgets');
          });
        });
        a.spacer({ width: 50 }); // 50px margin from right edge
      });
    });
  });
}

if (require.main === module) {
  const { app, resolveTransport } = require('tsyne');
  const appInstance = app(resolveTransport(), { title: 'Text Contrast Test' }, (a: App) => {
    a.window({ title: 'Text Contrast Test', width: 700, height: 350 }, (win: Window) => {
      const target = asRenderTarget(win as ITsyneWindow);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));      buildTextContrastDemo(a, target);
      win.show();
    });
  });
}
