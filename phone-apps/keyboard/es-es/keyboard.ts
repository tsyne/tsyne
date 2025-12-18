/**
 * Spanish (es-ES) Keyboard
 * QWERTY with ñ and Spanish punctuation (¿ ¡)
 * See LICENSE for copyright information.
 */

import type { App } from '../../../core/src/app';
import { KeyboardController } from '../controller';

export const locale = 'es-ES';
export const name = 'Español';

/**
 * Build the Spanish keyboard UI
 */
export function buildKeyboard(a: App, k: KeyboardController): void {
  a.vbox(() => {
    // ═══════════════════════════════════════════════════════════════════════
    // ROW 1: Q W E R T Y U I O P
    // ═══════════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════════
    // ROW 2: A S D F G H J K L Ñ  (Spanish has ñ on main layout)
    // ═══════════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════════
    // ROW 3: ⇪ Z X C V B N M ⌫
    // ═══════════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════════
    // ROW 4: ¿ ¡ ―――――― . ↵  (Spanish inverted punctuation)
    // ═══════════════════════════════════════════════════════════════════════
    a.hbox(() => {
      k.register('quest-inv', a.button('¿').onClick(() => k.symbol('¿', 'quest-inv')).withId('key-quest-inv'), '¿');
      k.register('excl-inv', a.button('¡').onClick(() => k.symbol('¡', 'excl-inv')).withId('key-excl-inv'), '¡');
      k.register('space', a.button('――――――').onClick(() => k.space('space')).withId('key-space'), '――――――');
      k.register('dot', a.button('.').onClick(() => k.symbol('.', 'dot')).withId('key-dot'), '.');
      k.register('enter', a.button('↵').onClick(() => k.enter('enter')).withId('key-enter'), '↵');
    });
  });
}
