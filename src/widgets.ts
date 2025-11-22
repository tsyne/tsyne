import { Context } from './context';
import { applyStyleForWidget, WidgetSelector } from './styles';

/**
 * Context menu item
 */
export interface ContextMenuItem {
  label: string;
  onSelected: () => void;
  disabled?: boolean;
  checked?: boolean;
  isSeparator?: boolean;
}

/**
 * Accessibility options for widgets
 */
export interface AccessibilityOptions {
  /** ARIA label - concise name for the widget */
  label?: string;
  /** Extended description for screen readers */
  description?: string;
  /** ARIA role (e.g., 'button', 'textbox', 'navigation') */
  role?: string;
  /** Usage hint for assistive technologies */
  hint?: string;
}

/**
 * Base class for all widgets
 */
export abstract class Widget {
  protected ctx: Context;
  public id: string;
  private visibilityCondition?: () => Promise<void>;
  private styleClass?: WidgetSelector;

  constructor(ctx: Context, id: string) {
    this.ctx = ctx;
    this.id = id;
  }

  /**
   * Apply styles from the global stylesheet to this widget
   */
  protected async applyStyles(widgetType: WidgetSelector): Promise<void> {
    this.styleClass = widgetType; // Store for later refresh
    await applyStyleForWidget(this.ctx, this.id, widgetType);
  }

  /**
   * Refresh styles from the global stylesheet
   * Call this after updating the global styles to apply changes to existing widgets
   */
  async refreshStyles(): Promise<void> {
    if (this.styleClass) {
      await applyStyleForWidget(this.ctx, this.id, this.styleClass);
    }
  }

  /**
   * Set context menu for this widget (shown on right-click)
   */
  async setContextMenu(items: ContextMenuItem[]): Promise<void> {
    const menuItems = items.map(item => {
      if (item.isSeparator) {
        return { isSeparator: true };
      }

      const callbackId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(callbackId, () => item.onSelected());

      return {
        label: item.label,
        callbackId,
        disabled: item.disabled,
        checked: item.checked
      };
    });

    await this.ctx.bridge.send('setWidgetContextMenu', {
      widgetId: this.id,
      items: menuItems
    });
  }

  async setText(text: string): Promise<void> {
    await this.ctx.bridge.send('setText', {
      widgetId: this.id,
      text
    });
  }

