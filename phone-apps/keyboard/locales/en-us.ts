/**
 * US English (en-US) Keyboard Layout
 * Standard QWERTY with US symbol positions
 */

import type { KeyboardLayout } from '../keyboard';

export const EnUS: KeyboardLayout = {
  name: 'English (US)',
  locale: 'en-US',

  // Letter rows - standard QWERTY
  letters: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ],

  // Symbol rows - US standard
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '^', '&', '*', '('],
    [')', '-', '=', '[', ']', '\\', ';', "'"],
  ],
};
