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
 * Register a binding on a specific context.
 * Bindings are scoped per-Context so apps can't trigger each other's bindings.
 * @param ctx The context to register the binding on
 * @param binding The binding function to register
 */
export function registerGlobalBinding(ctx: Context, binding: ReactiveBinding): void {
  ctx.registerBinding(binding);
}

/**
 * Refresh all reactive bindings on a specific context.
 * @param ctx The context whose bindings to refresh
 */
export async function refreshAllBindings(ctx?: Context): Promise<void> {
  if (ctx) {
    return ctx.refreshAllBindings();
  }
  // No-arg form: legacy fallback — should not be used in contained mode
}

/**
 * Clear all bindings on a specific context.
 * @param ctx The context to clear (if omitted, no-op)
 */
export function clearAllBindings(ctx?: Context): void {
  if (ctx) {
    ctx.clearBindings();
  }
}

/**
 * Event options for widget constructors — declare events at creation time
 * to avoid follow-up messages. Extends any widget-specific options interface.
 */
export interface WidgetEventOptions {
  onMouseIn?: (e: { position: { x: number, y: number } }) => void;
  onMouseOut?: () => void;
  onMouseMoved?: (e: { position: { x: number, y: number } }) => void;
  onMouseDown?: (e: { button: number, position: { x: number, y: number } }) => void;
  onMouseUp?: (e: { button: number, position: { x: number, y: number } }) => void;
  onKeyDown?: (e: { key: string }) => void;
  onKeyUp?: (e: { key: string }) => void;
  onFocusChange?: (e: { focused: boolean }) => void;
  cursor?: 'default' | 'text' | 'crosshair' | 'pointer' | 'hResize' | 'vResize';
}

// Bitmask constants matching Go evBit* constants
const evBitTap       = 1 << 0;
const evBitDoubleTap = 1 << 1;
// const evBitSecTap    = 1 << 2;
const evBitHover     = 1 << 3;
const evBitMouse     = 1 << 4;
const evBitFocus     = 1 << 5;
const evBitKey       = 1 << 6;
// const evBitDrag      = 1 << 7;
// const evBitScroll    = 1 << 8;
const evBitCursor    = 1 << 9;

// Maps event key names to the bitmask bit they enable
const eventKeyToBit: Record<string, number> = {
  tap: evBitTap,
  doubleTap: evBitDoubleTap,
  mouseIn: evBitHover,
  mouseOut: evBitHover,
  mouseMoved: evBitHover,
  mouseDown: evBitMouse,
  mouseUp: evBitMouse,
  focusGained: evBitFocus,
  focusLost: evBitFocus,
  keyDown: evBitKey,
  keyUp: evBitKey,
  cursor: evBitCursor,
};

export abstract class Widget {
  protected ctx: Context;
  public id: string;
  private visibilityCondition?: () => Promise<void>;
  private styleCondition?: () => Promise<void>;
  protected ghostCondition?: () => Promise<void>;
  private styleClass?: WidgetSelector;
  private bindings: ReactiveBinding[] = [];

  // Microtask batching for event registration
  private pendingEvents?: Map<string, string>;
  private flushScheduled = false;

  constructor(ctx: Context, id: string) {
    this.ctx = ctx;
    this.id = id;
  }

  /**
   * Register an event for batched sending. All registerEvent() calls within
   * one synchronous execution context are collapsed into a single setWidgetEvents
   * message via queueMicrotask.
   */
  protected registerEvent(eventKey: string, callbackId: string): void {
    if (!this.pendingEvents) this.pendingEvents = new Map();
    this.pendingEvents.set(eventKey, callbackId);
    if (!this.flushScheduled) {
      this.flushScheduled = true;
      queueMicrotask(() => this.flushEvents());
    }
  }

  private flushEvents(): void {
    if (!this.pendingEvents || this.pendingEvents.size === 0) {
      this.flushScheduled = false;
      return;
    }
    // Compute bitmask from registered event keys
    let events = 0;
    const cbs: Record<string, string> = {};
    for (const [key, id] of this.pendingEvents) {
      cbs[key] = id;
      const bit = eventKeyToBit[key];
      if (bit) events |= bit;
    }
    this.ctx.bridge.send('setWidgetEvents', {
      widgetId: this.id,
      events,
      cbs,
    });
    this.pendingEvents = undefined;
    this.flushScheduled = false;
  }

