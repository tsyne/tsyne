/**
 * State Management Utilities for Tsyne
 *
 * Provides reactive state management, data binding, and state passing capabilities
 * for building applications with various architectural patterns (MVC, MVVM, MVP).
 */

/**
 * Callback function type for state changes
 */
type StateChangeListener<T> = (newValue: T, oldValue: T) => void;

/**
 * Observable State
 *
 * Provides reactive state management with change notifications.
 * Perfect for implementing data binding and reactive UIs.
 *
 * @example
 * ```typescript
 * const count = new ObservableState(0);
 * count.subscribe((newVal, oldVal) => {
 *   console.log(`Count changed from ${oldVal} to ${newVal}`);
 * });
 * count.set(5); // Triggers subscriber
 * ```
 */
export class ObservableState<T> {
  private value: T;
  private listeners: Set<StateChangeListener<T>> = new Set();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  /**
   * Get the current value
   */
  get(): T {
    return this.value;
  }

  /**
   * Set a new value and notify all subscribers
   */
  set(newValue: T): void {
    const oldValue = this.value;
    if (oldValue !== newValue) {
      this.value = newValue;
      this.notifyListeners(newValue, oldValue);
    }
  }

  /**
   * Update the value using a function
   */
  update(updater: (current: T) => T): void {
    this.set(updater(this.value));
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StateChangeListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of a state change
   */
  private notifyListeners(newValue: T, oldValue: T): void {
    this.listeners.forEach(listener => listener(newValue, oldValue));
  }
}

/**
 * Computed State
 *
 * Derives its value from one or more observable states.
 * Automatically updates when dependencies change.
 *
 * @example
 * ```typescript
 * const firstName = new ObservableState('John');
 * const lastName = new ObservableState('Doe');
 * const fullName = new ComputedState(
 *   [firstName, lastName],
 *   (first, last) => `${first} ${last}`
 * );
 * ```
 */
export class ComputedState<T, TDeps extends any[]> {
  private value: T;
  private listeners: Set<StateChangeListener<T>> = new Set();
  private unsubscribers: (() => void)[] = [];

  constructor(
    dependencies: { [K in keyof TDeps]: ObservableState<TDeps[K]> },
    computeFn: (...values: TDeps) => T
  ) {
    // Initial computation
    this.value = computeFn(...dependencies.map(dep => dep.get()) as TDeps);

    // Subscribe to all dependencies
    dependencies.forEach(dep => {
      const unsubscribe = dep.subscribe(() => {
        this.recompute(dependencies, computeFn);
      });
      this.unsubscribers.push(unsubscribe);
    });
  }

  get(): T {
    return this.value;
  }

  subscribe(listener: StateChangeListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.listeners.clear();
  }

  private recompute(
    dependencies: { [K in keyof TDeps]: ObservableState<TDeps[K]> },
    computeFn: (...values: TDeps) => T
  ): void {
    const oldValue = this.value;
    this.value = computeFn(...dependencies.map(dep => dep.get()) as TDeps);
    if (oldValue !== this.value) {
      this.listeners.forEach(listener => listener(this.value, oldValue));
    }
  }
}

/**
 * State Store
 *
 * Centralized state management for larger applications.
 * Similar to Redux or Vuex, but simpler.
 *
 * @example
 * ```typescript
 * interface AppState {
 *   user: string;
 *   count: number;
 * }
 *
 * const store = new StateStore<AppState>({
 *   user: 'Guest',
 *   count: 0
 * });
 *
 * store.subscribe(state => console.log('State changed:', state));
 * store.update(state => ({ ...state, count: state.count + 1 }));
 * ```
 */
export class StateStore<T extends Record<string, any>> {
  private state: T;
  private listeners: Set<(state: T) => void> = new Set();

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  /**
   * Get the current state (read-only)
   */
  getState(): Readonly<T> {
    return this.state;
  }

  /**
   * Update the state
   */
  update(updater: (currentState: T) => T): void {
    const newState = updater(this.state);
    if (newState !== this.state) {
      this.state = newState;
      this.notifyListeners();
    }
  }

