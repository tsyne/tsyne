import { Context } from '../context';
import { AccessibilityOptions } from './base';

/**
 * ModelBoundList - Smart list binding for containers (inspired by AngularJS ng-repeat)
 * Efficiently manages a list of items with intelligent diffing to avoid full rebuilds
 */
export class ModelBoundList<T> {
  private ctx: Context;
  private container: VBox;
  private items: T[];
  private keyFn: (item: T) => any = (item) => item;
  private builderFn?: (item: T) => any;
  private trackedItems = new Map<any, any>();

  constructor(ctx: Context, container: VBox, items: T[]) {
    this.ctx = ctx;
    this.container = container;
    this.items = items;
  }

  /**
   * Track items by key (like ng-repeat track by)
   * @param fn Function to extract unique key from item
   */
  trackBy(fn: (item: T) => any): ModelBoundList<T> {
    this.keyFn = fn;
    return this;
  }

  /**
   * Builder function for each item (called once per item)
   * @param builder Function that creates the view for an item
   */
  each(builder: (item: T) => any): void {
    this.builderFn = builder;

    // Initial render - create views for all items
    for (const item of this.items) {
      const key = this.keyFn(item);
      const widget = this.createItemView(item);
      this.trackedItems.set(key, widget);
    }
  }

  /**
   * Update the model - performs smart diff and only updates changed items
   * @param newItems New list of items
   */
  update(newItems: T[]): void {
    if (!this.builderFn) {
      throw new Error('Must call each() before update()');
    }

    const newKeys = new Set(newItems.map(item => this.keyFn(item)));
    const oldKeys = new Set(this.trackedItems.keys());

    // Find items to remove (in old but not in new)
    const toRemove = Array.from(oldKeys).filter(key => !newKeys.has(key));

    // Find items to add (in new but not in old)
    const toAdd = newItems.filter(item => !oldKeys.has(this.keyFn(item)));

    // If there are changes, rebuild the list
    // Future optimization: only add/remove changed items instead of full rebuild
    if (toRemove.length > 0 || toAdd.length > 0) {
      this.trackedItems.clear();
      this.container.removeAll();

      for (const item of newItems) {
        const key = this.keyFn(item);
        const widget = this.createItemView(item);
        this.trackedItems.set(key, widget);
      }

      this.container.refresh();
    }

    this.items = newItems;
  }

  /**
   * Refresh visibility of all items (re-evaluates when() conditions)
   */
  async refreshVisibility(): Promise<void> {
    for (const widget of this.trackedItems.values()) {
      if (widget && widget.refreshVisibility) {
        await widget.refreshVisibility();
      }
    }
  }

  private createItemView(item: T): any {
    let widget: any;
    this.container.add(() => {
      widget = this.builderFn!(item);
    });
    return widget;
  }
}

/**
 * VBox container (vertical box layout)
 */
export class VBox {
  private ctx: Context;
  public id: string;
  private visibilityCondition?: () => Promise<void>;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('vbox');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect children
    builder();

    // Pop the container and get the children
    const children = ctx.popContainer();

    // Create the VBox with the children
    ctx.bridge.send('createVBox', { id: this.id, children });
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Dynamically add a widget to this container (Fyne container.Add)
   * @param builder Function that creates the widget to add
   */
  add(builder: () => void): void {
    // Push this container as the current context
    this.ctx.pushContainer();

    // Execute builder to create the widget
    builder();

    // Get the widget IDs that were just created
    const newChildren = this.ctx.popContainer();

    // Send add command to bridge for each child
    for (const childId of newChildren) {
      this.ctx.bridge.send('containerAdd', {
        containerId: this.id,
        childId
      });
    }
  }

  /**
   * Remove all widgets from this container (Fyne container.Objects = nil)
   */
  removeAll(): void {
    this.ctx.bridge.send('containerRemoveAll', {
      containerId: this.id
    });
  }

  /**
   * Refresh the container display (Fyne container.Refresh)
   */
  refresh(): void {
    this.ctx.bridge.send('containerRefresh', {
      containerId: this.id
    });
  }

  /**
   * Create a model-bound list for smart list rendering (AngularJS ng-repeat style)
   * @param items Initial array of items
   * @returns ModelBoundList instance for chaining trackBy() and each()
   */
  model<T>(items: T[]): ModelBoundList<T> {
    return new ModelBoundList(this.ctx, this, items);
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

    // Store for reactive re-evaluation
    this.visibilityCondition = updateVisibility;
    updateVisibility(); // Initial evaluation

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
}

/**
 * HBox container (horizontal box layout)
 */
export class HBox {
  private ctx: Context;
  public id: string;
  private visibilityCondition?: () => Promise<void>;