  async getText(): Promise<string> {
    const result = await this.ctx.bridge.send('getText', {
      widgetId: this.id
    });
    return result.text;
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
   * Focus this widget (for keyboard input)
   * Widget must implement fyne.Focusable to receive focus
   */
  async focus(): Promise<void> {
    await this.ctx.bridge.send('focusWidget', {
      widgetId: this.id
    });
  }

  /**
   * Register a custom ID for this widget (for test framework getByID)
   * @param customId Custom ID to register
   * @returns this for method chaining
   * @example
   * const statusLabel = a.label('').withId('statusLabel');
   * // In tests: ctx.getByID('statusLabel')
   */
  withId(customId: string): this {
    this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    });
    return this;
  }

  /**
   * Declarative visibility control - show widget when condition is true
   * @param conditionFn Function that returns whether widget should be visible
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
   * Set accessibility properties for assistive technologies
   * Automatically enables hover announcements so the accessibility info is announced on hover
   * @param options Accessibility options (label, description, role, hint)
   * @returns this for method chaining
   * @example
   * const submitBtn = a.button('Submit', onSubmit).accessibility({
   *   label: 'Submit Form',
   *   description: 'Submits the registration form',
   *   role: 'button',
   *   hint: 'Press Enter or click to submit'
   * });
   */
  accessibility(options: AccessibilityOptions): this {
    this.ctx.bridge.send('setAccessibility', {
      widgetId: this.id,
      ...options
    });

    // If accessibility info is provided, enable hover-to-focus
    // This gives the widget keyboard focus on hover (for spacebar activation)
    // The announcement is handled by AccessibilityManager's pointerEnter listener
    if (options.label || options.description) {
      this.onMouseIn(() => {
        // Focus the widget on hover so it can receive keyboard input
        this.focus();
      });
    }
    return this;
  }

  /**
   * Enable hover announcements for this widget
   * When enabled, hovering over the widget will announce its accessibility info
   * @param enabled Whether to enable hover announcements (default: true)
   * @returns this for method chaining
   * @example
   * const cell = a.button('X', onClick)
   *   .accessibility({ label: 'Top left cell' })
   *   .announceOnHover();
   */


  /**
   * Register a callback for when the mouse enters the widget
   * @param callback Function called when mouse enters, receives mouse event with position
   * @returns this for method chaining
   * @example
   * a.button('Cell', onClick)
   *   .onMouseIn((event) => {
   *     highlightCell();
   *     console.log('Mouse at', event.position);
   *   });
   */
  onMouseIn(callback: (event: { position: { x: number, y: number } }) => void): this {
    const callbackId = this.ctx.generateId('callback');
    this.ctx.bridge.registerEventHandler(callbackId, callback); // Register the callback
    this.ctx.bridge.send('setWidgetHoverable', { // Send message to bridge
      widgetId: this.id,
      onMouseInCallbackId: callbackId,
      enabled: true // Enable hoverable capability
    });
    return this;
  }

  /**
   * Register a callback for when the mouse moves within the widget
   * @param callback Function called when mouse moves, receives mouse event with position
   * @returns this for method chaining
   * @example
   * a.button('Canvas', onClick)
   *   .onMouseMoved((event) => {
   *     updateCursor(event.position);
   *   });
   */
  onMouseMoved(callback: (event: { position: { x: number, y: number } }) => void): this {
    const callbackId = this.ctx.generateId('callback');
    this.ctx.bridge.registerEventHandler(callbackId, callback); // Register the callback
    this.ctx.bridge.send('setWidgetHoverable', { // Send message to bridge
      widgetId: this.id,
      onMouseMoveCallbackId: callbackId,
      enabled: true // Enable hoverable capability
    });
    return this;
  }

  /**
   * Register a callback for when the mouse exits the widget
   * @param callback Function called when mouse exits
   * @returns this for method chaining
   * @example
   * a.button('Cell', onClick)
   *   .onMouseOut(() => {
   *     unhighlightCell();
   *   });
   */
  onMouseOut(callback: () => void): this {
    const callbackId = this.ctx.generateId('callback');
    this.ctx.bridge.registerEventHandler(callbackId, callback); // Register the callback
    this.ctx.bridge.send('setWidgetHoverable', { // Send message to bridge
      widgetId: this.id,
      onMouseOutCallbackId: callbackId,
      enabled: true // Enable hoverable capability
    });
    return this;
  }

  /**
   * Register callbacks for mouse events (convenience method)
   * @param callbacks Object with optional in, moved, and out callbacks
   * @returns this for method chaining
   * @example
   * a.button('Cell', onClick)
   *   .onMouse({
   *     in: (e) => highlightCell(),
   *     moved: (e) => updateCursor(e.position),
   *     out: () => unhighlightCell()
   *   });
   */
  onMouse(callbacks: {
    in?: (event: { position: { x: number, y: number } }) => void,
    moved?: (event: { position: { x: number, y: number } }) => void,
    out?: () => void
  }): this {
    if (callbacks.in) {
      const callbackId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(callbackId, callbacks.in);
      this.ctx.bridge.send('setWidgetHoverable', {
        widgetId: this.id,
        onMouseInCallbackId: callbackId,
        enabled: true
      });
    }
    if (callbacks.moved) {
      const callbackId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(callbackId, callbacks.moved);
      this.ctx.bridge.send('setWidgetHoverable', {
        widgetId: this.id,
        onMouseMoveCallbackId: callbackId,
        enabled: true
      });
    }
    if (callbacks.out) {
      const callbackId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(callbackId, callbacks.out);
      this.ctx.bridge.send('setWidgetHoverable', {
        widgetId: this.id,
        onMouseOutCallbackId: callbackId,
        enabled: true
      });
    }
    return this;
  }

  /**
   * Register a callback for when a mouse button is pressed on the widget (Mouseable interface)
   * @param callback Function called when mouse button pressed, receives event with button and position
   * @returns this for method chaining
   * @example
   * a.button('Draw', onClick)
   *   .onMouseDown((event) => {
   *     console.log('Button', event.button, 'pressed at', event.position);
   *   });
   */
  onMouseDown(callback: (event: { button: number, position: { x: number, y: number } }) => void): this {
    const callbackId = this.ctx.generateId('callback');
    this.ctx.bridge.registerEventHandler(callbackId, callback);
    this.ctx.bridge.send('setWidgetHoverable', {
      widgetId: this.id,
      onMouseDownCallbackId: callbackId,
      enabled: true
    });
    return this;
  }

  /**
   * Register a callback for when a mouse button is released on the widget (Mouseable interface)
   * @param callback Function called when mouse button released, receives event with button and position
   * @returns this for method chaining
   * @example
   * a.button('Draw', onClick)
   *   .onMouseUp((event) => {
   *     console.log('Button', event.button, 'released at', event.position);
   *   });
   */
  onMouseUp(callback: (event: { button: number, position: { x: number, y: number } }) => void): this {
    const callbackId = this.ctx.generateId('callback');
    this.ctx.bridge.registerEventHandler(callbackId, callback);
    this.ctx.bridge.send('setWidgetHoverable', {
      widgetId: this.id,
      onMouseUpCallbackId: callbackId,
      enabled: true
    });
    return this;
  }

  /**
   * Register a callback for when a key is pressed while widget has focus (Keyable interface)
   * @param callback Function called when key pressed, receives event with key name
   * @returns this for method chaining
   * @example
   * a.button('Input', onClick)
   *   .onKeyDown((event) => {
   *     console.log('Key pressed:', event.key);
   *   });
   */
  onKeyDown(callback: (event: { key: string }) => void): this {
    const callbackId = this.ctx.generateId('callback');
    this.ctx.bridge.registerEventHandler(callbackId, callback);
    this.ctx.bridge.send('setWidgetHoverable', {
      widgetId: this.id,
      onKeyDownCallbackId: callbackId,
      enabled: true
    });
    return this;
  }

  /**
   * Register a callback for when a key is released while widget has focus (Keyable interface)
   * @param callback Function called when key released, receives event with key name
   * @returns this for method chaining
   * @example
   * a.button('Input', onClick)
   *   .onKeyUp((event) => {
   *     console.log('Key released:', event.key);
   *   });
   */
  onKeyUp(callback: (event: { key: string }) => void): this {
    const callbackId = this.ctx.generateId('callback');
    this.ctx.bridge.registerEventHandler(callbackId, callback);
    this.ctx.bridge.send('setWidgetHoverable', {
      widgetId: this.id,
      onKeyUpCallbackId: callbackId,
      enabled: true
    });
    return this;
  }

  /**
   * Register a callback for focus changes (Focusable interface)
   * @param callback Function called when focus gained or lost, receives event with focused state
   * @returns this for method chaining
   * @example
   * a.button('Action', onClick)
   *   .onFocus((event) => {
   *     console.log(event.focused ? 'Gained focus' : 'Lost focus');
   *   });
   */
  onFocusChange(callback: (event: { focused: boolean }) => void): this {
    const callbackId = this.ctx.generateId('callback');
    this.ctx.bridge.registerEventHandler(callbackId, callback);
    this.ctx.bridge.send('setWidgetHoverable', {
      widgetId: this.id,
      onFocusCallbackId: callbackId,
      enabled: true
    });
    return this;
  }

  /**
   * Set the cursor to display when hovering over this widget (Cursorable interface)
   * @param cursor Cursor type: 'default', 'text', 'crosshair', 'pointer', 'hResize', 'vResize'
   * @returns this for method chaining
   * @example
   * a.button('Resize', onClick).setCursor('hResize');
   * a.button('Text Input', onClick).setCursor('text');
   */
  setCursor(cursor: 'default' | 'text' | 'crosshair' | 'pointer' | 'hResize' | 'vResize'): this {
    this.ctx.bridge.send('setWidgetHoverable', {
      widgetId: this.id,
      cursorType: cursor,
      enabled: true
    });
    return this;
  }

  /**
   * Refresh the widget - re-evaluates visibility conditions
   */
  async refresh(): Promise<void> {
    if (this.visibilityCondition) {
      await this.visibilityCondition();
    }
  }
}

