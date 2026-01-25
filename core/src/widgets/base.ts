import { Context } from '../context';
import { applyStyleForWidget, applyStyleToWidget, WidgetSelector, WidgetStyle } from '../styles';

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
/**
 * Reactive binding - stores a function that updates a widget property
 */
export type ReactiveBinding = () => void | Promise<void>;

/**
 * Global registry of all reactive bindings (for MVC-style updates)
 */
const globalBindings: Set<ReactiveBinding> = new Set();

/**
 * Register a binding in the global registry
 * @param binding The binding function to register
 */
export function registerGlobalBinding(binding: ReactiveBinding): void {
  globalBindings.add(binding);
}

/**
 * Refresh all reactive bindings globally
 * Call this to trigger all MVC-style bindings to re-evaluate
 */
export async function refreshAllBindings(): Promise<void> {
  // Copy to array to avoid issues if bindings are removed during iteration
  const bindings = Array.from(globalBindings);
  for (const binding of bindings) {
    try {
      await binding();
    } catch (err) {
      // Widget may have been destroyed - remove stale binding
      globalBindings.delete(binding);
    }
  }
}

/**
 * Clear all global bindings
 * Call this when rebuilding UI to prevent stale bindings from causing errors
 */
export function clearAllBindings(): void {
  globalBindings.clear();
}

export abstract class Widget {
  protected ctx: Context;
  public id: string;
  private visibilityCondition?: () => Promise<void>;
  private styleCondition?: () => Promise<void>;
  private styleClass?: WidgetSelector;
  private bindings: ReactiveBinding[] = [];

  constructor(ctx: Context, id: string) {
    this.ctx = ctx;
    this.id = id;
  }

  /**
   * Register a reactive binding for this widget
   * @internal
   */
  protected registerBinding(binding: ReactiveBinding): void {
    this.bindings.push(binding);
    globalBindings.add(binding);
  }

  /**
   * Refresh all reactive bindings on this widget
   */
  async refreshBindings(): Promise<void> {
    for (const binding of this.bindings) {
      await binding();
    }
  }

  /**
   * MVC-style binding: bind visibility to a reactive condition
   * Unlike when(), this registers globally for automatic refresh
   * @param conditionFn Function returning whether widget should be visible
   * @returns this for method chaining
   * @example
   * a.label('Error').bindVisible(() => hasError);
   */
  bindVisible(conditionFn: () => boolean): this {
    const binding = async () => {
      const shouldShow = conditionFn();
      if (shouldShow) {
        await this.show();
      } else {
        await this.hide();
      }
    };

    this.registerBinding(binding);
    binding(); // Initial evaluation

    return this;
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
   * Get the position and size of this widget
   * @returns Object with x, y, absoluteX, absoluteY, width, height
   */
  async getPosition(): Promise<{ x: number; y: number; absoluteX: number; absoluteY: number; width: number; height: number }> {
    const info = await this.ctx.bridge.send('getWidgetInfo', {
      widgetId: this.id
    }) as { x: number; y: number; absoluteX: number; absoluteY: number; width: number; height: number };
    return {
      x: info.x || 0,
      y: info.y || 0,
      absoluteX: info.absoluteX || 0,
      absoluteY: info.absoluteY || 0,
      width: info.width || 0,
      height: info.height || 0
    };
  }

  /**
   * Register a custom ID for this widget (for test framework getById)
   * @param customId Custom ID to register
   * @returns this for method chaining
   * @example
   * const statusLabel = a.label('').withId('statusLabel');
   * // In tests: ctx.getById('statusLabel')
   */
  withId(customId: string): this {
    // Send registration and track the promise so app.run() can wait for it
    const registrationPromise = this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    }).then(() => {
      // Registration complete
    }).catch(err => {
      console.error('Failed to register custom ID:', err);
    });

    this.ctx.trackRegistration(registrationPromise);
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

    // Register as global binding for MVC-style auto-refresh
    registerGlobalBinding(updateVisibility);

    updateVisibility(); // Initial evaluation

