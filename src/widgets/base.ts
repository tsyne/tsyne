import { Context } from '../context';
import { applyStyleForWidget, WidgetSelector } from '../styles';

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
    }) as { text: string };
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
    this.ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
      callback(data as { position: { x: number, y: number } });
    }); // Register the callback
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
    this.ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
      callback(data as { position: { x: number, y: number } });
    }); // Register the callback
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
      this.ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
        callbacks.in!(data as { position: { x: number, y: number } });
      });
      this.ctx.bridge.send('setWidgetHoverable', {
        widgetId: this.id,
        onMouseInCallbackId: callbackId,
        enabled: true
      });
    }
    if (callbacks.moved) {
      const callbackId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
        callbacks.moved!(data as { position: { x: number, y: number } });
      });
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
    this.ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
      callback(data as { button: number, position: { x: number, y: number } });
    });
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
    this.ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
      callback(data as { button: number, position: { x: number, y: number } });
    });
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
    this.ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
      callback(data as { key: string });
    });
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
    this.ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
      callback(data as { key: string });
    });
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
    this.ctx.bridge.registerEventHandler(callbackId, (data: unknown) => {
      callback(data as { focused: boolean });
    });
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

  // ==================== Drag & Drop ====================

  /**
   * Make this widget draggable
   * @param options Drag options including data and callbacks
   * @returns this for method chaining
   * @example
   * a.label('Drag me').makeDraggable({
   *   dragData: 'item-1',
   *   onDragStart: () => console.log('Started dragging'),
   *   onDragEnd: () => console.log('Stopped dragging')
   * });
   */
  makeDraggable(options: {
    dragData: string;
    onDragStart?: () => void;
    onDragEnd?: () => void;
  }): this {
    const payload: any = {
      widgetId: this.id,
      dragData: options.dragData
    };

    if (options.onDragStart) {
      const callbackId = this.ctx.generateId('callback');
      payload.onDragStartCallbackId = callbackId;
      this.ctx.bridge.registerEventHandler(callbackId, () => options.onDragStart!());
    }

    if (options.onDragEnd) {
      const callbackId = this.ctx.generateId('callback');
      payload.onDragEndCallbackId = callbackId;
      this.ctx.bridge.registerEventHandler(callbackId, () => options.onDragEnd!());
    }

    this.ctx.bridge.send('setDraggable', payload);
    return this;
  }

  /**
   * Make this widget a drop target
   * @param options Drop options including callbacks
   * @returns this for method chaining
   * @example
   * a.vbox(() => { ... }).makeDroppable({
   *   onDrop: (data, sourceId) => console.log('Dropped:', data),
   *   onDragEnter: () => console.log('Drag entered'),
   *   onDragLeave: () => console.log('Drag left')
   * });
   */
  makeDroppable(options: {
    onDrop?: (dragData: string, sourceId: string) => void;
    onDragEnter?: (dragData: string, sourceId: string) => void;
    onDragLeave?: () => void;
  }): this {
    const payload: any = {
      widgetId: this.id
    };

    if (options.onDrop) {
      const callbackId = this.ctx.generateId('callback');
      payload.onDropCallbackId = callbackId;
      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onDrop!(data.dragData, data.sourceId);
      });
    }

    if (options.onDragEnter) {
      const callbackId = this.ctx.generateId('callback');
      payload.onDragEnterCallbackId = callbackId;
      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        options.onDragEnter!(data.dragData, data.sourceId);
      });
    }

    if (options.onDragLeave) {
      const callbackId = this.ctx.generateId('callback');
      payload.onDragLeaveCallbackId = callbackId;
      this.ctx.bridge.registerEventHandler(callbackId, () => options.onDragLeave!());
    }

    this.ctx.bridge.send('setDroppable', payload);
    return this;
  }
}
