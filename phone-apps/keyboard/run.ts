/**
 * Keyboard Test Harness Runner
 * Usage: ./scripts/tsyne phone-apps/keyboard/run.ts [locale]
 * Locales: en-us, en-gb, en-dvorak, fr-fr, es-es
 */

import { app } from '../../core/src/index';
import { createTestHarness, resetTestHarnessState } from './controller';

// Import all locale keyboards
import { buildKeyboard as buildEnUS } from './en-us/keyboard';
import { buildKeyboard as buildEnGB } from './en-gb/keyboard';
import { buildKeyboard as buildEnDvorak } from './en-dvorak/keyboard';
import { buildKeyboard as buildFrFR } from './fr-fr/keyboard';
import { buildKeyboard as buildEsES } from './es-es/keyboard';

const keyboards: Record<string, { build: typeof buildEnUS; name: string }> = {
  'en-us': { build: buildEnUS, name: 'English US' },
  'en-gb': { build: buildEnGB, name: 'English UK' },
  'en-dvorak': { build: buildEnDvorak, name: 'English Dvorak' },
  'fr-fr': { build: buildFrFR, name: 'French AZERTY' },
  'es-es': { build: buildEsES, name: 'Spanish' },
};

const locale = process.argv[2] || 'en-gb';
const keyboard = keyboards[locale];

if (!keyboard) {
  console.error(`Unknown locale: ${locale}`);
  console.error(`Available: ${Object.keys(keyboards).join(', ')}`);
  process.exit(1);
}

// Reset state for fresh start
resetTestHarnessState();

app({ title: `Keyboard: ${keyboard.name}` }, (a) => {
  a.window({ title: `Keyboard: ${keyboard.name}`, width: 420, height: 550 }, (win) => {
    // Rebuild function for mode toggle
    const rebuild = () => {
      win.setContent(() => createTestHarness(a, keyboard.build, rebuild));
    };

    // Initial build
    win.setContent(() => createTestHarness(a, keyboard.build, rebuild));
    win.show();
  });
});
