import { Context } from '../context';
import { AccessibilityOptions, registerGlobalBinding } from './base';
import { BoundList } from './containers_box';

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
 * Canvas Stack container - stacks canvas primitives on top of each other
 * Unlike regular Stack, this preserves absolute Position coordinates for
 * canvas.Line, canvas.Circle, etc. Use for clock faces, gauges, etc.
 */
export class CanvasStack {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasstack');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect children
    builder();

    // Pop the container and get the children
    const childIds = ctx.popContainer();

    // Create the CanvasStack with the children
    ctx.bridge.send('createCanvasStack', { id: this.id, childIds });
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

  /**
   * Set minimum height for the scroll container
   */
  withMinHeight(height: number): Scroll {
    this.ctx.bridge.send('setScrollMinHeight', { id: this.id, minHeight: height });
    return this;
  }

  /**
   * Set minimum size (width and height) for the scroll container
   */
  withMinSize(width: number, height: number): Scroll {
    this.ctx.bridge.send('setScrollMinSize', { id: this.id, minWidth: width, minHeight: height });
    return this;
  }

  /**
   * Set a custom widget ID for testing
   * @returns this for method chaining
   */
  withId(customId: string): Scroll {
    this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    });
    return this;
  }

  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWidget', {
      widgetId: this.id
    });
  }

  async show(): Promise<void> {
    await this.ctx.bridge.send('showWidget', {
      widgetId: this.id
    });
  }

  /**
   * Scroll to the bottom of the content
   */
  async scrollToBottom(): Promise<void> {
    await this.ctx.bridge.send('scrollToBottom', {
      widgetId: this.id
    });
  }

  /**
   * Scroll to the top of the content
   */
  async scrollToTop(): Promise<void> {
    await this.ctx.bridge.send('scrollToTop', {
      widgetId: this.id
    });
  }
}

/**
 * Options for Grid container
 */
export interface GridOptions {
  /** Spacing between items (in pixels). Default uses theme padding. Set to 0 for no spacing. */
  spacing?: number;
  /** Fixed cell size (in pixels). If set, all cells will be this size. Useful for chess boards, etc. */
  cellSize?: number;
}

/**
 * Grid layout container
 */
export class Grid {
  private ctx: Context;
  public id: string;
  private visibilityCondition?: () => Promise<void>;

