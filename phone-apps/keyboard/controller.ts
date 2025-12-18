/**
 * Shared Keyboard Controller
 * Handles state, callbacks, and key logic - shared across all locale keyboards
 * See LICENSE for copyright information.
 */

import type { App } from '../../core/src/app';
import type { Button, MultiLineEntry } from '../../core/src/widgets/inputs';

export type OnTextCallback = (char: string) => void;
export type OnEnterCallback = () => void;

/**
 * Keyboard controller - manages state and key actions
 * Each locale keyboard creates one and wires buttons to it
 */
export class KeyboardController {
  private _shift = false;
  private _symbols = false;
  private onText: OnTextCallback;
  private onEnter: OnEnterCallback;
  private buttons: Map<string, { btn: Button; label: string }> = new Map();

  constructor(onText: OnTextCallback, onEnter: OnEnterCallback) {
    this.onText = onText;
    this.onEnter = onEnter;
  }

  get shift() { return this._shift; }
  get symbols() { return this._symbols; }

  /** Register a button for flash feedback */
  register(id: string, btn: Button, label: string) {
    this.buttons.set(id, { btn, label });
  }

  /** Flash a key to show it was pressed */
  flash(id: string) {
    const entry = this.buttons.get(id);
    if (entry) {
      entry.btn.setText(`»${entry.label}«`);
      setTimeout(() => entry.btn.setText(entry.label), 120);
    }
  }

  /** Press a character key */
  key(char: string, id: string) {
    const out = this._shift ? char.toUpperCase() : char;
    this.onText(out);
    this.flash(id);
    if (this._shift) {
      this._shift = false;
    }
  }

  /** Press a symbol (no shift transformation) */
  symbol(char: string, id: string) {
    this.onText(char);
    this.flash(id);
  }

  /** Backspace */
  backspace(id: string) {
    this.onText('\b');
    this.flash(id);
  }

  /** Space */
  space(id: string) {
    this.onText(' ');
    this.flash(id);
  }

  /** Enter */
  enter(id: string) {
    this.onEnter();
    this.flash(id);
  }

  /** Toggle shift */
  toggleShift() {
    this._shift = !this._shift;
  }

  /** Toggle symbols mode - returns new state for UI update */
  toggleSymbols(): boolean {
    this._symbols = !this._symbols;
    this._shift = false;
    return this._symbols;
  }
}

/**
 * Test harness - text area + keyboard
 */
export interface TestHarness {
  controller: KeyboardController;
  textArea: MultiLineEntry;
}

export function createTestHarness(
  a: App,
  buildKeyboard: (a: App, ctrl: KeyboardController) => void
): TestHarness {
  let textArea: MultiLineEntry;
  let content = '';

  const ctrl = new KeyboardController(
    (char) => {
      content = char === '\b' ? content.slice(0, -1) : content + char;
      textArea?.setText(content);
    },
    () => {
      content += '\n';
      textArea?.setText(content);
    }
  );

  a.vbox(() => {
    a.padded(() => {
      a.vbox(() => {
        a.label('Output:');
        textArea = a.multilineentry().withId('text-area');
      });
    });
    a.separator();
    buildKeyboard(a, ctrl);
  });

  return { controller: ctrl, textArea: textArea! };
}
