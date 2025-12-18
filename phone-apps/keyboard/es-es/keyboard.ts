/**
 * Spanish (es-ES) Keyboard
 * QWERTY with ñ, Spanish punctuation (¿ ¡), and Fn layer
 * See LICENSE for copyright information.
 */

import type { App } from '../../../core/src/app';
import type { Button } from '../../../core/src/widgets/inputs';
import { KeyboardController } from '../controller';

export const locale = 'es-ES';
export const name = 'Español';

/**
 * Build the Spanish keyboard UI
 */
export function buildKeyboard(a: App, k: KeyboardController): void {
  let modeBtn: Button;

  a.vbox(() => {
    // ═══════════════════════════════════════════════════════════════════════
    // ABC LAYER - QWERTY with ñ
    // ═══════════════════════════════════════════════════════════════════════

    // ROW 1: Q W E R T Y U I O P
    a.hbox(() => {
      k.register('q', a.button('q').onClick(() => k.key('q', 'q')).withId('key-q'), 'q');
      k.register('w', a.button('w').onClick(() => k.key('w', 'w')).withId('key-w'), 'w');
      k.register('e', a.button('e').onClick(() => k.key('e', 'e')).withId('key-e'), 'e');
      k.register('r', a.button('r').onClick(() => k.key('r', 'r')).withId('key-r'), 'r');
      k.register('t', a.button('t').onClick(() => k.key('t', 't')).withId('key-t'), 't');
      k.register('y', a.button('y').onClick(() => k.key('y', 'y')).withId('key-y'), 'y');
      k.register('u', a.button('u').onClick(() => k.key('u', 'u')).withId('key-u'), 'u');
      k.register('i', a.button('i').onClick(() => k.key('i', 'i')).withId('key-i'), 'i');
      k.register('o', a.button('o').onClick(() => k.key('o', 'o')).withId('key-o'), 'o');
      k.register('p', a.button('p').onClick(() => k.key('p', 'p')).withId('key-p'), 'p');
    });

    // ROW 2: A S D F G H J K L Ñ
    a.hbox(() => {
      k.register('a', a.button('a').onClick(() => k.key('a', 'a')).withId('key-a'), 'a');
      k.register('s', a.button('s').onClick(() => k.key('s', 's')).withId('key-s'), 's');
      k.register('d', a.button('d').onClick(() => k.key('d', 'd')).withId('key-d'), 'd');
      k.register('f', a.button('f').onClick(() => k.key('f', 'f')).withId('key-f'), 'f');
      k.register('g', a.button('g').onClick(() => k.key('g', 'g')).withId('key-g'), 'g');
      k.register('h', a.button('h').onClick(() => k.key('h', 'h')).withId('key-h'), 'h');
      k.register('j', a.button('j').onClick(() => k.key('j', 'j')).withId('key-j'), 'j');
      k.register('k', a.button('k').onClick(() => k.key('k', 'k')).withId('key-k'), 'k');
      k.register('l', a.button('l').onClick(() => k.key('l', 'l')).withId('key-l'), 'l');
      k.register('ñ', a.button('ñ').onClick(() => k.key('ñ', 'ñ')).withId('key-ñ'), 'ñ');
    });

    // ROW 3: ⇪ Z X C V B N M ⌫
    a.hbox(() => {
      k.register('shift', a.button('⇪').onClick(() => k.toggleShift()).withId('key-shift'), '⇪');
      k.register('z', a.button('z').onClick(() => k.key('z', 'z')).withId('key-z'), 'z');
      k.register('x', a.button('x').onClick(() => k.key('x', 'x')).withId('key-x'), 'x');
      k.register('c', a.button('c').onClick(() => k.key('c', 'c')).withId('key-c'), 'c');
      k.register('v', a.button('v').onClick(() => k.key('v', 'v')).withId('key-v'), 'v');
      k.register('b', a.button('b').onClick(() => k.key('b', 'b')).withId('key-b'), 'b');
      k.register('n', a.button('n').onClick(() => k.key('n', 'n')).withId('key-n'), 'n');
      k.register('m', a.button('m').onClick(() => k.key('m', 'm')).withId('key-m'), 'm');
      k.register('back', a.button('⌫').onClick(() => k.backspace('back')).withId('key-back'), '⌫');
    });

    // ROW 4: mode ¿ ¡ ―――――― . ↵
    a.hbox(() => {
      modeBtn = a.button('123').onClick(() => {
        k.cycleMode();
        modeBtn.setText(k.getModeLabel());
      }).withId('key-mode');
      k.register('mode', modeBtn, '123');
      k.register('quest-inv', a.button('¿').onClick(() => k.symbol('¿', 'quest-inv')).withId('key-quest-inv'), '¿');
      k.register('excl-inv', a.button('¡').onClick(() => k.symbol('¡', 'excl-inv')).withId('key-excl-inv'), '¡');
      k.register('space', a.button('――――――').onClick(() => k.space('space')).withId('key-space'), '――――――');
      k.register('dot', a.button('.').onClick(() => k.symbol('.', 'dot')).withId('key-dot'), '.');
      k.register('enter', a.button('↵').onClick(() => k.enter('enter')).withId('key-enter'), '↵');
    });

    a.separator();

    // ═══════════════════════════════════════════════════════════════════════
    // FN LAYER - Function keys, cursor keys, navigation
    // ═══════════════════════════════════════════════════════════════════════

    // F-KEYS ROW 1: F1 F2 F3 F4 F5 F6
    a.hbox(() => {
      k.register('f1', a.button('F1').onClick(() => k.fkey(1, 'f1')).withId('key-f1'), 'F1');
      k.register('f2', a.button('F2').onClick(() => k.fkey(2, 'f2')).withId('key-f2'), 'F2');
      k.register('f3', a.button('F3').onClick(() => k.fkey(3, 'f3')).withId('key-f3'), 'F3');
      k.register('f4', a.button('F4').onClick(() => k.fkey(4, 'f4')).withId('key-f4'), 'F4');
      k.register('f5', a.button('F5').onClick(() => k.fkey(5, 'f5')).withId('key-f5'), 'F5');
      k.register('f6', a.button('F6').onClick(() => k.fkey(6, 'f6')).withId('key-f6'), 'F6');
    });

    // F-KEYS ROW 2: F7 F8 F9 F10 F11 F12
    a.hbox(() => {
      k.register('f7', a.button('F7').onClick(() => k.fkey(7, 'f7')).withId('key-f7'), 'F7');
      k.register('f8', a.button('F8').onClick(() => k.fkey(8, 'f8')).withId('key-f8'), 'F8');
      k.register('f9', a.button('F9').onClick(() => k.fkey(9, 'f9')).withId('key-f9'), 'F9');
      k.register('f10', a.button('F10').onClick(() => k.fkey(10, 'f10')).withId('key-f10'), 'F10');
      k.register('f11', a.button('F11').onClick(() => k.fkey(11, 'f11')).withId('key-f11'), 'F11');
      k.register('f12', a.button('F12').onClick(() => k.fkey(12, 'f12')).withId('key-f12'), 'F12');
    });

    // NAVIGATION: Esc Tab | Ins Del | Home End | PgUp PgDn
    a.hbox(() => {
      k.register('esc', a.button('Esc').onClick(() => k.escape('esc')).withId('key-esc'), 'Esc');
      k.register('tab', a.button('Tab').onClick(() => k.tab('tab')).withId('key-tab'), 'Tab');
      k.register('ins', a.button('Ins').onClick(() => k.insert('ins')).withId('key-ins'), 'Ins');
      k.register('del', a.button('Del').onClick(() => k.delete('del')).withId('key-del'), 'Del');
      k.register('home', a.button('Home').onClick(() => k.home('home')).withId('key-home'), 'Home');
      k.register('end', a.button('End').onClick(() => k.end('end')).withId('key-end'), 'End');
      k.register('pgup', a.button('PgUp').onClick(() => k.pageUp('pgup')).withId('key-pgup'), 'PgUp');
      k.register('pgdn', a.button('PgDn').onClick(() => k.pageDown('pgdn')).withId('key-pgdn'), 'PgDn');
    });

    // CURSOR KEYS (inverted T) + CTRL
    a.hbox(() => {
      a.spacer();
      a.spacer();
      k.register('up', a.button('↑').onClick(() => k.cursorUp('up')).withId('key-up'), '↑');
      a.spacer();
      a.spacer();
      k.register('ctrl', a.button('Ctrl').onClick(() => k.toggleCtrl()).withId('key-ctrl'), 'Ctrl');
    });
    a.hbox(() => {
      a.spacer();
      k.register('left', a.button('←').onClick(() => k.cursorLeft('left')).withId('key-left'), '←');
      k.register('down', a.button('↓').onClick(() => k.cursorDown('down')).withId('key-down'), '↓');
      k.register('right', a.button('→').onClick(() => k.cursorRight('right')).withId('key-right'), '→');
      a.spacer();
    });
  });
}