  constructor(ctx: Context, columns: number, builder: () => void, options?: GridOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('grid');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect children
    builder();

    // Pop the container and get the children
    const children = ctx.popContainer();

    // Create the Grid with the children
    const payload: any = { id: this.id, columns, children };
    if (options?.spacing !== undefined) {
      payload.spacing = options.spacing;
    }
    if (options?.cellSize !== undefined) {
      payload.cellSize = options.cellSize;
    }
    ctx.bridge.send('createGrid', payload);
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

  /**
   * Dynamically add a widget to this container
   * @param builder Function that creates the widget to add
   */
  add(builder: () => void): void {
    this.ctx.pushContainer();
    builder();
    const newChildren = this.ctx.popContainer();

    for (const childId of newChildren) {
      this.ctx.bridge.send('containerAdd', {
        containerId: this.id,
        childId
      });
    }
  }

  /**
   * Remove all widgets from this container
   */
  removeAll(): void {
    this.ctx.bridge.send('containerRemoveAll', {
      containerId: this.id
    });
  }

  /**
   * Refresh the container display
   */
  refresh(): void {
    this.ctx.bridge.send('containerRefresh', {
      containerId: this.id
    });
  }

  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWidget', {
      widgetId: this.id
    });
  }

  async show(): Promise<void> {
    await this.ctx.bridge.send('showWidget', {
      widgetId: this.id
    });
  }

  /**
   * Declarative visibility control - show container when condition is true
   * MVC-style: automatically re-evaluates when refreshAllBindings() is called
   * @param conditionFn Function that returns whether container should be visible
   * @returns this for method chaining
   */
  when(conditionFn: () => boolean): this {
    const updateVisibility = async () => {
      const shouldShow = conditionFn();
      if (shouldShow) {
        await this.show();
      } else {
        await this.hide();
      }
    };

    this.visibilityCondition = updateVisibility;
    registerGlobalBinding(updateVisibility);
    updateVisibility();

    return this;
  }

  /**
   * Refresh the container - re-evaluates visibility conditions
   */
  async refreshVisibility(): Promise<void> {
    if (this.visibilityCondition) {
      await this.visibilityCondition();
    }
  }

  /**
   * Bind container to a data source with render/delete callbacks (ng-repeat style)
   * Smart diffing avoids flicker by reusing existing widgets.
   * Supports both MVVM (return widget) and MVC (return void with bindings) modes.
   *
   * @param getItems Function that returns the current items array
   * @param renderItem Function called to render each item. Receives (item, index, existing).
   *                   MVVM: return widget reference for reuse
   *                   MVC: return void, use bindFillColor/bindText for reactive updates
   * @param onDelete Optional function called when an item is removed
   * @param trackBy Optional function to extract unique key from item
   * @returns BoundList controller with update() method
   */
  bindTo<T, W = any>(
    getItems: () => T[],
    renderItem: (item: T, index: number, existing: W | null) => W | void,
    onDelete?: (item: T, index: number) => void,
    trackBy?: (item: T) => any
  ): BoundList<T, W> {
    return new BoundList(this.ctx, this as any, getItems, renderItem, onDelete, trackBy);
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
 * AspectRatio layout - maintains content at a fixed aspect ratio, centered
 * Useful for maintaining square canvases, video players, etc.
 */
export class AspectRatio {
  private ctx: Context;
  public id: string;

  /**
   * Create an aspect ratio container
   * @param ctx The context
   * @param ratio The aspect ratio (width/height). 1.0 for square, 16/9 for widescreen
   * @param builder Builder function for the child widget
   */
  constructor(ctx: Context, ratio: number, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('aspectratio');

    // Build child content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('AspectRatio must have exactly one child');
    }

    ctx.bridge.send('createAspectRatio', {
      id: this.id,
      childId: children[0],
      ratio: ratio
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

  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWidget', {
      widgetId: this.id
    });
  }

  async show(): Promise<void> {
    await this.ctx.bridge.send('showWidget', {
      widgetId: this.id
    });
  }
}

/**
 * Options for padded container
 */
export interface PaddedOptions {
  /** Uniform padding on all sides */
  p?: number;
  /** Padding top */
  pt?: number;
  /** Padding right */
  pr?: number;
  /** Padding bottom */
  pb?: number;
  /** Padding left */
  pl?: number;
}

/**
 * Padded container - adds standard inset padding around content
 * Wraps a single child with Fyne's theme-aware padding
 *
 * @example
 * // Default theme padding
 * padded(() => { label('Content'); });
 *
 * // Uniform 20px padding
 * padded(() => { label('Content'); }, { p: 20 });
 *
 * // Individual padding values
 * padded(() => { label('Content'); }, { pt: 10, pr: 20, pb: 10, pl: 20 });
 */
export class Padded {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, builder: () => void, options?: PaddedOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('padded');

    // Build child content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Padded must have exactly one child');
    }

    const payload: Record<string, unknown> = {
      id: this.id,
      childId: children[0]
    };

    // Add padding options if provided
    if (options) {
      if (options.p !== undefined) {
        payload.p = options.p;
      } else {
        if (options.pt !== undefined) payload.pt = options.pt;
        if (options.pr !== undefined) payload.pr = options.pr;
        if (options.pb !== undefined) payload.pb = options.pb;
        if (options.pl !== undefined) payload.pl = options.pl;
      }
    }

    ctx.bridge.send('createPadded', payload);

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

  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWidget', {
      widgetId: this.id
    });
  }

  async show(): Promise<void> {
    await this.ctx.bridge.send('showWidget', {
      widgetId: this.id
    });
  }
}

/**
 * GridWrap layout - wrapping grid with fixed item sizes
 */
export class GridWrap {
  private ctx: Context;
  public id: string;
  private visibilityCondition?: () => Promise<void>;

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

