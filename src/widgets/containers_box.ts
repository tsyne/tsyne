import { Context } from '../context';

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
