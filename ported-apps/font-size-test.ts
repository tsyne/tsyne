/**
 * Font Size Test
 *
 * Tests whether font_size styling works on buttons and labels.
 */

import { App, app, resolveTransport } from 'tsyne';

export function buildFontSizeTest(a: App): void {
  a.window({ title: 'Font Size Test', width: 600, height: 500 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Button font_size test:');

        a.hbox(() => {
          a.button('A (10)').withStyle({ font_size: 10 });
          a.button('A (20)').withStyle({ font_size: 20 });
          a.button('A (30)').withStyle({ font_size: 30 });
          a.button('A (40)').withStyle({ font_size: 40 });
          a.button('A (50)').withStyle({ font_size: 50 });
        });

        a.separator();

        a.label('Label font_size test:');

        a.hbox(() => {
          a.label('A (10)').withStyle({ font_size: 10 });
          a.label('A (20)').withStyle({ font_size: 20 });
          a.label('A (30)').withStyle({ font_size: 30 });
          a.label('A (40)').withStyle({ font_size: 40 });
          a.label('A (50)').withStyle({ font_size: 50 });
        });

        a.separator();

        a.label('Unicode arrows with font_size:');

        a.hbox(() => {
          a.button('◀ (10)').withStyle({ font_size: 10 });
          a.button('◀ (20)').withStyle({ font_size: 20 });
          a.button('◀ (30)').withStyle({ font_size: 30 });
          a.button('◀ (40)').withStyle({ font_size: 40 });
        });

        a.separator();

        a.label('Button with minSize + font_size:');

        a.hbox(() => {
          a.button('◀').withMinSize(40, 40).withStyle({ font_size: 10 });
          a.button('◀').withMinSize(60, 60).withStyle({ font_size: 20 });
          a.button('◀').withMinSize(80, 80).withStyle({ font_size: 30 });
          a.button('◀').withMinSize(100, 100).withStyle({ font_size: 40 });
        });
      });
    });
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Font Size Test' }, buildFontSizeTest);
}
