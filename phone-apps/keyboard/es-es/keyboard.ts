/**
 * Spanish (es-ES) Keyboard
 * QWERTY with ñ, Spanish punctuation (¿ ¡), symbols layer, and Fn layer
 * Uses when() for ng-if style layer switching
 * See LICENSE for copyright information.
 */

import type { App } from '../../../core/src/app';
import { KeyboardController } from '../controller';
import { styles, FontFamily } from '../../../core/src/styles';

export const locale = 'es-ES';
export const name = 'Español';

// Set monospace font for buttons so all letters have equal width
styles({
  button: {
    font_family: FontFamily.MONOSPACE
  }
});

/**
 * Build the Spanish keyboard UI
 * Purely declarative - when() bindings auto-refresh via controller
 */
export function buildKeyboard(a: App, k: KeyboardController): void {
  const isAbc = () => k.mode === 'abc';
  const isSymbols = () => k.mode === 'symbols';
  const isFn = () => k.mode === 'fn';
  const isLower = () => !k.shift;
  const isUpper = () => k.shift;

  a.vbox(() => {
    // ═══════════════════════════════════════════════════════════════════════
    // ABC LAYER - QWERTY with ñ (mode === 'abc')
    // ═══════════════════════════════════════════════════════════════════════
    a.vbox(() => {
      // ROW 1: Q W E R T Y U I O P
      a.hbox(() => {
        for (const c of ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']) {
          a.button(c).onClick((b) => k.key(c, b)).when(isLower);
          a.button(c.toUpperCase()).onClick((b) => k.key(c, b)).when(isUpper);
        }
      });

      // ROW 2: A S D F G H J K L Ñ
      a.hbox(() => {
        for (const c of ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ']) {
          a.button(c).onClick((b) => k.key(c, b)).when(isLower);
          a.button(c.toUpperCase()).onClick((b) => k.key(c, b)).when(isUpper);
        }
      });

      // ROW 3: ⇪ Z X C V B N M ⌫
      a.hbox(() => {
        a.button('⇪').onClick(() => k.toggleShift());
        for (const c of ['z', 'x', 'c', 'v', 'b', 'n', 'm']) {
          a.button(c).onClick((b) => k.key(c, b)).when(isLower);
          a.button(c.toUpperCase()).onClick((b) => k.key(c, b)).when(isUpper);
        }
        a.button('⌫').onClick((b) => k.backspace(b));
      });

      // ROW 4: mode ¿ ¡ ―――――― . ↵
      a.hbox(() => {
        a.button('123').onClick(() => k.cycleMode()).when(isAbc);
        a.button('Fn').onClick(() => k.cycleMode()).when(isSymbols);
        a.button('abc').onClick(() => k.cycleMode()).when(isFn);
        a.button('¿').onClick((b) => k.symbol('¿', b));
        a.button('¡').onClick((b) => k.symbol('¡', b));
        a.button('――――――').onClick((b) => k.space(b, '――――――'));
        a.button('.').onClick((b) => k.symbol('.', b));
        a.button('↵').onClick((b) => k.enter(b));
      });
    }).when(isAbc);

    // ═══════════════════════════════════════════════════════════════════════
    // SYMBOLS/NUMBERS LAYER (mode === 'symbols')
    // ═══════════════════════════════════════════════════════════════════════
    a.vbox(() => {
      // ROW 1: 1 2 3 4 5 6 7 8 9 0
      a.hbox(() => {
        for (const c of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
          a.button(c).onClick((b) => k.symbol(c, b));
        }
      });

      // ROW 2: @ # € $ % ^ & * ( )
      a.hbox(() => {
        for (const c of ['@', '#', '€', '$', '%', '^', '&', '*', '(', ')']) {
          a.button(c).onClick((b) => k.symbol(c, b));
        }
      });

      // ROW 3: - + = _ " ' : ; ⌫
      a.hbox(() => {
        for (const c of ['-', '+', '=', '_', '"', "'", ':', ';']) {
          a.button(c).onClick((b) => k.symbol(c, b));
        }
        a.button('⌫').onClick((b) => k.backspace(b));
      });

      // ROW 4: mode / \ , ―――― . ! ? ↵
      a.hbox(() => {
        a.button('123').onClick(() => k.cycleMode()).when(isAbc);
        a.button('Fn').onClick(() => k.cycleMode()).when(isSymbols);
        a.button('abc').onClick(() => k.cycleMode()).when(isFn);
        for (const c of ['/', '\\', ',']) {
          a.button(c).onClick((b) => k.symbol(c, b));
        }
        a.button('――――').onClick((b) => k.space(b, '――――'));
        for (const c of ['.', '!', '?']) {
          a.button(c).onClick((b) => k.symbol(c, b));
        }
        a.button('↵').onClick((b) => k.enter(b));
      });
    }).when(isSymbols);

    // ═══════════════════════════════════════════════════════════════════════
    // FN LAYER - Function keys, cursor keys, navigation (mode === 'fn')
    // ═══════════════════════════════════════════════════════════════════════
    a.vbox(() => {
      // F-KEYS ROW 1: F1 F2 F3 F4 F5 F6
      a.hbox(() => {
        for (const n of [1, 2, 3, 4, 5, 6]) {
          a.button(`F${n}`).onClick((b) => k.fkey(n, b));
        }
      });

      // F-KEYS ROW 2: F7 F8 F9 F10 F11 F12
      a.hbox(() => {
        for (const n of [7, 8, 9, 10, 11, 12]) {
          a.button(`F${n}`).onClick((b) => k.fkey(n, b));
        }
      });

      // NAVIGATION: Esc Tab Ins Del Home End PgUp PgDn
      a.hbox(() => {
        a.button('Esc').onClick((b) => k.escape(b));
        a.button('Tab').onClick((b) => k.tab(b));
        a.button('Ins').onClick((b) => k.insert(b));
        a.button('Del').onClick((b) => k.delete(b));
        a.button('Home').onClick((b) => k.home(b));
        a.button('End').onClick((b) => k.end(b));
        a.button('PgUp').onClick((b) => k.pageUp(b));
        a.button('PgDn').onClick((b) => k.pageDown(b));
      });

      // CURSOR + MODE: abc ← ↑ ↓ → Ctrl
      a.hbox(() => {
        a.button('123').onClick(() => k.cycleMode()).when(isAbc);
        a.button('Fn').onClick(() => k.cycleMode()).when(isSymbols);
        a.button('abc').onClick(() => k.cycleMode()).when(isFn);
        a.button('←').onClick((b) => k.cursorLeft(b));
        a.button('↑').onClick((b) => k.cursorUp(b));
        a.button('↓').onClick((b) => k.cursorDown(b));
        a.button('→').onClick((b) => k.cursorRight(b));
        a.button('Ctrl').onClick(() => k.toggleCtrl());
      });
    }).when(isFn);
  });
}
