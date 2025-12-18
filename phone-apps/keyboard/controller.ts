/**
 * Shared Keyboard Controller
 * Handles state, callbacks, and key logic - shared across all locale keyboards
 * See LICENSE for copyright information.
 */

import type { App } from '../../core/src/app';
import type { Button, MultiLineEntry } from '../../core/src/widgets/inputs';

export type OnTextCallback = (char: string) => void;
export type OnEnterCallback = () => void;
export type OnSpecialCallback = (key: string, ctrl: boolean) => void;
export type KeyboardMode = 'abc' | 'symbols' | 'fn';

/**
 * Keyboard controller - manages state and key actions
 * Each locale keyboard creates one and wires buttons to it
 */
export class KeyboardController {
  private _shift = false;
  private _ctrl = false;
  private _mode: KeyboardMode = 'abc';
  private onText: OnTextCallback;
  private onEnter: OnEnterCallback;
  private onSpecial: OnSpecialCallback;
  private buttons: Map<string, { btn: Button; label: string }> = new Map();
  private modeChangeListeners: Array<(mode: KeyboardMode) => void> = [];

  constructor(onText: OnTextCallback, onEnter: OnEnterCallback, onSpecial?: OnSpecialCallback) {
    this.onText = onText;
    this.onEnter = onEnter;
    this.onSpecial = onSpecial || (() => {});
  }

  get shift() { return this._shift; }
  get ctrl() { return this._ctrl; }
  get mode() { return this._mode; }

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
    let out = this._shift ? char.toUpperCase() : char;
    if (this._ctrl) {
      // Ctrl+letter sends control character (ASCII 1-26)
      const code = out.toUpperCase().charCodeAt(0) - 64;
      if (code >= 1 && code <= 26) {
        out = String.fromCharCode(code);
      }
      this._ctrl = false;
    }
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

  /** Tab */
  tab(id: string) {
    this.onText('\t');
    this.flash(id);
  }

  /** Escape */
  escape(id: string) {
    this.onSpecial('Escape', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  /** Function key (F1-F12) */
  fkey(n: number, id: string) {
    this.onSpecial(`F${n}`, this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  /** Cursor keys */
  cursorUp(id: string) {
    this.onSpecial('ArrowUp', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  cursorDown(id: string) {
    this.onSpecial('ArrowDown', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  cursorLeft(id: string) {
    this.onSpecial('ArrowLeft', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  cursorRight(id: string) {
    this.onSpecial('ArrowRight', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  /** Navigation keys */
  home(id: string) {
    this.onSpecial('Home', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  end(id: string) {
    this.onSpecial('End', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  pageUp(id: string) {
    this.onSpecial('PageUp', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  pageDown(id: string) {
    this.onSpecial('PageDown', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  insert(id: string) {
    this.onSpecial('Insert', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  delete(id: string) {
    this.onSpecial('Delete', this._ctrl);
    this.flash(id);
    this._ctrl = false;
  }

  /** Toggle shift */
  toggleShift() {
    this._shift = !this._shift;
  }

  /** Toggle ctrl */
  toggleCtrl() {
    this._ctrl = !this._ctrl;
  }

  /** Cycle through modes: abc → symbols → fn → abc */
  cycleMode(): KeyboardMode {
    if (this._mode === 'abc') {
      this._mode = 'symbols';
    } else if (this._mode === 'symbols') {
      this._mode = 'fn';
    } else {
      this._mode = 'abc';
    }
    this._shift = false;
    this._ctrl = false;
    this.modeChangeListeners.forEach(cb => cb(this._mode));
    return this._mode;
  }

  /** Register a mode change listener */
  onModeChange(callback: (mode: KeyboardMode) => void) {
    this.modeChangeListeners.push(callback);
  }

  /** Get mode button label */
  getModeLabel(): string {
    if (this._mode === 'abc') return '123';
    if (this._mode === 'symbols') return 'Fn';
    return 'abc';
  }

  // Legacy compatibility
  get symbols() { return this._mode === 'symbols'; }
  toggleSymbols(): boolean {
    this.cycleMode();
    return this._mode === 'symbols';
  }
}

/**
 * Test harness - text area + keyboard
 */
export interface TestHarness {
  controller: KeyboardController;
  textArea: MultiLineEntry;
  specialKeys: string[];
}

export function createTestHarness(
  a: App,
  buildKeyboard: (a: App, ctrl: KeyboardController) => void
): TestHarness {
  let textArea: MultiLineEntry;
  let content = '';
  const specialKeys: string[] = [];

  const ctrl = new KeyboardController(
    (char) => {
      if (char === '\b') {
        content = content.slice(0, -1);
      } else if (char === '\t') {
        content += '→'; // Visual tab indicator
      } else {
        content += char;
      }
      textArea?.setText(content);
    },
    () => {
      content += '\n';
      textArea?.setText(content);
    },
    (key, ctrlPressed) => {
      // Record special keys for testing
      const prefix = ctrlPressed ? 'Ctrl+' : '';
      specialKeys.push(`${prefix}${key}`);
      // Show in text area as [key]
      content += `[${prefix}${key}]`;
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

  return { controller: ctrl, textArea: textArea!, specialKeys };
}
