/**
 * Binding system for Cosyne primitives
 *
 * Bindings store functions that are evaluated on refresh to update primitive properties.
 * This allows primitives to be animated or controlled by reactive state.
 */

/**
 * Deep equality check for objects - more efficient than JSON.stringify
 * Handles primitives, arrays, plain objects, Date, and null/undefined
 */
function deepEqual(a: unknown, b: unknown): boolean {
  // Strict equality (handles primitives, null, undefined, same reference)
  if (a === b) return true;

  // If either is null/undefined (and they're not equal), they differ
  if (a == null || b == null) return false;

  // Different types
  if (typeof a !== typeof b) return false;

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    }
    return true;
  }

  return false;
}

export type BindingFunction<T> = () => T;

export interface PositionBinding {
  x: number;
  y: number;
}

/**
 * Represents a single binding (function + last evaluated value)
 */
export class Binding<T> {
  private lastValue: T | undefined;

  constructor(private fn: BindingFunction<T>) {
    this.lastValue = undefined;
  }

  evaluate(): T {
    this.lastValue = this.fn();
    return this.lastValue;
  }

  getLastValue(): T | undefined {
    return this.lastValue;
  }
}

/**
 * Options for collection binding
 */
export interface CollectionBindingOptions<T, R> {
  items: BindingFunction<T[]>;
  render: (item: T, index: number) => R;
  trackBy: (item: T, index: number) => string | number;
}

/**
 * Represents a collection of rendered items with diffing
 */
export class CollectionBinding<T, R> {
  private lastItems: T[] = [];
  private lastResults: Map<string | number, R> = new Map();
  private currentResults: R[] = [];

  constructor(private options: CollectionBindingOptions<T, R>) {}

  evaluate(): { results: R[]; added: R[]; removed: R[]; updated: R[] } {
    const newItems = this.options.items();
    const added: R[] = [];
    const removed: R[] = [];
    const updated: R[] = [];

    // Build map of new items by key
    const newKeys = new Map<string | number, { item: T; index: number }>();
    for (let i = 0; i < newItems.length; i++) {
      const key = this.options.trackBy(newItems[i], i);
      newKeys.set(key, { item: newItems[i], index: i });
    }

    // Find removed and updated items
    const oldKeys = new Map<string | number, { item: T; index: number }>();
    for (let i = 0; i < this.lastItems.length; i++) {
      const key = this.options.trackBy(this.lastItems[i], i);
      oldKeys.set(key, { item: this.lastItems[i], index: i });

      if (!newKeys.has(key)) {
        const result = this.lastResults.get(key);
        if (result !== undefined) {
          removed.push(result);
        }
      }
    }

    // Build results array and find added items
    this.currentResults = [];
    for (let i = 0; i < newItems.length; i++) {
      const key = this.options.trackBy(newItems[i], i);
      let result = this.lastResults.get(key);

      if (!result) {
        // New item
        result = this.options.render(newItems[i], i);
        added.push(result);
      } else if (oldKeys.has(key)) {
        // Check if item changed (index moved or content changed)
        const oldIndex = oldKeys.get(key)!.index;
        if (i !== oldIndex || !deepEqual(newItems[i], this.lastItems[oldIndex])) {
          updated.push(result);
        }
      }

      this.lastResults.set(key, result);
      this.currentResults.push(result);
    }

    // Update state
    this.lastItems = [...newItems];

    return {
      results: this.currentResults,
      added,
      removed,
      updated
    };
  }

  getResults(): R[] {
    return this.currentResults;
  }

  getLastValue(): R[] {
    return this.currentResults;
  }
}

/**
 * Registry of all bindings in a Cosyne context
 * Manages evaluation and refresh of all bound primitives
 */
export class BindingRegistry {
  private bindings: Binding<any>[] = [];
  private collectionBindings: CollectionBinding<any, any>[] = [];

  register<T>(binding: Binding<T>): void {
    this.bindings.push(binding);
  }

  registerCollection<T, R>(binding: CollectionBinding<T, R>): void {
    this.collectionBindings.push(binding);
  }

  refreshAll(): void {
    for (const binding of this.bindings) {
      binding.evaluate();
    }
  }

  refreshCollections(): Array<{ results: any[]; added: any[]; removed: any[]; updated: any[] }> {
    const results: Array<{ results: any[]; added: any[]; removed: any[]; updated: any[] }> = [];
    for (const binding of this.collectionBindings) {
      results.push(binding.evaluate());
    }
    return results;
  }

  clear(): void {
    this.bindings = [];
    this.collectionBindings = [];
  }

  count(): number {
    return this.bindings.length + this.collectionBindings.length;
  }
}
