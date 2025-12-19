/**
 * Full Calculator - Multi-base calculator with bitwise operations and memory
 *
 * Inspired by ChrysaLisp's calculator app.lisp
 * Features: dec/hex/bin/oct bases, bitwise ops, memory functions
 *
 * @tsyne-app:name Full Calculator
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="currentColor">
 *   <rect x="3" y="1" width="18" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
 *   <rect x="5" y="3" width="14" height="4" fill="currentColor" opacity="0.3"/>
 *   <circle cx="7" cy="10" r="1.2"/><circle cx="12" cy="10" r="1.2"/><circle cx="17" cy="10" r="1.2"/>
 *   <circle cx="7" cy="14" r="1.2"/><circle cx="12" cy="14" r="1.2"/><circle cx="17" cy="14" r="1.2"/>
 *   <circle cx="7" cy="18" r="1.2"/><circle cx="12" cy="18" r="1.2"/><circle cx="17" cy="18" r="1.2"/>
 * </svg>
 * SVG
 * @tsyne-app:category utilities
 * @tsyne-app:builder buildFullCalculator
 * @tsyne-app:count desktop-many
 */

import { app, App, Window, Label, Button } from '../core/src';
// In production: import { app, App, Window, Label, Button } from 'tsyne';

type Base = 'dec' | 'hex' | 'bin' | 'oct';

interface CalculatorState {
  display: string;
  currentValue: bigint;
  previousValue: bigint;
  operator: string | null;
  memory: bigint;
  base: Base;
  shouldResetDisplay: boolean;
  hasDecimalPoint: boolean;
}

