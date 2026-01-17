/**
 * Base class for all Cosyne primitives
 */

import { Binding, BindingFunction, PositionBinding } from '../binding';
import { RotationAngles } from '../projections';
import { HitTester } from '../events';
import { Animation, AnimationOptions, AnimationControl } from '../animation';
import { AnimationManager } from '../animation-manager';
import { EasingFunction } from '../easing';
import { EffectsAnchor, DropShadowOptions, GlowOptions } from '../effects';
import { LinearGradient, RadialGradient } from '../gradients';
import { ClippingRegion } from '../clipping';

export interface PrimitiveOptions {
  id?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  animationManager?: AnimationManager;
}

/**
 * Event handlers for interactive primitives
 */
export interface PrimitiveEventHandlers {
  onClick?: (e: { x: number; y: number }) => void | Promise<void>;
  onMouseMove?: (e: { x: number; y: number }) => void;
  onMouseEnter?: (e: { x: number; y: number }) => void;
  onMouseLeave?: () => void;
  onDragStart?: (e: { x: number; y: number }) => void;
  onDrag?: (e: { x: number; y: number; deltaX: number; deltaY: number }) => void;
  onDragEnd?: () => void;
}

/**
 * Fluent animation builder interface
 */
export interface FluentAnimationBuilder {
  duration(ms: number): FluentAnimationBuilder;
  easing(fn: EasingFunction | string): FluentAnimationBuilder;
  delay(ms: number): FluentAnimationBuilder;
  loop(enabled: boolean): FluentAnimationBuilder;
  yoyo(enabled: boolean): FluentAnimationBuilder;
  start(): AnimationControl;
}

/**
 * Base primitive that wraps a Tsyne canvas primitive
 */
export abstract class Primitive<TUnderlyingWidget> {
  protected customId: string | undefined;
  protected fillColor: string | undefined;
  protected strokeColor: string | undefined;
  protected strokeWidth: number | undefined;
  protected alpha: number = 1.0;
  protected isPassthrough: boolean = false;
  protected positionBinding: Binding<PositionBinding> | undefined;
  protected fillBinding: Binding<string> | undefined;
  protected strokeBinding: Binding<string> | undefined;
  protected alphaBinding: Binding<number> | undefined;
  protected visibleBinding: Binding<boolean> | undefined;
  protected rotationBinding: Binding<RotationAngles> | undefined;

  // Event handlers
  protected onClickHandler: ((e: { x: number; y: number }) => void | Promise<void>) | undefined;
  protected onMouseMoveHandler: ((e: { x: number; y: number }) => void) | undefined;
  protected onMouseEnterHandler: ((e: { x: number; y: number }) => void) | undefined;
  protected onMouseLeaveHandler: (() => void) | undefined;
  protected onDragStartHandler: ((e: { x: number; y: number }) => void) | undefined;
  protected onDragHandler: ((e: { x: number; y: number; deltaX: number; deltaY: number }) => void) | undefined;
  protected onDragEndHandler: (() => void) | undefined;

  // Animation tracking (for cleanup)
  protected activeAnimations: Set<AnimationControl> = new Set();

  // Animation manager (injected via IoC)
  protected animationManager?: AnimationManager;

  // Effects support
  protected effects: EffectsAnchor = new EffectsAnchor();

  // Gradient support
  protected _fillGradient: LinearGradient | RadialGradient | null = null;
  protected _strokeGradient: LinearGradient | RadialGradient | null = null;

  // Clipping support
  protected clipping: ClippingRegion = new ClippingRegion();

  constructor(
    protected underlying: TUnderlyingWidget,
    options?: PrimitiveOptions
  ) {
    if (options?.id) {
      this.customId = options.id;
    }
    if (options?.fillColor) {
      this.fillColor = options.fillColor;
    }
    if (options?.strokeColor) {
      this.strokeColor = options.strokeColor;
    }
    if (options?.strokeWidth) {
      this.strokeWidth = options.strokeWidth;
    }
    if (options?.animationManager) {
      this.animationManager = options.animationManager;
    }
  }

  /**
   * Get the custom ID for this primitive (for testing)
   */
  getId(): string | undefined {
    return this.customId;
  }

  /**
   * Set custom ID for testing and debugging
   */
  withId(id: string): this {
    this.customId = id;
    return this;
  }