  /**
   * Register a custom ID for this container
   */
  withId(customId: string): this {
    this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    });
    return this;
  }

  /**
   * Dynamically add a widget to this container
   */
  add(builder: () => void): void {
    this.ctx.pushContainer();
    builder();
    const newChildren = this.ctx.popContainer();

    for (const childId of newChildren) {
      this.ctx.bridge.send('containerAdd', {
        containerId: this.id,
        childId
      });
    }
  }

  /**
   * Remove all widgets from this container
   */
  removeAll(): void {
    this.ctx.bridge.send('containerRemoveAll', {
      containerId: this.id
    });
  }

  /**
   * Refresh the container display
   */
  refresh(): void {
    this.ctx.bridge.send('containerRefresh', {
      containerId: this.id
    });
  }

  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWidget', {
      widgetId: this.id
    });
  }

  async show(): Promise<void> {
    await this.ctx.bridge.send('showWidget', {
      widgetId: this.id
    });
  }

  /**
   * Declarative visibility control
   * MVC-style: automatically re-evaluates when refreshAllBindings() is called
   */
  when(conditionFn: () => boolean): this {
    const updateVisibility = async () => {
      const shouldShow = conditionFn();
      if (shouldShow) {
        await this.show();
      } else {
        await this.hide();
      }
    };

    this.visibilityCondition = updateVisibility;
    registerGlobalBinding(updateVisibility);
    updateVisibility();

    return this;
  }

  async refreshVisibility(): Promise<void> {
    if (this.visibilityCondition) {
      await this.visibilityCondition();
    }
  }

  /**
   * Bind container to a data source (ng-repeat style)
   * Supports both MVVM and MVC modes.
   */
  bindTo<T, W = any>(
    getItems: () => T[],
    renderItem: (item: T, index: number, existing: W | null) => W | void,
    onDelete?: (item: T, index: number) => void,
    trackBy?: (item: T) => any
  ): BoundList<T, W> {
    return new BoundList(this.ctx, this as any, getItems, renderItem, onDelete, trackBy);
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
  private visibilityCondition?: () => Promise<void>;

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

  /**
   * Dynamically add a widget to this container
   */
  add(builder: () => void): void {
    this.ctx.pushContainer();
    builder();
    const newChildren = this.ctx.popContainer();

    for (const childId of newChildren) {
      this.ctx.bridge.send('containerAdd', {
        containerId: this.id,
        childId
      });
    }
  }

  /**
   * Remove all widgets from this container
   */
  removeAll(): void {
    this.ctx.bridge.send('containerRemoveAll', {
      containerId: this.id
    });
  }

  /**
   * Refresh the container display
   */
  refresh(): void {
    this.ctx.bridge.send('containerRefresh', {
      containerId: this.id
    });
  }

  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWidget', {
      widgetId: this.id
    });
  }

  async show(): Promise<void> {
    await this.ctx.bridge.send('showWidget', {
      widgetId: this.id
    });
  }

  /**
   * Declarative visibility control
   * MVC-style: automatically re-evaluates when refreshAllBindings() is called
   */
  when(conditionFn: () => boolean): this {
    const updateVisibility = async () => {
      const shouldShow = conditionFn();
      if (shouldShow) {
        await this.show();
      } else {
        await this.hide();
      }
    };

    this.visibilityCondition = updateVisibility;
    registerGlobalBinding(updateVisibility);
    updateVisibility();

    return this;
  }

  async refreshVisibility(): Promise<void> {
    if (this.visibilityCondition) {
      await this.visibilityCondition();
    }
  }

  /**
   * Bind container to a data source (ng-repeat style)
   * Supports both MVVM and MVC modes.
   */
  bindTo<T, W = any>(
    getItems: () => T[],
    renderItem: (item: T, index: number, existing: W | null) => W | void,
    onDelete?: (item: T, index: number) => void,
    trackBy?: (item: T) => any
  ): BoundList<T, W> {
    return new BoundList(this.ctx, this as any, getItems, renderItem, onDelete, trackBy);
  }
}

/**
 * Split container (horizontal or vertical)
 */
export class Split {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, orientation: 'horizontal' | 'vertical', leadingBuilder: () => void, trailingBuilder: () => void, offset?: number, fixed?: boolean) {
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

    if (fixed) {
      payload.fixed = true;
    }

    ctx.bridge.send('createSplit', payload);
    ctx.addToCurrentContainer(this.id);
  }
}
