/**
 * Reactive Form Tests
 *
 * Tests for the data binding system and reactive form demo.
 *
 * Usage:
 *   npm test examples/reactive-form.test.ts
 *   TSYNE_HEADED=1 npm test examples/reactive-form.test.ts  # Visual debugging
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { createReactiveFormApp } from './reactive-form';
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

describe('Reactive Form Integration Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display form with all fields', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createReactiveFormApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check form labels are visible
    await ctx.expect(ctx.getByText('First Name:')).toBeVisible();
    await ctx.expect(ctx.getByText('Last Name:')).toBeVisible();
    await ctx.expect(ctx.getByText('Email:')).toBeVisible();
    await ctx.expect(ctx.getByText('Age:')).toBeVisible();
  });

  test('should update full name when first and last name change', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createReactiveFormApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Fill sample data using the button
    await ctx.getByExactText('Fill Sample Data').click();

    // Check that the form summary shows the data
    await ctx.getByText('John Doe').within(1000).shouldExist();
  });

  test('should clear form when Clear button clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createReactiveFormApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Fill sample data first
    await ctx.getByExactText('Fill Sample Data').click();
    await ctx.getByText('John Doe').within(200).shouldExist();

    // Then clear
    await ctx.getByExactText('Clear Form').click();

    // Check that name label is reset
    await ctx.getByText('Enter your name').within(1000).shouldExist();
  });
});