  /**
   * Mark this primitive as passthrough for hit testing.
   * Passthrough primitives don't receive click/hover/drag events,
   * allowing events to reach primitives underneath them.
   * Useful for decorative/highlight shapes that shouldn't intercept events.
   */
  passthrough(enabled: boolean = true): this {
    this.isPassthrough = enabled;
    return this;
  }

  /**
   * Check if this primitive is passthrough
   */
  isPassthroughEnabled(): boolean {
    return this.isPassthrough;
  }

  /**
   * Set fill color
   */
  fill(color: string): this {
    this.fillColor = color;
    this.applyFill();
    return this;
  }

  /**
   * Set stroke color and width
   */
  stroke(color: string, width: number = 1): this {
    this.strokeColor = color;
    this.strokeWidth = width;
    this.applyStroke();
    return this;
  }

  /**
   * Set alpha (opacity) - 0.0 to 1.0
   */
  setAlpha(value: number): this {
    this.alpha = Math.max(0, Math.min(1, value));
    return this;
  }

  /**
   * Bind position to a function that returns x, y coordinates
   */
  bindPosition(fn: BindingFunction<PositionBinding>): this {
    this.positionBinding = new Binding(fn);
    return this;
  }

  /**
   * Bind visibility to a function
   */
  bindVisible(fn: BindingFunction<boolean>): this {
    this.visibleBinding = new Binding(fn);
    return this;
  }

  /**
   * Bind fill color to a function
   */
  bindFill(fn: BindingFunction<string>): this {
    this.fillBinding = new Binding(fn);
    return this;
  }

  /**
   * Bind stroke color to a function
   */
  bindStroke(fn: BindingFunction<string>): this {
    this.strokeBinding = new Binding(fn);
    return this;
  }

  /**
   * Bind alpha (opacity) to a function
   */
  bindAlpha(fn: BindingFunction<number>): this {
    this.alphaBinding = new Binding(fn);
    return this;
  }

  /**
   * Bind rotation angles (for projections)
   */
  bindRotation(fn: BindingFunction<RotationAngles>): this {
    this.rotationBinding = new Binding(fn);
    return this;
  }

  /**
   * Get the underlying Tsyne widget
   */
  getUnderlying(): TUnderlyingWidget {
    return this.underlying;
  }

  /**
   * Get position binding if set
   */
  getPositionBinding(): Binding<PositionBinding> | undefined {
    return this.positionBinding;
  }

  /**
   * Get visible binding if set
   */
  getVisibleBinding(): Binding<boolean> | undefined {
    return this.visibleBinding;
  }

  /**
   * Get fill binding if set
   */
  getFillBinding(): Binding<string> | undefined {
    return this.fillBinding;
  }

  /**
   * Get stroke binding if set
   */
  getStrokeBinding(): Binding<string> | undefined {
    return this.strokeBinding;
  }

  /**
   * Get alpha binding if set
   */
  getAlphaBinding(): Binding<number> | undefined {
    return this.alphaBinding;
  }

  /**
   * Get rotation binding if set
   */
  getRotationBinding(): Binding<RotationAngles> | undefined {
    return this.rotationBinding;
  }

  /**
   * Register click/tap handler
   */
  onClick(handler: (e: { x: number; y: number }) => void | Promise<void>): this {
    this.onClickHandler = handler;
    return this;
  }

  /**
   * Register mouse move handler
   */
  onMouseMove(handler: (e: { x: number; y: number }) => void): this {
    this.onMouseMoveHandler = handler;
    return this;
  }

  /**
   * Register mouse enter handler
   */
  onMouseEnter(handler: (e: { x: number; y: number }) => void): this {
    this.onMouseEnterHandler = handler;
    return this;
  }

  /**
   * Register mouse leave handler
   */
  onMouseLeave(handler: () => void): this {
    this.onMouseLeaveHandler = handler;
    return this;
  }

  /**
   * Register drag start handler
   */
  onDragStart(handler: (e: { x: number; y: number }) => void): this {
    this.onDragStartHandler = handler;
    return this;
  }

  /**
   * Register drag handler (fires continuously while dragging)
   */
  onDrag(handler: (e: { x: number; y: number; deltaX: number; deltaY: number }) => void): this {
    this.onDragHandler = handler;
    return this;
  }

  /**
   * Register drag end handler
   */
  onDragEnd(handler: () => void): this {
    this.onDragEndHandler = handler;
    return this;
  }

