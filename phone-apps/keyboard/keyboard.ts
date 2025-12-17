/**
 * Virtual Keyboard for Mobile Phone Form Factor
 *
 * Port of QtFreeVirtualKeyboard to Tsyne TypeScript.
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
import type { Label } from '../../core/src/widgets/display';
import type { Button } from '../../core/src/widgets/inputs';

// Key layouts - QWERTY standard
const ROWS = {
  letters: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ],
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '&', '*', '?', '/'],
    ['_', '"', "'", '(', ')', '-', '+'],
  ],
};

/** Keyboard mode */
type KeyboardMode = 'letters' | 'symbols';

/** Callback when text is produced */
export type OnTextCallback = (text: string) => void;

/** Callback when enter is pressed */
export type OnEnterCallback = () => void;

/**
 * Virtual keyboard state and logic
 */
export class VirtualKeyboard {
  private mode: KeyboardMode = 'letters';
  private shift = false;
  private inputBuffer = '';
  private onText: OnTextCallback;
  private onEnter: OnEnterCallback;
  private displayLabel: Label | null = null;
  private shiftBtn: Button | null = null;
  private modeBtn: Button | null = null;

  constructor(onText: OnTextCallback, onEnter: OnEnterCallback) {
    this.onText = onText;
    this.onEnter = onEnter;
  }

  /** Get current display text */
  getText(): string { return this.inputBuffer; }

  /** Set display text externally */
  setText(text: string): void {
    this.inputBuffer = text;
    this.updateDisplay();
  }

  /** Clear all text */
  clear(): void { this.setText(''); }

  /** Handle key press by row and index (resolves character dynamically) */
  private pressKeyAt(row: number, index: number): void {
    const char = ROWS[this.mode][row]?.[index];
    if (!char) return;
    const output = this.shift ? char.toUpperCase() : char;
    this.inputBuffer += output;
    this.onText(output);
    this.updateDisplay();
    // Auto-disable shift after letter
    if (this.shift && this.mode === 'letters') {
      this.shift = false;
      this.updateShiftButton();
    }
  }

  /** Handle direct character press (for punctuation that doesn't change) */
  private pressChar(char: string): void {
    this.inputBuffer += char;
    this.onText(char);
    this.updateDisplay();
  }

  /** Handle backspace */
  private backspace(): void {
    if (this.inputBuffer.length > 0) {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      this.updateDisplay();
    }
  }

  /** Handle space */
  private space(): void {
    this.inputBuffer += ' ';
    this.onText(' ');
    this.updateDisplay();
  }

  /** Handle enter */
  private enter(): void {
    this.onEnter();
  }

  /** Toggle shift state */
  private toggleShift(): void {
    if (this.mode === 'symbols') {
      this.mode = 'letters';
    }
    this.shift = !this.shift;
    this.updateShiftButton();
  }

  /** Toggle between letters and symbols */
  private toggleMode(): void {
    this.mode = this.mode === 'letters' ? 'symbols' : 'letters';
    this.shift = false;
    this.updateModeButton();
    this.updateShiftButton();
  }

  /** Update display label */
  private updateDisplay(): void {
    this.displayLabel?.setText(this.inputBuffer || ' ');
  }

  /** Update shift button appearance */
  private updateShiftButton(): void {
    this.shiftBtn?.setText(this.shift ? 'SHIFT' : 'shift');
  }

  /** Update mode button label */
  private updateModeButton(): void {
    this.modeBtn?.setText(this.mode === 'letters' ? '123' : 'ABC');
  }

  /**
   * Build keyboard UI
   */
  buildUI(a: App, win: Window, showDisplay = true): void {
    a.vbox(() => {
      // Optional text display
      if (showDisplay) {
        a.padded(() => {
          this.displayLabel = a.label(' ').withId('keyboard-display');
        });
        a.separator();
      }

      // Row 1: QWERTYUIOP or 1234567890 (10 keys)
      a.hbox(() => {
        for (let i = 0; i < 10; i++) {
          const char = ROWS.letters[0][i];
          a.button(char)
            .onClick(() => this.pressKeyAt(0, i))
            .withId(`key-r1-${i}`);
        }
      });

      // Row 2: ASDFGHJKL or symbols (9 keys)
      a.hbox(() => {
        a.spacer(); // Center shorter row
        for (let i = 0; i < 9; i++) {
          const char = ROWS.letters[1][i];
          a.button(char)
            .onClick(() => this.pressKeyAt(1, i))
            .withId(`key-r2-${i}`);
        }
        a.spacer();
      });

      // Row 3: Shift + ZXCVBNM + Backspace (7 letter keys)
      a.hbox(() => {
        this.shiftBtn = a.button('shift')
          .onClick(() => this.toggleShift())
          .withId('key-shift');
        for (let i = 0; i < 7; i++) {
          const char = ROWS.letters[2][i];
          a.button(char)
            .onClick(() => this.pressKeyAt(2, i))
            .withId(`key-r3-${i}`);
        }
        a.button('<=')
          .onClick(() => this.backspace())
          .withId('key-backspace');
      });

      // Row 4: Mode + , + Space + . + Enter
      a.hbox(() => {
        this.modeBtn = a.button('123')
          .onClick(() => this.toggleMode())
          .withId('key-mode');
        a.button(',')
          .onClick(() => this.pressChar(','))
          .withId('key-comma');
        a.button('space')
          .onClick(() => this.space())
          .withId('key-space');
        a.button('.')
          .onClick(() => this.pressChar('.'))
          .withId('key-period');
        a.button('Enter')
          .onClick(() => this.enter())
          .withId('key-enter');
      });
    });
  }
}

/**
 * Create standalone keyboard demo app
 */
export function createKeyboardApp(a: App): VirtualKeyboard {
  const output: string[] = [];

  const keyboard = new VirtualKeyboard(
    (text) => { output.push(text); },
    () => { console.log('Enter pressed, text:', keyboard.getText()); }
  );

  a.window({ title: 'Keyboard', width: 400, height: 300 }, (win: Window) => {
    win.setContent(() => {
      keyboard.buildUI(a, win, true);
    });
    win.show();
  });

  return keyboard;
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Virtual Keyboard' }, (a: App) => {
    createKeyboardApp(a);
  });
}