  /**
   * Update a specific property
   */
  set<K extends keyof T>(key: K, value: T[K]): void {
    if (this.state[key] !== value) {
      this.state = { ...this.state, [key]: value };
      this.notifyListeners();
    }
  }

  /**
   * Get a specific property
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

/**
 * Two-Way Binding Helper
 *
 * Binds a widget's text to an observable state, keeping them in sync.
 *
 * @example
 * ```typescript
 * const name = new ObservableState('');
 * const entry = entry('');
 *
 * bindToWidget(name, entry, {
 *   onWidgetChange: (widget) => widget.getText(),
 *   onStateChange: (widget, value) => widget.setText(value)
 * });
 * ```
 */
export interface BindingOptions<T, W> {
  onWidgetChange?: (widget: W) => Promise<T>;
  onStateChange?: (widget: W, value: T) => Promise<void>;
  transform?: (value: T) => string;
  parse?: (text: string) => T;
}

export class TwoWayBinding<T, W extends { setText(text: string): Promise<void>; getText(): Promise<string> }> {
  private unsubscribe?: () => void;

  constructor(
    private state: ObservableState<T>,
    private widget: W,
    private options: BindingOptions<T, W> = {}
  ) {}

  /**
   * Start the binding
   */
  bind(): void {
    const transform = this.options.transform || String;
    const parse = this.options.parse as any || ((x: string) => x);

    // Sync initial state to widget
    this.widget.setText(transform(this.state.get()));

    // Subscribe to state changes and update widget
    this.unsubscribe = this.state.subscribe(async (newValue) => {
      if (this.options.onStateChange) {
        await this.options.onStateChange(this.widget, newValue);
      } else {
        await this.widget.setText(transform(newValue));
      }
    });

    // Note: Widget -> State sync would require onChanged callback support
    // which would need to be added to the Entry widget
  }

  /**
   * Stop the binding
   */
  unbind(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}

/**
 * Dialog Result Pattern
 *
 * Allows passing state into a dialog/window and retrieving the result.
 *
 * @example
 * ```typescript
 * const dialog = new DialogResult<string>();
 *
 * // Show dialog and wait for result
 * const result = await dialog.show(() => {
 *   // Build dialog UI
 *   button('OK', () => dialog.resolve('User clicked OK'));
 *   button('Cancel', () => dialog.reject(new Error('Cancelled')));
 * });
 * ```
 */
export class DialogResult<T> {
  private promise?: Promise<T>;
  private resolveFunc?: (value: T) => void;
  private rejectFunc?: (error: Error) => void;

  /**
   * Show the dialog and return a promise that resolves with the result
   */
  async show(builder: () => void): Promise<T> {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolveFunc = resolve;
      this.rejectFunc = reject;
    });

    builder();

    return this.promise;
  }

  /**
   * Resolve the dialog with a value
   */
  resolve(value: T): void {
    if (this.resolveFunc) {
      this.resolveFunc(value);
    }
  }

  /**
   * Reject the dialog with an error
   */
  reject(error: Error): void {
    if (this.rejectFunc) {
      this.rejectFunc(error);
    }
  }
}

/**
 * ViewModel Base Class
 *
 * Base class for MVVM pattern ViewModels.
 * Provides observable properties and command binding.
 *
 * @example
 * ```typescript
 * class CounterViewModel extends ViewModel {
 *   count = new ObservableState(0);
 *
 *   increment = () => {
 *     this.count.update(c => c + 1);
 *   };
 * }
 * ```
 */
export abstract class ViewModel {
  private disposables: (() => void)[] = [];

  /**
   * Register a cleanup function
   */
  protected addDisposable(dispose: () => void): void {
    this.disposables.push(dispose);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.disposables.forEach(d => d());
    this.disposables = [];
  }
}

/**
 * Model Base Class
 *
 * Base class for MVC/MVP pattern Models.
 * Provides observable properties for data changes.
 */
export abstract class Model {
  private listeners: Set<() => void> = new Set();

  /**
   * Subscribe to model changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners that the model has changed
   */
  protected notifyChanged(): void {
    this.listeners.forEach(listener => listener());
  }
}
