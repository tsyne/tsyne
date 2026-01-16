import { Context } from '../context';
import { ReactiveBinding, registerGlobalBinding } from './base';

// ============================================================================
// Animation System - D3/QML-inspired declarative animations
// ============================================================================

export type EasingType = 'linear' | 'inOut' | 'in' | 'out' | 'elastic' | 'bounce';
export type EasingFunction = (t: number) => number;
export type EasingSpec = EasingType | EasingFunction;

export interface AnimateOptions {
  ms: number;
  ease?: EasingSpec;
  delay?: number;
  onEnd?: () => void;
}

const easings: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => t * (2 - t),
  inOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  elastic: (t) => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1,
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Animation handle for chaining - returned by .to()
 */
/** Helper to resolve easing spec to function */
function resolveEasing(ease: EasingSpec): EasingFunction {
  if (typeof ease === 'function') return ease;
  return easings[ease] || easings.inOut;
}

export class Tween<T> {
  private target: T;
  private updateFn: (values: Record<string, any>) => void;
  private getValuesFn: () => Record<string, any>;
  private queue: Array<{
    toValues: Record<string, any>;
    duration: number;
    easeFn: EasingFunction;
    delay: number;
    onEnd?: () => void;
  }> = [];
  private running = false;

  constructor(
    target: T,
    updateFn: (values: Record<string, any>) => void,
    getValuesFn: () => Record<string, any>
  ) {
    this.target = target;
    this.updateFn = updateFn;
    this.getValuesFn = getValuesFn;
  }

  /**
   * Animate to target values
   * @param toValues - Properties to animate to
   * @param options - Duration in ms, or options object
   */
  to(toValues: Record<string, any>, options: number | AnimateOptions): Tween<T> {
    const duration = typeof options === 'number' ? options : options.ms;
    const ease = typeof options === 'object' && options.ease ? options.ease : 'inOut';
    const delay = typeof options === 'object' && options.delay ? options.delay : 0;
    const onEnd = typeof options === 'object' ? options.onEnd : undefined;
    const easeFn = resolveEasing(ease);

    this.queue.push({ toValues, duration, easeFn, delay, onEnd });

    if (!this.running) {
      this.runNext();
    }

    return this;
  }

  private runNext(): void {
    if (this.queue.length === 0) {
      this.running = false;
      return;
    }

    this.running = true;
    const { toValues, duration, easeFn, delay, onEnd } = this.queue.shift()!;
    const from = this.getValuesFn();
    const startTime = Date.now() + delay;

    const tick = () => {
      const now = Date.now();
      if (now < startTime) {
        setTimeout(tick, 16);
        return;
      }

      const elapsed = now - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const progress = easeFn(rawProgress);

      const current: Record<string, any> = {};
      for (const key of Object.keys(toValues)) {
        if (key in from && typeof from[key] === 'number' && typeof toValues[key] === 'number') {
          current[key] = lerp(from[key], toValues[key], progress);
        }
      }

      this.updateFn(current);

      if (rawProgress < 1) {
        setTimeout(tick, 16);
      } else {
        if (onEnd) onEnd();
        this.runNext();
      }
    };

    setTimeout(tick, 16);
  }

  /**
   * Stop all animations
   */
  stop(): Tween<T> {
    this.queue = [];
    this.running = false;
    return this;
  }
}

// ============================================================================
// Canvas Widgets
// ============================================================================

/**
 * Canvas Line - draws a line between two points
 *
 * Supports D3-style animation:
 *   line.to({ x2: 500 }, 1000);
 *   line.to({ x1: 100, y1: 200 }, { ms: 500, ease: 'elastic' });
 */
export class CanvasLine {
  private ctx: Context;
  public id: string;
  private _x1 = 0;
  private _y1 = 0;
  private _x2 = 0;
  private _y2 = 0;
  private _strokeWidth = 0;
  private _tween?: Tween<CanvasLine>;

  constructor(ctx: Context, x1: number, y1: number, x2: number, y2: number, options?: {
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasline');
    this._x1 = x1;
    this._y1 = y1;
    this._x2 = x2;
    this._y2 = y2;

    const payload: any = {
      id: this.id,
      x1, y1, x2, y2
    };

    if (options?.strokeColor) {
      payload.strokeColor = options.strokeColor;
    }
    if (options?.strokeWidth) {
      payload.strokeWidth = options.strokeWidth;
      this._strokeWidth = options.strokeWidth;
    }

    ctx.bridge.send('createCanvasLine', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    x1?: number; y1?: number;
    x2?: number; y2?: number;
    strokeColor?: string;
    strokeWidth?: number;
  }): Promise<void> {
    // Track current values for animation
    if (options.x1 !== undefined) this._x1 = options.x1;
    if (options.y1 !== undefined) this._y1 = options.y1;
    if (options.x2 !== undefined) this._x2 = options.x2;
    if (options.y2 !== undefined) this._y2 = options.y2;
    if (options.strokeWidth !== undefined) this._strokeWidth = options.strokeWidth;

    await this.ctx.bridge.send('updateCanvasLine', {
      widgetId: this.id,
      ...options
    });
  }

  /**
   * Animate to target values (D3-style)
   * @param toValues - Properties to animate: x1, y1, x2, y2, strokeWidth
   * @param options - Duration in ms, or options object with ease, delay, onEnd
   * @example
   *   line.to({ x2: 500 }, 1000);
   *   line.to({ x1: 100, y1: 200 }, { ms: 500, ease: 'elastic' });
   */
  to(toValues: { x1?: number; y1?: number; x2?: number; y2?: number; strokeWidth?: number },
     options: number | AnimateOptions): Tween<CanvasLine> {
    if (!this._tween) {
      this._tween = new Tween<CanvasLine>(
        this,
        (values) => {
          // Go bridge requires both x1/y1 and x2/y2 pairs together
          // Always include partner coordinate with current value
          const updateValues: Record<string, any> = { ...values };
          if ('x1' in values || 'y1' in values) {
            updateValues.x1 = values.x1 ?? this._x1;
            updateValues.y1 = values.y1 ?? this._y1;
          }
          if ('x2' in values || 'y2' in values) {
            updateValues.x2 = values.x2 ?? this._x2;
            updateValues.y2 = values.y2 ?? this._y2;
          }
          this.update(updateValues);
        },
        () => ({ x1: this._x1, y1: this._y1, x2: this._x2, y2: this._y2, strokeWidth: this._strokeWidth })
      );
    }
    return this._tween.to(toValues, options);
  }
}

/**
 * Canvas Circle - draws a circle/ellipse
 *
 * Supports D3-style animation:
 *   circle.to({ x: 400, x2: 440 }, 1000);
 *   circle.to({ x: 100 }, { ms: 500, ease: 'elastic' });
 */
export class CanvasCircle {
  private ctx: Context;
  public id: string;
  private _x = 0;
  private _y = 0;
  private _x2 = 0;
  private _y2 = 0;
  private _strokeWidth = 0;
  private _tween?: Tween<CanvasCircle>;

