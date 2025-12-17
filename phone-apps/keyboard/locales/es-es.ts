/**
 * Spanish (es-ES) Keyboard Layout
 * QWERTY with ñ and Spanish accented characters
 */

import type { KeyboardLayout } from '../keyboard';

export const EsES: KeyboardLayout = {
  name: 'Español',
  locale: 'es-ES',

  // QWERTY layout with ñ
  letters: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ],

  // Symbols with Spanish specifics (€, ¿, ¡, accents)
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡', '@'],
    ['€', '#', '&', '*', '!', '?', '+'],
  ],
};
