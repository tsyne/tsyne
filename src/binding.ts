/**
 * Data Binding Module for Tsyne
 *
 * Provides reactive data binding similar to Fyne's data/binding package.
 * Allows widgets to automatically sync with data sources.
 *
 * @example
 * ```typescript
 * // Create a string binding
 * const name = new StringBinding('');
 *
 * // Bind to an entry widget
 * const entry = a.entry('Enter name');
 * name.bindEntry(entry);
 *
 * // Changes to binding update the widget
 * name.set('John');
 *
 * // Widget changes update the binding
 * // (via onChanged callback)
 * ```
 */

import { Entry, Label, Checkbox, Slider, ProgressBar, Select } from './widgets';

/**
 * Widget that has getText method - used for syncing values from widgets
 */
interface TextWidget {
  getText(): Promise<string>;
}

/**
 * Listener function type for binding changes
 */
export type BindingListener<T> = (value: T) => void;

/**
 * Base interface for all bindings
 */
export interface Binding<T> {
  /** Get the current value */
  get(): T;
  /** Set a new value and notify listeners */
  set(value: T): void;
  /** Subscribe to value changes */
  addListener(listener: BindingListener<T>): void;
  /** Unsubscribe from value changes */
  removeListener(listener: BindingListener<T>): void;
}

/**
 * Abstract base class for bindings
 */
abstract class BaseBinding<T> implements Binding<T> {
  protected value: T;
  protected listeners: Set<BindingListener<T>> = new Set();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(value: T): void {
    if (this.value !== value) {
      this.value = value;
      this.notifyListeners();
    }
  }

  addListener(listener: BindingListener<T>): void {
    this.listeners.add(listener);
  }

  removeListener(listener: BindingListener<T>): void {
    this.listeners.delete(listener);
  }

  protected notifyListeners(): void {
    const value = this.value;
    this.listeners.forEach(listener => listener(value));
  }
}

/**
 * String Binding - Binds to text-based widgets
 *
 * @example
 * ```typescript
 * const username = new StringBinding('');
 * username.bindEntry(usernameEntry);
 * username.bindLabel(usernameLabel);
 * ```
 */
export class StringBinding extends BaseBinding<string> {
  constructor(initialValue: string = '') {
    super(initialValue);
  }

  /**
   * Bind to an Entry widget (two-way binding)
   * @param entry The entry widget to bind
   * @param updateOnChange Whether to update binding on each keystroke
   */
  bindEntry(entry: Entry, updateOnChange: boolean = true): () => void {
    // Initial sync: binding -> widget
    entry.setText(this.value);

    // Binding -> Widget: update entry when binding changes
    const listener = (value: string) => {
      entry.setText(value);
    };
    this.addListener(listener);

    // If two-way binding is desired, we need an onChanged callback
    // This is handled via the entry's onSubmit or a polling mechanism
    // For now, we provide a method to manually sync widget -> binding

    return () => {
      this.removeListener(listener);
    };
  }

  /**
   * Bind to a Label widget (one-way binding)
   * @param label The label widget to bind
   */
  bindLabel(label: Label): () => void {
    // Initial sync
    label.setText(this.value);

    // Binding -> Widget
    const listener = (value: string) => {
      label.setText(value);
    };
    this.addListener(listener);

    return () => {
      this.removeListener(listener);
    };
  }

  /**
   * Sync from entry widget to binding
   * Call this to update the binding from the widget's current value
   * Works with any widget that has a getText() method (Entry, PasswordEntry, etc.)
   */
  async syncFromEntry(entry: TextWidget): Promise<void> {
    const text = await entry.getText();
    this.set(text);
  }

  /**
   * Create a computed string from this binding
   */
  compute<R>(transform: (value: string) => R): ComputedBinding<R> {
    return new ComputedBinding([this], ([str]) => transform(str as string));
  }
}

/**
 * Boolean Binding - Binds to checkbox widgets
 *
 * @example
 * ```typescript
 * const isEnabled = new BoolBinding(false);
 * isEnabled.bindCheckbox(enableCheckbox);
 * ```
 */
export class BoolBinding extends BaseBinding<boolean> {
  constructor(initialValue: boolean = false) {
    super(initialValue);
  }