  constructor(ctx: Context, options?: {
    x?: number; y?: number;
    x2?: number; y2?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvascircle');

    const payload: any = { id: this.id };

    if (options) {
      if (options.x !== undefined) { payload.x = options.x; this._x = options.x; }
      if (options.y !== undefined) { payload.y = options.y; this._y = options.y; }
      if (options.x2 !== undefined) { payload.x2 = options.x2; this._x2 = options.x2; }
      if (options.y2 !== undefined) { payload.y2 = options.y2; this._y2 = options.y2; }
      if (options.fillColor) payload.fillColor = options.fillColor;
      if (options.strokeColor) payload.strokeColor = options.strokeColor;
      if (options.strokeWidth !== undefined) { payload.strokeWidth = options.strokeWidth; this._strokeWidth = options.strokeWidth; }
    }

    ctx.bridge.send('createCanvasCircle', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    x?: number; y?: number;
    x2?: number; y2?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }): Promise<void> {
    // Track current values for animation
    if (options.x !== undefined) this._x = options.x;
    if (options.y !== undefined) this._y = options.y;
    if (options.x2 !== undefined) this._x2 = options.x2;
    if (options.y2 !== undefined) this._y2 = options.y2;
    if (options.strokeWidth !== undefined) this._strokeWidth = options.strokeWidth;

    await this.ctx.bridge.send('updateCanvasCircle', {
      widgetId: this.id,
      ...options
    });
  }

  /**
   * Animate to target values (D3-style)
   * @param toValues - Properties to animate: x, y, x2, y2, strokeWidth
   * @param options - Duration in ms, or options object with ease, delay, onEnd
   * @example
   *   circle.to({ x: 400, x2: 440 }, 1000);
   *   circle.to({ x: 100 }, { ms: 500, ease: 'elastic' });
   *   circle.to({ x: 0 }, 300).to({ y: 100 }, 300);  // Chaining
   */
  /**
   * Get current position values (for testing)
   */
  getPosition(): { x: number; y: number; x2: number; y2: number } {
    return { x: this._x, y: this._y, x2: this._x2, y2: this._y2 };
  }

  to(toValues: { x?: number; y?: number; x2?: number; y2?: number; strokeWidth?: number },
     options: number | AnimateOptions): Tween<CanvasCircle> {
    if (!this._tween) {
      this._tween = new Tween<CanvasCircle>(
        this,
        (values) => {
          // Go bridge requires both x/y and x2/y2 pairs together
          // Always include partner coordinate with current value
          const updateValues: Record<string, any> = { ...values };
          if ('x' in values || 'y' in values) {
            updateValues.x = values.x ?? this._x;
            updateValues.y = values.y ?? this._y;
          }
          if ('x2' in values || 'y2' in values) {
            updateValues.x2 = values.x2 ?? this._x2;
            updateValues.y2 = values.y2 ?? this._y2;
          }
          this.update(updateValues);
        },
        () => ({ x: this._x, y: this._y, x2: this._x2, y2: this._y2, strokeWidth: this._strokeWidth })
      );
    }
    return this._tween.to(toValues, options);
  }
}

/**
 * Canvas Rectangle - draws a rectangle
 *
 * Supports onClick for interactive rectangles:
 *   a.canvasRectangle({ width: 400, height: 200, onClick: (x, y) => console.log(x, y) });
 */
export class CanvasRectangle {
  private ctx: Context;
  public id: string;
  private bindings: ReactiveBinding[] = [];
  private onClickCallback?: (x: number, y: number) => void;

