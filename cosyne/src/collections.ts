/**
 * Collection builders for Cosyne
 * Allows rendering dynamic collections of primitives with efficient diffing
 */

import { CollectionBinding, CollectionBindingOptions } from './binding';
import { Primitive } from './primitives/base';
import { CosyneCircle } from './primitives/circle';
import { CosyneRect } from './primitives/rect';
import { CosyneLine } from './primitives/line';

/**
 * Collection builder that wraps primitives and manages rendering
 */
export class CollectionBuilder<T, P extends Primitive<any>> {
  private binding: CollectionBinding<T, P> | undefined;
  private items: P[] = [];

  constructor(
    private primitiveClass: new (...args: any[]) => P,
    private context: any
  ) {}

  /**
   * Bind this collection to a data source with render function and trackBy
   */
  bindTo(options: CollectionBindingOptions<T, P>): this {
    this.binding = new CollectionBinding(options);
    return this;
  }

  /**
   * Evaluate the binding and get rendered items
   */
  evaluate(): P[] {
    if (!this.binding) {
      return this.items;
    }

    const result = this.binding.evaluate();
    this.items = result.results;
    return this.items;
  }

  /**
   * Get current items
   */
  getItems(): P[] {
    return this.items;
  }

  /**
   * Get the underlying binding
   */
  getBinding(): CollectionBinding<T, P> | undefined {
    return this.binding;
  }
}

/**
 * Specialized collection builder for circles
 */
export class CirclesCollection extends CollectionBuilder<any, CosyneCircle> {
  constructor(context: any) {
    super(CosyneCircle, context);
  }
}

/**
 * Specialized collection builder for rectangles
 */
export class RectsCollection extends CollectionBuilder<any, CosyneRect> {
  constructor(context: any) {
    super(CosyneRect, context);
  }
}

/**
 * Specialized collection builder for lines
 */
export class LinesCollection extends CollectionBuilder<any, CosyneLine> {
  constructor(context: any) {
    super(CosyneLine, context);
  }
}
