/**
 * UK English (en-GB) Keyboard Layout
 * QWERTY with UK-specific symbol positions
 * Key differences from US: £ on 3, @ and " swapped
 */

import type { KeyboardLayout } from '../keyboard';

export const EnGB: KeyboardLayout = {
  name: 'English (UK)',
  locale: 'en-GB',

  // Letter rows - standard QWERTY (same as US)
  letters: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ],

  // Symbol rows - UK specific (£ instead of #, @ and " positions differ)
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '"', '£', '$', '%', '^', '&', '*', '('],
    [')', '-', '=', '[', ']', '#', ';', "'"],
  ],
};