  constructor(ctx: Context, options?: {
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    width?: number;
    height?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    cornerRadius?: number;
    onClick?: (x: number, y: number) => void;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasrectangle');
    this.onClickCallback = options?.onClick;

    const payload: any = { id: this.id };

    if (options) {
      if (options.x !== undefined) payload.x = options.x;
      if (options.y !== undefined) payload.y = options.y;
      if (options.x2 !== undefined) payload.x2 = options.x2;
      if (options.y2 !== undefined) payload.y2 = options.y2;
      if (options.width !== undefined) payload.width = options.width;
      if (options.height !== undefined) payload.height = options.height;
      if (options.fillColor) payload.fillColor = options.fillColor;
      if (options.strokeColor) payload.strokeColor = options.strokeColor;
      if (options.strokeWidth !== undefined) payload.strokeWidth = options.strokeWidth;
      if (options.cornerRadius !== undefined) payload.cornerRadius = options.cornerRadius;
    }

    // Use tappable version if onClick is provided
    if (options?.onClick) {
      ctx.bridge.send('createTappableCanvasRectangle', payload);

      // Register event listener for tapped events using widget-specific key
      // to avoid overwriting handlers when multiple tappable rectangles exist
      ctx.bridge.on(`canvasRectangleTapped:${this.id}`, (event: any) => {
        if (this.onClickCallback) {
          this.onClickCallback(event.x, event.y);
        }
      });
    } else {
      ctx.bridge.send('createCanvasRectangle', payload);
    }

    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    width?: number;
    height?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    cornerRadius?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasRectangle', {
      widgetId: this.id,
      ...options
    });
  }

  /**
   * Set the fill color
   */
  async setFillColor(color: string): Promise<void> {
    await this.update({ fillColor: color });
  }

  /**
   * Set the stroke color
   */
  async setStrokeColor(color: string): Promise<void> {
    await this.update({ strokeColor: color });
  }

  /**
   * MVC-style binding: bind fill color to a reactive function
   * Color updates automatically when refreshAllBindings() is called
   * @param colorFn Function returning the fill color (hex string or 'transparent')
   * @returns this for method chaining
   * @example
   * a.rectangle().bindFillColor(() => isError ? '#FF0000' : 'transparent');
   */
  bindFillColor(colorFn: () => string): this {
    const binding = async () => {
      await this.update({ fillColor: colorFn() });
    };

    this.bindings.push(binding);
    registerGlobalBinding(binding);
    binding(); // Initial evaluation

    return this;
  }

  /**
   * Refresh all reactive bindings on this rectangle
   */
  async refreshBindings(): Promise<void> {
    for (const binding of this.bindings) {
      await binding();
    }
  }

  /**
   * Register a custom ID for this rectangle (for test framework getById)
   */
  withId(customId: string): this {
    const registrationPromise = this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    }).then(() => {}).catch(err => {
      console.error('Failed to register custom ID:', err);
    });
    this.ctx.trackRegistration(registrationPromise);
    return this;
  }
}

/**
 * Canvas Text - draws text on the canvas
 */
export class CanvasText {
  private ctx: Context;
  public id: string;
  private bindings: ReactiveBinding[] = [];

  constructor(ctx: Context, text: string, options?: {
    color?: string;
    textSize?: number;
    bold?: boolean;
    italic?: boolean;
    monospace?: boolean;
    alignment?: 'leading' | 'center' | 'trailing';
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvastext');

    const payload: any = { id: this.id, text };

    if (options) {
      if (options.color) payload.color = options.color;
      if (options.textSize !== undefined) payload.textSize = options.textSize;
      if (options.bold !== undefined) payload.bold = options.bold;
      if (options.italic !== undefined) payload.italic = options.italic;
      if (options.monospace !== undefined) payload.monospace = options.monospace;
      if (options.alignment) payload.alignment = options.alignment;
    }

    ctx.bridge.send('createCanvasText', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    text?: string;
    color?: string;
    textSize?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasText', {
      widgetId: this.id,
      ...options
    });
  }

  /**
   * Reactive binding for text color (MVC pattern)
   * @param colorFn Function that returns the color value
   * @returns this for method chaining
   *
   * @example
   * a.canvasText('Label').bindColor(() => isError ? '#FF0000' : '#000000');
   */
  bindColor(colorFn: () => string): this {
    const binding = async () => {
      await this.update({ color: colorFn() });
    };

    this.bindings.push(binding);
    registerGlobalBinding(binding);
    binding(); // Initial evaluation

    return this;
  }

  /**
   * Refresh all reactive bindings on this text
   */
  async refreshBindings(): Promise<void> {
    for (const binding of this.bindings) {
      await binding();
    }
  }
}

// ============================================================================
// Sprite System - Efficient animated graphics with dirty rectangle tracking
// ============================================================================

/**
 * Sprite reference returned by CanvasRaster.createSprite()
 * Sprites are image layers that can be efficiently moved and z-ordered
 */
export interface Sprite {
  name: string;
  x: number;
  y: number;
  zIndex: number;
  visible: boolean;
}

/**
 * Canvas Raster - pixel-level drawing with optional sprite/dirty-rect support
 *
 * For animated graphics, use the sprite system:
 * 1. Call saveBackground() after drawing static elements (grid, etc.)
 * 2. Create sprites with createSprite() - they reference registered resources
 * 3. Move sprites with moveSprite() - automatically tracks dirty rectangles
 * 4. Call flush() to efficiently redraw only dirty regions
 *
 * This reduces per-frame work from O(canvas_size) to O(sprite_area * num_sprites)
 */
export class CanvasRaster {
  private ctx: Context;
  public id: string;
  private _width: number;
  private _height: number;
  private _sprites: Map<string, Sprite> = new Map();

  constructor(ctx: Context, width: number, height: number, pixels?: Array<[number, number, number, number]>) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasraster');
    this._width = width;
    this._height = height;

    const payload: any = { id: this.id, width, height };