  /**
   * Bind to a Checkbox widget (two-way binding)
   * Note: For full two-way binding, pass this binding's set method
   * to the checkbox's onChanged callback when creating it
   */
  bindCheckbox(checkbox: Checkbox): () => void {
    // Initial sync
    checkbox.setChecked(this.value);

    // Binding -> Widget
    const listener = (value: boolean) => {
      checkbox.setChecked(value);
    };
    this.addListener(listener);

    return () => {
      this.removeListener(listener);
    };
  }

  /**
   * Toggle the boolean value
   */
  toggle(): void {
    this.set(!this.value);
  }

  /**
   * Sync from checkbox widget to binding
   */
  async syncFromCheckbox(checkbox: Checkbox): Promise<void> {
    const checked = await checkbox.getChecked();
    this.set(checked);
  }
}

/**
 * Number Binding - Binds to numeric widgets (slider, progress bar)
 *
 * @example
 * ```typescript
 * const volume = new NumberBinding(50, 0, 100);
 * volume.bindSlider(volumeSlider);
 * ```
 */
export class NumberBinding extends BaseBinding<number> {
  private min?: number;
  private max?: number;

  constructor(initialValue: number = 0, min?: number, max?: number) {
    super(initialValue);
    this.min = min;
    this.max = max;
  }

  set(value: number): void {
    // Clamp to range if specified
    let clampedValue = value;
    if (this.min !== undefined && value < this.min) {
      clampedValue = this.min;
    }
    if (this.max !== undefined && value > this.max) {
      clampedValue = this.max;
    }
    super.set(clampedValue);
  }

  /**
   * Bind to a Slider widget
   */
  bindSlider(slider: Slider): () => void {
    // Initial sync
    slider.setValue(this.value);

    // Binding -> Widget
    const listener = (value: number) => {
      slider.setValue(value);
    };
    this.addListener(listener);

    return () => {
      this.removeListener(listener);
    };
  }

  /**
   * Bind to a ProgressBar widget (one-way binding)
   */
  bindProgressBar(progressBar: ProgressBar): () => void {
    // Initial sync
    progressBar.setProgress(this.value);

    // Binding -> Widget
    const listener = (value: number) => {
      progressBar.setProgress(value);
    };
    this.addListener(listener);

    return () => {
      this.removeListener(listener);
    };
  }

  /**
   * Sync from slider widget to binding
   */
  async syncFromSlider(slider: Slider): Promise<void> {
    const value = await slider.getValue();
    this.set(value);
  }

  /**
   * Get the minimum value
   */
  getMin(): number | undefined {
    return this.min;
  }

  /**
   * Get the maximum value
   */
  getMax(): number | undefined {
    return this.max;
  }
}

/**
 * Int Binding - Integer-specific binding
 */
export class IntBinding extends NumberBinding {
  set(value: number): void {
    super.set(Math.round(value));
  }
}

/**
 * Float Binding - Float-specific binding (alias for NumberBinding)
 */
export class FloatBinding extends NumberBinding {}

/**
 * Computed Binding - Derives value from other bindings
 *
 * @example
 * ```typescript
 * const firstName = new StringBinding('John');
 * const lastName = new StringBinding('Doe');
 *
 * const fullName = new ComputedBinding(
 *   [firstName, lastName],
 *   ([first, last]) => `${first} ${last}`
 * );
 *
 * fullName.bindLabel(nameLabel); // Shows "John Doe"
 * ```
 */
export class ComputedBinding<T> implements Binding<T> {
  private value: T;
  private listeners: Set<BindingListener<T>> = new Set();
  private dependencies: Binding<any>[];
  private computeFn: (values: any[]) => T;
  private unbinders: (() => void)[] = [];

  constructor(dependencies: Binding<any>[], computeFn: (values: any[]) => T) {
    this.dependencies = dependencies;
    this.computeFn = computeFn;

    // Compute initial value
    this.value = this.compute();

    // Subscribe to all dependencies
    dependencies.forEach(dep => {
      const listener = () => {
        this.recompute();
      };
      dep.addListener(listener);
      this.unbinders.push(() => dep.removeListener(listener));
    });
  }

  private compute(): T {
    const values = this.dependencies.map(dep => dep.get());
    return this.computeFn(values);
  }

  private recompute(): void {
    const newValue = this.compute();
    if (newValue !== this.value) {
      this.value = newValue;
      this.listeners.forEach(listener => listener(this.value));
    }
  }

  get(): T {
    return this.value;
  }

  set(_value: T): void {
    throw new Error('Cannot set value on a computed binding');
  }

