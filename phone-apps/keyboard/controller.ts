/**
 * Shared Keyboard Controller
 * Handles state, callbacks, and key logic - shared across all locale keyboards
 * See LICENSE for copyright information.
 */

import type { App } from '../../core/src/app';
import type { Button, MultiLineEntry } from '../../core/src/widgets/inputs';
import { refreshAllBindings } from '../../core/src/widgets/base';

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
  private modeChangeListeners: Array<(mode: KeyboardMode) => void> = [];
  private shiftChangeListeners: Array<(shift: boolean) => void> = [];

  constructor(onText: OnTextCallback, onEnter: OnEnterCallback, onSpecial?: OnSpecialCallback) {
    this.onText = onText;
    this.onEnter = onEnter;
    this.onSpecial = onSpecial || (() => {});
  }

  get shift() { return this._shift; }
  get ctrl() { return this._ctrl; }
  get mode() { return this._mode; }

  /** Flash a key to show it was pressed */
  flash(btn: Button, label: string) {
    btn.withStyle({ importance: 'warning' });
    setTimeout(() => btn.withStyle({ importance: 'medium' }), 120);
  }

  /** Press a character key */
  key(char: string, btn: Button) {
    const label = this._shift ? char.toUpperCase() : char;
    let out = label;
    if (this._ctrl) {
      // Ctrl+letter sends control character (ASCII 1-26)
      const code = out.toUpperCase().charCodeAt(0) - 64;
      if (code >= 1 && code <= 26) {
        out = String.fromCharCode(code);
      }
      this._ctrl = false;
    }
    this.onText(out);
    this.flash(btn, label);
    if (this._shift) {
      this._shift = false;
      this.shiftChangeListeners.forEach(cb => cb(false));
      refreshAllBindings();
    }
  }

  /** Press a symbol (no shift transformation) */
  symbol(char: string, btn: Button) {
    this.onText(char);
    this.flash(btn, char);
  }

  /** Backspace */
  backspace(btn: Button) {
    this.onText('\b');
    this.flash(btn, '⌫');
  }

  /** Space */
  space(btn: Button, label: string) {
    this.onText(' ');
    this.flash(btn, label);
  }

  /** Enter */
  enter(btn: Button) {
    this.onEnter();
    this.flash(btn, '↵');
  }

  /** Tab */
  tab(btn: Button) {
    this.onText('\t');
    this.flash(btn, 'Tab');
  }

  /** Escape */
  escape(btn: Button) {
    this.onSpecial('Escape', this._ctrl);
    this.flash(btn, 'Esc');
    this._ctrl = false;
  }

  /** Function key (F1-F12) */
  fkey(n: number, btn: Button) {
    this.onSpecial(`F${n}`, this._ctrl);
    this.flash(btn, `F${n}`);
    this._ctrl = false;
  }

  /** Cursor keys */
  cursorUp(btn: Button) {
    this.onSpecial('ArrowUp', this._ctrl);
    this.flash(btn, '↑');
    this._ctrl = false;
  }

  cursorDown(btn: Button) {
    this.onSpecial('ArrowDown', this._ctrl);
    this.flash(btn, '↓');
    this._ctrl = false;
  }

  cursorLeft(btn: Button) {
    this.onSpecial('ArrowLeft', this._ctrl);
    this.flash(btn, '←');
    this._ctrl = false;
  }

  cursorRight(btn: Button) {
    this.onSpecial('ArrowRight', this._ctrl);
    this.flash(btn, '→');
    this._ctrl = false;
  }

  /** Navigation keys */
  home(btn: Button) {
    this.onSpecial('Home', this._ctrl);
    this.flash(btn, 'Home');
    this._ctrl = false;
  }

  end(btn: Button) {
    this.onSpecial('End', this._ctrl);
    this.flash(btn, 'End');
    this._ctrl = false;
  }

  pageUp(btn: Button) {
    this.onSpecial('PageUp', this._ctrl);
    this.flash(btn, 'PgUp');
    this._ctrl = false;
  }

  pageDown(btn: Button) {
    this.onSpecial('PageDown', this._ctrl);
    this.flash(btn, 'PgDn');
    this._ctrl = false;
  }

  insert(btn: Button) {
    this.onSpecial('Insert', this._ctrl);
    this.flash(btn, 'Ins');
    this._ctrl = false;
  }

  delete(btn: Button) {
    this.onSpecial('Delete', this._ctrl);
    this.flash(btn, 'Del');
    this._ctrl = false;
  }

  /** Toggle shift */
  toggleShift() {
    this._shift = !this._shift;
    this.shiftChangeListeners.forEach(cb => cb(this._shift));
    refreshAllBindings();
  }

  /** Register a shift change listener */
  onShiftChange(callback: (shift: boolean) => void) {
    this.shiftChangeListeners.push(callback);
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
    refreshAllBindings();
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
 * Bridge-based Keyboard Controller
 * Uses bridge.send('typeRune') and bridge.send('typeKey') to inject keystrokes
 * to the currently focused widget - enables cross-app typing in PhoneTop
 */
export class BridgeKeyboardController {
  private _shift = false;
  private _ctrl = false;
  private _mode: KeyboardMode = 'abc';
  private bridge: { send: (type: string, payload: Record<string, unknown>) => Promise<unknown> };
  private modeChangeListeners: Array<(mode: KeyboardMode) => void> = [];
  private shiftChangeListeners: Array<(shift: boolean) => void> = [];

  constructor(bridge: { send: (type: string, payload: Record<string, unknown>) => Promise<unknown> }) {
    this.bridge = bridge;
  }

  get shift() { return this._shift; }
  get ctrl() { return this._ctrl; }
  get mode() { return this._mode; }

  /** Flash a key to show it was pressed */
  flash(btn: Button, label: string) {
    btn.withStyle({ importance: 'warning' });
    setTimeout(() => btn.withStyle({ importance: 'medium' }), 120);
  }

  /** Press a character key - injects rune to focused widget */
  key(char: string, btn: Button) {
    const label = this._shift ? char.toUpperCase() : char;
    let out = label;
    if (this._ctrl) {
      // Ctrl+letter sends control character (ASCII 1-26)
      const code = out.toUpperCase().charCodeAt(0) - 64;
      if (code >= 1 && code <= 26) {
        out = String.fromCharCode(code);
      }
      this._ctrl = false;
    }
    this.bridge.send('typeRune', { rune: out });
    this.flash(btn, label);
    if (this._shift) {
      this._shift = false;
      this.shiftChangeListeners.forEach(cb => cb(false));
      refreshAllBindings();
    }
  }

  /** Press a symbol (no shift transformation) */
  symbol(char: string, btn: Button) {
    this.bridge.send('typeRune', { rune: char });
    this.flash(btn, char);
  }

  /** Backspace - uses typeKey for special key */
  backspace(btn: Button) {
    this.bridge.send('typeKey', { key: 'BackSpace' });
    this.flash(btn, '⌫');
  }

  /** Space */
  space(btn: Button, label: string) {
    this.bridge.send('typeRune', { rune: ' ' });
    this.flash(btn, label);
  }

  /** Enter - uses typeKey */
  enter(btn: Button) {
    this.bridge.send('typeKey', { key: 'Return' });
    this.flash(btn, '↵');
  }

  /** Tab - uses typeKey */
  tab(btn: Button) {
    this.bridge.send('typeKey', { key: 'Tab' });
    this.flash(btn, 'Tab');
  }

  /** Escape */
  escape(btn: Button) {
    this.bridge.send('typeKey', { key: 'Escape' });
    this.flash(btn, 'Esc');
    this._ctrl = false;
  }

  /** Function key (F1-F12) */
  fkey(n: number, btn: Button) {
    this.bridge.send('typeKey', { key: `F${n}` });
    this.flash(btn, `F${n}`);
    this._ctrl = false;
  }

  /** Cursor keys */
  cursorUp(btn: Button) {
    this.bridge.send('typeKey', { key: 'Up' });
    this.flash(btn, '↑');
    this._ctrl = false;
  }

  cursorDown(btn: Button) {
    this.bridge.send('typeKey', { key: 'Down' });
    this.flash(btn, '↓');
    this._ctrl = false;
  }

  cursorLeft(btn: Button) {
    this.bridge.send('typeKey', { key: 'Left' });
    this.flash(btn, '←');
    this._ctrl = false;
  }

  cursorRight(btn: Button) {
    this.bridge.send('typeKey', { key: 'Right' });
    this.flash(btn, '→');
    this._ctrl = false;
  }

  /** Navigation keys */
  home(btn: Button) {
    this.bridge.send('typeKey', { key: 'Home' });
    this.flash(btn, 'Home');
    this._ctrl = false;
  }

  end(btn: Button) {
    this.bridge.send('typeKey', { key: 'End' });
    this.flash(btn, 'End');
    this._ctrl = false;
  }

  pageUp(btn: Button) {
    this.bridge.send('typeKey', { key: 'PageUp' });
    this.flash(btn, 'PgUp');
    this._ctrl = false;
  }

  pageDown(btn: Button) {
    this.bridge.send('typeKey', { key: 'PageDown' });
    this.flash(btn, 'PgDn');
    this._ctrl = false;
  }

  insert(btn: Button) {
    this.bridge.send('typeKey', { key: 'Insert' });
    this.flash(btn, 'Ins');
    this._ctrl = false;
  }

  delete(btn: Button) {
    this.bridge.send('typeKey', { key: 'Delete' });
    this.flash(btn, 'Del');
    this._ctrl = false;
  }

  /** Toggle shift */
  toggleShift() {
    this._shift = !this._shift;
    this.shiftChangeListeners.forEach(cb => cb(this._shift));
    refreshAllBindings();
  }

  /** Register a shift change listener */
  onShiftChange(callback: (shift: boolean) => void) {
    this.shiftChangeListeners.push(callback);
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
    refreshAllBindings();
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
 * Test harness - text area + keyboard with mode toggle
 */
export interface TestHarness {
  controller: KeyboardController | BridgeKeyboardController;
  textArea: MultiLineEntry;
  specialKeys: string[];
  mode: 'verbose' | 'real';
}

export type TestHarnessMode = 'verbose' | 'real';

// Shared state for test harness (persists across rebuilds)
let harnessState = {
  mode: 'verbose' as TestHarnessMode,
  content: '',
  specialKeys: [] as string[],
};

/**
 * Create a test harness with mode toggle
 * - Verbose mode: shows [ArrowLeft], [F1] etc. in text area (for testing)
 * - Real mode: uses bridge injection for actual cursor movement
 *
 * @param rebuildFn - Function to call to rebuild the entire window content
 */
export function createTestHarness(
  a: App,
  buildKeyboard: (a: App, ctrl: KeyboardController | BridgeKeyboardController) => void,
  rebuildFn?: () => void
): TestHarness {
  let textArea: MultiLineEntry;

  // Verbose mode controller - shows keys in text area
  const verboseCtrl = new KeyboardController(
    (char) => {
      if (char === '\b') {
        harnessState.content = harnessState.content.slice(0, -1);
      } else if (char === '\t') {
        harnessState.content += '→'; // Visual tab indicator
      } else {
        harnessState.content += char;
      }
      textArea?.setText(harnessState.content);
    },
    () => {
      harnessState.content += '\n';
      textArea?.setText(harnessState.content);
    },
    (key, ctrlPressed) => {
      // Record special keys for testing
      const prefix = ctrlPressed ? 'Ctrl+' : '';
      harnessState.specialKeys.push(`${prefix}${key}`);
      // Show in text area as [key]
      harnessState.content += `[${prefix}${key}]`;
      textArea?.setText(harnessState.content);
    }
  );

  // Real mode controller - uses bridge injection
  const realCtrl = new BridgeKeyboardController(a.getContext().bridge);

  // Get current active controller based on mode
  const controller = harnessState.mode === 'verbose' ? verboseCtrl : realCtrl;

  a.vbox(() => {
    a.padded(() => {
      a.vbox(() => {
        // Mode toggle row
        a.hbox(() => {
          a.label('Mode:');
          a.label(harnessState.mode === 'verbose' ? '[Verbose]' : 'Verbose');
          a.label(harnessState.mode === 'real' ? '[Real]' : 'Real');
          a.button('Toggle').onClick(() => {
            harnessState.mode = harnessState.mode === 'verbose' ? 'real' : 'verbose';
            if (rebuildFn) {
              rebuildFn();
            }
          });
        });
        a.label('Verbose=shows [keys], Real=actual cursor movement');

        a.separator();
        a.label('Output:');
        textArea = a.multilineentry().withId('text-area');

        // Restore content and focus in real mode
        if (harnessState.content) {
          textArea.setText(harnessState.content);
        }
        if (harnessState.mode === 'real') {
          setTimeout(() => textArea?.focus(), 100);
        }
      });
    });
    a.separator();

    // Build keyboard with current controller
    buildKeyboard(a, controller);
  });

  return {
    controller,
    textArea: textArea!,
    specialKeys: harnessState.specialKeys,
    mode: harnessState.mode
  };
}

/**
 * Reset test harness state (for testing)
 */
export function resetTestHarnessState(): void {
  harnessState = {
    mode: 'verbose',
    content: '',
    specialKeys: [],
  };
}
