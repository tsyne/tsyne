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

  update(options: {
    x1?: number; y1?: number;
    x2?: number; y2?: number;
    strokeColor?: string;
    strokeWidth?: number;
  }): void {
    // Track current values for animation
    if (options.x1 !== undefined) this._x1 = options.x1;
    if (options.y1 !== undefined) this._y1 = options.y1;
    if (options.x2 !== undefined) this._x2 = options.x2;
    if (options.y2 !== undefined) this._y2 = options.y2;
    if (options.strokeWidth !== undefined) this._strokeWidth = options.strokeWidth;

    // Send update without awaiting response
    this.ctx.bridge.send('updateCanvasLine', {
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
    x?: number;
    y?: number;
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
      if (options.x !== undefined) payload.x = options.x;
      if (options.y !== undefined) payload.y = options.y;
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
 * Canvas Spherical Patch - renders a curved quadrilateral on a sphere surface
 * Used for Amiga Boing Ball style checkered spheres.
 * Each patch is bounded by latitude/longitude lines on the sphere.
 */
export interface CanvasSphericalPatchOptions {
  cx: number;           // Center X of the sphere
  cy: number;           // Center Y of the sphere
  radius: number;       // Radius of the sphere
  latStart: number;     // Starting latitude in radians (-π/2 to π/2)
  latEnd: number;       // Ending latitude in radians
  lonStart: number;     // Starting longitude in radians (0 to 2π)
  lonEnd: number;       // Ending longitude in radians
  rotation?: number;    // Y-axis rotation in radians (for spinning)
  fillColor?: string;   // Fill color
}

export class CanvasSphericalPatch {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options: CanvasSphericalPatchOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvassphericalpatch');

    const payload: any = {
      id: this.id,
      cx: options.cx,
      cy: options.cy,
      radius: options.radius,
      latStart: options.latStart,
      latEnd: options.latEnd,
      lonStart: options.lonStart,
      lonEnd: options.lonEnd,
    };

    if (options.rotation !== undefined) payload.rotation = options.rotation;
    if (options.fillColor) payload.fillColor = options.fillColor;

    ctx.bridge.send('createCanvasSphericalPatch', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    cx?: number;
    cy?: number;
    radius?: number;
    rotation?: number;
    fillColor?: string;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasSphericalPatch', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Checkered Sphere (Amiga Boing Ball style)
 * Renders a sphere with alternating colored patches in a single raster
 * to avoid z-order compositing issues with multiple overlapping patches
 */
export interface CanvasCheckeredSphereOptions {
  cx: number;           // Center X of the sphere
  cy: number;           // Center Y of the sphere
  radius: number;       // Radius of the sphere
  latBands: number;     // Number of latitude bands
  lonSegments: number;  // Number of longitude segments (front hemisphere)
  rotation?: number;    // Y-axis rotation in radians (for spinning)
  color1?: string;      // First checkerboard color (default: #cc0000 red)
  color2?: string;      // Second checkerboard color (default: white)
}

export class CanvasCheckeredSphere {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, options: CanvasCheckeredSphereOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvascheckeredsphere');

    const payload: any = {
      id: this.id,
      cx: options.cx,
      cy: options.cy,
      radius: options.radius,
      latBands: options.latBands,
      lonSegments: options.lonSegments,
    };

    if (options.rotation !== undefined) payload.rotation = options.rotation;
    if (options.color1) payload.color1 = options.color1;
    if (options.color2) payload.color2 = options.color2;

    ctx.bridge.send('createCanvasCheckeredSphere', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: {
    cx?: number;
    cy?: number;
    radius?: number;
    rotation?: number;
  }): Promise<void> {
    await this.ctx.bridge.send('updateCanvasCheckeredSphere', {
      widgetId: this.id,
      ...options
    });
  }
}

/**
 * Animation preset types for CanvasSphere
 * Phase 6: Built-in animation presets
 */
export type SphereAnimationType = 'spin' | 'wobble' | 'bounce' | 'pulse';

/**
 * Animation options for CanvasSphere.animate()
 */
export interface SphereAnimationOptions {
  /** Animation type: spin, wobble, bounce, or pulse */
  type: SphereAnimationType;
  /** Animation speed multiplier (default: 1.0, higher = faster) */
  speed?: number;
  /** Rotation axis for spin/wobble (default: 'y') */
  axis?: 'x' | 'y' | 'z';
  /** Animation amplitude for wobble/bounce/pulse (radians for wobble, scale factor for bounce/pulse) */
  amplitude?: number;
  /** Loop animation (default: true) */
  loop?: boolean;
  /** Callback when animation completes (only called if loop=false) */
  onComplete?: () => void;
}

/**
 * Animation handle returned by animate() for controlling animations
 */
export interface SphereAnimationHandle {
  /** Stop the animation */
  stop: () => void;
  /** Pause the animation (preserves state) */
  pause: () => void;
  /** Resume a paused animation */
  resume: () => void;
  /** Check if animation is running */
  isRunning: () => boolean;
  /** Check if animation is paused */
  isPaused: () => boolean;
}

/**
 * Phase 7: Configurable lighting options for CanvasSphere
 */
export interface LightingOptions {
  enabled?: boolean;  // default: true
  direction?: { x: number; y: number; z: number };  // Light source direction (normalized)
  ambient?: number;   // 0-1, base illumination (default: 0.3)
  diffuse?: number;   // 0-1, directional light strength (default: 0.7)
}

/**
 * Phase 8: Cubemap texture for six-face environment mapping
 */
export interface CubemapTexture {
  positiveX: string;  // Resource name for +X face (right)
  negativeX: string;  // Resource name for -X face (left)
  positiveY: string;  // Resource name for +Y face (top)
  negativeY: string;  // Resource name for -Y face (bottom)
  positiveZ: string;  // Resource name for +Z face (front)
  negativeZ: string;  // Resource name for -Z face (back)
}

/**
 * Extended texture options including cubemap support
 */
export interface SphereTextureOptions {
  resourceName?: string;               // For equirectangular
  mapping?: 'equirectangular' | 'cubemap';
  cubemap?: CubemapTexture;            // Required when mapping='cubemap'
}

/**
 * Generalized Sphere - supports multiple patterns, textures, lighting, and interactivity
 * Phase 1: Pattern system (checkered, solid, stripes, gradient)
 * Phase 6: Animation presets (spin, wobble, bounce, pulse)
 * Phase 7: Configurable lighting
 * Phase 8: Cubemap textures
 * Phase 9: Custom pattern function
 * Default pattern is 'checkered' for backward compatibility
 */
export interface CanvasSphereOptions {
  cx: number;                    // Center X of the sphere
  cy: number;                    // Center Y of the sphere
  radius: number;                // Radius of the sphere
  pattern?: 'solid' | 'checkered' | 'stripes' | 'gradient' | 'custom';  // Pattern type (default: checkered)
  colors?: string[];             // Color array for pattern
  latBands?: number;             // Number of latitude bands (default: 8)
  lonSegments?: number;          // Number of longitude segments (default: 8)
  rotationX?: number;            // X-axis rotation in radians (tilt forward/back)
  rotationY?: number;            // Y-axis rotation in radians (spin left/right)
  rotationZ?: number;            // Z-axis rotation in radians (roll)
  rotation?: number;             // DEPRECATED: Use rotationY instead. Y-axis rotation in radians (for spinning)
  // Pattern-specific options
  checkeredColor1?: string;      // First checkerboard color (used if pattern='checkered')
  checkeredColor2?: string;      // Second checkerboard color (used if pattern='checkered')
  solidColor?: string;           // Solid color (used if pattern='solid')
  stripeColors?: string[];       // Alternating stripe colors (used if pattern='stripes')
  gradientStart?: string;        // Gradient start color (used if pattern='gradient')
  gradientEnd?: string;          // Gradient end color (used if pattern='gradient')
  stripeDirection?: 'horizontal' | 'vertical';  // Stripe orientation (default: horizontal)
  // Phase 4/8: Texture mapping support (with cubemap extension)
  texture?: SphereTextureOptions;
  // Phase 5: Interactivity - tap handler with lat/lon coordinates
  onTap?: (lat: number, lon: number, screenX: number, screenY: number) => void;
  // Phase 7: Configurable lighting
  lighting?: LightingOptions;
  // Phase 9: Custom pattern function
  customPattern?: (lat: number, lon: number) => string;  // Returns hex color
}

export class CanvasSphere {
  private ctx: Context;
  public id: string;
  private onTapCallback?: (lat: number, lon: number, screenX: number, screenY: number) => void;

  // Phase 6: Animation state
  private _animationTimer?: ReturnType<typeof setInterval>;
  private _animationPaused = false;
  private _animationStartTime = 0;
  private _animationPausedTime = 0;
  private _rotationX = 0;
  private _rotationY = 0;
  private _rotationZ = 0;
  private _baseRadius = 0;  // Original radius for bounce/pulse animations
  private _currentOptions?: SphereAnimationOptions;

  // Phase 7: Lighting state
  private _lighting?: LightingOptions;

  // Phase 9: Custom pattern state
  private _customPattern?: (lat: number, lon: number) => string;
  private _cx: number;
  private _cy: number;
  private _radius: number;

  constructor(ctx: Context, options: CanvasSphereOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvassphere');
    this.onTapCallback = options.onTap;
    this._customPattern = options.customPattern;
    this._lighting = options.lighting;
    this._cx = options.cx;
    this._cy = options.cy;
    this._radius = options.radius;

    const payload: any = {
      id: this.id,
      cx: options.cx,
      cy: options.cy,
      radius: options.radius,
      latBands: options.latBands ?? 8,
      lonSegments: options.lonSegments ?? 8,
      pattern: options.pattern ?? 'checkered',
    };

    // Handle rotations - support both old 'rotation' (deprecated) and new 'rotationX/Y/Z'
    // For backward compatibility: 'rotation' maps to 'rotationY'
    const rotX = options.rotationX ?? 0;
    const rotY = options.rotationY ?? options.rotation ?? 0;
    const rotZ = options.rotationZ ?? 0;

    // Store initial rotation values for animation (Phase 6)
    this._rotationX = rotX;
    this._rotationY = rotY;
    this._rotationZ = rotZ;
    this._baseRadius = options.radius;

    if (rotX !== 0 || rotY !== 0 || rotZ !== 0) {
      payload.rotationX = rotX;
      payload.rotationY = rotY;
      payload.rotationZ = rotZ;
    }

    // Handle pattern-specific colors
    switch (options.pattern ?? 'checkered') {
      case 'solid':
        payload.solidColor = options.solidColor ?? '#cc0000';
        break;
      case 'stripes':
        payload.stripeColors = options.stripeColors ?? ['#cc0000', '#ffffff'];
        payload.stripeDirection = options.stripeDirection ?? 'horizontal';
        break;
      case 'gradient':
        payload.gradientStart = options.gradientStart ?? '#ff0000';
        payload.gradientEnd = options.gradientEnd ?? '#0000ff';
        break;
      case 'custom':
        // Custom pattern will be rendered client-side via renderCustomPattern()
        payload.hasCustomPattern = true;
        break;
      case 'checkered':
      default:
        payload.checkeredColor1 = options.checkeredColor1 ?? '#cc0000';
        payload.checkeredColor2 = options.checkeredColor2 ?? '#ffffff';
        break;
    }

    // Handle texture mapping (Phase 4/8: with cubemap extension)
    if (options.texture) {
      payload.texture = {
        resourceName: options.texture.resourceName,
        mapping: options.texture.mapping ?? 'equirectangular',
      };
      // Phase 8: Include cubemap if specified
      if (options.texture.cubemap) {
        payload.texture.cubemap = options.texture.cubemap;
      }
    }

    // Handle interactivity (Phase 5)
    if (options.onTap) {
      payload.hasTapHandler = true;
    }

    // Handle lighting (Phase 7)
    if (options.lighting) {
      payload.lighting = options.lighting;
    }

    ctx.bridge.send('createCanvasSphere', payload);
    ctx.addToCurrentContainer(this.id);

    // Register event listener for tap events (Phase 5)
    if (options.onTap) {
      ctx.bridge.on(`sphereTapped:${this.id}`, (event: any) => {
        if (this.onTapCallback) {
          // event contains: { lat, lon, screenX, screenY }
          // Handle async callbacks properly - catch and log any errors
          Promise.resolve(this.onTapCallback(event.lat, event.lon, event.screenX, event.screenY))
            .catch((err) => console.error('Error in onTap callback:', err));
        }
      });
    }
  }

  async update(options: {
    cx?: number;
    cy?: number;
    radius?: number;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
    rotation?: number;  // DEPRECATED: Use rotationY instead
    texture?: SphereTextureOptions;
    lighting?: LightingOptions;
  }): Promise<void> {
    const updatePayload: any = {
      widgetId: this.id,
    };

    if (options.cx !== undefined) {
      updatePayload.cx = options.cx;
      this._cx = options.cx;
    }
    if (options.cy !== undefined) {
      updatePayload.cy = options.cy;
      this._cy = options.cy;
    }
    if (options.radius !== undefined) {
      updatePayload.radius = options.radius;
      this._radius = options.radius;
    }

    // Handle rotations - support both old 'rotation' and new 'rotationX/Y/Z'
    if (options.rotationX !== undefined) {
      updatePayload.rotationX = options.rotationX;
      this._rotationX = options.rotationX;
    }
    if (options.rotationY !== undefined) {
      updatePayload.rotationY = options.rotationY;
      this._rotationY = options.rotationY;
    }
    if (options.rotationZ !== undefined) {
      updatePayload.rotationZ = options.rotationZ;
      this._rotationZ = options.rotationZ;
    }
    if (options.rotation !== undefined && options.rotationY === undefined) {
      // Backward compatibility: map 'rotation' to 'rotationY' if rotationY not explicitly set
      updatePayload.rotationY = options.rotation;
      this._rotationY = options.rotation;
    }

    // Handle texture updates (Phase 4/8: with cubemap extension)
    if (options.texture !== undefined) {
      updatePayload.texture = {
        resourceName: options.texture.resourceName,
        mapping: options.texture.mapping ?? 'equirectangular',
      };
      // Phase 8: Include cubemap if specified
      if (options.texture.cubemap) {
        updatePayload.texture.cubemap = options.texture.cubemap;
      }
    }

    // Handle lighting updates (Phase 7)
    if (options.lighting !== undefined) {
      updatePayload.lighting = options.lighting;
      this._lighting = options.lighting;
    }

    await this.ctx.bridge.send('updateCanvasSphere', updatePayload);

    // Re-render custom pattern if rotation changed (Phase 9)
    if (this._customPattern && (
      options.rotationX !== undefined ||
      options.rotationY !== undefined ||
      options.rotationZ !== undefined ||
      options.rotation !== undefined
    )) {
      await this.renderCustomPattern();
    }
  }

  // ==========================================================================
  // Phase 9: Custom Pattern Rendering
  // ==========================================================================

  /**
   * Render custom pattern to pixel buffer and send to bridge
   * This is called automatically when using pattern='custom' and on rotation updates.
   * Can also be called manually to force re-render.
   */
  async renderCustomPattern(): Promise<void> {
    if (!this._customPattern) return;

    const width = Math.round(this._radius * 2);
    const height = Math.round(this._radius * 2);
    const buffer = new Uint8Array(width * height * 4);
    const radius = this._radius;

    // Apply inverse rotations to find original (unrotated) positions
    const cosRX = Math.cos(-this._rotationX);
    const sinRX = Math.sin(-this._rotationX);
    const cosRY = Math.cos(-this._rotationY);
    const sinRY = Math.sin(-this._rotationY);
    const cosRZ = Math.cos(-this._rotationZ);
    const sinRZ = Math.sin(-this._rotationZ);

    // Lighting calculation helpers
    const lighting = this._lighting ?? { enabled: true };
    const lightEnabled = lighting.enabled !== false;
    const lightDir = lighting.direction ?? { x: 0.5, y: -0.3, z: 0.8 };
    const ambient = lighting.ambient ?? 0.3;
    const diffuse = lighting.diffuse ?? 0.7;

    // Normalize light direction
    const lightLen = Math.sqrt(lightDir.x * lightDir.x + lightDir.y * lightDir.y + lightDir.z * lightDir.z);
    const lx = lightDir.x / lightLen;
    const ly = lightDir.y / lightLen;
    const lz = lightDir.z / lightLen;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const offset = (py * width + px) * 4;

        // Convert pixel to coordinates relative to sphere center
        const x = px - width / 2;
        const y = py - height / 2;

        // Check if within sphere circle
        const distSq = x * x + y * y;
        if (distSq > radius * radius) {
          // Transparent pixel outside sphere
          buffer[offset] = 0;
          buffer[offset + 1] = 0;
          buffer[offset + 2] = 0;
          buffer[offset + 3] = 0;
          continue;
        }

        // Calculate z for front face of sphere
        const z = Math.sqrt(radius * radius - distSq);

        // Apply inverse Y-axis rotation (yaw/spin)
        const x1 = x * cosRY + z * sinRY;
        const z1 = -x * sinRY + z * cosRY;
        const y1 = y;

        // Apply inverse X-axis rotation (pitch/tilt)
        const x2 = x1;
        const y2 = y1 * cosRX - z1 * sinRX;
        const z2 = y1 * sinRX + z1 * cosRX;

        // Apply inverse Z-axis rotation (roll)
        const xOrig = x2 * cosRZ - y2 * sinRZ;
        const yOrig = x2 * sinRZ + y2 * cosRZ;
        const zOrig = z2;

        // Calculate latitude: angle from equator, -π/2 (south) to π/2 (north)
        const lat = Math.asin(-yOrig / radius);

        // Calculate longitude: angle around Y axis, -π to π
        let lon = Math.atan2(zOrig, xOrig);

        // Call user's custom pattern function
        const colorHex = this._customPattern(lat, lon);

        // Parse hex color
        const { r, g, b } = this.parseHexColor(colorHex);

        // Apply lighting if enabled
        let finalR = r, finalG = g, finalB = b;
        if (lightEnabled) {
          // Surface normal (normalized) is just the point on the sphere
          const nx = x / radius;
          const ny = y / radius;
          const nz = z / radius;
          // Dot product gives lighting intensity
          let lightFactor = nx * lx + ny * ly + nz * lz;
          if (lightFactor < 0) lightFactor = 0;
          const shade = ambient + diffuse * lightFactor;
          finalR = Math.round(r * shade);
          finalG = Math.round(g * shade);
          finalB = Math.round(b * shade);
        }

        buffer[offset] = Math.min(255, Math.max(0, finalR));
        buffer[offset + 1] = Math.min(255, Math.max(0, finalG));
        buffer[offset + 2] = Math.min(255, Math.max(0, finalB));
        buffer[offset + 3] = 255;
      }
    }

    // Send buffer to Go bridge
    const base64 = Buffer.from(buffer).toString('base64');
    await this.ctx.bridge.send('updateCanvasSphereBuffer', {
      widgetId: this.id,
      buffer: base64,
      width,
      height,
    });
  }

  /**
   * Parse hex color string to RGB components
   */
  private parseHexColor(hex: string): { r: number; g: number; b: number } {
    // Remove # if present
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;

    // Handle 3-digit hex (#rgb)
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return { r, g, b };
    }

    // Handle 6-digit hex (#rrggbb)
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return { r, g, b };
  }

  // ==========================================================================
  // Phase 6: Animation Presets
  // ==========================================================================

  /**
   * Start an animation preset on this sphere
   *
   * @param options Animation options specifying type, speed, axis, etc.
   * @returns Animation handle with stop(), pause(), resume() methods
   *
   * @example
   * // Spin animation (default axis: Y)
   * const handle = sphere.animate({ type: 'spin', speed: 1.0 });
   *
   * // Wobble animation on X axis
   * sphere.animate({ type: 'wobble', axis: 'x', amplitude: Math.PI / 8 });
   *
   * // Bounce animation (size oscillation)
   * sphere.animate({ type: 'bounce', speed: 0.5, amplitude: 0.2 });
   *
   * // Pulse animation (subtle size pulse)
   * sphere.animate({ type: 'pulse', speed: 2.0 });
   *
   * // Stop animation
   * handle.stop();
   */
  animate(options: SphereAnimationOptions): SphereAnimationHandle {
    // Stop any existing animation
    this.stopAnimation();

    const speed = options.speed ?? 1.0;
    const axis = options.axis ?? 'y';
    const loop = options.loop ?? true;
    const onComplete = options.onComplete;

    // Default amplitudes by type
    let amplitude = options.amplitude;
    if (amplitude === undefined) {
      switch (options.type) {
        case 'spin':
          amplitude = Math.PI * 2;  // Full rotation (not used directly, speed controls rate)
          break;
        case 'wobble':
          amplitude = Math.PI / 6;  // 30 degrees wobble
          break;
        case 'bounce':
          amplitude = 0.15;  // 15% size change
          break;
        case 'pulse':
          amplitude = 0.08;  // 8% size change
          break;
      }
    }

    this._currentOptions = { ...options, speed, axis, amplitude, loop };
    this._animationStartTime = Date.now();
    this._animationPaused = false;
    this._animationPausedTime = 0;

    // Animation frame interval (roughly 60 fps)
    const frameInterval = 16;

    this._animationTimer = setInterval(() => {
      if (this._animationPaused) return;

      const elapsed = Date.now() - this._animationStartTime - this._animationPausedTime;
      const t = elapsed / 1000;  // Time in seconds

      switch (options.type) {
        case 'spin':
          this._animateSpin(t, speed, axis);
          break;
        case 'wobble':
          this._animateWobble(t, speed, axis, amplitude!);
          break;
        case 'bounce':
          this._animateBounce(t, speed, amplitude!);
          break;
        case 'pulse':
          this._animatePulse(t, speed, amplitude!);
          break;
      }

      // Handle non-looping animations
      if (!loop) {
        // For non-looping, complete after one cycle
        const cycleTime = (2 * Math.PI) / speed;
        if (t >= cycleTime) {
          this.stopAnimation();
          if (onComplete) {
            onComplete();
          }
        }
      }
    }, frameInterval);

    // Return animation handle
    const handle: SphereAnimationHandle = {
      stop: () => this.stopAnimation(),
      pause: () => this._pauseAnimation(),
      resume: () => this._resumeAnimation(),
      isRunning: () => this._animationTimer !== undefined && !this._animationPaused,
      isPaused: () => this._animationPaused,
    };

    return handle;
  }

  /**
   * Stop any running animation and reset to initial state
   */
  stopAnimation(): void {
    if (this._animationTimer) {
      clearInterval(this._animationTimer);
      this._animationTimer = undefined;
    }
    this._animationPaused = false;
    this._animationPausedTime = 0;
    this._currentOptions = undefined;
  }

  /**
   * Pause the current animation (preserves state)
   */
  private _pauseAnimation(): void {
    if (this._animationTimer && !this._animationPaused) {
      this._animationPaused = true;
      this._animationPausedTime = Date.now() - this._animationStartTime;
    }
  }

  /**
   * Resume a paused animation
   */
  private _resumeAnimation(): void {
    if (this._animationTimer && this._animationPaused) {
      this._animationStartTime = Date.now() - this._animationPausedTime;
      this._animationPaused = false;
    }
  }

  /**
   * Spin animation - continuous rotation around specified axis
   */
  private _animateSpin(t: number, speed: number, axis: 'x' | 'y' | 'z'): void {
    const angle = t * speed;

    const updateData: any = {};
    switch (axis) {
      case 'x':
        this._rotationX = angle;
        updateData.rotationX = angle;
        break;
      case 'y':
        this._rotationY = angle;
        updateData.rotationY = angle;
        break;
      case 'z':
        this._rotationZ = angle;
        updateData.rotationZ = angle;
        break;
    }

    this.update(updateData);
  }

  /**
   * Wobble animation - oscillating rotation back and forth
   */
  private _animateWobble(t: number, speed: number, axis: 'x' | 'y' | 'z', amplitude: number): void {
    const angle = Math.sin(t * speed * 2) * amplitude;

    const updateData: any = {};
    switch (axis) {
      case 'x':
        updateData.rotationX = angle;
        break;
      case 'y':
        updateData.rotationY = angle;
        break;
      case 'z':
        updateData.rotationZ = angle;
        break;
    }

    this.update(updateData);
  }

  /**
   * Bounce animation - oscillating size (elastic bounce feel)
   */
  private _animateBounce(t: number, speed: number, amplitude: number): void {
    // Use a bouncy sine wave that starts at 1, goes to 1+amplitude, back through 1 to 1-amplitude
    const scale = 1 + Math.sin(t * speed * 2) * amplitude;
    const radius = this._baseRadius * scale;

    this.update({ radius });
  }

  /**
   * Pulse animation - smooth size oscillation (breathing effect)
   */
  private _animatePulse(t: number, speed: number, amplitude: number): void {
    // Smoother sine wave that oscillates between 1-amplitude and 1+amplitude
    // Using (sin + 1) / 2 to keep it always positive and centered
    const scale = 1 + Math.sin(t * speed) * amplitude;
    const radius = this._baseRadius * scale;

    this.update({ radius });
  }

  /**
   * Check if an animation is currently running
   */
  isAnimating(): boolean {
    return this._animationTimer !== undefined;
  }

  /**
   * Get the current animation options (if any)
   */
  getCurrentAnimation(): SphereAnimationOptions | undefined {
    return this._currentOptions;
  }
}

/**
 * Canvas Gradient Text - renders text with a vertical gradient fill
 * Uses Fyne's theme font dynamically - supports any text string
 */
export interface CanvasGradientTextOptions {
  x?: number;          // X position
  y?: number;          // Y position
  fontSize?: number;   // Font size (default: 48)
  gradient?: 'rainbow'; // Gradient type (currently only rainbow supported)
  bold?: boolean;      // Use bold font
  direction?: 'down' | 'up' | 'left' | 'right'; // Gradient direction (default: down)
}

export class CanvasGradientText {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, text: string, options?: CanvasGradientTextOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasgradienttext');

    const payload: any = {
      id: this.id,
      text,
    };

    if (options) {
      if (options.x !== undefined) payload.x = options.x;
      if (options.y !== undefined) payload.y = options.y;
      if (options.fontSize !== undefined) payload.fontSize = options.fontSize;
      if (options.gradient) payload.gradient = options.gradient;
      if (options.bold !== undefined) payload.bold = options.bold;
      if (options.direction) payload.direction = options.direction;
    }

    ctx.bridge.send('createCanvasGradientText', payload);
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Canvas Ellipse - draws an ellipse/oval shape
 */
export interface CanvasEllipseOptions {
  x: number;           // Top-left X position
  y: number;           // Top-left Y position
  width: number;       // Width of ellipse
  height: number;      // Height of ellipse
  fillColor?: string;  // Fill color
}

export class CanvasEllipse {
  private ctx: Context;
  public id: string;
  private _x: number;
  private _y: number;

  constructor(ctx: Context, options: CanvasEllipseOptions) {
    this.ctx = ctx;
    this.id = ctx.generateId('canvasellipse');
    this._x = options.x;
    this._y = options.y;

    const payload: any = {
      id: this.id,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
    };

    if (options.fillColor) payload.fillColor = options.fillColor;

    ctx.bridge.send('createCanvasEllipse', payload);
    ctx.addToCurrentContainer(this.id);
  }

  async update(options: { x?: number; y?: number }): Promise<void> {
    if (options.x !== undefined) this._x = options.x;
    if (options.y !== undefined) this._y = options.y;

    await this.ctx.bridge.send('updateCanvasEllipse', {
      widgetId: this.id,
      ...options
    });
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }
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