    if (pixels) {
      payload.pixels = pixels;
    }

    ctx.bridge.send('createCanvasRaster', payload);
    ctx.addToCurrentContainer(this.id);
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }

  /**
   * Register a custom ID for this widget (for test framework getById)
   * @param customId Custom ID to register
   * @returns this for method chaining
   */
  withId(customId: string): this {
    this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    }).catch(err => {
      console.error('Failed to register custom ID:', err);
    });
    return this;
  }

  /**
   * Update individual pixels
   * @param updates Array of pixel updates {x, y, r, g, b, a}
   */
  async setPixels(updates: Array<{x: number; y: number; r: number; g: number; b: number; a: number}>): Promise<void> {
    await this.ctx.bridge.send('updateCanvasRaster', {
      widgetId: this.id,
      updates
    });
  }

  /**
   * Set a single pixel
   */
  async setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255): Promise<void> {
    await this.setPixels([{x, y, r, g, b, a}]);
  }

  /**
   * Fill a rectangular region with a solid color
   * Much more efficient than calling setPixel for each pixel
   * @param x Top-left X coordinate
   * @param y Top-left Y coordinate
   * @param width Rectangle width
   * @param height Rectangle height
   * @param r Red component (0-255)
   * @param g Green component (0-255)
   * @param b Blue component (0-255)
   * @param a Alpha component (0-255), defaults to 255
   */
  async fillRect(x: number, y: number, width: number, height: number,
                 r: number, g: number, b: number, a: number = 255): Promise<void> {
    await this.ctx.bridge.send('fillCanvasRasterRect', {
      widgetId: this.id,
      x, y, width, height, r, g, b, a
    });
  }

  /**
   * Blit (copy) a pre-registered image resource onto the raster at the specified position
   * The resource should be registered via app.resources.registerResource() with PNG/image data
   * @param resourceName Name of the registered resource
   * @param x Destination X coordinate (top-left)
   * @param y Destination Y coordinate (top-left)
   * @param options Optional settings: alpha for transparency blending (0-255)
   */
  async blitImage(resourceName: string, x: number, y: number, options?: {
    alpha?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('blitToCanvasRaster', {
      widgetId: this.id,
      resourceName,
      x, y,
      alpha: options?.alpha ?? 255
    });
  }

  // ==========================================================================
  // Sprite System - Efficient dirty-rectangle based animation
  // ==========================================================================

  /**
   * Save the current raster contents as the static background
   * Call this after drawing grid lines, static elements, etc.
   * The background is used to restore pixels under moving sprites
   */
  async saveBackground(): Promise<void> {
    await this.ctx.bridge.send('saveRasterBackground', {
      widgetId: this.id
    });
  }

  /**
   * Create a sprite from a registered resource
   * Sprites are image layers that can be efficiently moved and z-ordered
   * @param name Unique name for this sprite
   * @param resourceName Name of the registered image resource
   * @param x Initial X position
   * @param y Initial Y position
   * @param options zIndex for layering (higher = front), visible to show/hide
   */
  async createSprite(name: string, resourceName: string, x: number, y: number, options?: {
    zIndex?: number;
    visible?: boolean;
  }): Promise<Sprite> {
    const sprite: Sprite = {
      name,
      x,
      y,
      zIndex: options?.zIndex ?? 0,
      visible: options?.visible ?? true
    };
    this._sprites.set(name, sprite);

    await this.ctx.bridge.send('createRasterSprite', {
      widgetId: this.id,
      name,
      resourceName,
      x, y,
      zIndex: sprite.zIndex,
      visible: sprite.visible
    });

    return sprite;
  }

  /**
   * Move a sprite to a new position
   * Automatically marks both old and new positions as dirty
   * @param name Sprite name
   * @param x New X position
   * @param y New Y position
   */
  async moveSprite(name: string, x: number, y: number): Promise<void> {
    const sprite = this._sprites.get(name);
    if (sprite) {
      sprite.x = x;
      sprite.y = y;
    }

    await this.ctx.bridge.send('moveRasterSprite', {
      widgetId: this.id,
      name,
      x, y
    });
  }

  /**
   * Change a sprite's image resource (e.g., for animation frames)
   * @param name Sprite name
   * @param resourceName New resource name
   */
  async setSpriteResource(name: string, resourceName: string): Promise<void> {
    await this.ctx.bridge.send('setRasterSpriteResource', {
      widgetId: this.id,
      name,
      resourceName
    });
  }

  /**
   * Show or hide a sprite
   * @param name Sprite name
   * @param visible Whether the sprite should be visible
   */
  async setSpriteVisible(name: string, visible: boolean): Promise<void> {
    const sprite = this._sprites.get(name);
    if (sprite) {
      sprite.visible = visible;
    }

    await this.ctx.bridge.send('setRasterSpriteVisible', {
      widgetId: this.id,
      name,
      visible
    });
  }

  /**
   * Change a sprite's z-index for layering
   * Higher z-index = drawn on top
   * @param name Sprite name
   * @param zIndex New z-index value
   */
  async setSpriteZIndex(name: string, zIndex: number): Promise<void> {
    const sprite = this._sprites.get(name);
    if (sprite) {
      sprite.zIndex = zIndex;
    }

    await this.ctx.bridge.send('setRasterSpriteZIndex', {
      widgetId: this.id,
      name,
      zIndex
    });
  }

  /**
   * Remove a sprite
   * @param name Sprite name to remove
   */
  async removeSprite(name: string): Promise<void> {
    this._sprites.delete(name);

    await this.ctx.bridge.send('removeRasterSprite', {
      widgetId: this.id,
      name
    });
  }

  /**
   * Flush pending sprite changes - redraws only dirty rectangles
   * This is the efficient update path:
   * 1. For each dirty rect: restore background pixels
   * 2. Re-draw sprites that overlap dirty rects (in z-order)
   * 3. Refresh the raster widget
   *
   * Call this once per frame after moving sprites
   */
  async flush(): Promise<void> {
    await this.ctx.bridge.send('flushRasterSprites', {
      widgetId: this.id
    });
  }

  /**
   * Get a sprite by name
   */
  getSprite(name: string): Sprite | undefined {
    return this._sprites.get(name);
  }

  /**
   * Get all sprites
   */
  getSprites(): Sprite[] {
    return Array.from(this._sprites.values());
  }
}