/**
 * Button widget
 */
export class Button extends Widget {
  constructor(ctx: Context, text: string, onClick?: () => void, className?: string) {
    const id = ctx.generateId('button');
    super(ctx, id);

    const payload: any = { id, text };

    if (onClick) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, () => {
        onClick();
      });
    }

    ctx.bridge.send('createButton', payload);
    ctx.addToCurrentContainer(id);

    if (className) {
      this.applyStyles(className).catch(() => {});
    } else {
      this.applyStyles('button').catch(() => {});
    }
  }

  async disable(): Promise<void> {
    await this.ctx.bridge.send('disableWidget', {
      widgetId: this.id
    });
  }

  async enable(): Promise<void> {
    await this.ctx.bridge.send('enableWidget', {
      widgetId: this.id
    });
  }

  async isEnabled(): Promise<boolean> {
    const result = await this.ctx.bridge.send('isEnabled', {
      widgetId: this.id
    });
    return result.enabled;
  }
}

/**
 * Label widget
 */
export class Label extends Widget {
  constructor(ctx: Context, text: string, className?: string, alignment?: 'leading' | 'trailing' | 'center', wrapping?: 'off' | 'break' | 'word', textStyle?: { bold?: boolean; italic?: boolean; monospace?: boolean }) {
    const id = ctx.generateId('label');
    super(ctx, id);

    const payload: any = { id, text };

    if (alignment) {
      payload.alignment = alignment;
    }

    if (wrapping) {
      payload.wrapping = wrapping;
    }

    if (textStyle) {
      payload.textStyle = textStyle;
    }

    ctx.bridge.send('createLabel', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking) - try class names first, then fall back to 'label'
    if (className) {
      this.applyStyles(className).catch(() => {});
    } else {
      this.applyStyles('label').catch(() => {});
    }
  }
}

