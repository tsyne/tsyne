/**
 * English Dvorak Keyboard
 * Dvorak Simplified Keyboard layout for improved typing efficiency
 * See LICENSE for copyright information.
 */

import type { App } from '../../../core/src/app';
import { KeyboardController } from '../controller';

export const locale = 'en-dvorak';
export const name = 'English (Dvorak)';

/**
 * Build the English Dvorak keyboard UI
 */
export function buildKeyboard(a: App, k: KeyboardController): void {
  a.vbox(() => {
    // ═══════════════════════════════════════════════════════════════════════
    // ROW 1: ' , . P Y F G C R L
    // ═══════════════════════════════════════════════════════════════════════
    a.hbox(() => {
      k.register('apos', a.button("'").onClick(() => k.symbol("'", 'apos')).withId('key-apos'), "'");
      k.register('comma', a.button(',').onClick(() => k.symbol(',', 'comma')).withId('key-comma'), ',');
      k.register('dot', a.button('.').onClick(() => k.symbol('.', 'dot')).withId('key-dot'), '.');
      k.register('p', a.button('p').onClick(() => k.key('p', 'p')).withId('key-p'), 'p');
      k.register('y', a.button('y').onClick(() => k.key('y', 'y')).withId('key-y'), 'y');
      k.register('f', a.button('f').onClick(() => k.key('f', 'f')).withId('key-f'), 'f');
      k.register('g', a.button('g').onClick(() => k.key('g', 'g')).withId('key-g'), 'g');
      k.register('c', a.button('c').onClick(() => k.key('c', 'c')).withId('key-c'), 'c');
      k.register('r', a.button('r').onClick(() => k.key('r', 'r')).withId('key-r'), 'r');
      k.register('l', a.button('l').onClick(() => k.key('l', 'l')).withId('key-l'), 'l');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ROW 2: A O E U I D H T N S
    // ═══════════════════════════════════════════════════════════════════════
    a.hbox(() => {
      k.register('a', a.button('a').onClick(() => k.key('a', 'a')).withId('key-a'), 'a');
      k.register('o', a.button('o').onClick(() => k.key('o', 'o')).withId('key-o'), 'o');
      k.register('e', a.button('e').onClick(() => k.key('e', 'e')).withId('key-e'), 'e');
      k.register('u', a.button('u').onClick(() => k.key('u', 'u')).withId('key-u'), 'u');
      k.register('i', a.button('i').onClick(() => k.key('i', 'i')).withId('key-i'), 'i');
      k.register('d', a.button('d').onClick(() => k.key('d', 'd')).withId('key-d'), 'd');
      k.register('h', a.button('h').onClick(() => k.key('h', 'h')).withId('key-h'), 'h');
      k.register('t', a.button('t').onClick(() => k.key('t', 't')).withId('key-t'), 't');
      k.register('n', a.button('n').onClick(() => k.key('n', 'n')).withId('key-n'), 'n');
      k.register('s', a.button('s').onClick(() => k.key('s', 's')).withId('key-s'), 's');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ROW 3: ⇪ Q J K X B M W V Z ⌫
    // ═══════════════════════════════════════════════════════════════════════
    a.hbox(() => {
      k.register('shift', a.button('⇪').onClick(() => k.toggleShift()).withId('key-shift'), '⇪');
      k.register('q', a.button('q').onClick(() => k.key('q', 'q')).withId('key-q'), 'q');
      k.register('j', a.button('j').onClick(() => k.key('j', 'j')).withId('key-j'), 'j');
      k.register('k', a.button('k').onClick(() => k.key('k', 'k')).withId('key-k'), 'k');
      k.register('x', a.button('x').onClick(() => k.key('x', 'x')).withId('key-x'), 'x');
      k.register('b', a.button('b').onClick(() => k.key('b', 'b')).withId('key-b'), 'b');
      k.register('m', a.button('m').onClick(() => k.key('m', 'm')).withId('key-m'), 'm');
      k.register('w', a.button('w').onClick(() => k.key('w', 'w')).withId('key-w'), 'w');
      k.register('v', a.button('v').onClick(() => k.key('v', 'v')).withId('key-v'), 'v');
      k.register('z', a.button('z').onClick(() => k.key('z', 'z')).withId('key-z'), 'z');
      k.register('back', a.button('⌫').onClick(() => k.backspace('back')).withId('key-back'), '⌫');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ROW 4: 123 ―――――― ↵
    // ═══════════════════════════════════════════════════════════════════════
    a.hbox(() => {
      k.register('mode', a.button('123').onClick(() => { k.toggleSymbols(); }).withId('key-mode'), '123');
      k.register('space', a.button('――――――――').onClick(() => k.space('space')).withId('key-space'), '――――――――');
      k.register('enter', a.button('↵').onClick(() => k.enter('enter')).withId('key-enter'), '↵');
    });
  });
}