/**
 * Options for TappableCanvasRaster
 */
export interface TappableCanvasRasterOptions {
  pixels?: Array<[number, number, number, number]>;
  onTap?: (x: number, y: number) => void;
  onKeyDown?: (key: string) => void;
  onKeyUp?: (key: string) => void;
  /** Called on scroll/mousewheel/touchpad two-finger scroll. deltaY > 0 = scroll up, < 0 = scroll down */
  onScroll?: (deltaX: number, deltaY: number, x: number, y: number) => void;
  /** Called when mouse moves over the canvas */
  onMouseMove?: (x: number, y: number) => void;
  /** Called during drag with position and delta */
  onDrag?: (x: number, y: number, deltaX: number, deltaY: number) => void;
  /** Called when drag ends */
  onDragEnd?: () => void;
}

/**
 * Tappable Canvas Raster - an interactive raster that responds to tap/click and keyboard events
 */
export class TappableCanvasRaster {
  private ctx: Context;
  public id: string;
  private _width: number;
  private _height: number;
  private onTapCallback?: (x: number, y: number) => void;
  private onKeyDownCallback?: (key: string) => void;
  private onKeyUpCallback?: (key: string) => void;
  private onScrollCallback?: (deltaX: number, deltaY: number, x: number, y: number) => void;
  private onMouseMoveCallback?: (x: number, y: number) => void;
  private onDragCallback?: (x: number, y: number, deltaX: number, deltaY: number) => void;
  private onDragEndCallback?: () => void;

