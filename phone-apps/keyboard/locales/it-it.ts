/**
 * Italian (it-IT) Keyboard Layout
 * QWERTY with Italian accented characters
 */

import type { KeyboardLayout } from '../keyboard';

export const ItIT: KeyboardLayout = {
  name: 'Italiano',
  locale: 'it-IT',

  // QWERTY layout (same as English)
  letters: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ],

  // Symbols with Italian accented characters
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['à', 'è', 'é', 'ì', 'í', 'ò', 'ó', 'ù', 'ú'],
    ['€', '@', '#', '&', '*', '!', '?'],
  ],
};