/**
 * Entry (text input) widget
 */
export class Entry extends Widget {
  constructor(ctx: Context, placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void) {
    const id = ctx.generateId('entry');
    super(ctx, id);

    const payload: any = { id, placeholder: placeholder || '' };

    if (onSubmit) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSubmit(data.text);
      });
    }

    if (onDoubleClick) {
      const doubleClickCallbackId = ctx.generateId('callback');
      payload.doubleClickCallbackId = doubleClickCallbackId;
      ctx.bridge.registerEventHandler(doubleClickCallbackId, () => {
        onDoubleClick();
      });
    }

    if (minWidth !== undefined) {
      payload.minWidth = minWidth;
    }

    ctx.bridge.send('createEntry', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('entry').catch(() => {});
  }

  async disable(): Promise<void> {
    await this.ctx.bridge.send('disableWidget', {
      widgetId: this.id
    });
  }

  async enable(): Promise<void> {
    await this.ctx.bridge.send('enableWidget', {
      widgetId: this.id
    });
  }

  async focus(): Promise<void> {
    await this.ctx.bridge.send('focusWidget', {
      widgetId: this.id
    });
  }

  async submit(): Promise<void> {
    await this.ctx.bridge.send('submitEntry', {
      widgetId: this.id
    });
  }
}

/**
 * Multi-line text entry widget
 */
export class MultiLineEntry extends Widget {
  constructor(ctx: Context, placeholder?: string, wrapping?: 'off' | 'word' | 'break') {
    const id = ctx.generateId('multilineentry');
    super(ctx, id);

    const payload: any = { id, placeholder: placeholder || '' };
    if (wrapping) {
      payload.wrapping = wrapping;
    }

    ctx.bridge.send('createMultiLineEntry', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('multilineentry').catch(() => {});
  }
}

/**
 * Password entry widget (text is masked)
 */
export class PasswordEntry extends Widget {
  constructor(ctx: Context, placeholder?: string, onSubmit?: (text: string) => void) {
    const id = ctx.generateId('passwordentry');
    super(ctx, id);

    const payload: any = { id, placeholder: placeholder || '' };

    if (onSubmit) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSubmit(data.text);
      });
    }

    ctx.bridge.send('createPasswordEntry', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('passwordentry').catch(() => {});
  }
}