  constructor(ctx: Context, width: number, height: number, options?: TappableCanvasRasterOptions);
  /** @deprecated Use options object instead */
  constructor(ctx: Context, width: number, height: number, pixels?: Array<[number, number, number, number]>, onTap?: (x: number, y: number) => void);
  constructor(ctx: Context, width: number, height: number, pixelsOrOptions?: Array<[number, number, number, number]> | TappableCanvasRasterOptions, onTap?: (x: number, y: number) => void) {
    this.ctx = ctx;
    this.id = ctx.generateId('tappablecanvasraster');
    this._width = width;
    this._height = height;

    // Handle both old and new API
    let pixels: Array<[number, number, number, number]> | undefined;
    let options: TappableCanvasRasterOptions = {};

    if (Array.isArray(pixelsOrOptions)) {
      // Old API: pixels array
      pixels = pixelsOrOptions;
      options = { pixels, onTap };
    } else if (pixelsOrOptions) {
      // New API: options object
      options = pixelsOrOptions;
      pixels = options.pixels;
    }

    this.onTapCallback = options.onTap;
    this.onKeyDownCallback = options.onKeyDown;
    this.onKeyUpCallback = options.onKeyUp;
    this.onScrollCallback = options.onScroll;
    this.onMouseMoveCallback = options.onMouseMove;
    this.onDragCallback = options.onDrag;
    this.onDragEndCallback = options.onDragEnd;

    const payload: any = { id: this.id, width, height };

    if (pixels) {
      payload.pixels = pixels;
    }

    // Set up keyboard callbacks
    if (options.onKeyDown) {
      const callbackId = ctx.generateId('callback');
      payload.onKeyDownCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (this.onKeyDownCallback) {
          this.onKeyDownCallback(data.key);
        }
      });
    }

    if (options.onKeyUp) {
      const callbackId = ctx.generateId('callback');
      payload.onKeyUpCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (this.onKeyUpCallback) {
          this.onKeyUpCallback(data.key);
        }
      });
    }

    // Set up scroll callback
    if (options.onScroll) {
      const callbackId = ctx.generateId('callback');
      payload.onScrollCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (this.onScrollCallback) {
          this.onScrollCallback(data.deltaX, data.deltaY, data.x, data.y);
        }
      });
    }

    // Set up mouse move callback
    if (options.onMouseMove) {
      const callbackId = ctx.generateId('callback');
      payload.onMouseMoveCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (this.onMouseMoveCallback) {
          this.onMouseMoveCallback(data.x, data.y);
        }
      });
    }

    // Set up drag callback
    if (options.onDrag) {
      const callbackId = ctx.generateId('callback');
      payload.onDragCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, (data: any) => {
        if (this.onDragCallback) {
          this.onDragCallback(data.x, data.y, data.deltaX, data.deltaY);
        }
      });
    }

    // Set up drag end callback
    if (options.onDragEnd) {
      const callbackId = ctx.generateId('callback');
      payload.onDragEndCallbackId = callbackId;
      ctx.bridge.registerEventHandler(callbackId, () => {
        if (this.onDragEndCallback) {
          this.onDragEndCallback();
        }
      });
    }

    ctx.bridge.send('createTappableCanvasRaster', payload);
    ctx.addToCurrentContainer(this.id);

    // Register event listener for tap events using widget-specific key
    // to avoid overwriting handlers when multiple TappableCanvasRaster exist
    if (options.onTap) {
      ctx.bridge.on(`canvasRasterTapped:${this.id}`, (event: any) => {
        if (this.onTapCallback) {
          // event is already the data object with x, y, widgetId properties
          this.onTapCallback(event.x, event.y);
        }
      });
    }
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }

  /**
   * Update individual pixels
   * @param updates Array of pixel updates {x, y, r, g, b, a}
   */
  async setPixels(updates: Array<{x: number; y: number; r: number; g: number; b: number; a: number}>): Promise<void> {
    await this.ctx.bridge.send('updateTappableCanvasRaster', {
      widgetId: this.id,
      updates
    });
  }

  /**
   * Set a single pixel
   */
  async setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255): Promise<void> {
    await this.setPixels([{x, y, r, g, b, a}]);
  }

  /**
   * Set the tap callback
   */
  onTap(callback: (x: number, y: number) => void): void {
    this.onTapCallback = callback;
  }

  /**
   * Resize the canvas to new dimensions
   * The canvas will be cleared after resize
   * @param width New width in pixels
   * @param height New height in pixels
   */
  async resize(width: number, height: number): Promise<void> {
    this._width = width;
    this._height = height;
    await this.ctx.bridge.send('resizeTappableCanvasRaster', {
      widgetId: this.id,
      width,
      height
    });
  }

  /**
   * Set all pixels at once from a Uint8Array buffer (RGBA format)
   * This is much more efficient than setPixels for full-canvas updates.
   * Buffer must be width * height * 4 bytes (RGBA for each pixel).
   * @param buffer Raw pixel data in RGBA format
   */
  async setPixelBuffer(buffer: Uint8Array): Promise<void> {
    // Convert Uint8Array to base64
    const base64 = Buffer.from(buffer).toString('base64');
    await this.ctx.bridge.send('setTappableCanvasBuffer', {
      widgetId: this.id,
      buffer: base64
    });
  }

  /**
   * Set a rectangular region of pixels (RGBA format).
   * More efficient than setPixelBuffer for partial updates like selections.
   * Buffer must be rectWidth * rectHeight * 4 bytes (RGBA for each pixel).
   * @param x Left edge of rectangle in canvas coordinates
   * @param y Top edge of rectangle in canvas coordinates
   * @param rectWidth Width of the rectangle
   * @param rectHeight Height of the rectangle
   * @param buffer Raw pixel data in RGBA format for the rectangle
   */
  async setPixelRect(x: number, y: number, rectWidth: number, rectHeight: number, buffer: Uint8Array): Promise<void> {
    const base64 = Buffer.from(buffer).toString('base64');
    await this.ctx.bridge.send('setTappableCanvasRect', {
      widgetId: this.id,
      x,
      y,
      width: rectWidth,
      height: rectHeight,
      buffer: base64
    });
  }

  /**
   * Set all pixels using horizontal stripes to avoid message size limits.
   * Use this for large images (> ~10MB raw) that would exceed msgpack frame limits.
   * Buffer must be width * height * 4 bytes (RGBA for each pixel).
   * @param buffer Raw pixel data in RGBA format
   * @param width Image width (defaults to canvas width)
   * @param height Image height (defaults to canvas height)
   * @param maxStripeBytes Maximum bytes per stripe (default 1MB raw = ~1.33MB base64)
   */
  async setPixelBufferInStripes(
    buffer: Uint8Array,
    width?: number,
    height?: number,
    maxStripeBytes: number = 1024 * 1024
  ): Promise<void> {
    const imgWidth = width ?? this._width;
    const imgHeight = height ?? this._height;
    const bytesPerRow = imgWidth * 4;

    // Calculate rows per stripe (minimum 1 row)
    const rowsPerStripe = Math.max(1, Math.floor(maxStripeBytes / bytesPerRow));

    // Send stripes sequentially
    for (let y = 0; y < imgHeight; y += rowsPerStripe) {
      const stripeHeight = Math.min(rowsPerStripe, imgHeight - y);
      const startOffset = y * bytesPerRow;
      const endOffset = (y + stripeHeight) * bytesPerRow;
      const stripeBuffer = buffer.subarray(startOffset, endOffset);

      await this.setPixelRect(0, y, imgWidth, stripeHeight, stripeBuffer);
    }
  }

  /**
   * Set canvas from PNG image bytes.
   * This allows sending PNG data directly without TypeScript-side decoding.
   * The Go bridge will decode the PNG and update the canvas.
   * @param pngBytes Raw PNG image data (as Uint8Array or ArrayBuffer)
   * @returns Promise with the decoded image dimensions
   */
  async setImageFromPNG(pngBytes: Uint8Array | ArrayBuffer): Promise<{ width: number; height: number }> {
    // Ensure we have a Uint8Array
    const bytes = pngBytes instanceof ArrayBuffer ? new Uint8Array(pngBytes) : pngBytes;
    // Convert to base64
    const base64 = Buffer.from(bytes).toString('base64');
    const response = await this.ctx.bridge.send('setTappableCanvasImage', {
      widgetId: this.id,
      image: base64
    }) as { result?: { width?: number; height?: number } };
    return {
      width: response?.result?.width ?? this._width,
      height: response?.result?.height ?? this._height
    };
  }

  /**
   * Request keyboard focus for this canvas.
   * Once focused, the canvas will receive keyboard events.
   */
  async requestFocus(): Promise<void> {
    await this.ctx.bridge.send('focusTappableCanvasRaster', {
      widgetId: this.id
    });
  }

  /**
   * Register a custom ID for this canvas (for test framework getById)
   */
  withId(customId: string): this {
    const registrationPromise = this.ctx.bridge.send('registerCustomId', {
      widgetId: this.id,
      customId
    }).then(() => {}).catch(err => {
      console.error('Failed to register custom ID:', err);
    });
    this.ctx.trackRegistration(registrationPromise);
    return this;
  }
}

