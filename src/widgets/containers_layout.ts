import { Context } from '../context';
import { AccessibilityOptions } from './base';

/**
 * Stack container - stacks widgets on top of each other
 * Useful for creating overlapping UI elements
 */
export class Stack {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('stack');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect children
    builder();

    // Pop the container and get the children
    const childIds = ctx.popContainer();

    // Create the Stack with the children
    ctx.bridge.send('createStack', { id: this.id, childIds });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Scroll container
 */
export class Scroll {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('scroll');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect content
    builder();

    // Pop the container and get the single child (content)
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Scroll container must have exactly one child');
    }

    const contentId = children[0];

    // Create the Scroll with the content
    ctx.bridge.send('createScroll', { id: this.id, contentId });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Grid layout container
 */
export class Grid {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, columns: number, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('grid');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect children
    builder();

    // Pop the container and get the children
    const children = ctx.popContainer();

    // Create the Grid with the children
    ctx.bridge.send('createGrid', { id: this.id, columns, children });
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Register a custom ID for this grid container
   * @param customId Custom ID to register
   * @returns this for method chaining
   */
  withId(customId: string): this {
    this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    });
    return this;
  }

  /**
   * Set accessibility properties for assistive technologies
   * @param options Accessibility options (label, description, role, hint)
   * @returns this for method chaining
   */
  accessibility(options: AccessibilityOptions): this {
    this.ctx.bridge.send('setAccessibility', {
      widgetId: this.id,
      ...options
    });
    return this;
  }
}

/**
 * Center layout - centers content in the available space
 */
export class Center {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('center');

    // Build child content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Center must have exactly one child');
    }

    ctx.bridge.send('createCenter', {
      id: this.id,
      childId: children[0]
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Max layout - stacks widgets on top of each other (Z-layering)
 * All widgets expand to fill the container (like CSS position: absolute with 100% width/height)
 * Useful for layering backgrounds and foregrounds, like a chess square + piece
 */
export class Max {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('max');

    // Build child content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length === 0) {
      throw new Error('Max must have at least one child');
    }

    ctx.bridge.send('createMax', {
      id: this.id,
      childIds: children
    });

    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Register a custom ID for this widget (for testing/debugging)
   * @param customId Custom ID to register
   * @returns this for method chaining
   */
  withId(customId: string): this {
    this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    });
    return this;
  }
}

/**
 * Padded container - adds standard inset padding around content
 * Wraps a single child with Fyne's theme-aware padding
 */
export class Padded {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('padded');

    // Build child content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Padded must have exactly one child');
    }

    ctx.bridge.send('createPadded', {
      id: this.id,
      childId: children[0]
    });

    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Register a custom ID for this container
   * @param customId Custom ID to register
   * @returns this for method chaining
   */
  withId(customId: string): this {
    this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    });
    return this;
  }
}

/**
 * Border layout - positions widgets at edges and center
 */
export class Border {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, config: {
    top?: () => void;
    bottom?: () => void;
    left?: () => void;
    right?: () => void;
    center?: () => void;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('border');

    const payload: any = { id: this.id };

    // Build each optional section
    if (config.top) {
      ctx.pushContainer();
      config.top();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.topId = children[0];
      }
    }

    if (config.bottom) {
      ctx.pushContainer();
      config.bottom();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.bottomId = children[0];
      }
    }

    if (config.left) {
      ctx.pushContainer();
      config.left();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.leftId = children[0];
      }
    }

    if (config.right) {
      ctx.pushContainer();
      config.right();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.rightId = children[0];
      }
    }

    if (config.center) {
      ctx.pushContainer();
      config.center();
      const children = ctx.popContainer();
      if (children.length === 1) {
        payload.centerId = children[0];
      }
    }

    ctx.bridge.send('createBorder', payload);
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * GridWrap layout - wrapping grid with fixed item sizes
 */
export class GridWrap {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, itemWidth: number, itemHeight: number, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('gridwrap');

    // Build children
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    ctx.bridge.send('createGridWrap', {
      id: this.id,
      itemWidth,
      itemHeight,
      children
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * WithoutLayout container - children are manually positioned using moveWidget()
 * Useful for free-form layouts like desktop icons
 */
export class WithoutLayout {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('withoutlayout');

    // Build children
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    ctx.bridge.send('createWithoutLayout', {
      id: this.id,
      children
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Clip container - clips any content that extends beyond the bounds of its child
 * Useful for constraining overflow in layouts and preventing content from bleeding outside containers
 */
export class Clip {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('clip');

    // Build child content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Clip must have exactly one child');
    }

    ctx.bridge.send('createClip', {
      id: this.id,
      childId: children[0]
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * AdaptiveGrid layout - responsive grid that adjusts columns based on width
 * Creates a grid layout where the number of columns (rowcols) determines
 * the minimum number of items per row. Items resize to fill available space.
 */
export class AdaptiveGrid {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, rowcols: number, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('adaptivegrid');

    // Build children
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    ctx.bridge.send('createAdaptiveGrid', {
      id: this.id,
      rowcols,
      children
    });

    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Register a custom ID for this container
   * @param customId Custom ID to register
   * @returns this for method chaining
   */
  withId(customId: string): this {
    this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    });
    return this;
  }
}

/**
 * Split container (horizontal or vertical)
 */
export class Split {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, orientation: 'horizontal' | 'vertical', leadingBuilder: () => void, trailingBuilder: () => void, offset?: number) {
    this.ctx = ctx;
    this.id = ctx.generateId('split');

    // Build leading content
    ctx.pushContainer();
    leadingBuilder();
    const leadingChildren = ctx.popContainer();
    if (leadingChildren.length !== 1) {
      throw new Error('Split leading section must have exactly one child');
    }
    const leadingId = leadingChildren[0];

    // Build trailing content
    ctx.pushContainer();
    trailingBuilder();
    const trailingChildren = ctx.popContainer();
    if (trailingChildren.length !== 1) {
      throw new Error('Split trailing section must have exactly one child');
    }
    const trailingId = trailingChildren[0];

    // Create the split container
    const payload: any = {
      id: this.id,
      orientation,
      leadingId,
      trailingId
    };

    if (offset !== undefined) {
      payload.offset = offset;
    }

    ctx.bridge.send('createSplit', payload);
    ctx.addToCurrentContainer(this.id);
  }
}
