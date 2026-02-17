/**
 * CVG Grammar — CvgContext class (core).
 *
 * Contains the class definition, fields, constructor, and these method groups:
 * - Event tracking & dispatch
 * - Binding regions (bindTo)
 * - Animation manager
 * - Polling / resize
 *
 * Rendering, shapes, and defs methods are added via prototype augmentation
 * in grammar-rendering.ts, grammar-shapes.ts, and grammar-defs.ts.
 *
 * Extracted from grammar.ts for manageability.
 */

import { SvgNode, SvgStyle, CvgElementAttrs, FilterDef, ClipPathDef, ClipPathShape } from './types';
import { AffineMatrix, type Transform2D } from './transform';
import {
  type CvgEvent, type GradientDef, type ViewBoxMapping, type EasingFn, type AnimationOptions,
  AnimationHandle, resolveEasing,
} from './grammar-types';
import { CvgElement, BindingRegion, ActiveAnimation } from './grammar-element';

/**
 * CVG rendering context. Uses SVG-inspired element names for a familiar API.
 *
 * Element methods return CvgElement wrappers supporting fluent .fill()/.stroke().
 */
export class CvgContext {
  // Allow prototype augmentation files to add methods
  [key: string]: any;

  private app: any;
  private mapping: ViewBoxMapping;
  private styleStack: SvgStyle[] = [{}];
  private transformStack: Transform2D[] = [AffineMatrix.identity()];
  private whenStack: (() => boolean)[] = [];
  private gradients: Map<string, GradientDef> = new Map();
  private trackedElements: CvgElement[] = [];
  private filters: Map<string, FilterDef> = new Map();
  private clipPaths: Map<string, ClipPathDef> = new Map();
  private nodesById: Map<string, SvgNode> = new Map();
  private walkNodeFn?: (s: CvgContext, node: SvgNode) => void;
  private cssRules: Map<string, Record<string, string>> = new Map(); // selector → properties
  private eventCallback?: (event: CvgEvent) => void;
  private hoveredElement: CvgElement | null = null;
  private draggedElement: CvgElement | null = null;
  private lastDragX: number = 0;
  private lastDragY: number = 0;
  private keyDownHandler?: (key: string) => void;
  private keyUpHandler?: (key: string) => void;
  private sceneScrollHandler?: (e: { deltaX: number; deltaY: number; x: number; y: number }) => void;
  private tappableRaster?: any;  // TappableCanvasRaster for tooltip support
  private tooltipTimer?: ReturnType<typeof setTimeout>;
  private tooltipElement: CvgElement | null = null;
  private tooltipDelay: number = 500;  // ms before showing tooltip
  private animations: ActiveAnimation[] = [];
  private animationTimer?: ReturnType<typeof setInterval>;
  private nextAnimationId: number = 1;
  private bindingRegions: BindingRegion[] = [];
  private pollTimer?: ReturnType<typeof setInterval>;
  private resizeTimer?: ReturnType<typeof setTimeout>;
  private sizingShim?: any;  // transparent rect that sizes the clip container
  private clipContainer?: any;  // outermost clip — resized from outside in

  constructor(app: any, mapping: ViewBoxMapping, rootStyle?: SvgStyle) {
    this.app = app;
    this.mapping = mapping;
    if (rootStyle) this.styleStack[0] = rootStyle;
  }

  // ─── Event tracking ─────────────────────────────────────────

  private trackElement(el: CvgElement): void {
    el.setContext(this);
    this.trackedElements.push(el);
  }

  /** Register an event callback that fires on every tap hit/miss. */
  onEvent(cb: (event: CvgEvent) => void): this {
    this.eventCallback = cb;
    return this;
  }

  /** Simulate a tap at canvas coordinates — dispatches to topmost element with a click handler. */
  dispatchTap(x: number, y: number): void {
    for (let i = this.trackedElements.length - 1; i >= 0; i--) {
      const el = this.trackedElements[i];
      const handler = el.getClickHandler();
      if (handler && el.hitTest(x, y)) {
        this.eventCallback?.({ type: 'tap-hit', x, y, elementName: el.getName(), elementIndex: i });
        handler({ x, y });
        return;
      }
    }
    this.eventCallback?.({ type: 'tap-miss', x, y });
  }

