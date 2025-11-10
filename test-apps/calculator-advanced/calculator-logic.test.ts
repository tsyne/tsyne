/**
 * Pure Jest tests for Calculator Logic
 *
 * These tests run WITHOUT any UI - just pure JavaScript testing.
 * No Tsyne, no Fyne, no bridge process needed.
 *
 * Run with: npx jest calculator-logic.test.ts
 */

import { CalculatorLogic } from './calculator-logic';

describe('CalculatorLogic', () => {
  let calc: CalculatorLogic;

  beforeEach(() => {
    calc = new CalculatorLogic();
  });

  describe('Initial State', () => {
    test('should start with display showing 0', () => {
      expect(calc.getDisplay()).toBe('0');
    });

    test('should have correct initial state', () => {
      const state = calc.getState();
      expect(state.currentValue).toBe('0');
      expect(state.previousValue).toBe('0');
      expect(state.operator).toBeNull();
      expect(state.shouldResetDisplay).toBe(false);
    });
  });

  describe('Number Input', () => {
    test('should input single digit', () => {
      expect(calc.inputNumber('5')).toBe('5');
      expect(calc.getDisplay()).toBe('5');
    });

    test('should input multiple digits', () => {
      calc.inputNumber('1');
      calc.inputNumber('2');
      expect(calc.inputNumber('3')).toBe('123');
    });

    test('should replace leading zero', () => {
      expect(calc.inputNumber('7')).toBe('7');
    });

    test('should handle zero input', () => {
      calc.inputNumber('0');
      calc.inputNumber('0');
      expect(calc.getDisplay()).toBe('0');
    });

    test('should allow building number after zero', () => {
      calc.inputNumber('0');
      calc.inputNumber('5');
      expect(calc.getDisplay()).toBe('5');
    });
  });

  describe('Decimal Input', () => {
    test('should add decimal point', () => {
      calc.inputNumber('3');
      expect(calc.inputDecimal()).toBe('3.');
    });

    test('should handle decimal at start', () => {
      expect(calc.inputDecimal()).toBe('0.');
    });

    test('should not add multiple decimal points', () => {
      calc.inputNumber('3');
      calc.inputDecimal();
      calc.inputNumber('1');
      calc.inputDecimal(); // Should be ignored
      expect(calc.getDisplay()).toBe('3.1');
    });

    test('should allow decimal after operator', () => {
      calc.inputNumber('5');
      calc.inputOperator('+');
      expect(calc.inputDecimal()).toBe('0.');
    });
  });

  describe('Addition', () => {
    test('should add two numbers', () => {
      calc.inputNumber('5');
      calc.inputOperator('+');
      calc.inputNumber('3');
      expect(calc.calculate()).toBe('8');
    });

    test('should handle zero addition', () => {
      calc.inputNumber('5');
      calc.inputOperator('+');
      calc.inputNumber('0');
      expect(calc.calculate()).toBe('5');
    });

    test('should add decimals', () => {
      calc.inputNumber('1');
      calc.inputDecimal();
      calc.inputNumber('5');
      calc.inputOperator('+');
      calc.inputNumber('2');
      calc.inputDecimal();
      calc.inputNumber('5');
      expect(calc.calculate()).toBe('4');
    });
  });

  describe('Subtraction', () => {
    test('should subtract two numbers', () => {
      calc.inputNumber('9');
      calc.inputOperator('-');
      calc.inputNumber('4');
      expect(calc.calculate()).toBe('5');
    });

    test('should handle negative results', () => {
      calc.inputNumber('3');
      calc.inputOperator('-');
      calc.inputNumber('7');
      expect(calc.calculate()).toBe('-4');
    });
  });

  describe('Multiplication', () => {
    test('should multiply two numbers', () => {
      calc.inputNumber('6');
      calc.inputOperator('×');
      calc.inputNumber('7');
      expect(calc.calculate()).toBe('42');
    });

    test('should handle multiplication by zero', () => {
      calc.inputNumber('5');
      calc.inputOperator('×');
      calc.inputNumber('0');
      expect(calc.calculate()).toBe('0');
    });

    test('should multiply decimals', () => {
      calc.inputNumber('2');
      calc.inputDecimal();
      calc.inputNumber('5');
      calc.inputOperator('×');
      calc.inputNumber('4');
      expect(calc.calculate()).toBe('10');
    });
  });

  describe('Division', () => {
    test('should divide two numbers', () => {
      calc.inputNumber('8');
      calc.inputOperator('÷');
      calc.inputNumber('2');
      expect(calc.calculate()).toBe('4');
    });

    test('should handle division by zero', () => {
      calc.inputNumber('5');
      calc.inputOperator('÷');
      calc.inputNumber('0');
      expect(calc.calculate()).toBe('Error');
    });

    test('should handle decimal division', () => {
      calc.inputNumber('5');
      calc.inputOperator('÷');
      calc.inputNumber('2');
      expect(calc.calculate()).toBe('2.5');
    });

    test('should handle repeating decimals', () => {
      calc.inputNumber('1');
      calc.inputOperator('÷');
      calc.inputNumber('3');
      const result = calc.calculate();
      expect(parseFloat(result)).toBeCloseTo(0.333333, 5);
    });
  });

  describe('Chain Operations', () => {
    test('should handle consecutive operations', () => {
      calc.inputNumber('2');
      calc.inputOperator('+');
      calc.inputNumber('3');
      calc.inputOperator('+'); // Should calculate 2+3 and continue
      calc.inputNumber('4');
      expect(calc.calculate()).toBe('9');
    });

    test('should chain multiple different operators', () => {
      calc.inputNumber('2');
      calc.inputOperator('+');
      calc.inputNumber('3');
      calc.inputOperator('×');
      calc.inputNumber('4');
      expect(calc.calculate()).toBe('20'); // (2+3) * 4
    });
  });

  describe('Clear Function', () => {
    test('should clear to initial state', () => {
      calc.inputNumber('1');
      calc.inputNumber('2');
      calc.inputNumber('3');
      expect(calc.clear()).toBe('0');
    });

    test('should clear after calculation', () => {
      calc.inputNumber('5');
      calc.inputOperator('+');
      calc.inputNumber('3');
      calc.calculate();
      calc.clear();
      expect(calc.getDisplay()).toBe('0');
    });

    test('should reset all state', () => {
      calc.inputNumber('5');
      calc.inputOperator('+');
      calc.clear();
      const state = calc.getState();
      expect(state.operator).toBeNull();
      expect(state.previousValue).toBe('0');
    });
  });

  describe('Execute Helper', () => {
    test('should execute simple calculation', () => {
      expect(calc.execute('5 + 3 =')).toBe('8');
    });

    test('should execute complex calculation', () => {
      expect(calc.execute('2 + 3 × 4 =')).toBe('20');
    });

    test('should handle clear in sequence', () => {
      calc.execute('5 + 3');
      expect(calc.execute('C 7 =')).toBe('7');
    });

    test('should handle decimal input', () => {
      expect(calc.execute('3 . 1 4 =')).toBe('3.14');
    });
  });

  describe('Edge Cases', () => {
    test('should handle equals without operator', () => {
      calc.inputNumber('5');
      expect(calc.calculate()).toBe('5');
    });

    test('should handle multiple equals presses', () => {
      calc.inputNumber('5');
      calc.inputOperator('+');
      calc.inputNumber('3');
      calc.calculate();
      const result = calc.calculate(); // Second equals
      expect(result).toBe('8');
    });

    test('should handle operator change', () => {
      calc.inputNumber('5');
      calc.inputOperator('+');
      calc.inputOperator('×'); // Change mind
      calc.inputNumber('3');
      expect(calc.calculate()).toBe('15');
    });

    test('should handle very large numbers', () => {
      calc.execute('9 9 9 9 9 9 9 9 9 9');
      expect(calc.getDisplay()).toBe('9999999999');
    });

    test('should handle floating point precision', () => {
      calc.execute('0 . 1 + 0 . 2 =');
      const result = parseFloat(calc.getDisplay());
      expect(result).toBeCloseTo(0.3, 10);
    });
  });

  describe('State Immutability', () => {
    test('getState should return a copy', () => {
      const state1 = calc.getState();
      state1.currentValue = 'modified';
      const state2 = calc.getState();
      expect(state2.currentValue).toBe('0');
    });
  });
});