  /**
   * Get click handler (for event routing)
   */
  getClickHandler(): ((e: { x: number; y: number }) => void | Promise<void>) | undefined {
    return this.onClickHandler;
  }

  /**
   * Get mouse move handler (for event routing)
   */
  getMouseMoveHandler(): ((e: { x: number; y: number }) => void) | undefined {
    return this.onMouseMoveHandler;
  }

  /**
   * Get mouse enter handler (for event routing)
   */
  getMouseEnterHandler(): ((e: { x: number; y: number }) => void) | undefined {
    return this.onMouseEnterHandler;
  }

  /**
   * Get mouse leave handler (for event routing)
   */
  getMouseLeaveHandler(): (() => void) | undefined {
    return this.onMouseLeaveHandler;
  }

  /**
   * Get drag start handler (for event routing)
   */
  getDragStartHandler(): ((e: { x: number; y: number }) => void) | undefined {
    return this.onDragStartHandler;
  }

  /**
   * Get drag handler (for event routing)
   */
  getDragHandler(): ((e: { x: number; y: number; deltaX: number; deltaY: number }) => void) | undefined {
    return this.onDragHandler;
  }

  /**
   * Get drag end handler (for event routing)
   */
  getDragEndHandler(): (() => void) | undefined {
    return this.onDragEndHandler;
  }

  /**
   * Check if this primitive has any event handlers
   */
  hasEventHandlers(): boolean {
    return !!(
      this.onClickHandler ||
      this.onMouseMoveHandler ||
      this.onMouseEnterHandler ||
      this.onMouseLeaveHandler ||
      this.onDragStartHandler ||
      this.onDragHandler ||
      this.onDragEndHandler
    );
  }

  // ==================== Effects API ====================

  /**
   * Apply drop shadow effect
   */
  dropShadow(options: DropShadowOptions): this {
    this.effects.setDropShadow(options);
    return this;
  }

  /**
   * Clear drop shadow effect
   */
  clearDropShadow(): this {
    this.effects.clearDropShadow();
    return this;
  }

  /**
   * Apply glow effect
   */
  glow(options: GlowOptions): this {
    this.effects.setGlow(options);
    return this;
  }

  /**
   * Clear glow effect
   */
  clearGlow(): this {
    this.effects.clearGlow();
    return this;
  }

  /**
   * Set blend mode (e.g., 'multiply', 'screen', 'overlay')
   */
  blendMode(mode: string): this {
    this.effects.setBlendMode(mode);
    return this;
  }

  /**
   * Set stroke dash pattern
   * @param pattern Array of dash lengths [dashLength, gapLength, ...]
   * @param offset Optional offset for animation
   */
  strokeDash(pattern: number[], offset: number = 0): this {
    this.effects.setStrokeDash(pattern, offset);
    return this;
  }

  /**
   * Get the effects anchor for this primitive
   */
  getEffects(): EffectsAnchor {
    return this.effects;
  }

  // ==================== Gradient API ====================

  /**
   * Set fill to a linear gradient
   */
  linearGradient(gradient: LinearGradient): this {
    this._fillGradient = gradient;
    return this;
  }

  /**
   * Set fill to a radial gradient
   */
  radialGradient(gradient: RadialGradient): this {
    this._fillGradient = gradient;
    return this;
  }

  /**
   * Set stroke to a gradient
   */
  strokeGradient(gradient: LinearGradient | RadialGradient): this {
    this._strokeGradient = gradient;
    return this;
  }

  /**
   * Get fill gradient if set
   */
  getFillGradient(): LinearGradient | RadialGradient | null {
    return this._fillGradient;
  }

  /**
   * Get stroke gradient if set
   */
  getStrokeGradient(): LinearGradient | RadialGradient | null {
    return this._strokeGradient;
  }

  // ==================== Clipping API ====================

  /**
   * Set circular clipping region
   */
  clipCircle(cx: number, cy: number, r: number): this {
    this.clipping.setCircleClip(cx, cy, r);
    return this;
  }

  /**
   * Set rectangular clipping region
   */
  clipRect(x: number, y: number, width: number, height: number, radius?: number): this {
    this.clipping.setRectClip(x, y, width, height, radius);
    return this;
  }

  /**
   * Set polygonal clipping region
   */
  clipPolygon(points: Array<{ x: number; y: number }>): this {
    this.clipping.setPolygonClip(points);
    return this;
  }

