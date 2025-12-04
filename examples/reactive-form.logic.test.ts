/**
 * Data Binding Unit Tests
 *
 * Pure logic tests for the reactive data binding system.
 * These run without GUI dependencies.
 *
 * Usage:
 *   npm run test:logic
 */

import {
  StringBinding,
  BoolBinding,
  NumberBinding,
  ComputedBinding,
  ListBinding
} from '../src/binding';

describe('Data Binding Unit Tests', () => {
  describe('StringBinding', () => {
    test('should initialize with value', () => {
      const binding = new StringBinding('hello');
      expect(binding.get()).toBe('hello');
    });

    test('should update value and notify listeners', () => {
      const binding = new StringBinding('');
      const listener = jest.fn();
      binding.addListener(listener);

      binding.set('world');

      expect(binding.get()).toBe('world');
      expect(listener).toHaveBeenCalledWith('world');
    });

    test('should not notify if value unchanged', () => {
      const binding = new StringBinding('same');
      const listener = jest.fn();
      binding.addListener(listener);

      binding.set('same');

      expect(listener).not.toHaveBeenCalled();
    });

    test('should remove listener', () => {
      const binding = new StringBinding('');
      const listener = jest.fn();
      binding.addListener(listener);
      binding.removeListener(listener);

      binding.set('new');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('BoolBinding', () => {
    test('should initialize with value', () => {
      const binding = new BoolBinding(true);
      expect(binding.get()).toBe(true);
    });

    test('should toggle value', () => {
      const binding = new BoolBinding(false);
      binding.toggle();
      expect(binding.get()).toBe(true);
      binding.toggle();
      expect(binding.get()).toBe(false);
    });
  });

  describe('NumberBinding', () => {
    test('should initialize with value', () => {
      const binding = new NumberBinding(42);
      expect(binding.get()).toBe(42);
    });

    test('should clamp to min value', () => {
      const binding = new NumberBinding(50, 0, 100);
      binding.set(-10);
      expect(binding.get()).toBe(0);
    });

    test('should clamp to max value', () => {
      const binding = new NumberBinding(50, 0, 100);
      binding.set(150);
      expect(binding.get()).toBe(100);
    });

    test('should allow value within range', () => {
      const binding = new NumberBinding(50, 0, 100);
      binding.set(75);
      expect(binding.get()).toBe(75);
    });
  });

  describe('ComputedBinding', () => {
    test('should compute initial value', () => {
      const a = new StringBinding('Hello');
      const b = new StringBinding('World');
      const computed = new ComputedBinding([a, b], ([x, y]) => `${x} ${y}`);

      expect(computed.get()).toBe('Hello World');
    });

    test('should update when dependencies change', () => {
      const a = new StringBinding('Hello');
      const b = new StringBinding('World');
      const computed = new ComputedBinding([a, b], ([x, y]) => `${x} ${y}`);
      const listener = jest.fn();
      computed.addListener(listener);

      a.set('Hi');

      expect(computed.get()).toBe('Hi World');
      expect(listener).toHaveBeenCalledWith('Hi World');
    });

    test('should throw when trying to set value', () => {
      const a = new StringBinding('test');
      const computed = new ComputedBinding([a], ([x]) => x.toUpperCase());

      expect(() => computed.set('value')).toThrow('Cannot set value on a computed binding');
    });
  });

  describe('ListBinding', () => {
    test('should initialize with items', () => {
      const binding = new ListBinding(['a', 'b', 'c']);
      expect(binding.get()).toEqual(['a', 'b', 'c']);
    });

    test('should append item', () => {
      const binding = new ListBinding(['a', 'b']);
      binding.append('c');
      expect(binding.get()).toEqual(['a', 'b', 'c']);
    });

    test('should prepend item', () => {
      const binding = new ListBinding(['a', 'b']);
      binding.prepend('z');
      expect(binding.get()).toEqual(['z', 'a', 'b']);
    });

    test('should remove item at index', () => {
      const binding = new ListBinding(['a', 'b', 'c']);
      const removed = binding.remove(1);
      expect(removed).toBe('b');
      expect(binding.get()).toEqual(['a', 'c']);
    });

    test('should get item at index', () => {
      const binding = new ListBinding(['a', 'b', 'c']);
      expect(binding.getItem(1)).toBe('b');
    });

    test('should set item at index', () => {
      const binding = new ListBinding(['a', 'b', 'c']);
      binding.setItem(1, 'x');
      expect(binding.get()).toEqual(['a', 'x', 'c']);
    });

    test('should clear all items', () => {
      const binding = new ListBinding(['a', 'b', 'c']);
      binding.clear();
      expect(binding.get()).toEqual([]);
      expect(binding.length()).toBe(0);
    });

    test('should notify listeners on changes', () => {
      const binding = new ListBinding<string>([]);
      const listener = jest.fn();
      binding.addListener(listener);

      binding.append('item');

      expect(listener).toHaveBeenCalledWith(['item']);
    });
  });
});