  /** Dispatch hover events — finds topmost hovered element and fires enter/leave transitions.
   *  Also manages tooltip show/hide with a delay and cursor changes. */
  dispatchHover(x: number, y: number): void {
    let newHovered: CvgElement | null = null;
    for (let i = this.trackedElements.length - 1; i >= 0; i--) {
      const el = this.trackedElements[i];
      if ((el.getHoverHandler() || el.getTooltip() || el.getCursor()) && el.hitTest(x, y)) {
        newHovered = el;
        break;
      }
    }
    if (newHovered !== this.hoveredElement) {
      // Hide tooltip from old element
      if (this.tooltipElement) {
        this.cancelTooltip();
        this.hideTooltipNow();
      }
      if (this.hoveredElement) {
        const idx = this.trackedElements.indexOf(this.hoveredElement);
        this.eventCallback?.({ type: 'hover-out', x, y, elementName: this.hoveredElement.getName(), elementIndex: idx });
        this.hoveredElement.getHoverHandler()?.(false);
      }
      if (newHovered) {
        const idx = this.trackedElements.indexOf(newHovered);
        this.eventCallback?.({ type: 'hover-in', x, y, elementName: newHovered.getName(), elementIndex: idx });
        newHovered.getHoverHandler()?.(true);
        // Start tooltip delay if element has tooltip text
        const tip = newHovered.getTooltip();
        if (tip && this.tappableRaster) {
          this.scheduleTooltip(newHovered, tip, x, y);
        }
      }
      // Update cursor based on new hovered element
      if (this.tappableRaster) {
        const cursorType = newHovered?.getCursor() || 'default';
        this.tappableRaster.setCursor(cursorType);
      }
      this.hoveredElement = newHovered;
    }
  }

  private scheduleTooltip(el: CvgElement, text: string, x: number, y: number): void {
    this.cancelTooltip();
    this.tooltipTimer = setTimeout(() => {
      this.tooltipElement = el;
      this.tappableRaster?.showTooltip(text, x, y);
      const idx = this.trackedElements.indexOf(el);
      this.eventCallback?.({ type: 'tooltip-show', x, y, elementName: el.getName(), elementIndex: idx });
    }, this.tooltipDelay);
  }