  constructor(ctx: Context, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('hbox');

    // Push a new container context
    ctx.pushContainer();

    // Execute the builder function to collect children
    builder();

    // Pop the container and get the children
    const children = ctx.popContainer();

    // Create the HBox with the children
    ctx.bridge.send('createHBox', { id: this.id, children });
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Dynamically add a widget to this container (Fyne container.Add)
   * @param builder Function that creates the widget to add
   */
  add(builder: () => void): void {
    // Push this container as the current context
    this.ctx.pushContainer();

    // Execute builder to create the widget
    builder();

    // Get the widget IDs that were just created
    const newChildren = this.ctx.popContainer();

    // Send add command to bridge for each child
    for (const childId of newChildren) {
      this.ctx.bridge.send('containerAdd', {
        containerId: this.id,
        childId
      });
    }
  }

  /**
   * Remove all widgets from this container (Fyne container.Objects = nil)
   */
  removeAll(): void {
    this.ctx.bridge.send('containerRemoveAll', {
      containerId: this.id
    });
  }

  /**
   * Refresh the container display (Fyne container.Refresh)
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

    // Store for reactive re-evaluation
    this.visibilityCondition = updateVisibility;
    updateVisibility(); // Initial evaluation

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

/**
 * Tabs container (AppTabs)
 */
export class Tabs {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, tabDefinitions: Array<{title: string, builder: () => void}>, location?: 'top' | 'bottom' | 'leading' | 'trailing') {
    this.ctx = ctx;
    this.id = ctx.generateId('tabs');

    // Build each tab's content
    const tabs: Array<{title: string, contentId: string}> = [];

    for (const tabDef of tabDefinitions) {
      ctx.pushContainer();
      tabDef.builder();
      const children = ctx.popContainer();

      if (children.length !== 1) {
        throw new Error(`Tab "${tabDef.title}" must have exactly one child widget`);
      }

      tabs.push({
        title: tabDef.title,
        contentId: children[0]
      });
    }

    // Create the tabs container
    const payload: any = {
      id: this.id,
      tabs
    };

    if (location) {
      payload.location = location;
    }

    ctx.bridge.send('createTabs', payload);
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * DocTabs container (tabs with close buttons)
 * Suitable for document-style interfaces like text editors
 */
export class DocTabs {
  private ctx: Context;
  public id: string;
  private tabInfos: Array<{title: string, contentId: string}> = [];

  constructor(
    ctx: Context,
    tabDefinitions: Array<{title: string, builder: () => void}>,
    options?: {
      location?: 'top' | 'bottom' | 'leading' | 'trailing';
      onClosed?: (tabIndex: number, tabTitle: string) => void;
    }
  ) {
    this.ctx = ctx;
    this.id = ctx.generateId('doctabs');

    // Build each tab's content
    const tabs: Array<{title: string, contentId: string}> = [];

    for (const tabDef of tabDefinitions) {
      ctx.pushContainer();
      tabDef.builder();
      const children = ctx.popContainer();

      if (children.length !== 1) {
        throw new Error(`Tab "${tabDef.title}" must have exactly one child widget`);
      }

      tabs.push({
        title: tabDef.title,
        contentId: children[0]
      });
    }

    this.tabInfos = tabs;

    // Create the doctabs container
    const payload: any = {
      id: this.id,
      tabs
    };

    if (options?.location) {
      payload.location = options.location;
    }

    // Register close callback if provided
    if (options?.onClosed) {
      const closeCallbackId = ctx.generateId('callback');
      ctx.bridge.registerEventHandler(closeCallbackId, (data: any) => {
        options.onClosed!(data.tabIndex, data.tabTitle);
      });
      payload.closeCallbackId = closeCallbackId;
    }

    ctx.bridge.send('createDocTabs', payload);
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Append a new tab to the DocTabs
   * @param title Tab title
   * @param builder Function to build the tab content
   * @param select Whether to select the new tab after adding
   */
  async append(title: string, builder: () => void, select: boolean = true): Promise<void> {
    this.ctx.pushContainer();
    builder();
    const children = this.ctx.popContainer();

    if (children.length !== 1) {
      throw new Error(`Tab "${title}" must have exactly one child widget`);
    }

    const contentId = children[0];
    this.tabInfos.push({ title, contentId });

    await this.ctx.bridge.send('docTabsAppend', {
      id: this.id,
      title,
      contentId,
      select
    });
  }

  /**
   * Remove a tab by index
   * @param tabIndex Index of the tab to remove
   */
  async remove(tabIndex: number): Promise<void> {
    await this.ctx.bridge.send('docTabsRemove', {
      id: this.id,
      tabIndex
    });
    this.tabInfos.splice(tabIndex, 1);
  }

  /**
   * Select a tab by index
   * @param tabIndex Index of the tab to select
   */
  async select(tabIndex: number): Promise<void> {
    await this.ctx.bridge.send('docTabsSelect', {
      id: this.id,
      tabIndex
    });
  }

  /**
   * Get the number of tabs
   */
  getTabCount(): number {
    return this.tabInfos.length;
  }

  /**
   * Get tab titles
   */
  getTabTitles(): string[] {
    return this.tabInfos.map(t => t.title);
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
 * Card container with title, subtitle, and content
 */
export class Card {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, title: string, subtitle: string, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('card');

    // Build card content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Card must have exactly one child');
    }

    ctx.bridge.send('createCard', {
      id: this.id,
      title,
      subtitle,
      contentId: children[0]
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Accordion - collapsible sections
 */
export class Accordion {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, items: Array<{title: string, builder: () => void}>) {
    this.ctx = ctx;
    this.id = ctx.generateId('accordion');

    // Build each accordion item's content
    const accordionItems: Array<{title: string, contentId: string}> = [];

    for (const item of items) {
      ctx.pushContainer();
      item.builder();
      const children = ctx.popContainer();

      if (children.length !== 1) {
        throw new Error(`Accordion item "${item.title}" must have exactly one child`);
      }

      accordionItems.push({
        title: item.title,
        contentId: children[0]
      });
    }

    ctx.bridge.send('createAccordion', {
      id: this.id,
      items: accordionItems
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Form widget with labeled fields and submit/cancel buttons
 */
export class Form {
  private ctx: Context;
  public id: string;

  constructor(
    ctx: Context,
    items: Array<{label: string, widget: any}>,
    onSubmit?: () => void,
    onCancel?: () => void
  ) {
    this.ctx = ctx;
    this.id = ctx.generateId('form');

    const formItems = items.map(item => ({
      label: item.label,
      widgetId: item.widget.id
    }));

    const payload: any = {
      id: this.id,
      items: formItems
    };

    if (onSubmit) {
      const submitCallbackId = ctx.generateId('callback');
      payload.submitCallbackId = submitCallbackId;
      ctx.bridge.registerEventHandler(submitCallbackId, (_data: any) => {
        onSubmit();
      });
    }

    if (onCancel) {
      const cancelCallbackId = ctx.generateId('callback');
      payload.cancelCallbackId = cancelCallbackId;
      ctx.bridge.registerEventHandler(cancelCallbackId, (_data: any) => {
        onCancel();
      });
    }

    ctx.bridge.send('createForm', payload);
    ctx.addToCurrentContainer(this.id);
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
 * InnerWindow - a window-like container that can be placed inside a canvas
 * Useful for MDI (Multiple Document Interface) applications
 */
export class InnerWindow {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, title: string, builder: () => void, onClose?: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('innerwindow');

    // Build content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('InnerWindow must have exactly one child');
    }

    const contentId = children[0];

    const payload: any = {
      id: this.id,
      title,
      contentId
    };

    if (onClose) {
      const closeCallbackId = ctx.generateId('callback');
      payload.onCloseCallbackId = closeCallbackId;
      ctx.bridge.registerEventHandler(closeCallbackId, () => {
        onClose();
      });
    }

    ctx.bridge.send('createInnerWindow', payload);
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Close the inner window
   */
  async close(): Promise<void> {
    await this.ctx.bridge.send('innerWindowClose', {
      widgetId: this.id
    });
  }

  /**
   * Set the title of the inner window
   */
  async setTitle(title: string): Promise<void> {
    await this.ctx.bridge.send('setInnerWindowTitle', {
      widgetId: this.id,
      title
    });
  }

  /**
   * Hide the inner window
   */
  async hide(): Promise<void> {
    await this.ctx.bridge.send('hideWidget', {
      widgetId: this.id
    });
  }

  /**
   * Show the inner window
   */
  async show(): Promise<void> {
    await this.ctx.bridge.send('showWidget', {
      widgetId: this.id
    });
  }

  /**
   * Register a custom ID for this inner window (for test framework getByID)
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
 * ThemeOverride container - applies a specific theme (dark/light) to its contents
 * This allows different regions of the UI to have different themes
 */
export class ThemeOverride {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, variant: 'dark' | 'light', builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('themeoverride');

    // Build child content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('ThemeOverride must have exactly one child');
    }

    ctx.bridge.send('createThemeOverride', {
      id: this.id,
      childId: children[0],
      variant
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Navigation options for creating a navigation container
 */
export interface NavigationOptions {
  /** Optional title for the root level */
  title?: string;
  /** Callback when back button is pressed */
  onBack?: () => void;
  /** Callback when forward button is pressed */
  onForward?: () => void;
}

/**
 * Navigation container - stack-based navigation with back/forward controls
 * Provides a navigation bar with title and manages a stack of content views
 */
export class Navigation {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, rootBuilder: () => void, options?: NavigationOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('navigation');

    // Build root content
    ctx.pushContainer();
    rootBuilder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Navigation must have exactly one root child');
    }

    const rootId = children[0];

    const payload: any = {
      id: this.id,
      rootId
    };

    if (options?.title) {
      payload.title = options.title;
    }

    if (options?.onBack) {
      const onBackCallbackId = ctx.generateId('callback');
      payload.onBackCallbackId = onBackCallbackId;
      ctx.bridge.registerEventHandler(onBackCallbackId, () => {
        options.onBack!();
      });
    }

    if (options?.onForward) {
      const onForwardCallbackId = ctx.generateId('callback');
      payload.onForwardCallbackId = onForwardCallbackId;
      ctx.bridge.registerEventHandler(onForwardCallbackId, () => {
        options.onForward!();
      });
    }

    ctx.bridge.send('createNavigation', payload);
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Push a new view onto the navigation stack
   * @param builder Function that creates the content to push
   * @param title Optional title for the new view
   */
  push(builder: () => void, title?: string): void {
    // Build the content to push
    this.ctx.pushContainer();
    builder();
    const children = this.ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Navigation.push() must create exactly one child');
    }

    const contentId = children[0];

    const payload: any = {
      navigationId: this.id,
      contentId
    };

    if (title) {
      payload.title = title;
    }

    this.ctx.bridge.send('navigationPush', payload);
  }

  /**
   * Go back to the previous view
   */
  async back(): Promise<void> {
    await this.ctx.bridge.send('navigationBack', {
      navigationId: this.id
    });
  }

  /**
   * Go forward to the next view (if available after going back)
   */
  async forward(): Promise<void> {
    await this.ctx.bridge.send('navigationForward', {
      navigationId: this.id
    });
  }

  /**
   * Set the root-level navigation title
   * @param title The new title
   */
  async setTitle(title: string): Promise<void> {
    await this.ctx.bridge.send('navigationSetTitle', {
      navigationId: this.id,
      title,
      current: false
    });
  }

  /**
   * Set the title for the current navigation level
   * @param title The new title
   */
  async setCurrentTitle(title: string): Promise<void> {
    await this.ctx.bridge.send('navigationSetTitle', {
      navigationId: this.id,
      title,
      current: true
    });
  }
}

/**
 * Popup widget - floating overlay that can be positioned anywhere on the canvas
 * Useful for tooltips, popovers, context menus, and floating panels
 */
export class Popup {
  private ctx: Context;
  public id: string;
  private windowId: string;

  constructor(ctx: Context, windowId: string, builder: () => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('popup');
    this.windowId = windowId;

    // Build popup content
    ctx.pushContainer();
    builder();
    const children = ctx.popContainer();

    if (children.length !== 1) {
      throw new Error('Popup must have exactly one child widget');
    }

    const contentId = children[0];

    // Create the popup (initially hidden)
    ctx.bridge.send('createPopup', {
      id: this.id,
      contentId,
      windowId
    });

    // Note: Popup is NOT added to current container - it's a floating overlay
  }

  /**
   * Show the popup centered on the canvas
   */
  async show(): Promise<void> {
    await this.ctx.bridge.send('showPopup', {
      widgetId: this.id
    });
  }

  /**
   * Show the popup at a specific position
   * @param x X coordinate
   * @param y Y coordinate
   */
  async showAt(x: number, y: number): Promise<void> {
    await this.ctx.bridge.send('showPopup', {
      widgetId: this.id,
      x,
      y
    });
  }

  /**
   * Hide the popup
   */
  async hide(): Promise<void> {
    await this.ctx.bridge.send('hidePopup', {
      widgetId: this.id
    });
  }

  /**
   * Move the popup to a new position
   * @param x X coordinate
   * @param y Y coordinate
   */
  async move(x: number, y: number): Promise<void> {
    await this.ctx.bridge.send('movePopup', {
      widgetId: this.id,
      x,
      y
    });
  }
}