/**
 * Separator widget (horizontal or vertical line)
 */
export class Separator {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.id = ctx.generateId('separator');

    ctx.bridge.send('createSeparator', { id: this.id });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Hyperlink widget (clickable URL)
 */
export class Hyperlink {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, text: string, url: string) {
    this.ctx = ctx;
    this.id = ctx.generateId('hyperlink');

    ctx.bridge.send('createHyperlink', { id: this.id, text, url });
    ctx.addToCurrentContainer(this.id);
  }
}

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
 * Checkbox widget
 */
export class Checkbox extends Widget {
  constructor(ctx: Context, text: string, onChanged?: (checked: boolean) => void) {
    const id = ctx.generateId('checkbox');
    super(ctx, id);

    const payload: any = { id, text };

    if (onChanged) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onChanged(data.checked);
      });
    }

    ctx.bridge.send('createCheckbox', payload);
    ctx.addToCurrentContainer(id);
  }

  async setChecked(checked: boolean): Promise<void> {
    await this.ctx.bridge.send('setChecked', {
      widgetId: this.id,
      checked
    });
  }

  async getChecked(): Promise<boolean> {
    const result = await this.ctx.bridge.send('getChecked', {
      widgetId: this.id
    });
    return result.checked;
  }
}

/**
 * Select (dropdown) widget
 */
export class Select extends Widget {
  constructor(ctx: Context, options: string[], onSelected?: (selected: string) => void) {
    const id = ctx.generateId('select');
    super(ctx, id);

    const payload: any = { id, options };

    if (onSelected) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSelected(data.selected);
      });
    }

    ctx.bridge.send('createSelect', payload);
    ctx.addToCurrentContainer(id);
  }

  async setSelected(selected: string): Promise<void> {
    await this.ctx.bridge.send('setSelected', {
      widgetId: this.id,
      selected
    });
  }

  async getSelected(): Promise<string> {
    const result = await this.ctx.bridge.send('getSelected', {
      widgetId: this.id
    });
    return result.selected;
  }
}

/**
 * Slider widget
 */
export class Slider extends Widget {
  constructor(
    ctx: Context,
    min: number,
    max: number,
    initialValue?: number,
    onChanged?: (value: number) => void
  ) {
    const id = ctx.generateId('slider');
    super(ctx, id);

    const payload: any = { id, min, max };

    if (initialValue !== undefined) {
      payload.value = initialValue;
    }

    if (onChanged) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onChanged(data.value);
      });
    }

    ctx.bridge.send('createSlider', payload);
    ctx.addToCurrentContainer(id);
  }

  async setValue(value: number): Promise<void> {
    await this.ctx.bridge.send('setValue', {
      widgetId: this.id,
      value
    });
  }

  async getValue(): Promise<number> {
    const result = await this.ctx.bridge.send('getValue', {
      widgetId: this.id
    });
    return result.value;
  }
}

/**
 * ProgressBar widget
 */
export class ProgressBar extends Widget {
  constructor(ctx: Context, initialValue?: number, infinite?: boolean) {
    const id = ctx.generateId('progressbar');
    super(ctx, id);

    const payload: any = { id, infinite: infinite || false };

    if (!infinite && initialValue !== undefined) {
      payload.value = initialValue;
    }

    ctx.bridge.send('createProgressBar', payload);
    ctx.addToCurrentContainer(id);
  }

  async setProgress(value: number): Promise<void> {
    await this.ctx.bridge.send('setProgress', {
      widgetId: this.id,
      value
    });
  }

  async getProgress(): Promise<number> {
    const result = await this.ctx.bridge.send('getProgress', {
      widgetId: this.id
    });
    return result.value;
  }

  // Aliases to match Slider API naming convention
  async setValue(value: number): Promise<void> {
    await this.setProgress(value);
  }

  async getValue(): Promise<number> {
    return await this.getProgress();
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
 * RadioGroup widget
 */
export class RadioGroup extends Widget {
  constructor(ctx: Context, options: string[], initialSelected?: string, onSelected?: (selected: string) => void) {
    const id = ctx.generateId('radiogroup');
    super(ctx, id);

    const payload: any = { id, options };

    if (initialSelected !== undefined) {
      payload.selected = initialSelected;
    }

    if (onSelected) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSelected(data.selected);
      });
    }