  private cancelTooltip(): void {
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
      this.tooltipTimer = undefined;
    }
  }

  private hideTooltipNow(): void {
    if (this.tooltipElement) {
      const el = this.tooltipElement;
      const idx = this.trackedElements.indexOf(el);
      this.eventCallback?.({ type: 'tooltip-hide', x: 0, y: 0, elementName: el.getName(), elementIndex: idx });
      this.tappableRaster?.hideTooltip();
      this.tooltipElement = null;
    }
  }

  /** Dispatch drag — hit-tests on first call to find drag target, sticks to it until dragEnd. */
  dispatchDrag(x: number, y: number, deltaX: number, deltaY: number): void {
    this.lastDragX = x;
    this.lastDragY = y;
    if (!this.draggedElement) {
      // First drag event — find topmost element with a drag handler
      for (let i = this.trackedElements.length - 1; i >= 0; i--) {
        const el = this.trackedElements[i];
        if (el.getDragHandler() && el.hitTest(x, y)) {
          this.draggedElement = el;
          break;
        }
      }
    }
    if (this.draggedElement) {
      const idx = this.trackedElements.indexOf(this.draggedElement);
      this.eventCallback?.({ type: 'drag', x, y, deltaX, deltaY, elementName: this.draggedElement.getName(), elementIndex: idx });
      this.draggedElement.getDragHandler()?.({ x, y, deltaX, deltaY });
    }
  }

  /** Dispatch drag end — fires dragEnd handler on current drag target, clears it. */
  dispatchDragEnd(): void {
    if (this.draggedElement) {
      const idx = this.trackedElements.indexOf(this.draggedElement);
      const x = this.lastDragX;
      const y = this.lastDragY;
      this.eventCallback?.({ type: 'drag-end', x, y, elementName: this.draggedElement.getName(), elementIndex: idx });
      this.draggedElement.getDragEndHandler()?.({ x, y });
      this.draggedElement = null;
    }
  }

  /** Dispatch scroll — topmost element under cursor, falls back to scene-wide handler. */
  dispatchScroll(deltaX: number, deltaY: number, x: number, y: number): void {
    for (let i = this.trackedElements.length - 1; i >= 0; i--) {
      const el = this.trackedElements[i];
      if (el.getScrollHandler() && el.hitTest(x, y)) {
        this.eventCallback?.({ type: 'scroll', x, y, deltaX, deltaY, elementName: el.getName(), elementIndex: i });
        el.getScrollHandler()!({ deltaX, deltaY, x, y });
        return;
      }
    }
    if (this.sceneScrollHandler) {
      this.eventCallback?.({ type: 'scroll', x, y, deltaX, deltaY });
      this.sceneScrollHandler({ deltaX, deltaY, x, y });
    }
  }

  /** Dispatch key down — fires scene-wide handler directly (no hit testing). */
  dispatchKeyDown(key: string): void {
    this.eventCallback?.({ type: 'key-down', x: 0, y: 0, key });
    this.keyDownHandler?.(key);
  }

  /** Dispatch key up — fires scene-wide handler directly (no hit testing). */
  dispatchKeyUp(key: string): void {
    this.eventCallback?.({ type: 'key-up', x: 0, y: 0, key });
    this.keyUpHandler?.(key);
  }

  /** Dispatch double-click — hits topmost element with a doubleClick handler. */
  dispatchDoubleTap(x: number, y: number): void {
    for (let i = this.trackedElements.length - 1; i >= 0; i--) {
      const el = this.trackedElements[i];
      const handler = el.getDoubleClickHandler();
      if (handler && el.hitTest(x, y)) {
        this.eventCallback?.({ type: 'double-click', x, y, elementName: el.getName(), elementIndex: i });
        handler({ x, y });
        return;
      }
    }
  }

  /** Dispatch right-click / secondary tap — hits topmost element with a rightClick handler. */
  dispatchSecondaryTap(x: number, y: number): void {
    for (let i = this.trackedElements.length - 1; i >= 0; i--) {
      const el = this.trackedElements[i];
      const handler = el.getRightClickHandler();
      if (handler && el.hitTest(x, y)) {
        this.eventCallback?.({ type: 'right-click', x, y, elementName: el.getName(), elementIndex: i });
        handler({ x, y });
        return;
      }
    }
  }

  /** Register a scene-wide key-down handler. */
  onKeyDown(handler: (key: string) => void): this {
    this.keyDownHandler = handler;
    return this;
  }

  /** Register a scene-wide key-up handler. */
  onKeyUp(handler: (key: string) => void): this {
    this.keyUpHandler = handler;
    return this;
  }

  /** Register a scene-wide scroll handler (fires when no element handles scroll). */
  onScroll(handler: (e: { deltaX: number; deltaY: number; x: number; y: number }) => void): this {
    this.sceneScrollHandler = handler;
    return this;
  }

  /** Request keyboard focus on the event overlay (created by enableEvents). */
  async requestFocus(): Promise<void> {
    if (this.tappableRaster?.requestFocus) {
      await this.tappableRaster.requestFocus();
    }
  }

  // ─── Dynamic Binding Regions ──────────────────────────────────

  /** Remove an element from hit-test tracking (used when destroying bindTo elements). */
  private untrackElement(el: CvgElement): void {
    const idx = this.trackedElements.indexOf(el);
    if (idx >= 0) this.trackedElements.splice(idx, 1);
  }

  /**
   * Bind a dynamic list of data items to SVG elements.
   *
   * On each `refresh()`, the items are diffed using `trackBy`:
   * - **New items**: `render()` is called to create elements
   * - **Removed items**: elements are destroyed (hidden + untracked)
   * - **Existing items**: `update()` is called if provided (or rely on property bindings)
   *
   * ```ts
   * svgCtx.bindTo({
   *   items: () => dataPoints,
   *   trackBy: (d) => d.id,
   *   render: (d) => s.rect({ x: d.x, y: 0, width: 10, height: d.value, fill: '#48c' }),
   *   update: (d, els) => els[0].fill(d.color),
   * });
   * ```
   */
  bindTo<T>(config: {
    items: () => T[];
    render: (item: T, index: number) => CvgElement | CvgElement[];
    trackBy: (item: T) => string | number;
    update?: (item: T, elements: CvgElement[]) => void;
  }): void {
    const region: BindingRegion<T> = {
      items: config.items,
      render: config.render,
      trackBy: config.trackBy,
      update: config.update,
      current: new Map(),
    };

    // Initial render
    const items = config.items();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = config.trackBy(item);
      const result = config.render(item, i);
      const elements = Array.isArray(result) ? result : [result];
      region.current.set(key, { item, elements });
    }

    this.bindingRegions.push(region);
  }

  /** @internal Process all binding regions during refresh(). */
  private async refreshBindingRegions(): Promise<void> {
    for (const region of this.bindingRegions) {
      const newItems = region.items();
      const newKeys = new Set<string | number>();

      // Build map of new items by key
      const newItemMap = new Map<string | number, { item: any; index: number }>();
      for (let i = 0; i < newItems.length; i++) {
        const key = region.trackBy(newItems[i]);
        newKeys.add(key);
        newItemMap.set(key, { item: newItems[i], index: i });
      }

      // Remove items that are no longer present
      for (const [key, entry] of region.current) {
        if (!newKeys.has(key)) {
          for (const el of entry.elements) {
            await el.destroy();
            this.untrackElement(el);
          }
          region.current.delete(key);
        }
      }

      // Add new items and update existing ones
      for (const [key, { item, index }] of newItemMap) {
        const existing = region.current.get(key);
        if (existing) {
          // Update existing — call update callback if provided
          existing.item = item;
          if (region.update) {
            region.update(item, existing.elements);
          }
        } else {
          // New item — render it
          const result = region.render(item, index);
          const elements = Array.isArray(result) ? result : [result];
          region.current.set(key, { item, elements });
        }
      }
    }
  }

  // ─── Animation Manager ────────────────────────────────────────

  /** @internal Add an animation to the manager. Called by CvgElement.transition/animate. */
  addAnimation(element: CvgElement, tickFn: (t: number) => void, opts?: AnimationOptions): AnimationHandle {
    const resolvedEasing = resolveEasing(opts?.easing);
    const handle = new AnimationHandle(this.nextAnimationId++);
    handle._context = this;
    handle._onComplete = opts?.onComplete;

    const anim: ActiveAnimation = {
      handle,
      element,
      tickFn,
      startTime: Date.now() + (opts?.delay ?? 0),
      duration: opts?.duration ?? 300,
      delay: opts?.delay ?? 0,
      easing: resolvedEasing,
      loop: opts?.loop ?? opts?.yoyo ?? false,
      yoyo: opts?.yoyo ?? false,
    };

    this.animations.push(anim);
    this.startAnimationLoop();
    return handle;
  }

  /** @internal Remove an animation by id (called by AnimationHandle.stop). */
  removeAnimation(id: number): void {
    this.animations = this.animations.filter(a => a.handle._id !== id);
    if (this.animations.length === 0) {
      this.stopAnimationLoop();
    }
  }

  /** Stop all running animations. */
  stopAllAnimations(): void {
    for (const anim of this.animations) {
      anim.handle._stopped = true;
      anim.handle._resolve?.();
    }
    this.animations = [];
    this.stopAnimationLoop();
  }

  /** Whether any animations are currently running. */
  isAnimating(): boolean {
    return this.animations.length > 0;
  }

  /**
   * Start polling — re-evaluates all property bindings at the given interval.
   *
   * Use for live data displays (clocks, dashboards, sensor readouts) where
   * bound values change over time without explicit user interaction.
   *
   * ```ts
   * svgCtx.poll(1000);  // re-evaluate bindings every second
   * ```
   */
  poll(intervalMs: number): this {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.refresh(), intervalMs);
    return this;
  }

  /** Stop polling. */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  /**
   * Resize the SVG canvas — recomputes the viewBox→canvas mapping and
   * re-positions all elements that have shape info.
   *
   * Pair with `win.onResize()` for responsive SVG scenes:
   * ```ts
   * win.onResize((w, h) => {
   *   const side = Math.min(w, h);  // maintain aspect ratio
   *   svgCtx.resize(side, side);
   * });
   * ```
   */
  resize(canvasWidth: number, canvasHeight: number): void {
    const vb = this.mapping.vb;
    const scaleX = canvasWidth / vb.width;
    const scaleY = canvasHeight / vb.height;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvasWidth - vb.width * scale) / 2;
    const offsetY = (canvasHeight - vb.height * scale) / 2;

    const transform = AffineMatrix.translate(offsetX, offsetY)
      .multiply(AffineMatrix.scale(scale))
      .multiply(AffineMatrix.translate(-vb.minX, -vb.minY));
    this.mapping = { vb, canvasWidth, canvasHeight, scale, offsetX, offsetY, transform };

    // Outside in: resize the clip container first, then elements follow
    if (this.clipContainer?.resize) {
      this.clipContainer.resize(canvasWidth, canvasHeight);
    }

    // Resize sizing shim (establishes clip bounds)
    if (this.sizingShim?.update) {
      this.sizingShim.update({ width: canvasWidth, height: canvasHeight });
    }

    // Re-position all elements with stored SVG attrs
    for (const el of this.trackedElements) {
      el.setMapping(this.mapping);
      el.recomputeGeometry();
    }

    // Resize TappableCanvasRaster overlay if present
    if (this.tappableRaster?.resize) {
      this.tappableRaster.resize(canvasWidth, canvasHeight);
    }
  }

  /**
   * Debounced resize — drops intermediate events, applies only the latest.
   * Use from `win.onResize()` to avoid flooding the bridge during drag-resize.
   */
  debouncedResize(canvasWidth: number, canvasHeight: number): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = undefined;
      this.resize(canvasWidth, canvasHeight);
    }, 16);
  }

  /** Get the current viewBox mapping (for external layout calculations). */
  getMapping(): ViewBoxMapping {
    return this.mapping;
  }

  /** @internal Set the sizing shim (used by cvg() factory for resize support). */
  setSizingShim(shim: any): void {
    this.sizingShim = shim;
  }

  /** @internal Set the clip container (used by cvg() factory for outside-in resize). */
  setClipContainer(clip: any): void {
    this.clipContainer = clip;
  }

  private startAnimationLoop(): void {
    if (this.animationTimer) return;
    this.animationTimer = setInterval(() => this.tickAnimations(), 16);
  }

  private stopAnimationLoop(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = undefined;
    }
  }

  private tickAnimations(): void {
    const now = Date.now();
    const completed: ActiveAnimation[] = [];

    for (const anim of this.animations) {
      if (anim.handle._stopped) {
        completed.push(anim);
        continue;
      }

      // Not started yet (delay)
      if (now < anim.startTime) continue;

      const elapsed = now - anim.startTime;
      let rawT = Math.min(elapsed / anim.duration, 1);

      if (anim.yoyo) {
        // Full cycle = 2 * duration (forward + reverse)
        const cycleTime = elapsed % (anim.duration * 2);
        rawT = cycleTime <= anim.duration
          ? cycleTime / anim.duration
          : 2 - cycleTime / anim.duration;
      } else if (anim.loop && rawT >= 1) {
        rawT = (elapsed % anim.duration) / anim.duration;
      }

      const easedT = anim.easing(rawT);
      anim.tickFn(easedT);

      // Check completion (non-looping)
      if (!anim.loop && !anim.yoyo && elapsed >= anim.duration) {
        anim.tickFn(anim.easing(1));  // ensure we land exactly at target
        completed.push(anim);
      }
    }

    // Remove completed animations
    for (const anim of completed) {
      this.animations = this.animations.filter(a => a !== anim);
      if (!anim.handle._stopped) {
        anim.handle._onComplete?.();
      }
      anim.handle._resolve?.();
    }

    if (this.animations.length === 0) {
      this.stopAnimationLoop();
    }
  }
}