  /**
   * Set path-based clipping region
   */
  clipPath(pathString: string): this {
    this.clipping.setPathClip(pathString);
    return this;
  }

  /**
   * Clear clipping
   */
  clearClip(): this {
    this.clipping.clearClip();
    return this;
  }

  /**
   * Get the clipping region for this primitive
   */
  getClipping(): ClippingRegion {
    return this.clipping;
  }

  // ==================== Animation API ====================

  /**
   * Animate a numeric property (e.g., alpha, rotation, position, radius)
   * Returns control object for pause/resume/seek
   *
   * @example
   * ```typescript
   * c.circle(100, 100, 20)
   *   .animate('alpha', { from: 0, to: 1 })
   *   .duration(1000)
   *   .easing(easeInOutCubic);
   * ```
   */
  animate<T = number>(
    property: string,
    options: Omit<AnimationOptions<T>, 'from' | 'to'> & { from: T; to: T }
  ): AnimationControl {
    if (!this.animationManager) {
      throw new Error('AnimationManager not available. Ensure primitive was created with an animationManager option.');
    }

    // Create animation with completion tracking
    const originalOnComplete = options.onComplete;
    const animation = new Animation<T>({
      ...options,
      onComplete: () => {
        originalOnComplete?.();
        this.activeAnimations.delete(control);
      },
    });

    // Register with injected animation manager
    const control = this.animationManager.add(animation, this as any, property);

    // Track animation for cleanup
    this.activeAnimations.add(control);

    return control;
  }

  /**
   * Build fluent animation with duration
   * Returns object allowing further configuration
   *
   * @example
   * ```typescript
   * c.circle(100, 100, 20)
   *   .animateFluent('alpha', 0, 1)
   *   .duration(1000)
   *   .easing('easeInOutCubic')
   *   .loop(true);
   * ```
   */
  animateFluent<T = number>(
    property: string,
    from: T,
    to: T
  ): FluentAnimationBuilder {
    const config: Partial<AnimationOptions<T>> = { from, to };

    const fluent = {
      duration: (ms: number) => {
        config.duration = ms;
        return fluent;
      },
      easing: (fn: EasingFunction | string) => {
        if (typeof fn === 'string') {
          const { getEasingFunction } = require('../easing');
          config.easing = getEasingFunction(fn);
        } else {
          config.easing = fn;
        }
        return fluent;
      },
      delay: (ms: number) => {
        config.delay = ms;
        return fluent;
      },
      loop: (enabled: boolean) => {
        config.loop = enabled;
        return fluent;
      },
      yoyo: (enabled: boolean) => {
        config.yoyo = enabled;
        return fluent;
      },
      start: (): AnimationControl => {
        if (!config.duration) {
          config.duration = 1000; // Default duration
        }
        return this.animate<T>(property, config as AnimationOptions<T>);
      },
    };

    return fluent;
  }

  /**
   * Clear all active animations on this primitive
   */
  clearAnimations(): void {
    for (const control of this.activeAnimations) {
      if (this.animationManager) {
        this.animationManager.remove(control);
      }
      control.stop();
    }
    this.activeAnimations.clear();
  }

  /**
   * Apply fill color to underlying widget (implemented by subclasses)
   */
  protected abstract applyFill(): void;

  /**
   * Apply stroke to underlying widget (implemented by subclasses)
   */
  protected abstract applyStroke(): void;

  /**
   * Update position from binding (implemented by subclasses)
   */
  abstract updatePosition(pos: PositionBinding): void;

  /**
   * Update visibility from binding (implemented by subclasses)
   */
  abstract updateVisibility(visible: boolean): void;

  /**
   * Update fill color from binding (implemented by subclasses)
   */
  abstract updateFill(color: string): void;

  /**
   * Update stroke color from binding (implemented by subclasses)
   */
  abstract updateStroke(color: string): void;

  /**
   * Update alpha from binding (implemented by subclasses)
   */
  abstract updateAlpha(alpha: number): void;

  /**
   * Update rotation from binding (implemented by subclasses)
   */
  abstract updateRotation(rotation: RotationAngles): void;

  /**
   * Get hit tester for this primitive (for event handling)
   * Returns a function that tests if a point is inside/on the primitive
   */
  abstract getHitTester(): HitTester;
}
