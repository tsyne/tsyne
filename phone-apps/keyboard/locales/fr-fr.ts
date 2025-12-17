/**
 * French (fr-FR) Keyboard Layout
 * AZERTY layout with French accented characters
 */

import type { KeyboardLayout } from '../keyboard';

export const FrFR: KeyboardLayout = {
  name: 'Français',
  locale: 'fr-FR',

  // AZERTY layout
  letters: [
    ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    ['w', 'x', 'c', 'v', 'b', 'n'],
  ],

  // Symbols with French specifics (€, accented chars)
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['é', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'ô', 'î'],
    ['ç', 'œ', '€', '@', '&', '#'],
  ],
};