  /**
   * Apply event options from a constructor options object. Returns an object
   * with `events` bitmask and `cbs` map suitable for including in a create* payload.
   * Returns undefined if no event options are present.
   */
  protected applyEventOptions(options: WidgetEventOptions): { events: number, cbs: Record<string, string> } | undefined {
    let events = 0;
    const cbs: Record<string, string> = {};
    let hasAny = false;

    if (options.onMouseIn) {
      const cbId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(cbId, (data: unknown) => {
        options.onMouseIn!(data as { position: { x: number, y: number } });
      });
      cbs.mouseIn = cbId;
      events |= evBitHover;
      hasAny = true;
    }
    if (options.onMouseOut) {
      const cbId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(cbId, options.onMouseOut);
      cbs.mouseOut = cbId;
      events |= evBitHover;
      hasAny = true;
    }
    if (options.onMouseMoved) {
      const cbId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(cbId, (data: unknown) => {
        options.onMouseMoved!(data as { position: { x: number, y: number } });
      });
      cbs.mouseMoved = cbId;
      events |= evBitHover;
      hasAny = true;
    }
    if (options.onMouseDown) {
      const cbId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(cbId, (data: unknown) => {
        options.onMouseDown!(data as { button: number, position: { x: number, y: number } });
      });
      cbs.mouseDown = cbId;
      events |= evBitMouse;
      hasAny = true;
    }
    if (options.onMouseUp) {
      const cbId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(cbId, (data: unknown) => {
        options.onMouseUp!(data as { button: number, position: { x: number, y: number } });
      });
      cbs.mouseUp = cbId;
      events |= evBitMouse;
      hasAny = true;
    }
    if (options.onKeyDown) {
      const cbId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(cbId, (data: unknown) => {
        options.onKeyDown!(data as { key: string });
      });
      cbs.keyDown = cbId;
      events |= evBitKey;
      hasAny = true;
    }
    if (options.onKeyUp) {
      const cbId = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(cbId, (data: unknown) => {
        options.onKeyUp!(data as { key: string });
      });
      cbs.keyUp = cbId;
      events |= evBitKey;
      hasAny = true;
    }
    if (options.onFocusChange) {
      const cbIdGained = this.ctx.generateId('callback');
      const cbIdLost = this.ctx.generateId('callback');
      this.ctx.bridge.registerEventHandler(cbIdGained, (data: unknown) => {
        options.onFocusChange!(data as { focused: boolean });
      });
      this.ctx.bridge.registerEventHandler(cbIdLost, (data: unknown) => {
        options.onFocusChange!(data as { focused: boolean });
      });
      cbs.focusGained = cbIdGained;
      cbs.focusLost = cbIdLost;
      events |= evBitFocus;
      hasAny = true;
    }
    if (options.cursor) {
      cbs.cursor = options.cursor;
      events |= evBitCursor;
      hasAny = true;
    }

    return hasAny ? { events, cbs } : undefined;
  }

  /**
   * Register a reactive binding for this widget
   * @internal
   */
  protected registerBinding(binding: ReactiveBinding): void {
    this.bindings.push(binding);
    this.ctx.registerBinding(binding);
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
    // Register in context-scoped registry for a.refreshBindings() lookup
    this.ctx.registerWidgetId(customId, this);

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

    // Register on this widget's context for scoped auto-refresh
    this.ctx.registerBinding(updateVisibility);

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
    });
    this.registerEvent('mouseIn', callbackId);
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
    });
    this.registerEvent('mouseMoved', callbackId);
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
    this.ctx.bridge.registerEventHandler(callbackId, callback);
    this.registerEvent('mouseOut', callbackId);
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
    if (callbacks.in) this.onMouseIn(callbacks.in);
    if (callbacks.moved) this.onMouseMoved(callbacks.moved);
    if (callbacks.out) this.onMouseOut(callbacks.out);
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
    this.registerEvent('mouseDown', callbackId);
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
    this.registerEvent('mouseUp', callbackId);
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
    this.registerEvent('keyDown', callbackId);
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
    this.registerEvent('keyUp', callbackId);
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
    const cbIdGained = this.ctx.generateId('callback');
    const cbIdLost = this.ctx.generateId('callback');
    this.ctx.bridge.registerEventHandler(cbIdGained, (data: unknown) => {
      callback(data as { focused: boolean });
    });
    this.ctx.bridge.registerEventHandler(cbIdLost, (data: unknown) => {
      callback(data as { focused: boolean });
    });
    this.registerEvent('focusGained', cbIdGained);
    this.registerEvent('focusLost', cbIdLost);
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
    this.registerEvent('cursor', cursor);
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
    if (this.ghostCondition) {
      await this.ghostCondition();
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
   * Make this widget's text bold
   * @returns this for method chaining
   * @example
   * a.label('Title').withBold();
   */
  withBold(): this {
    return this.withStyle({ font_weight: 'bold' });
  }

  /**
   * Set font size for this widget
   * @returns this for method chaining
   */
  withSize(size: number): this {
    return this.withStyle({ font_size: size });
  }

  /**
   * Set padding (visual hint, no-op in current renderer)
   * @returns this for method chaining
   */
  withPadding(_padding: number): this {
    return this;
  }

  /**
   * Set minimum width (visual hint, no-op in current renderer)
   * @returns this for method chaining
   */
  withMinWidth(_width: number): this {
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
    dragLabel?: string;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onDoubleTap?: (dragData: string) => void;
    onTap?: (dragData: string) => void;
  }): this {
    const payload: any = {
      widgetId: this.id,
      dragData: options.dragData
    };
    if (options.dragLabel) payload.dragLabel = options.dragLabel;

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

    if (options.onDoubleTap) {
      const callbackId = this.ctx.generateId('callback');
      payload.onDoubleTapCallbackId = callbackId;
      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => options.onDoubleTap!(data.dragData));
    }

    if (options.onTap) {
      const callbackId = this.ctx.generateId('callback');
      payload.onTapCallbackId = callbackId;
      this.ctx.bridge.registerEventHandler(callbackId, (data: any) => options.onTap!(data.dragData));
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
    onDrop?: (dragData: string, sourceId: string, dropIndex: number) => void;
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
        options.onDrop!(data.dragData, data.sourceId, data.dropIndex ?? -1);
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
