import { Context } from '../context';
import { refreshAllBindings, registerGlobalBinding } from './base';

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

  /**
   * Bind container to a data source with render/delete callbacks (ng-repeat style)
   * Smart diffing avoids flicker by reusing existing widgets.
   *
   * @param getItems Function that returns the current items array
   * @param renderItem Function called to render each item. Receives (item, index, existing).
   *                   If existing is null, create and return new widget.
   *                   If existing is provided, update it and return it (or return as-is).
   * @param onDelete Optional function called when an item is removed (receives item and index)
   * @param trackBy Optional function to extract unique key from item (default: item itself)
   * @returns BoundList controller with update() method
   *
   * @example
   * const list = checklistContainer.bindTo(
   *   () => store.getItems(),
   *   (item, index, existing) => {
   *     if (existing) {
   *       existing.setText(item.text);
   *       return existing;
   *     }
   *     return a.checkbox(item, () => store.toggle(index));
   *   },
   *   (item, index) => console.log('Removed:', item),
   *   (item) => item.id  // trackBy key
   * );
   *
   * // Call when data changes:
   * list.update();
   */
  bindTo<T, W = any>(
    getItems: () => T[],
    renderItem: (item: T, index: number, existing: W | null) => W,
    onDelete?: (item: T, index: number) => void,
    trackBy?: (item: T) => any
  ): BoundList<T, W> {
    return new BoundList(this.ctx, this, getItems, renderItem, onDelete, trackBy);
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
   * @example
   * a.vbox(() => {
   *   a.label('No items');
   * }).when(() => items.length === 0);
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

    // Register as global binding for MVC-style auto-refresh
    registerGlobalBinding(updateVisibility);

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
   * MVC-style: automatically re-evaluates when refreshAllBindings() is called
   * @param conditionFn Function that returns whether container should be visible
   * @returns this for method chaining
   * @example
   * a.vbox(() => {
   *   a.label('No items');
   * }).when(() => items.length === 0);
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

    // Register as global binding for MVC-style auto-refresh
    registerGlobalBinding(updateVisibility);

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

  /**
   * Bind container to a data source with render/delete callbacks (ng-repeat style)
   * Smart diffing avoids flicker by reusing existing widgets.
   *
   * @param getItems Function that returns the current items array
   * @param renderItem Function called to render each item. Receives (item, index, existing).
   *                   If existing is null, create and return new widget.
   *                   If existing is provided, update it and return it (or return as-is).
   * @param onDelete Optional function called when an item is removed (receives item and index)
   * @param trackBy Optional function to extract unique key from item (default: item itself)
   * @returns BoundList controller with update() method
   *
   * @example
   * a.vbox(() => {}).bindTo(
   *   () => store.getItems(),
   *   (item, index, existing) => {
   *     if (existing) {
   *       // Update existing widget
   *       existing.setText(item.text);
   *       return existing;
   *     } else {
   *       // Create new widget
   *       return a.label(item.text);
   *     }
   *   },
   *   (item, index) => console.log('deleted:', item),
   *   (item) => item.id  // trackBy key
   * );
   */
  bindTo<T, W = any>(
    getItems: () => T[],
    renderItem: (item: T, index: number, existing: W | null) => W,
    onDelete?: (item: T, index: number) => void,
    trackBy?: (item: T) => any
  ): BoundList<T, W> {
    return new BoundList(this.ctx, this, getItems, renderItem, onDelete, trackBy);
  }
}

/**
 * BoundList - Declarative list binding for containers (ng-repeat style)
 * Supports two modes:
 * - MVVM mode: render callback returns widget reference, called on updates with existing widget
 * - MVC mode: render callback returns void, uses reactive bindings for updates (pure 1978 MVC)
 */
export class BoundList<T, W = any> {
  private ctx: Context;
  private container: VBox | HBox;
  private getItems: () => T[];
  private renderItem: (item: T, index: number, existing: W | null) => W | void;
  private onDelete?: (item: T, index: number) => void;
  private trackBy: (item: T) => any;

  // Track widgets by key for smart updates (MVVM mode)
  private widgetsByKey = new Map<any, W>();
  private currentKeys: any[] = [];

  // MVC mode detection - true if render callback returns void
  private mvcMode: boolean = false;

  constructor(
    ctx: Context,
    container: VBox | HBox,
    getItems: () => T[],
    renderItem: (item: T, index: number, existing: W | null) => W | void,
    onDelete?: (item: T, index: number) => void,
    trackBy?: (item: T) => any
  ) {
    this.ctx = ctx;
    this.container = container;
    this.getItems = getItems;
    this.renderItem = renderItem;
    this.onDelete = onDelete;
    this.trackBy = trackBy || ((item: T) => item);

    // Initial render
    this.initialRender();
  }

  /**
   * Update the list with smart diffing - only modifies what changed
   * In MVC mode, refreshes reactive bindings instead of calling renderItem
   */
  update(): void {
    const items = this.getItems();
    const newKeys = items.map(item => this.trackBy(item));
    const oldKeys = new Set(this.currentKeys);
    const newKeysSet = new Set(newKeys);

    // Find what changed
    const toRemove = this.currentKeys.filter(key => !newKeysSet.has(key));
    const toAdd = newKeys.filter(key => !oldKeys.has(key));

    // If only updates (no structural changes)
    if (toRemove.length === 0 && toAdd.length === 0) {
      if (this.mvcMode) {
        // MVC mode: just refresh all bindings (View updates from Model automatically)
        refreshAllBindings();
      } else {
        // MVVM mode: call renderItem with existing widgets for manual updates
        items.forEach((item, index) => {
          const key = this.trackBy(item);
          const existing = this.widgetsByKey.get(key);
          if (existing) {
            this.renderItem(item, index, existing);
          }
        });
      }
      return;
    }

    // Structural changes - need to rebuild
    // First, call onDelete for removed items
    if (this.onDelete) {
      toRemove.forEach(key => {
        const oldIndex = this.currentKeys.indexOf(key);
        this.onDelete!(key as T, oldIndex);
      });
    }

    // Clear old widget tracking for removed items
    toRemove.forEach(key => {
      this.widgetsByKey.delete(key);
    });

    // Rebuild the container (unfortunately Fyne doesn't support reordering)
    this.container.removeAll();

    items.forEach((item, index) => {
      const key = this.trackBy(item);
      const existing = this.widgetsByKey.get(key) || null;

      this.container.add(() => {
        const widget = this.renderItem(item, index, existing);
        if (widget !== undefined) {
          this.widgetsByKey.set(key, widget);
        }
      });
    });

    this.container.refresh();
    this.currentKeys = newKeys;
  }

  /**
   * Initial render - create all widgets
   */
  private initialRender(): void {
    const items = this.getItems();
    this.currentKeys = items.map(item => this.trackBy(item));

    items.forEach((item, index) => {
      const key = this.trackBy(item);

      this.container.add(() => {
        const widget = this.renderItem(item, index, null);
        if (widget !== undefined) {
          this.widgetsByKey.set(key, widget);
        } else {
          // First item returned void = MVC mode
          this.mvcMode = true;
        }
      });
    });

    this.container.refresh();
  }
}