    return this;
  }

  /**
   * Refresh visibility - re-evaluates when() condition
   */
  async refreshVisibility(): Promise<void> {
    if (this.visibilityCondition) {
      await this.visibilityCondition();
    }
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
   * Refresh the widget - re-evaluates visibility conditions and style conditions
   */
  async refresh(): Promise<void> {
    if (this.visibilityCondition) {
      await this.visibilityCondition();
    }
    if (this.styleCondition) {
      await this.styleCondition();
    }
  }

  /**
   * Apply inline styles to this widget
   * @param style WidgetStyle object with styling properties
   * @returns this for method chaining
   * @example
   * a.label('Error').withStyle({ color: 0xFF0000, font_weight: 'bold' });
   */
  withStyle(style: WidgetStyle): this {
    applyStyleToWidget(this.ctx, this.id, style);
    return this;
  }

  /**
   * Declarative conditional styling - apply different styles based on condition
   * @param conditionFn Function that returns true/false for condition
   * @param trueStyle Style to apply when condition is true
   * @param falseStyle Style to apply when condition is false (optional)
   * @returns this for method chaining
   * @example
   * // Scarlet background when unchecked, default when checked
   * checkbox.styleWhen(
   *   () => !isChecked,
   *   { background_color: 0xDC143C, color: 0xFFFFFF, font_weight: 'bold' },
   *   { background_color: undefined, color: undefined, font_weight: 'normal' }
   * );
   */
  styleWhen(
    conditionFn: () => boolean,
    trueStyle: WidgetStyle,
    falseStyle?: WidgetStyle
  ): this {
    const updateStyle = async () => {
      const condition = conditionFn();
      if (condition) {
        await applyStyleToWidget(this.ctx, this.id, trueStyle);
      } else if (falseStyle) {
        await applyStyleToWidget(this.ctx, this.id, falseStyle);
      }
    };

    // Store for reactive re-evaluation
    this.styleCondition = updateStyle;
    updateStyle(); // Initial evaluation

    return this;
  }

  /**
   * Refresh only the style condition without affecting visibility
   */
  async refreshStyle(): Promise<void> {
    if (this.styleCondition) {
      await this.styleCondition();
    }
  }

  // ==================== Size & Resize ====================

  /**
   * Set the minimum size of this widget
   * @param width Minimum width in pixels
   * @param height Minimum height in pixels
   * @returns this for method chaining
   * @example
   * a.button('1').withMinSize(40, 40); // Fixed 40x40 button
   * a.label('X').withMinSize(50, 0);   // Min width 50, height auto
   */
  withMinSize(width: number, height: number): this {
    this.ctx.bridge.send('setWidgetMinSize', {
      widgetId: this.id,
      minWidth: width,
      minHeight: height
    });
    return this;
  }

  /**
   * Get the current rendered size of the widget
   * @returns Promise resolving to {width, height} in pixels
   * @example
   * const size = await container.getSize();
   * console.log(`Container is ${size.width}x${size.height}`);
   */
  async getSize(): Promise<{ width: number; height: number }> {
    const result = await this.ctx.bridge.send('getWidgetSize', {
      widgetId: this.id
    }) as { width: number; height: number };
    return { width: result.width, height: result.height };
  }

  /**
   * Register a callback for when this container's size changes
   * Only works on container widgets (vbox, hbox, stack, etc.)
   * @param callback Function called with new width and height when container resizes
   * @returns this for method chaining
   * @example
   * a.stack(() => {
   *   // canvas elements
   * }).onResize((width, height) => {
   *   // Recalculate canvas element positions based on new size
   *   updateCanvasPositions(width, height);
   * });
   */
  onResize(callback: (width: number, height: number) => void): this {
    const callbackId = this.ctx.generateId('resize');
    this.ctx.bridge.registerEventHandler(callbackId, (data: any) => {
      callback(data.width, data.height);
    });
    this.ctx.bridge.send('setWidgetOnResize', {
      widgetId: this.id,
      callbackId
    });
    return this;
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