/**
 * Canvas Linear Gradient - draws a gradient fill
 */
export class CanvasLinearGradient {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    startColor?: string;
    endColor?: string;
    angle?: number;
    width?: number;
    height?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvaslineargradient');

    const payload: any = { id: this.id };

    if (options) {
      if (options.startColor) payload.startColor = options.startColor;
      if (options.endColor) payload.endColor = options.endColor;
      if (options.angle !== undefined) payload.angle = options.angle;
      if (options.width !== undefined) payload.width = options.width;
      if (options.height !== undefined) payload.height = options.height;
    }

    ctx.bridge.send('createCanvasLinearGradient', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    startColor?: string;
    endColor?: string;
    angle?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasLinearGradient', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Arc - draws a filled arc or annular sector
 * Used for pie charts, circular progress indicators, etc.
 */
export class CanvasArc {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    startAngle?: number;
    endAngle?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasarc');

    const payload: any = { id: this.id };

    if (options) {
      if (options.x !== undefined) payload.x = options.x;
      if (options.y !== undefined) payload.y = options.y;
      if (options.x2 !== undefined) payload.x2 = options.x2;
      if (options.y2 !== undefined) payload.y2 = options.y2;
      if (options.startAngle !== undefined) payload.startAngle = options.startAngle;
      if (options.endAngle !== undefined) payload.endAngle = options.endAngle;
      if (options.fillColor) payload.fillColor = options.fillColor;
      if (options.strokeColor) payload.strokeColor = options.strokeColor;
      if (options.strokeWidth !== undefined) payload.strokeWidth = options.strokeWidth;
    }

    ctx.bridge.send('createCanvasArc', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    startAngle?: number;
    endAngle?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasArc', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Polygon - draws a regular polygon primitive
 * The points define the vertices of the polygon
 */
export class CanvasPolygon {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    points?: Array<{x: number; y: number}>;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvaspolygon');

    const payload: any = { id: this.id };

    if (options) {
      if (options.points) payload.points = options.points;
      if (options.fillColor) payload.fillColor = options.fillColor;
      if (options.strokeColor) payload.strokeColor = options.strokeColor;
      if (options.strokeWidth !== undefined) payload.strokeWidth = options.strokeWidth;
    }

    ctx.bridge.send('createCanvasPolygon', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    points?: Array<{x: number; y: number}>;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasPolygon', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Radial Gradient - draws a gradient from center outward
 */
export class CanvasRadialGradient {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options?: {
    startColor?: string;
    endColor?: string;
    centerOffsetX?: number;
    centerOffsetY?: number;
    width?: number;
    height?: number;
  }) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasradialgradient');

    const payload: any = { id: this.id };

    if (options) {
      if (options.startColor) payload.startColor = options.startColor;
      if (options.endColor) payload.endColor = options.endColor;
      if (options.centerOffsetX !== undefined) payload.centerOffsetX = options.centerOffsetX;
      if (options.centerOffsetY !== undefined) payload.centerOffsetY = options.centerOffsetY;
      if (options.width !== undefined) payload.width = options.width;
      if (options.height !== undefined) payload.height = options.height;
    }

    ctx.bridge.send('createCanvasRadialGradient', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    startColor?: string;
    endColor?: string;
    centerOffsetX?: number;
    centerOffsetY?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasRadialGradient', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Canvas Gauge - composite widget for dashboard gauges/meters
 * Composes: background arc, value arc, needle line, center circle, value text
 */
export interface CanvasGaugeOptions {
  x?: number;
  y?: number;
  radius?: number;
  minValue?: number;
  maxValue?: number;
  value?: number;
  startAngle?: number;  // radians, default 225° (bottom-left)
  endAngle?: number;    // radians, default 315° (bottom-right)
  trackColor?: string;
  valueColor?: string;  // Color for value indicator (auto if not set)
  needleColor?: string;
  textColor?: string;
  showValue?: boolean;
}

export class CanvasGauge {
  private ctx: Context;
  public id: string;

  private _x: number;
  private _y: number;
  private _radius: number;
  private _minValue: number;
  private _maxValue: number;
  private _value: number;
  private _startAngle: number;
  private _endAngle: number;
  private _trackColor: string;
  private _valueColor: string | undefined;  // Custom color, or auto-calculate
  private _needleColor: string;
  private _textColor: string;
  private _showValue: boolean;

  // Composed primitives
  private sizeRect: CanvasRectangle;
  private trackArc: CanvasArc;
  private valueArc: CanvasArc;
  private needle: CanvasLine;
  private centerDot: CanvasCircle;
  private valueText: CanvasText;

  constructor(ctx: Context, options?: CanvasGaugeOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasgauge');

    // Store options with defaults
    // Gauge is always centered in its canvas based on radius
    this._radius = options?.radius ?? 50;
    const center = this._radius + 10;  // padding
    this._x = options?.x ?? center;
    this._y = options?.y ?? center;
    this._minValue = options?.minValue ?? 0;
    this._maxValue = options?.maxValue ?? 100;
    this._value = options?.value ?? 0;
    // Default: 270° sweep from bottom-left to bottom-right (in radians, 0-2π range)
    this._startAngle = options?.startAngle ?? (225 * Math.PI / 180);  // 225° = 3.93 rad
    this._endAngle = options?.endAngle ?? (315 * Math.PI / 180);      // 315° = 5.50 rad
    this._trackColor = options?.trackColor ?? '#e0e0e0';
    this._valueColor = options?.valueColor;  // Store custom color
    this._needleColor = options?.needleColor ?? '#333333';
    this._textColor = options?.textColor ?? '#333333';
    this._showValue = options?.showValue ?? true;

    // Use custom valueColor if provided, otherwise auto-calculate
    const valueColor = this._valueColor ?? this.getValueColor();

    // Create sizing rectangle to define canvas bounds (transparent)
    const canvasSize = (this._radius + 10) * 2;
    this.sizeRect = new CanvasRectangle(ctx, {
      width: canvasSize,
      height: canvasSize,
      fillColor: 'transparent',
    });

    // Create background track arc (filled wedge)
    this.trackArc = new CanvasArc(ctx, {
      x: this._x - this._radius,
      y: this._y - this._radius,
      x2: this._x + this._radius,
      y2: this._y + this._radius,
      startAngle: this._startAngle,
      endAngle: this._endAngle,
      fillColor: this._trackColor,
    });

    // Create value arc (shows current value as filled wedge)
    const valueAngle = this.getValueAngle();
    this.valueArc = new CanvasArc(ctx, {
      x: this._x - this._radius + 8,
      y: this._y - this._radius + 8,
      x2: this._x + this._radius - 8,
      y2: this._y + this._radius - 8,
      startAngle: this._startAngle,
      endAngle: valueAngle,
      fillColor: valueColor,
    });

    // Create needle
    const needleEnd = this.getNeedleEndpoint();
    this.needle = new CanvasLine(ctx, this._x, this._y, needleEnd.x, needleEnd.y, {
      strokeColor: this._needleColor,
      strokeWidth: 2,
    });

    // Create center dot
    const dotRadius = 4;
    this.centerDot = new CanvasCircle(ctx, {
      x: this._x - dotRadius,
      y: this._y - dotRadius,
      x2: this._x + dotRadius,
      y2: this._y + dotRadius,
      fillColor: this._needleColor,
    });

    // Create value text
    const displayValue = Math.round(this._value);
    this.valueText = new CanvasText(ctx, this._showValue ? `${displayValue}` : '', {
      color: this._textColor,
      textSize: 12,
      alignment: 'center',
    });
  }

  /**
   * Get normalized value (0-1)
   */
  private getNormalizedValue(): number {
    if (this._maxValue === this._minValue) return 0;
    return Math.max(0, Math.min(1,
      (this._value - this._minValue) / (this._maxValue - this._minValue)
    ));
  }

  /**
   * Get angle for current value
   * Handles wrap-around for arcs where endAngle < startAngle (e.g., 3/4 circle)
   */
  private getValueAngle(): number {
    const normalized = this.getNormalizedValue();
    let range = this._endAngle - this._startAngle;
    // If end < start, we're going the "long way around" - add 2π to get positive range
    if (range < 0) {
      range += 2 * Math.PI;
    }
    return this._startAngle + range * normalized;
  }

  /**
   * Get needle endpoint coordinates
   */
  private getNeedleEndpoint(): { x: number; y: number } {
    const angle = this.getValueAngle();
    const needleLength = this._radius * 0.8;
    return {
      x: this._x + Math.cos(angle) * needleLength,
      y: this._y - Math.sin(angle) * needleLength,  // Y inverted for screen coords
    };
  }

  /**
   * Get color based on value (green -> yellow -> red)
   */
  private getValueColor(): string {
    const normalized = this.getNormalizedValue();
    if (normalized < 0.5) {
      // Green to yellow
      const g = 200;
      const r = Math.floor(255 * normalized * 2);
      return `rgb(${r}, ${g}, 0)`;
    } else {
      // Yellow to red
      const r = 255;
      const g = Math.floor(200 * (1 - (normalized - 0.5) * 2));
      return `rgb(${r}, ${g}, 0)`;
    }
  }

  /**
   * Update gauge value and refresh display
   */
  async update(options: {
    value?: number;
    minValue?: number;
    maxValue?: number;
  }): Promise<void> {
    if (options.value !== undefined) this._value = options.value;
    if (options.minValue !== undefined) this._minValue = options.minValue;
    if (options.maxValue !== undefined) this._maxValue = options.maxValue;

    const valueAngle = this.getValueAngle();
    const needleEnd = this.getNeedleEndpoint();
    const valueColor = this._valueColor ?? this.getValueColor();

    // Update value arc
    await this.valueArc.update({
      endAngle: valueAngle,
      fillColor: valueColor,
    });

    // Update needle
    await this.needle.update({
      x2: needleEnd.x,
      y2: needleEnd.y,
    });

    // Update text
    if (this._showValue) {
      await this.valueText.update({
        text: `${Math.round(this._value)}`,
      });
    }
  }

  /**
   * Set the gauge value
   */
  async setValue(value: number): Promise<void> {
    await this.update({ value });
  }

  /**
   * Get current value
   */
  getValue(): number {
    return this._value;
  }
}
