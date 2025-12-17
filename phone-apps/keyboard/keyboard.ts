/**
 * Virtual Keyboard for Mobile Phone Form Factor
 *
 * Port of QtFreeVirtualKeyboard to Tsyne TypeScript.
 * Supports multiple locale layouts defined in pure TypeScript.
 * See LICENSE for copyright information.
 *
 * @tsyne-app:name Keyboard
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="8" width="2" height="2"/><rect x="9" y="8" width="2" height="2"/><rect x="13" y="8" width="2" height="2"/><rect x="17" y="8" width="2" height="2"/><rect x="6" y="12" width="12" height="2"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder createKeyboardApp
 * @tsyne-app:args app
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Button, MultiLineEntry } from '../../core/src/widgets/inputs';

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD LAYOUT TYPE - Pure TypeScript, no JSON/YAML configuration
// ═══════════════════════════════════════════════════════════════════════════

export interface KeyboardLayout {
  name: string;
  locale: string;
  letters: string[][];
  symbols: string[][];
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD MODE
// ═══════════════════════════════════════════════════════════════════════════

type KeyboardMode = 'letters' | 'symbols';

export type OnTextCallback = (text: string) => void;
export type OnEnterCallback = () => void;

// ═══════════════════════════════════════════════════════════════════════════
// VIRTUAL KEYBOARD CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class VirtualKeyboard {
  private mode: KeyboardMode = 'letters';
  private shift = false;
  private layout: KeyboardLayout;
  private onText: OnTextCallback;
  private onEnter: OnEnterCallback;
  private shiftBtn: Button | null = null;
  private modeBtn: Button | null = null;
  private keyButtons: Map<string, Button> = new Map();

  constructor(layout: KeyboardLayout, onText: OnTextCallback, onEnter: OnEnterCallback) {
    this.layout = layout;
    this.onText = onText;
    this.onEnter = onEnter;
  }

  getLayout(): KeyboardLayout { return this.layout; }

  private pressKeyAt(row: number, index: number): void {
    const rows = this.mode === 'letters' ? this.layout.letters : this.layout.symbols;
    const char = rows[row]?.[index];
    if (!char) return;
    const output = this.shift && this.mode === 'letters' ? char.toUpperCase() : char;
    this.onText(output);
    this.flashKey(`key-r${row + 1}-${index}`);
    if (this.shift && this.mode === 'letters') {
      this.shift = false;
      this.updateShiftButton();
      this.updateKeyLabels();
    }
  }

  private pressChar(char: string, keyId: string): void {
    this.onText(char);
    this.flashKey(keyId);
  }

  private keyLabels: Map<string, string> = new Map();

  private flashKey(keyId: string): void {
    const btn = this.keyButtons.get(keyId);
    const original = this.keyLabels.get(keyId);
    if (btn && original) {
      btn.setText(`»${original}«`);
      setTimeout(() => btn.setText(original), 150);
    }
  }

  private backspace(): void {
    this.onText('\b');
    this.flashKey('key-backspace');
  }

  private space(): void {
    this.onText(' ');
    this.flashKey('key-space');
  }

  private enter(): void {
    this.onEnter();
    this.flashKey('key-enter');
  }

  private toggleShift(): void {
    if (this.mode === 'symbols') {
      this.mode = 'letters';
      this.updateModeButton();
    }
    this.shift = !this.shift;
    this.updateShiftButton();
    this.updateKeyLabels();
  }

  private toggleMode(): void {
    this.mode = this.mode === 'letters' ? 'symbols' : 'letters';
    this.shift = false;
    this.updateModeButton();
    this.updateShiftButton();
    this.updateKeyLabels();
  }

  private updateShiftButton(): void {
    this.shiftBtn?.setText(this.shift ? '⇧' : '⇪');
  }

  private updateModeButton(): void {
    this.modeBtn?.setText(this.mode === 'letters' ? '123' : 'ABC');
  }

  private updateKeyLabels(): void {
    const rows = this.mode === 'letters' ? this.layout.letters : this.layout.symbols;
    for (let r = 0; r < rows.length; r++) {
      for (let i = 0; i < rows[r].length; i++) {
        const keyId = `key-r${r + 1}-${i}`;
        const btn = this.keyButtons.get(keyId);
        if (btn) {
          const char = rows[r][i];
          const label = this.shift && this.mode === 'letters' ? char.toUpperCase() : char;
          btn.setText(label);
          this.keyLabels.set(keyId, label);
        }
      }
    }
  }

  buildUI(a: App): void {
    const rows = this.layout.letters;
    this.keyButtons.clear();
    this.keyLabels.clear();

    const setKey = (id: string, label: string, btn: Button) => {
      this.keyButtons.set(id, btn);
      this.keyLabels.set(id, label);
    };

    a.vbox(() => {
      // Row 1: Top row (10 keys)
      a.hbox(() => {
        for (let i = 0; i < rows[0].length; i++) {
          const label = rows[0][i];
          const btn = a.button(label)
            .onClick(() => this.pressKeyAt(0, i))
            .withId(`key-r1-${i}`);
          setKey(`key-r1-${i}`, label, btn);
        }
      });

      // Row 2: Middle row (centered)
      a.hbox(() => {
        a.spacer();
        for (let i = 0; i < rows[1].length; i++) {
          const label = rows[1][i];
          const btn = a.button(label)
            .onClick(() => this.pressKeyAt(1, i))
            .withId(`key-r2-${i}`);
          setKey(`key-r2-${i}`, label, btn);
        }
        a.spacer();
      });

      // Row 3: Shift + letters + Backspace
      a.hbox(() => {
        this.shiftBtn = a.button('⇪')
          .onClick(() => this.toggleShift())
          .withId('key-shift');
        setKey('key-shift', '⇪', this.shiftBtn);

        for (let i = 0; i < rows[2].length; i++) {
          const label = rows[2][i];
          const btn = a.button(label)
            .onClick(() => this.pressKeyAt(2, i))
            .withId(`key-r3-${i}`);
          setKey(`key-r3-${i}`, label, btn);
        }

        const backBtn = a.button('⌫')
          .onClick(() => this.backspace())
          .withId('key-backspace');
        setKey('key-backspace', '⌫', backBtn);
      });

      // Row 4: Mode + comma + WIDE SPACE + period + Enter
      a.hbox(() => {
        this.modeBtn = a.button('123')
          .onClick(() => this.toggleMode())
          .withId('key-mode');
        setKey('key-mode', '123', this.modeBtn);

        const commaBtn = a.button(',')
          .onClick(() => this.pressChar(',', 'key-comma'))
          .withId('key-comma');
        setKey('key-comma', ',', commaBtn);

        // Wide spacebar
        const spaceBtn = a.button('―――――――')
          .onClick(() => this.space())
          .withId('key-space');
        setKey('key-space', '―――――――', spaceBtn);

        const periodBtn = a.button('.')
          .onClick(() => this.pressChar('.', 'key-period'))
          .withId('key-period');
        setKey('key-period', '.', periodBtn);

        const enterBtn = a.button('↵')
          .onClick(() => this.enter())
          .withId('key-enter');
        setKey('key-enter', '↵', enterBtn);
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST HARNESS - Text area + keyboard for testing
// ═══════════════════════════════════════════════════════════════════════════

export interface KeyboardTestHarness {
  keyboard: VirtualKeyboard;
  textArea: MultiLineEntry;
  getContent: () => Promise<string>;
}

export function createKeyboardTestHarness(
  a: App,
  layout: KeyboardLayout
): KeyboardTestHarness {
  let textArea: MultiLineEntry;
  let textContent = '';

  const keyboard = new VirtualKeyboard(
    layout,
    (char) => {
      if (char === '\b') {
        textContent = textContent.slice(0, -1);
      } else {
        textContent += char;
      }
      textArea?.setText(textContent);
    },
    () => {
      textContent += '\n';
      textArea?.setText(textContent);
    }
  );

  a.vbox(() => {
    // Text area at top - receives keyboard input
    a.padded(() => {
      a.vbox(() => {
        a.label('Output:').withId('output-label');
        textArea = a.multilineentry().withId('text-area');
      });
    });
    a.separator();

    // Keyboard below
    keyboard.buildUI(a);
  });

  return {
    keyboard,
    textArea: textArea!,
    getContent: async () => textArea?.getText() ?? '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDALONE APP
// ═══════════════════════════════════════════════════════════════════════════

export function createKeyboardApp(a: App, layout?: KeyboardLayout): VirtualKeyboard {
  const { EnUS } = require('./locales/en-us');
  const useLayout = layout ?? EnUS;
  let harness: KeyboardTestHarness;

  a.window({ title: `Keyboard - ${useLayout.name}`, width: 400, height: 450 }, (win: Window) => {
    win.setContent(() => {
      harness = createKeyboardTestHarness(a, useLayout);
    });
    win.show();
  });

  return harness!.keyboard;
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Virtual Keyboard' }, (a: App) => {
    createKeyboardApp(a);
  });
}
