/**
 * French (fr-FR) Keyboard
 * AZERTY layout with accented characters
 * See LICENSE for copyright information.
 */

import type { App } from '../../../core/src/app';
import { KeyboardController } from '../controller';

export const locale = 'fr-FR';
export const name = 'Français';

/**
 * Build the French AZERTY keyboard UI
 */
export function buildKeyboard(a: App, k: KeyboardController): void {
  a.vbox(() => {
    // ═══════════════════════════════════════════════════════════════════════
    // ROW 1: A Z E R T Y U I O P  (AZERTY top row)
    // ═══════════════════════════════════════════════════════════════════════
    a.hbox(() => {
      k.register('a', a.button('a').onClick(() => k.key('a', 'a')).withId('key-a'), 'a');
      k.register('z', a.button('z').onClick(() => k.key('z', 'z')).withId('key-z'), 'z');
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
    // ROW 2: Q S D F G H J K L M  (AZERTY middle row)
    // ═══════════════════════════════════════════════════════════════════════
    a.hbox(() => {
      k.register('q', a.button('q').onClick(() => k.key('q', 'q')).withId('key-q'), 'q');
      k.register('s', a.button('s').onClick(() => k.key('s', 's')).withId('key-s'), 's');
      k.register('d', a.button('d').onClick(() => k.key('d', 'd')).withId('key-d'), 'd');
      k.register('f', a.button('f').onClick(() => k.key('f', 'f')).withId('key-f'), 'f');
      k.register('g', a.button('g').onClick(() => k.key('g', 'g')).withId('key-g'), 'g');
      k.register('h', a.button('h').onClick(() => k.key('h', 'h')).withId('key-h'), 'h');
      k.register('j', a.button('j').onClick(() => k.key('j', 'j')).withId('key-j'), 'j');
      k.register('k', a.button('k').onClick(() => k.key('k', 'k')).withId('key-k'), 'k');
      k.register('l', a.button('l').onClick(() => k.key('l', 'l')).withId('key-l'), 'l');
      k.register('m', a.button('m').onClick(() => k.key('m', 'm')).withId('key-m'), 'm');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ROW 3: ⇪ W X C V B N ⌫  (AZERTY bottom row)
    // ═══════════════════════════════════════════════════════════════════════
    a.hbox(() => {
      k.register('shift', a.button('⇪').onClick(() => k.toggleShift()).withId('key-shift'), '⇪');
      k.register('w', a.button('w').onClick(() => k.key('w', 'w')).withId('key-w'), 'w');
      k.register('x', a.button('x').onClick(() => k.key('x', 'x')).withId('key-x'), 'x');
      k.register('c', a.button('c').onClick(() => k.key('c', 'c')).withId('key-c'), 'c');
      k.register('v', a.button('v').onClick(() => k.key('v', 'v')).withId('key-v'), 'v');
      k.register('b', a.button('b').onClick(() => k.key('b', 'b')).withId('key-b'), 'b');
      k.register('n', a.button('n').onClick(() => k.key('n', 'n')).withId('key-n'), 'n');
      k.register('back', a.button('⌫').onClick(() => k.backspace('back')).withId('key-back'), '⌫');
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ROW 4: é è ç ―――― . ↵  (French accents directly accessible)
    // ═══════════════════════════════════════════════════════════════════════
    a.hbox(() => {
      k.register('e-acute', a.button('é').onClick(() => k.symbol('é', 'e-acute')).withId('key-e-acute'), 'é');
      k.register('e-grave', a.button('è').onClick(() => k.symbol('è', 'e-grave')).withId('key-e-grave'), 'è');
      k.register('c-cedilla', a.button('ç').onClick(() => k.symbol('ç', 'c-cedilla')).withId('key-c-cedilla'), 'ç');
      k.register('space', a.button('――――').onClick(() => k.space('space')).withId('key-space'), '――――');
      k.register('dot', a.button('.').onClick(() => k.symbol('.', 'dot')).withId('key-dot'), '.');
      k.register('enter', a.button('↵').onClick(() => k.enter('enter')).withId('key-enter'), '↵');
    });
  });
}