// Build the full calculator UI (exported for testing)
export function buildFullCalculator(a: App) {
  // Instance-local state
  const state: CalculatorState = {
    display: '0',
    currentValue: 0n,
    previousValue: 0n,
    operator: null,
    memory: 0n,
    base: 'dec',
    shouldResetDisplay: false,
    hasDecimalPoint: false,
  };

  let displayLabel: Label | undefined;
  let baseLabel: Label | undefined;
  let memoryIndicator: Label | undefined;
  let win: Window | undefined;

  // Button references for enabling/disabling based on base
  const digitButtons: Map<string, Button> = new Map();

  // Format number for display in current base
  function formatDisplay(value: bigint): string {
    switch (state.base) {
      case 'hex':
        return value.toString(16).toUpperCase();
      case 'bin':
        return value.toString(2);
      case 'oct':
        return value.toString(8);
      default:
        return value.toString(10);
    }
  }

  // Parse display string to bigint in current base
  function parseDisplay(str: string): bigint {
    try {
      switch (state.base) {
        case 'hex':
          return BigInt('0x' + str);
        case 'bin':
          return BigInt('0b' + str);
        case 'oct':
          return BigInt('0o' + str);
        default:
          return BigInt(str);
      }
    } catch {
      return 0n;
    }
  }

  function updateDisplay(value: string) {
    state.display = value;
    state.currentValue = parseDisplay(value);
    if (displayLabel) {
      displayLabel.setText(value || '0');
    }
  }

  function updateDisplayFromValue(value: bigint) {
    state.currentValue = value;
    state.display = formatDisplay(value);
    if (displayLabel) {
      displayLabel.setText(state.display);
    }
  }

  function updateBaseLabel() {
    if (baseLabel) {
      baseLabel.setText(state.base.toUpperCase());
    }
  }

  function updateMemoryIndicator() {
    if (memoryIndicator) {
      memoryIndicator.setText(state.memory !== 0n ? 'M' : ' ');
    }
  }

  // Check if digit is valid for current base
  function isValidDigit(digit: string): boolean {
    const digitValue = parseInt(digit, 16);
    switch (state.base) {
      case 'bin':
        return digitValue < 2;
      case 'oct':
        return digitValue < 8;
      case 'dec':
        return digitValue < 10;
      case 'hex':
        return digitValue < 16;
    }
  }

  // Update button states based on current base
  function updateButtonStates() {
    digitButtons.forEach((button, digit) => {
      const valid = isValidDigit(digit);
      if (valid) {
        button.enable();
      } else {
        button.disable();
      }
    });
  }

  function handleDigit(digit: string) {
    if (!isValidDigit(digit)) return;

    if (state.shouldResetDisplay) {
      updateDisplay(digit);
      state.shouldResetDisplay = false;
    } else {
      const newValue = state.display === '0' ? digit : state.display + digit;
      updateDisplay(newValue);
    }
  }

  function handleOperator(op: string) {
    if (state.operator && !state.shouldResetDisplay) {
      calculate();
    }
    state.previousValue = state.currentValue;
    state.operator = op;
    state.shouldResetDisplay = true;
  }

  function calculate() {
    const prev = state.previousValue;
    const current = state.currentValue;
    if (!state.operator) return;

    let result: bigint;
    try {
      switch (state.operator) {
        case '+':
          result = prev + current;
          break;
        case '-':
          result = prev - current;
          break;
        case '*':
          result = prev * current;
          break;
        case '/':
          if (current === 0n) {
            updateDisplay('Error');
            state.operator = null;
            state.shouldResetDisplay = true;
            return;
          }
          result = prev / current;
          break;
        case '%':
          if (current === 0n) {
            updateDisplay('Error');
            state.operator = null;
            state.shouldResetDisplay = true;
            return;
          }
          result = prev % current;
          break;
        case 'AND':
          result = prev & current;
          break;
        case 'OR':
          result = prev | current;
          break;
        case 'XOR':
          result = prev ^ current;
          break;
        case '<<':
          result = prev << current;
          break;
        case '>>':
          result = prev >> current;
          break;
        case '>>>':
          // Logical right shift (treat as unsigned 64-bit)
          result = BigInt.asUintN(64, prev) >> current;
          break;
        default:
          result = current;
      }
      updateDisplayFromValue(result);
    } catch {
      updateDisplay('Error');
    }
    state.operator = null;
    state.shouldResetDisplay = true;
  }

  function handleUnary(op: string) {
    let result: bigint;
    switch (op) {
      case 'NOT':
        result = ~state.currentValue;
        break;
      case 'NEG':
        result = -state.currentValue;
        break;
      default:
        return;
    }
    updateDisplayFromValue(result);
    state.shouldResetDisplay = true;
  }

  // Memory functions
  function memoryClear() {
    state.memory = 0n;
    updateMemoryIndicator();
  }

  function memoryRecall() {
    updateDisplayFromValue(state.memory);
    state.shouldResetDisplay = true;
  }

  function memoryAdd() {
    state.memory = state.memory + state.currentValue;
    updateMemoryIndicator();
    state.shouldResetDisplay = true;
  }

  function memorySubtract() {
    state.memory = state.memory - state.currentValue;
    updateMemoryIndicator();
    state.shouldResetDisplay = true;
  }

  function clearEntry() {
    updateDisplay('0');
  }

  function allClear() {
    state.display = '0';
    state.currentValue = 0n;
    state.previousValue = 0n;
    state.operator = null;
    state.shouldResetDisplay = false;
    updateDisplay('0');
  }

  function setBase(newBase: Base) {
    // Convert current value to new base display
    state.base = newBase;
    updateDisplayFromValue(state.currentValue);
    updateBaseLabel();
    updateButtonStates();
  }

  // Helper to create digit button with tracking
  function digitButton(digit: string): Button {
    const btn = a.button(digit).onClick(() => handleDigit(digit)).withId(`btn-${digit}`);
    digitButtons.set(digit, btn);
    return btn;
  }

  // Helper to create operator button
  function opButton(label: string, op: string, id: string): Button {
    return a.button(label).onClick(() => handleOperator(op)).withId(id);
  }

  a.window({ title: 'Full Calculator', width: 280, height: 480 }, (w: Window) => {
    win = w;
    w.setContent(() => {
      a.vbox(() => {
        // Header row: base indicator and memory indicator
        a.hbox(() => {
          baseLabel = a.label('DEC').withId('base-label');
          a.spacer();
          memoryIndicator = a.label(' ').withId('memory-indicator');
        });

        // Base selector
        a.hbox(() => {
          a.button('DEC').onClick(() => setBase('dec')).withId('btn-dec');
          a.button('HEX').onClick(() => setBase('hex')).withId('btn-hex');
          a.button('BIN').onClick(() => setBase('bin')).withId('btn-bin');
          a.button('OCT').onClick(() => setBase('oct')).withId('btn-oct');
        });

        a.separator();

        // Display
        displayLabel = a.label('0').withId('calc-display');

        a.separator();

        // Button grid (4 columns, 9 rows) - matching ChrysaLisp layout
        a.grid(4, () => {
          // Row 1: Memory functions
          a.button('MC').onClick(() => memoryClear()).withId('btn-mc');
          a.button('MR').onClick(() => memoryRecall()).withId('btn-mr');
          a.button('M-').onClick(() => memorySubtract()).withId('btn-msub');
          a.button('M+').onClick(() => memoryAdd()).withId('btn-madd');

          // Row 2: Bitwise logic
          opButton('AND', 'AND', 'btn-and');
          opButton('OR', 'OR', 'btn-or');
          opButton('XOR', 'XOR', 'btn-xor');
          a.button('NOT').onClick(() => handleUnary('NOT')).withId('btn-not');

          // Row 3: Shifts and negation
          opButton('>>>', '>>>', 'btn-asr');
          opButton('>>', '>>', 'btn-shr');
          opButton('<<', '<<', 'btn-shl');
          a.button('NEG').onClick(() => handleUnary('NEG')).withId('btn-neg');

          // Row 4: D, E, F, %
          digitButton('D');
          digitButton('E');
          digitButton('F');
          opButton('%', '%', 'btn-mod');

          // Row 5: A, B, C, /
          digitButton('A');
          digitButton('B');
          digitButton('C');
          opButton('÷', '/', 'btn-div');

          // Row 6: 7, 8, 9, *
          digitButton('7');
          digitButton('8');
          digitButton('9');
          opButton('×', '*', 'btn-mul');

          // Row 7: 4, 5, 6, -
          digitButton('4');
          digitButton('5');
          digitButton('6');
          opButton('-', '-', 'btn-sub');

          // Row 8: 1, 2, 3, +
          digitButton('1');
          digitButton('2');
          digitButton('3');
          opButton('+', '+', 'btn-add');

          // Row 9: 0, CE, AC, =
          digitButton('0');
          a.button('CE').onClick(() => clearEntry()).withId('btn-ce');
          a.button('AC').onClick(() => allClear()).withId('btn-ac');
          a.button('=').onClick(() => calculate()).withId('btn-eq');
        });
      });
    });

    // Initialize button states for decimal mode
    updateButtonStates();
  });
}

// Skip auto-run when imported by test framework
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

if (!isTestEnvironment) {
  app({ title: 'Full Calculator' }, buildFullCalculator);
}