    ctx.bridge.send('createRadioGroup', payload);
    ctx.addToCurrentContainer(id);
  }

  async setSelected(selected: string): Promise<void> {
    await this.ctx.bridge.send('setRadioSelected', {
      widgetId: this.id,
      selected
    });
  }

  async getSelected(): Promise<string> {
    const result = await this.ctx.bridge.send('getRadioSelected', {
      widgetId: this.id
    });
    return result.selected;
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
 * Represents a clickable action item in a Toolbar
 */
export class ToolbarAction {
  private _id?: string;

  constructor(public label: string, public onAction?: () => void) {}

  /**
   * Assign a unique ID to this toolbar action for testing
   * @param id Custom ID for the action
   * @returns this for method chaining
   */
  withId(id: string): this {
    this._id = id;
    return this;
  }

  get id(): string | undefined {
    return this._id;
  }
}

/**
 * Toolbar widget
 */
export class Toolbar {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, toolbarItems: Array<ToolbarAction | { type: 'separator' | 'spacer' }>) {
    this.ctx = ctx;
    this.id = ctx.generateId('toolbar');

    const items = toolbarItems.map(item => {
      if ('type' in item) { // Separator or Spacer
        return { type: item.type };
      }

      // Action item
      const action = item as ToolbarAction;
      const callbackId = ctx.generateId('callback');
      if (action.onAction) {
        ctx.bridge.registerEventHandler(callbackId, (_data: any) => {
          action.onAction!();
        });
      }

      return {
        type: 'action',
        label: action.label,
        callbackId,
        customId: action.id, // Pass custom ID to the bridge
      };
    });

    ctx.bridge.send('createToolbar', {
      id: this.id,
      items
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Table widget
 */
export class Table {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, headers: string[], data: string[][]) {
    this.ctx = ctx;
    this.id = ctx.generateId('table');

    ctx.bridge.send('createTable', {
      id: this.id,
      headers,
      data
    });

    ctx.addToCurrentContainer(this.id);
  }

  async updateData(data: string[][]): Promise<void> {
    await this.ctx.bridge.send('updateTableData', {
      id: this.id,
      data
    });
  }
}

/**
 * List widget
 */
export class List {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, items: string[], onSelected?: (index: number, item: string) => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('list');

    const payload: any = {
      id: this.id,
      items
    };

    if (onSelected) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        onSelected(data.index, data.item);
      });
    }

    ctx.bridge.send('createList', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async updateItems(items: string[]): Promise<void> {
    await this.ctx.bridge.send('updateListData', {
      id: this.id,
      items
    });
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
 * Tree widget for hierarchical data
 */
export class Tree {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, rootLabel: string) {
    this.ctx = ctx;
    this.id = ctx.generateId('tree');

    ctx.bridge.send('createTree', {
      id: this.id,
      rootLabel
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * RichText widget for formatted text
 */
export class RichText {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, segments: Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    monospace?: boolean;
  }>) {
    this.ctx = ctx;
    this.id = ctx.generateId('richtext');

    ctx.bridge.send('createRichText', {
      id: this.id,
      segments
    });

    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Image widget for displaying images
 */
export class Image {
  private ctx: Context;
  public id: string;

  constructor(
    ctx: Context,
    pathOrOptions: string | { path?: string; resource?: string; fillMode?: 'contain' | 'stretch' | 'original'; onClick?: () => void; onDrag?: (x: number, y: number) => void; onDragEnd?: (x: number, y: number) => void; },
    fillMode?: 'contain' | 'stretch' | 'original',
    onClick?: () => void,
    onDrag?: (x: number, y: number) => void,
    onDragEnd?: (x: number, y: number) => void
  ) {
    this.ctx = ctx;
    this.id = ctx.generateId('image');

    const payload: any = {
      id: this.id
    };

    // Support both string path (legacy) and options object (new)
    if (typeof pathOrOptions === 'string') {
      // Legacy: path as first parameter
      const resolvedPath = ctx.resolveResourcePath(pathOrOptions);
      payload.path = resolvedPath;

      if (fillMode) {
        payload.fillMode = fillMode;
      }
    } else {
      // New: options object
      const options = pathOrOptions;

      if (options.resource) {
        payload.resource = options.resource;
      } else if (options.path) {
        const resolvedPath = ctx.resolveResourcePath(options.path);
        payload.path = resolvedPath;
      }

      if (options.fillMode) {
        payload.fillMode = options.fillMode;
      }

      // Override with options if provided
      onClick = options.onClick || onClick;
      onDrag = options.onDrag || onDrag;
      onDragEnd = options.onDragEnd || onDragEnd;
    }

    if (onClick) {
      const callbackId = ctx.generateId('callback');
      payload.callbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, () => {
        onClick();
      });
    }

    if (onDrag) {
      const dragCallbackId = ctx.generateId('callback');
      payload.onDragCallbackId = dragCallbackId;
      ctx.bridge.registerEventHandler(dragCallbackId, (data: any) => {
        onDrag(data.x, data.y);
      });
    }

    if (onDragEnd) {
      const dragEndCallbackId = ctx.generateId('callback');
      payload.onDragEndCallbackId = dragEndCallbackId;
      ctx.bridge.registerEventHandler(dragEndCallbackId, (data: any) => {
        onDragEnd(data.x, data.y);
      });
    }

    ctx.bridge.send('createImage', payload);
    ctx.addToCurrentContainer(this.id);
  }

  /**
   * Updates the image widget with new image data
   * @param imageData - Base64-encoded image data (with or without data URL prefix)
   */
  /**
   * Update the image displayed in this widget
   * @param imageSource - Image source, can be:
   *   - String: Base64 data URI (e.g., 'data:image/png;base64,...')
   *   - Object with path: File path to image (e.g., { path: '/path/to/image.svg' })
   *   - Object with resource: Resource name (e.g., { resource: 'my-resource' })
   *   - Object with svg: Raw SVG string (e.g., { svg: '<svg>...</svg>' })
   *   - Object with url: Remote image URL (e.g., { url: 'https://example.com/image.png' })
   */
  async updateImage(imageSource: string | { path?: string; resource?: string; svg?: string; url?: string }): Promise<void> {
    if (typeof imageSource === 'string') {
      // Backwards compatible: string is base64 data URI
      await this.ctx.bridge.send('updateImage', {
        widgetId: this.id,
        imageData: imageSource
      });
    } else {
      // New object-based API
      await this.ctx.bridge.send('updateImage', {
        widgetId: this.id,
        path: imageSource.path,
        resource: imageSource.resource,
        svg: imageSource.svg,
        url: imageSource.url
      });
    }
  }

  /**
   * Register a custom ID for this image widget (for test framework getByID)
   * @param customId Custom ID to register
   * @returns this for method chaining
   * @example
   * const cardImage = a.image('card.png').withId('draw3-card');
   * // In tests: ctx.getByID('draw3-card').click()
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
 * Menu item for standalone Menu widget
 */
export interface MenuItem {
  label: string;
  onSelected: () => void;
  disabled?: boolean;
  checked?: boolean;
  isSeparator?: boolean;
}

/**
 * Menu widget - standalone menu that can be embedded in containers
 * Useful for command palettes, action menus, and in-container menus
 */
export class Menu extends Widget {
  private items: MenuItem[];

  constructor(ctx: Context, items: MenuItem[]) {
    const id = ctx.generateId('menu');
    super(ctx, id);
    this.items = items;

    const menuItems = items.map(item => {
      if (item.isSeparator) {
        return { isSeparator: true };
      }

      const callbackId = ctx.generateId('callback');
      ctx.bridge.registerEventHandler(callbackId, () => item.onSelected());

      return {
        label: item.label,
        callbackId,
        disabled: item.disabled,
        checked: item.checked
      };
    });

    ctx.bridge.send('createMenu', { id, items: menuItems });
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking)
    this.applyStyles('menu').catch(() => {});
  }

  /**
   * Get the current menu items
   */
  getItems(): MenuItem[] {
    return this.items;
  }
}