  addListener(listener: BindingListener<T>): void {
    this.listeners.add(listener);
  }

  removeListener(listener: BindingListener<T>): void {
    this.listeners.delete(listener);
  }

  /**
   * Dispose of this computed binding
   */
  dispose(): void {
    this.unbinders.forEach(unbind => unbind());
    this.listeners.clear();
  }
}

/**
 * List Binding - Binds to list/array data
 *
 * @example
 * ```typescript
 * const items = new ListBinding<string>(['Apple', 'Banana']);
 *
 * items.addListener((list) => {
 *   console.log('List changed:', list);
 * });
 *
 * items.append('Cherry');
 * items.remove(0);
 * ```
 */
export class ListBinding<T> implements Binding<T[]> {
  private items: T[];
  private listeners: Set<BindingListener<T[]>> = new Set();

  constructor(initialItems: T[] = []) {
    this.items = [...initialItems];
  }

  get(): T[] {
    return [...this.items];
  }

  set(items: T[]): void {
    this.items = [...items];
    this.notifyListeners();
  }

  /**
   * Get item at index
   */
  getItem(index: number): T | undefined {
    return this.items[index];
  }

  /**
   * Set item at index
   */
  setItem(index: number, value: T): void {
    if (index >= 0 && index < this.items.length) {
      this.items[index] = value;
      this.notifyListeners();
    }
  }

  /**
   * Append an item to the list
   */
  append(item: T): void {
    this.items.push(item);
    this.notifyListeners();
  }

  /**
   * Prepend an item to the list
   */
  prepend(item: T): void {
    this.items.unshift(item);
    this.notifyListeners();
  }

  /**
   * Remove item at index
   */
  remove(index: number): T | undefined {
    if (index >= 0 && index < this.items.length) {
      const removed = this.items.splice(index, 1)[0];
      this.notifyListeners();
      return removed;
    }
    return undefined;
  }

  /**
   * Get the length of the list
   */
  length(): number {
    return this.items.length;
  }

  /**
   * Clear all items
   */
  clear(): void {
    if (this.items.length > 0) {
      this.items = [];
      this.notifyListeners();
    }
  }

  addListener(listener: BindingListener<T[]>): void {
    this.listeners.add(listener);
  }

  removeListener(listener: BindingListener<T[]>): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const items = this.get();
    this.listeners.forEach(listener => listener(items));
  }
}

/**
 * String List Binding - Convenient binding for string arrays
 * Useful for Select widget options
 */
export class StringListBinding extends ListBinding<string> {
  /**
   * Bind to a Select widget's selected value
   */
  bindSelect(select: Select, selectedBinding: StringBinding): () => void {
    // Note: Select options are set at creation time in Fyne
    // This binding updates the selected value

    const listener = (value: string) => {
      select.setSelected(value);
    };
    selectedBinding.addListener(listener);

    return () => {
      selectedBinding.removeListener(listener);
    };
  }
}

/**
 * Create bindings for form fields with automatic sync
 *
 * @example
 * ```typescript
 * const form = createFormBindings({
 *   username: '',
 *   email: '',
 *   age: 0,
 *   newsletter: false
 * });
 *
 * form.username.set('john_doe');
 * form.newsletter.toggle();
 * ```
 */
export function createFormBindings<T extends Record<string, string | number | boolean>>(
  initialValues: T
): { [K in keyof T]: T[K] extends string ? StringBinding : T[K] extends number ? NumberBinding : BoolBinding } {
  const bindings: any = {};

  for (const [key, value] of Object.entries(initialValues)) {
    if (typeof value === 'string') {
      bindings[key] = new StringBinding(value);
    } else if (typeof value === 'number') {
      bindings[key] = new NumberBinding(value);
    } else if (typeof value === 'boolean') {
      bindings[key] = new BoolBinding(value);
    }
  }

  return bindings;
}

/**
 * Bind a string binding to an entry with automatic two-way sync on submit
 *
 * @example
 * ```typescript
 * const name = new StringBinding('');
 * const entry = a.entry('Enter name', (text) => {
 *   bindEntryToString(entry, name);
 * });
 * ```
 */
export function bindEntryToString(entry: Entry, binding: StringBinding): void {
  entry.getText().then(text => binding.set(text));
}

/**
 * Create an onChanged handler that syncs to a binding
 */
export function syncToBinding<T>(binding: Binding<T>): (value: T) => void {
  return (value: T) => binding.set(value);
}
