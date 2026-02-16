/**
 * CVG (Cosyne Vector Graphics) Grammar
 *
 * Core classes: CvgElement, CvgContext, PathBuilder.
 *
 * Types, constants, and animation helpers are in grammar-types.ts.
 * Utility functions are in grammar-utils.ts.
 * Factory functions (cvg, cvgBuilder, createCvgContext) are in grammar-factories.ts.
 *
 * This file re-exports everything from those modules so that existing
 * `import { ... } from './grammar'` statements continue to work.
 */

import { SvgNode, SvgStyle, CvgElementAttrs, FilterDef, ClipPathDef, ClipPathShape } from './types';
import { normalizePath } from './normalizer';
import { parseViewBox } from './parser';
import { AffineMatrix, parseTransform, ProjectiveMatrix, composeTransforms, transformFromSpec, type Transform2D } from './transform';
import { gaussianBlur } from './blur';
import { fillRectInBuffer, fillCircleInBuffer, fillPathInBuffer, applyClipMask, parseColorToRGBA } from './rasterize';
import {
  type CvgEvent, type GradientDef, type ViewBoxMapping, type EasingFn, type AnimationOptions,
  AnimationHandle, Easing, SVG_GEOM_KEYS, lerpColor, lerp, resolveEasing,
} from './grammar-types';
import {
  parseStyleAttr, parseNum, parseLengthToPx, parseFontSize, parseDyEm, parseFilterRegion,
  extractUrlId, uint8ArrayToBase64, CSS_COLORS, applyOpacityToColor, resolveFillColor,
  effectiveAlpha, effectiveStrokeAlpha, resolveStrokeColor, resolveGradientStroke,
  normalizeColor, parsePreserveAspectRatio, transformPathToBuffer, resolveGradientFill,
  pointsToPath, computePathBounds,
} from './grammar-utils';

/** @internal Tracked binding region for bindTo(). */
interface BindingRegion<T = any> {
  items: () => T[];
  render: (item: T, index: number) => CvgElement | CvgElement[];
  trackBy: (item: T) => string | number;
  update?: (item: T, elements: CvgElement[]) => void;
  /** Map from trackBy key → { item, elements } for current items */
  current: Map<string | number, { item: T; elements: CvgElement[] }>;
}

/** @internal Active animation state tracked by the animation manager. */
interface ActiveAnimation {
  handle: AnimationHandle;
  element: CvgElement;
  tickFn: (t: number) => void;
  startTime: number;
  duration: number;
  delay: number;
  easing: EasingFn;
  loop: boolean;
  yoyo: boolean;
}

/**
 * Wrapper returned by element methods — allows fluent .fill() / .stroke() chaining.
 *
 * ```ts
 * s.circle({ r: 15, cx: 50, cy: 18 }).fill("#900");
 * s.path({ d: "M10,10 L90,90" }).stroke("#000", 2);
 * ```
 */
export class CvgElement {
  private underlying: any;
  private clickHandler?: (e: { x: number; y: number }) => void;
  private hoverHandler?: (hovered: boolean) => void;
  private dragHandler?: (e: { x: number; y: number; deltaX: number; deltaY: number }) => void;
  private dragEndHandler?: (e: { x: number; y: number }) => void;
  private scrollHandler?: (e: { deltaX: number; deltaY: number; x: number; y: number }) => void;
  private doubleClickHandler?: (e: { x: number; y: number }) => void;
  private rightClickHandler?: (e: { x: number; y: number }) => void;
  private tooltipText?: string;
  private bounds?: { x: number; y: number; width: number; height: number };
  private elementName?: string;
  private whenPredicate?: () => boolean;
  private _visible: boolean = true;
  private cursorType?: string;
  private fillBinding?: () => string;
  private strokeBinding?: () => { color: string; width?: number };
  private opacityBinding?: () => number;
  private posBinding?: () => Record<string, number>;
  private _context?: CvgContext;
  private _destroyed = false;

  constructor(underlying: any) {
    this.underlying = underlying;
  }

  /** Assign a human-readable name for journal/debugging purposes. */
  name(n: string): this { this.elementName = n; return this; }

  /** Get the assigned name, if any. */
  getName(): string | undefined { return this.elementName; }

  /** Register a click handler for this element. */
  onClick(handler: (e: { x: number; y: number }) => void): this {
    this.clickHandler = handler;
    return this;
  }

  getClickHandler() { return this.clickHandler; }

  /** Register a hover handler for this element. */
  onHover(handler: (hovered: boolean) => void): this {
    this.hoverHandler = handler;
    return this;
  }

  getHoverHandler() { return this.hoverHandler; }

  /** Register a drag handler for this element. */
  onDrag(handler: (e: { x: number; y: number; deltaX: number; deltaY: number }) => void): this {
    this.dragHandler = handler;
    return this;
  }

  getDragHandler() { return this.dragHandler; }

  /** Register a drag-end handler for this element. */
  onDragEnd(handler: (e: { x: number; y: number }) => void): this {
    this.dragEndHandler = handler;
    return this;
  }

  getDragEndHandler() { return this.dragEndHandler; }

  /** Register a scroll handler for this element. */
  onScroll(handler: (e: { deltaX: number; deltaY: number; x: number; y: number }) => void): this {
    this.scrollHandler = handler;
    return this;
  }

  getScrollHandler() { return this.scrollHandler; }

  /** Register a double-click handler for this element. */
  onDoubleClick(handler: (e: { x: number; y: number }) => void): this {
    this.doubleClickHandler = handler;
    return this;
  }

  getDoubleClickHandler() { return this.doubleClickHandler; }

  /** Register a right-click / long-press handler for this element. */
  onRightClick(handler: (e: { x: number; y: number }) => void): this {
    this.rightClickHandler = handler;
    return this;
  }

  getRightClickHandler() { return this.rightClickHandler; }

  /** Set tooltip text to show on hover. */
  tooltip(text: string): this {
    this.tooltipText = text;
    return this;
  }

  getTooltip() { return this.tooltipText; }

  /** Conditionally show/hide this element based on a predicate.
   *  Evaluates immediately — hides if false. Call `svgCtx.refresh()` after
   *  state changes to re-evaluate. */
  when(predicate: () => boolean): this {
    this.whenPredicate = predicate;
    // Evaluate immediately — hide if condition is false at registration
    if (!predicate()) {
      this.hide();
    }
    return this;
  }

  getWhenPredicate() { return this.whenPredicate; }

  /** Set the cursor type shown when hovering over this element. */
  cursor(type: 'default' | 'pointer' | 'text' | 'crosshair' | 'hResize' | 'vResize'): this {
    this.cursorType = type;
    return this;
  }

  getCursor() { return this.cursorType; }

  /** Bind fill color to a reactive function. Re-evaluated on `svgCtx.refresh()`. */
  bindFill(fn: () => string): this {
    this.fillBinding = fn;
    return this;
  }

  getFillBinding() { return this.fillBinding; }

  /** Bind stroke to a reactive function. Re-evaluated on `svgCtx.refresh()`. */
  bindStroke(fn: () => { color: string; width?: number }): this {
    this.strokeBinding = fn;
    return this;
  }

  getStrokeBinding() { return this.strokeBinding; }

  /** Bind opacity to a reactive function. Re-evaluated on `svgCtx.refresh()`. */
  bindOpacity(fn: () => number): this {
    this.opacityBinding = fn;
    return this;
  }

  getOpacityBinding() { return this.opacityBinding; }

  /** Bind position/size to a reactive function. Re-evaluated on `svgCtx.refresh()`.
   *  Returns an object with numeric properties to update (e.g. { cx: 50, cy: 30, r: 10 }). */
  bindPos(fn: () => Record<string, number>): this {
    this.posBinding = fn;
    return this;
  }

  getPosBinding() { return this.posBinding; }

  /** Whether the element is currently visible. */
  isVisible(): boolean { return this._visible; }

  /** Hide this element (removes from rendering and hit-testing). */
  async hide(): Promise<void> {
    if (!this._visible) return;
    this._visible = false;
    if (this.underlying?.hide) {
      await this.underlying.hide();
    }
  }

  /** Show this element (restores rendering and hit-testing). */
  async show(): Promise<void> {
    if (this._visible) return;
    this._visible = true;
    if (this.underlying?.show) {
      await this.underlying.show();
    }
  }

  /** Destroy this element — hides it and marks it as permanently removed.
   *  Used by bindTo() when data items are removed. */
  async destroy(): Promise<void> {
    this._destroyed = true;
    await this.hide();
  }

  /** Whether the element has been destroyed (removed from a bindTo region). */
  isDestroyed(): boolean { return this._destroyed; }

  setBounds(x: number, y: number, w: number, h: number): this {
    this.bounds = { x, y, width: w, height: h };
    return this;
  }

  getBounds() { return this.bounds; }

  hitTest(px: number, py: number): boolean {
    if (this._destroyed) return false;
    if (!this._visible) return false;
    if (!this.bounds) return false;
    const b = this.bounds;
    return px >= b.x && px <= b.x + b.width &&
           py >= b.y && py <= b.y + b.height;
  }

  /** Set fill color on the element (updates the underlying widget). */
  fill(color: string): this {
    if (this.underlying?.update) {
      this.underlying.update({ fillColor: color });
    }
    return this;
  }

  /** Set stroke on the element (updates the underlying widget). */
  stroke(color: string, width?: number): this {
    if (this.underlying?.update) {
      const updates: any = { strokeColor: color };
      if (width !== undefined) updates.strokeWidth = width;
      this.underlying.update(updates);
    }
    return this;
  }

  /** Set opacity on the element (updates the underlying widget). */
  opacity(value: number): this {
    if (this.underlying?.update) {
      this.underlying.update({ opacity: value });
    }
    return this;
  }

  /** @internal Set the owning CvgContext (for animation manager access). */
  setContext(ctx: CvgContext): void {
    this._context = ctx;
  }

  /** Get the owning CvgContext. */
  getContext(): CvgContext | undefined {
    return this._context;
  }

  /** Get the underlying Tsyne widget. */
  getUnderlying(): any {
    return this.underlying;
  }

  // ─── SVG-semantic coordinate translation ──────────────────────

  private _shapeType?: 'circle' | 'rect' | 'line';
  private _mapping?: ViewBoxMapping;
  private _svgAttrs?: Record<string, number>;
  private _parentTransform: Transform2D = AffineMatrix.identity();
  /** @internal Callback for path-based elements to recompute geometry on resize. */
  private _resizeFn?: (mapping: ViewBoxMapping) => void;

  /** @internal Store a resize callback and initial mapping for path-based elements. */
  setPathResize(mapping: ViewBoxMapping, fn: (mapping: ViewBoxMapping) => void): void {
    this._mapping = mapping;
    this._resizeFn = fn;
  }

  /** @internal Store shape type and viewBox mapping for SVG→canvas coordinate translation. */
  setShapeInfo(type: 'circle' | 'rect' | 'line', mapping: ViewBoxMapping, svgAttrs: Record<string, number>, parentTransform?: Transform2D): void {
    this._shapeType = type;
    this._mapping = mapping;
    this._svgAttrs = { ...svgAttrs };
    if (parentTransform) this._parentTransform = parentTransform;
  }

  /** Get the current SVG-level attribute value (in viewBox units). */
  getSvgAttr(key: string): number | undefined {
    return this._svgAttrs?.[key];
  }

  /** Whether this element has SVG-semantic shape info for coordinate translation. */
  hasShapeInfo(): boolean {
    return this._shapeType !== undefined && this._mapping !== undefined;
  }

  /**
   * Update SVG-level properties with automatic coordinate translation.
   *
   * Translates SVG-space props (cx, cy, r for circle; x, y, width, height for rect;
   * x1, y1, x2, y2 for line) to canvas pixel coords using the stored viewBox mapping.
   * Also updates hit-test bounds.
   *
   * Non-geometry props (fillColor, strokeColor, etc.) are passed through directly.
   */
  updateSvgProps(props: Record<string, any>): void {
    if (!this._mapping || !this._shapeType || !this._svgAttrs) {
      // No shape info — pass through directly
      if (this.underlying?.update) this.underlying.update(props);
      return;
    }

    const m = this._mapping;
    const vb = m.transform;
    const pt = this._parentTransform;
    // Map a point: apply parent group transform, then viewBox→canvas mapping
    const mapPt = (x: number, y: number): [number, number] => {
      const [tx, ty] = pt.apply(x, y);
      return vb.apply(tx, ty);
    };
    const mapLen = (l: number) => l * m.scale * pt.averageScale();

    // Determine which keys are SVG geometry props for this shape type
    const geomKeys = SVG_GEOM_KEYS[this._shapeType];
    const canvasUpdates: Record<string, any> = {};

    // Merge geometry props into stored attrs; pass non-geometry props through
    for (const k of Object.keys(props)) {
      if (geomKeys.includes(k)) {
        this._svgAttrs[k] = props[k];
      } else {
        canvasUpdates[k] = props[k];
      }
    }

    // Translate geometry from SVG space → canvas space
    const a = this._svgAttrs;
    switch (this._shapeType) {
      case 'circle': {
        const [cx, cy] = mapPt(a.cx ?? 0, a.cy ?? 0);
        const r = mapLen(a.r ?? 0);
        canvasUpdates.x = cx - r;
        canvasUpdates.y = cy - r;
        canvasUpdates.x2 = cx + r;
        canvasUpdates.y2 = cy + r;
        this.setBounds(cx - r, cy - r, 2 * r, 2 * r);
        break;
      }
      case 'rect': {
        const [x, y] = mapPt(a.x ?? 0, a.y ?? 0);
        const w = mapLen(a.width ?? 0);
        const h = mapLen(a.height ?? 0);
        canvasUpdates.x = x;
        canvasUpdates.y = y;
        canvasUpdates.x2 = x + w;
        canvasUpdates.y2 = y + h;
        this.setBounds(x, y, w, h);
        break;
      }
      case 'line': {
        const [lx1, ly1] = mapPt(a.x1 ?? 0, a.y1 ?? 0);
        const [lx2, ly2] = mapPt(a.x2 ?? 0, a.y2 ?? 0);
        canvasUpdates.x1 = lx1;
        canvasUpdates.y1 = ly1;
        canvasUpdates.x2 = lx2;
        canvasUpdates.y2 = ly2;
        const minX = Math.min(lx1, lx2), minY = Math.min(ly1, ly2);
        this.setBounds(minX, minY, Math.abs(lx2 - lx1), Math.abs(ly2 - ly1));
        break;
      }
    }

    if (Object.keys(canvasUpdates).length > 0 && this.underlying?.update) {
      this.underlying.update(canvasUpdates);
    }
  }

  /** @internal Re-translate stored SVG attrs through a (possibly updated) mapping. */
  recomputeGeometry(): void {
    if (this._svgAttrs && this._shapeType && this._mapping) {
      this.updateSvgProps({ ...this._svgAttrs });
    } else if (this._resizeFn && this._mapping) {
      this._resizeFn(this._mapping);
    }
  }

  /** @internal Update the stored mapping (used by CvgContext.resize). */
  setMapping(mapping: ViewBoxMapping): void {
    if (this._mapping || this._resizeFn) this._mapping = mapping;
  }

  /**
   * Animate from current property values to target values over time.
   *
   * Supported properties: `fill`, `stroke`, `strokeWidth`, `opacity`, and any
   * numeric property accepted by the underlying widget's `.update()` (cx, cy, x, y, width, height, r, etc.)
   *
   * ```ts
   * el.transition({ fill: '#f00', cx: 100 }, { duration: 300, easing: 'easeOut' });
   * ```
   */
  transition(
    props: Record<string, string | number>,
    opts?: AnimationOptions
  ): AnimationHandle {
    if (!this._context) throw new Error('CvgElement must be tracked by an CvgContext to animate');

    // Snapshot current values — prefer SVG-level attrs for geometry props
    const underlying = this.underlying;
    const geomKeys = this._shapeType ? (SVG_GEOM_KEYS[this._shapeType] || []) : [];
    const startValues: Record<string, string | number> = {};
    for (const key of Object.keys(props)) {
      if (key === 'fill' || key === 'fillColor') {
        startValues[key] = underlying?._fillColor ?? underlying?.fillColor ?? '#000000';
      } else if (key === 'stroke' || key === 'strokeColor') {
        startValues[key] = underlying?._strokeColor ?? underlying?.strokeColor ?? '#000000';
      } else if (key === 'opacity') {
        startValues[key] = underlying?._opacity ?? 1;
      } else if (this._svgAttrs && geomKeys.includes(key)) {
        // SVG-level geometry prop — read from stored SVG attrs (viewBox units)
        startValues[key] = this._svgAttrs[key] ?? 0;
      } else {
        startValues[key] = underlying?.[`_${key}`] ?? underlying?.[key] ?? 0;
      }
    }

    const hasSvgProps = this._shapeType && geomKeys.some(k => k in props);

    const tickFn = (t: number) => {
      const svgUpdates: Record<string, any> = {};
      const directUpdates: Record<string, any> = {};
      for (const key of Object.keys(props)) {
        const from = startValues[key];
        const to = props[key];
        let val: any;
        if (typeof from === 'string' && typeof to === 'string') {
          val = lerpColor(from, to, t);
          directUpdates[key === 'fill' ? 'fillColor' : key === 'stroke' ? 'strokeColor' : key] = val;
        } else {
          val = lerp(Number(from), Number(to), t);
          if (hasSvgProps && geomKeys.includes(key)) {
            svgUpdates[key] = val;
          } else {
            directUpdates[key] = val;
          }
        }
      }
      if (Object.keys(svgUpdates).length > 0) this.updateSvgProps({ ...svgUpdates, ...directUpdates });
      else if (Object.keys(directUpdates).length > 0 && underlying?.update) underlying.update(directUpdates);
    };

    return this._context.addAnimation(this, tickFn, opts);
  }

  /**
   * Run a custom animation with a callback that receives normalized time.
   *
   * ```ts
   * el.animate((t) => ({ cx: 50 + 100 * t, r: 5 + 15 * t }), {
   *   duration: 500,
   *   easing: 'easeOut',
   *   onComplete: () => console.log('done'),
   * });
   * ```
   */
  animate(
    fn: (t: number) => Record<string, any>,
    opts?: AnimationOptions
  ): AnimationHandle {
    if (!this._context) throw new Error('CvgElement must be tracked by an CvgContext to animate');

    const underlying = this.underlying;
    const tickFn = (t: number) => {
      const updates = fn(t);
      if (this.hasShapeInfo()) {
        this.updateSvgProps(updates);
      } else if (underlying?.update) {
        underlying.update(updates);
      }
    };

    return this._context.addAnimation(this, tickFn, opts);
  }
}

/**
 * CVG rendering context. Uses SVG-inspired element names for a familiar API.
 *
 * Element methods return CvgElement wrappers supporting fluent .fill()/.stroke().
 */
export class CvgContext {
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

  /** Create a TappableCanvasRaster overlay that forwards taps and hovers to SVG element hit testing. */
  enableEvents(): this {
    this.tappableRaster = this.app.tappableCanvasRaster(this.mapping.canvasWidth, this.mapping.canvasHeight, {
      onTap: (x: number, y: number) => { this.dispatchTap(x, y); },
      onMouseMove: (x: number, y: number) => { this.dispatchHover(x, y); },
      onDrag: (x: number, y: number, deltaX: number, deltaY: number) => { this.dispatchDrag(x, y, deltaX, deltaY); },
      onDragEnd: () => { this.dispatchDragEnd(); },
      onScroll: (deltaX: number, deltaY: number, x: number, y: number) => { this.dispatchScroll(deltaX, deltaY, x, y); },
      onKeyDown: (key: string) => { this.dispatchKeyDown(key); },
      onKeyUp: (key: string) => { this.dispatchKeyUp(key); },
      onDoubleTap: (x: number, y: number) => { this.dispatchDoubleTap(x, y); },
      onSecondaryTap: (x: number, y: number) => { this.dispatchSecondaryTap(x, y); },
    });
    return this;
  }

  /** Re-evaluate all .when() predicates, property bindings, binding regions, and show/hide elements.
   *  Call this after state changes that affect .when() conditions, bound properties, or data lists. */
  async refresh(): Promise<void> {
    // Process binding regions first (may add/remove elements)
    await this.refreshBindingRegions();

    for (const el of this.trackedElements) {
      // Skip destroyed elements (from bindTo removal)
      if (el.isDestroyed()) continue;

      // Evaluate .when() predicates
      const pred = el.getWhenPredicate();
      if (pred) {
        const shouldShow = pred();
        if (shouldShow && !el.isVisible()) {
          await el.show();
          const idx = this.trackedElements.indexOf(el);
          this.eventCallback?.({ type: 'when-show', x: 0, y: 0, elementName: el.getName(), elementIndex: idx });
        } else if (!shouldShow && el.isVisible()) {
          await el.hide();
          const idx = this.trackedElements.indexOf(el);
          this.eventCallback?.({ type: 'when-hide', x: 0, y: 0, elementName: el.getName(), elementIndex: idx });
        }
      }

      // Skip property bindings for hidden elements
      if (!el.isVisible()) continue;

      // Evaluate property bindings
      const fillFn = el.getFillBinding();
      if (fillFn) el.fill(fillFn());

      const strokeFn = el.getStrokeBinding();
      if (strokeFn) {
        const { color, width } = strokeFn();
        el.stroke(color, width);
      }

      const opacityFn = el.getOpacityBinding();
      if (opacityFn) el.opacity(opacityFn());

      const posFn = el.getPosBinding();
      if (posFn) {
        const props = posFn();
        el.updateSvgProps(props);
      }
    }
  }

  /** Parse a CSS <style> block and register rules for class/element selectors. */
  registerCssStyle(cssText: string): void {
    // Simple CSS parser: extract rules like "selector { prop: value; ... }"
    const ruleRe = /([^{}]+)\{([^}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(cssText)) !== null) {
      const selectors = m[1].trim().split(/\s*,\s*/);
      const body = m[2].trim();
      const props: Record<string, string> = {};
      for (const decl of body.split(';')) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx < 0) continue;
        const prop = decl.slice(0, colonIdx).trim();
        const val = decl.slice(colonIdx + 1).trim();
        if (prop && val) props[prop] = val;
      }
      for (const sel of selectors) {
        const existing = this.cssRules.get(sel) || {};
        this.cssRules.set(sel, { ...existing, ...props });
      }
    }
  }

  /** Get CSS properties that apply to an element with given tag and class attribute. */
  private getCssProps(tag: string, className?: string): Record<string, string> {
    const result: Record<string, string> = {};
    // Element selector (e.g. "text")
    const tagRules = this.cssRules.get(tag);
    if (tagRules) Object.assign(result, tagRules);
    // Class selectors
    if (className) {
      for (const cls of className.trim().split(/\s+/)) {
        const classRules = this.cssRules.get('.' + cls);
        if (classRules) Object.assign(result, classRules);
      }
    }
    return result;
  }

  /** Register the walkNode callback for <use> element support. */
  setWalkNode(fn: (s: CvgContext, node: SvgNode) => void): void {
    this.walkNodeFn = fn;
  }

  /** Index all nodes by id for <use> lookups. */
  indexNodes(root: SvgNode): void {
    const walk = (node: SvgNode) => {
      if (node.attrs.id) this.nodesById.set(node.attrs.id, node);
      for (const child of node.children) walk(child);
    };
    walk(root);
  }

  // ─── Style stack ─────────────────────────────────────────────

  private currentStyle(): SvgStyle {
    return this.styleStack[this.styleStack.length - 1];
  }

  private pushStyle(attrs: CvgElementAttrs): void {
    const parent = this.currentStyle();
    const merged: SvgStyle = { ...parent };
    const style = parseStyleAttr(attrs.style);
    const css = this.getCssProps((attrs as any)._tag ?? '', attrs.class);
    if (attrs.fill !== undefined) merged.fill = attrs.fill;
    else if (style.fill) merged.fill = style.fill;
    else if (css.fill) merged.fill = css.fill;
    if (attrs.stroke !== undefined) merged.stroke = attrs.stroke;
    else if (style.stroke) merged.stroke = style.stroke;
    else if (css.stroke) merged.stroke = css.stroke;
    if (attrs['stroke-width'] !== undefined) merged.strokeWidth = parseNum(attrs['stroke-width']);
    else if (style['stroke-width']) merged.strokeWidth = parseNum(style['stroke-width']);
    else if (css['stroke-width']) merged.strokeWidth = parseNum(css['stroke-width']);
    if (attrs['stroke-linecap'] !== undefined) merged.strokeLinecap = attrs['stroke-linecap'] as any;
    if (attrs['stroke-linejoin'] !== undefined) merged.strokeLinejoin = attrs['stroke-linejoin'] as any;
    // Text properties
    const fontSize = attrs['font-size'] ?? style['font-size'] ?? css['font-size'];
    if (fontSize !== undefined) merged.fontSize = parseFontSize(fontSize);
    const fontFamily = attrs['font-family'] ?? style['font-family'] ?? css['font-family'];
    if (fontFamily !== undefined) merged.fontFamily = fontFamily;
    const fontWeight = attrs['font-weight'] ?? style['font-weight'] ?? css['font-weight'];
    if (fontWeight !== undefined) merged.fontWeight = fontWeight;
    const fontStyle = attrs['font-style'] ?? style['font-style'] ?? css['font-style'];
    if (fontStyle !== undefined) merged.fontStyle = fontStyle;
    const textAnchor = attrs['text-anchor'] ?? style['text-anchor'] ?? css['text-anchor'];
    if (textAnchor !== undefined) merged.textAnchor = textAnchor;
    const fillRule = attrs['fill-rule'] ?? style['fill-rule'] ?? css['fill-rule'];
    if (fillRule !== undefined) merged.fillRule = fillRule as any;
    const fillOpacity = attrs['fill-opacity'] ?? style['fill-opacity'] ?? css['fill-opacity'];
    if (fillOpacity !== undefined) merged.fillOpacity = parseNum(fillOpacity);
    const strokeOpacity = attrs['stroke-opacity'] ?? style['stroke-opacity'] ?? css['stroke-opacity'];
    if (strokeOpacity !== undefined) merged.strokeOpacity = parseNum(strokeOpacity);
    const opacity = attrs.opacity ?? style.opacity ?? css.opacity;
    if (opacity !== undefined) merged.opacity = parseNum(opacity);
    this.styleStack.push(merged);
  }

  private popStyle(): void {
    if (this.styleStack.length > 1) this.styleStack.pop();
  }

  // ─── Transform stack ──────────────────────────────────────────

  private currentTransform(): Transform2D {
    return this.transformStack[this.transformStack.length - 1];
  }

  private pushTransform(attrs: CvgElementAttrs): void {
    const parent = this.currentTransform();
    if (attrs.transform) {
      const local = typeof attrs.transform === 'string'
        ? parseTransform(attrs.transform)
        : transformFromSpec(attrs.transform);
      this.transformStack.push(composeTransforms(parent, local));
    } else {
      this.transformStack.push(parent);
    }
  }

  private popTransform(): void {
    if (this.transformStack.length > 1) this.transformStack.pop();
  }

  /** Apply current transform then viewBox mapping to a point. */
  mapPoint(x: number, y: number): [number, number] {
    const [tx, ty] = this.currentTransform().apply(x, y);
    return this.mapping.transform.apply(tx, ty);
  }

  /** Resolve final style: element attrs override inline style override CSS class override inherited. */
  private resolveStyle(attrs: CvgElementAttrs): SvgStyle {
    const inherited = this.currentStyle();
    const style = parseStyleAttr(attrs.style);
    // CSS class/tag rules (lower priority than inline style and element attrs)
    const tag = (attrs as any)._tag ?? '';
    const css = this.getCssProps(tag, attrs.class);
    const fontSize = attrs['font-size'] ?? style['font-size'] ?? css['font-size'];
    const fontFamily = attrs['font-family'] ?? style['font-family'] ?? css['font-family'];
    const fontWeight = attrs['font-weight'] ?? style['font-weight'] ?? css['font-weight'];
    const fontStyleVal = attrs['font-style'] ?? style['font-style'] ?? css['font-style'];
    const textAnchor = attrs['text-anchor'] ?? style['text-anchor'] ?? css['text-anchor'];
    const strokeWidth = attrs['stroke-width'] ?? style['stroke-width'] ?? css['stroke-width'];
    const strokeLinecap = attrs['stroke-linecap'] ?? style['stroke-linecap'] ?? css['stroke-linecap'];
    const strokeLinejoin = attrs['stroke-linejoin'] ?? style['stroke-linejoin'] ?? css['stroke-linejoin'];
    const fillRule = attrs['fill-rule'] ?? style['fill-rule'] ?? css['fill-rule'];
    const opacity = attrs.opacity ?? style.opacity ?? css.opacity;
    const fillOpacity = attrs['fill-opacity'] ?? style['fill-opacity'] ?? css['fill-opacity'];
    const strokeOpacity = attrs['stroke-opacity'] ?? style['stroke-opacity'] ?? css['stroke-opacity'];
    // Extract filter and clip-path references
    const filterStr = attrs.filter ?? style.filter;
    const clipPathStr = attrs['clip-path'] ?? style['clip-path'];
    const filterId = filterStr ? extractUrlId(filterStr) : undefined;
    const clipPathId = clipPathStr ? extractUrlId(clipPathStr) : undefined;

    return {
      fill: attrs.fill !== undefined ? attrs.fill : (style.fill ?? css.fill ?? inherited.fill),
      stroke: attrs.stroke !== undefined ? attrs.stroke : (style.stroke ?? css.stroke ?? inherited.stroke),
      strokeWidth: strokeWidth !== undefined ? parseNum(strokeWidth) : inherited.strokeWidth,
      strokeLinecap: (strokeLinecap as any) || inherited.strokeLinecap,
      strokeLinejoin: (strokeLinejoin as any) || inherited.strokeLinejoin,
      opacity: opacity !== undefined ? parseNum(opacity) : inherited.opacity,
      fillOpacity: fillOpacity !== undefined ? parseNum(fillOpacity) : inherited.fillOpacity,
      strokeOpacity: strokeOpacity !== undefined ? parseNum(strokeOpacity) : inherited.strokeOpacity,
      fontSize: fontSize !== undefined ? parseFontSize(fontSize) : inherited.fontSize,
      fontFamily: fontFamily !== undefined ? fontFamily : inherited.fontFamily,
      fontWeight: fontWeight !== undefined ? fontWeight : inherited.fontWeight,
      fontStyle: fontStyleVal !== undefined ? fontStyleVal : inherited.fontStyle,
      textAnchor: textAnchor !== undefined ? textAnchor : inherited.textAnchor,
      fillRule: (fillRule as any) || inherited.fillRule,
      filterId,
      clipPathId,
    };
  }

  // ─── Coordinate mapping ──────────────────────────────────────

  mapX(x: number): number {
    const t = this.mapping.transform;
    return t.a * x + t.e;
  }

  mapY(y: number): number {
    const t = this.mapping.transform;
    return t.d * y + t.f;
  }

  mapLength(l: number): number {
    return l * this.mapping.scale;
  }

  /** Parse a length value, resolving percentages against the viewBox width. */
  parseLenX(v: any): number {
    if (typeof v === 'string' && v.endsWith('%')) {
      return (parseFloat(v) / 100) * this.mapping.vb.width;
    }
    return parseNum(v);
  }

  /** Parse a length value, resolving percentages against the viewBox height. */
  parseLenY(v: any): number {
    if (typeof v === 'string' && v.endsWith('%')) {
      return (parseFloat(v) / 100) * this.mapping.vb.height;
    }
    return parseNum(v);
  }

  /** Map a stroke-width value through viewBox scaling + current transform.
   *  Returns [width, opacityFactor]: sub-pixel strokes are rendered at 1px
   *  with proportionally reduced opacity (matching browser anti-aliasing). */
  private mapStrokeWidth(raw: number): [number, number] {
    const w = this.mapLength(raw) * this.currentTransform().averageScale();
    if (w < 1) return [1, w];  // e.g. 0.38px → 1px at 38% opacity
    return [w, 1];
  }

  /** Build a fillGradient object for canvasPath, converting units as needed. */
  private buildFillGradient(
    gradDef: GradientDef,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    alpha?: number,
  ): any {
    const bw = bounds.maxX - bounds.minX || 1;
    const bh = bounds.maxY - bounds.minY || 1;
    // Apply element opacity to gradient stop colors
    const stops = (alpha !== undefined && alpha < 1)
      ? gradDef.stops.map(s => ({ offset: s.offset, color: applyOpacityToColor(s.color, alpha) }))
      : gradDef.stops;

    if (gradDef.type === 'radial') {
      let cx = gradDef.cx ?? 0.5;
      let cy = gradDef.cy ?? 0.5;
      let r = gradDef.r ?? 0.5;
      let fx = gradDef.fx ?? cx;
      let fy = gradDef.fy ?? cy;
      if (gradDef.units === 'userSpaceOnUse') {
        // Pass pixel-space center + radius to preserve circular shape
        const [mcx, mcy] = this.mapPoint(cx, cy);
        const [mfx, mfy] = this.mapPoint(fx, fy);
        const rPx = this.mapLength(r) * this.currentTransform().averageScale();
        return { type: 'radial', cx: mcx, cy: mcy, rx: rPx, ry: rPx, fx: mfx, fy: mfy, pixelSpace: true, stops, spreadMethod: gradDef.spreadMethod };
      }
      // objectBoundingBox: r is same in both axes (circle in bbox space)
      return { type: 'radial', cx, cy, rx: r, ry: r, fx, fy, stops, spreadMethod: gradDef.spreadMethod };
    }

    // Linear gradient
    if (gradDef.units === 'userSpaceOnUse') {
      // Pass pixel-space endpoints directly to preserve gradient angle
      const [gx1, gy1] = this.mapPoint(gradDef.x1, gradDef.y1);
      const [gx2, gy2] = this.mapPoint(gradDef.x2, gradDef.y2);
      return {
        type: 'linear',
        x1: gx1, y1: gy1, x2: gx2, y2: gy2,
        pixelSpace: true,
        stops: gradDef.stops,
        spreadMethod: gradDef.spreadMethod,
      };
    }
    return {
      type: 'linear',
      x1: gradDef.x1, y1: gradDef.y1,
      x2: gradDef.x2, y2: gradDef.y2,
      stops: gradDef.stops,
      spreadMethod: gradDef.spreadMethod,
    };
  }

  /** Map all coordinate args in a normalized path string, applying current transform. */
  /** Re-map a normalized path using a specific transform and mapping (for resize). */
  private remapPath(pathStr: string, xform: Transform2D, mapping: ViewBoxMapping): string {
    return pathStr.replace(
      /([MLCZ])\s*([\d\s.e+-]*)/gi,
      (_, cmd: string, nums: string) => {
        if (cmd === 'Z') return 'Z';
        const values = nums.trim().split(/\s+/).map(Number);
        const mapped: number[] = [];
        for (let i = 0; i + 1 < values.length; i += 2) {
          const [tx, ty] = xform.apply(values[i], values[i + 1]);
          const [mx, my] = mapping.transform.apply(tx, ty);
          mapped.push(mx, my);
        }
        const parts = mapped.map(n => {
          const r = Math.round(n * 10000) / 10000;
          return Number.isInteger(r) ? r.toString() : r.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
        });
        return `${cmd} ${parts.join(' ')}`;
      },
    );
  }

  private mapPathCoords(pathStr: string): string {
    return pathStr.replace(
      /([MLCZ])\s*([\d\s.e+-]*)/gi,
      (_, cmd: string, nums: string) => {
        if (cmd === 'Z') return 'Z';
        const values = nums.trim().split(/\s+/).map(Number);
        const mapped: number[] = [];
        for (let i = 0; i + 1 < values.length; i += 2) {
          const [mx, my] = this.mapPoint(values[i], values[i + 1]);
          mapped.push(mx, my);
        }
        const parts = mapped.map(n => {
          const r = Math.round(n * 10000) / 10000;
          return Number.isInteger(r) ? r.toString() : r.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
        });
        return `${cmd} ${parts.join(' ')}`;
      },
    );
  }

  // ─── Event handler wiring ───────────────────────────────────

  /** Wire event handlers from attrs onto an CvgElement (consolidates all creation sites). */
  private wireEventHandlers(el: CvgElement, attrs: CvgElementAttrs): void {
    if (attrs.onClick) el.onClick(attrs.onClick);
    if (attrs.onHover) el.onHover(attrs.onHover);
    if (attrs.onDrag) el.onDrag(attrs.onDrag);
    if (attrs.onDragEnd) el.onDragEnd(attrs.onDragEnd);
    if (attrs.onScroll) el.onScroll(attrs.onScroll);
    if (attrs.onDoubleClick) el.onDoubleClick(attrs.onDoubleClick);
    if (attrs.onRightClick) el.onRightClick(attrs.onRightClick);
    if (attrs.tooltip) el.tooltip(attrs.tooltip);
    // Combine element-level when with any group-level when predicates from the whenStack
    const effectiveWhen = this.resolveWhen(attrs.when);
    if (effectiveWhen) el.when(effectiveWhen);
    if (attrs.cursor) el.cursor(attrs.cursor);
    if (attrs.bindFill) el.bindFill(attrs.bindFill);
    if (attrs.bindStroke) el.bindStroke(attrs.bindStroke);
    if (attrs.bindOpacity) el.bindOpacity(attrs.bindOpacity);
    if (attrs.bindPos) el.bindPos(attrs.bindPos);
  }

  /** Combine an element's own when predicate with any active group-level when predicates. */
  private resolveWhen(elementWhen?: () => boolean): (() => boolean) | undefined {
    if (this.whenStack.length === 0) return elementWhen;
    // Snapshot the current stack predicates (they may be popped later)
    const groupPredicates = [...this.whenStack];
    if (!elementWhen) {
      if (groupPredicates.length === 1) return groupPredicates[0];
      return () => groupPredicates.every(p => p());
    }
    return () => groupPredicates.every(p => p()) && elementWhen();
  }

  // ─── SVG Element Methods ─────────────────────────────────────

  /** Group element — pushes style, transform, and optional when predicate onto stacks, runs builder, pops all. */
  g(attrs: CvgElementAttrs, builder: () => void): void {
    this.pushStyle(attrs);
    this.pushTransform(attrs);
    if (attrs.when) this.whenStack.push(attrs.when);
    builder();
    if (attrs.when) this.whenStack.pop();
    this.popTransform();
    this.popStyle();
  }

  /** Nested <svg> element — applies viewport transform with preserveAspectRatio. */
  nestedSvg(attrs: CvgElementAttrs, children: SvgNode[], builder: () => void): void {
    const viewBoxStr = attrs.viewBox || attrs.viewbox;
    const width = parseNum(attrs.width);
    const height = parseNum(attrs.height);

    if (!viewBoxStr || !width || !height) {
      builder();
      return;
    }
    const vb = parseViewBox(viewBoxStr);
    if (!vb) { builder(); return; }

    const par = parsePreserveAspectRatio(
      attrs.preserveAspectRatio || 'xMidYMid meet',
    );

    const scaleX = width / vb.width;
    const scaleY = height / vb.height;
    const scale = par.meetOrSlice === 'slice'
      ? Math.max(scaleX, scaleY)
      : Math.min(scaleX, scaleY);

    const scaledW = vb.width * scale;
    const scaledH = vb.height * scale;
    let tx = 0, ty = 0;
    if (par.alignX === 'Mid') tx = (width - scaledW) / 2;
    else if (par.alignX === 'Max') tx = width - scaledW;
    if (par.alignY === 'Mid') ty = (height - scaledH) / 2;
    else if (par.alignY === 'Max') ty = height - scaledH;

    // Optional x/y offset of the nested viewport in parent space
    const svgX = parseNum(attrs.x ?? 0);
    const svgY = parseNum(attrs.y ?? 0);

    // PAR transform: translate(svgX+tx, svgY+ty) * scale(s) * translate(-vb.minX, -vb.minY)
    const parMatrix = AffineMatrix.translate(svgX + tx, svgY + ty)
      .multiply(AffineMatrix.scale(scale))
      .multiply(AffineMatrix.translate(-vb.minX, -vb.minY));

    if (par.meetOrSlice === 'slice') {
      // Slice mode: render into a viewport-clipped raster buffer
      this.renderSlicedNestedSvg(svgX, svgY, width, height, parMatrix, children);
      return;
    }

    // Meet mode: no clipping needed, push transform and render normally
    const parent = this.currentTransform();
    this.transformStack.push(composeTransforms(parent, parMatrix));
    builder();
    this.popTransform();
  }

  /** Render a nested SVG in slice mode as a clipped raster buffer. */
  private renderSlicedNestedSvg(
    svgX: number,
    svgY: number,
    vpWidth: number,
    vpHeight: number,
    parMatrix: AffineMatrix,
    children: SvgNode[],
  ): void {
    // Compute viewport pixel bounds using parent transform (without PAR)
    const [px0, py0] = this.mapPoint(svgX, svgY);
    const [px1, py1] = this.mapPoint(svgX + vpWidth, svgY + vpHeight);
    const bufW = Math.max(Math.round(px1 - px0), 1);
    const bufH = Math.max(Math.round(py1 - py0), 1);

    // Combined transform: parent * PAR (maps viewBox coords to root SVG coords)
    const fullXform = composeTransforms(this.currentTransform(), parMatrix);

    const pixels = new Uint8Array(bufW * bufH * 4);

    // Rasterize each child into the clipped buffer
    for (const child of children) {
      this.rasterizeNode(child, fullXform, pixels, bufW, bufH, px0, py0);
    }

    // Encode and display as canvasRaster
    const rawPixels = uint8ArrayToBase64(pixels);
    this.app.canvasRaster(
      bufW, bufH,
      undefined,
      undefined,
      { x: Math.round(px0), y: Math.round(py0), rawPixels },
    );
  }

  /** Recursively rasterize an SvgNode tree into a pixel buffer for slice clipping. */
  private rasterizeNode(
    node: SvgNode,
    xform: Transform2D,
    buf: Uint8Array,
    bufW: number,
    bufH: number,
    px0: number,
    py0: number,
  ): void {
    const attrs = node.attrs;

    // Apply any transform on this node
    let localXform = xform;
    if (attrs.transform) {
      localXform = composeTransforms(xform, parseTransform(attrs.transform));
    }

    // Resolve fill color
    const style = parseStyleAttr(attrs.style);
    const fillStr = attrs.fill ?? style.fill;
    const hasFill = fillStr !== 'none' && fillStr !== undefined;
    const fillColor = fillStr === 'none' ? undefined : (fillStr || 'black');

    switch (node.tag) {
      case 'g':
        for (const child of node.children) {
          this.rasterizeNode(child, localXform, buf, bufW, bufH, px0, py0);
        }
        break;
      case 'rect': {
        const rx = parseNum(attrs.x ?? 0);
        const ry = parseNum(attrs.y ?? 0);
        const rw = parseNum(attrs.width ?? 0);
        const rh = parseNum(attrs.height ?? 0);
        const strokeStr = attrs.stroke ?? style.stroke;
        const hasStroke = strokeStr && strokeStr !== 'none';
        if (hasStroke) {
          // Draw stroke outer rect, then inset fill for symmetry
          const sw = parseNum(attrs['stroke-width'] ?? style['stroke-width'] ?? 1);
          const [sr, sg, sb, sa] = parseColorToRGBA(normalizeColor(strokeStr));
          const half = sw / 2;
          const [stx1, sty1] = localXform.apply(rx - half, ry - half);
          const [stx2, sty2] = localXform.apply(rx + rw + half, ry + rh + half);
          const sbx1 = this.mapX(stx1) - px0;
          const sby1 = this.mapY(sty1) - py0;
          const sbx2 = this.mapX(stx2) - px0;
          const sby2 = this.mapY(sty2) - py0;
          fillRectInBuffer(buf, bufW, bufH, sbx1, sby1, sbx2 - sbx1, sby2 - sby1, sr, sg, sb, sa);
          // Fill as symmetric inset from stroke outer (avoids rounding asymmetry)
          if (fillColor) {
            const [cr, cg, cb, ca] = parseColorToRGBA(normalizeColor(fillColor));
            const pxSW = Math.max(Math.round(this.mapLength(sw) * localXform.averageScale()), 1);
            fillRectInBuffer(buf, bufW, bufH,
              sbx1 + pxSW, sby1 + pxSW,
              (sbx2 - sbx1) - 2 * pxSW, (sby2 - sby1) - 2 * pxSW,
              cr, cg, cb, ca);
          }
        } else if (fillColor) {
          const [cr, cg, cb, ca] = parseColorToRGBA(normalizeColor(fillColor));
          const [tx1, ty1] = localXform.apply(rx, ry);
          const [tx2, ty2] = localXform.apply(rx + rw, ry + rh);
          const bx1 = this.mapX(tx1) - px0;
          const by1 = this.mapY(ty1) - py0;
          const bx2 = this.mapX(tx2) - px0;
          const by2 = this.mapY(ty2) - py0;
          fillRectInBuffer(buf, bufW, bufH, bx1, by1, bx2 - bx1, by2 - by1, cr, cg, cb, ca);
        }
        break;
      }
      case 'circle': {
        if (!fillColor) break;
        const [cr, cg, cb, ca] = parseColorToRGBA(normalizeColor(fillColor));
        const cx = parseNum(attrs.cx ?? 0);
        const cy = parseNum(attrs.cy ?? 0);
        const r = parseNum(attrs.r ?? 0);
        const [tcx, tcy] = localXform.apply(cx, cy);
        const bcx = this.mapX(tcx) - px0;
        const bcy = this.mapY(tcy) - py0;
        const br = this.mapLength(r) * localXform.averageScale();
        fillCircleInBuffer(buf, bufW, bufH, bcx, bcy, br, cr, cg, cb, ca);
        break;
      }
      case 'path': {
        if (!fillColor || !attrs.d) break;
        const [cr, cg, cb, ca] = parseColorToRGBA(normalizeColor(fillColor));
        // Normalize path, then transform all coordinates to buffer space
        const nd = normalizePath(attrs.d);
        const transformed = transformPathToBuffer(nd, localXform, this, px0, py0);
        if (transformed) {
          fillPathInBuffer(buf, bufW, bufH, transformed, 0, 0, cr, cg, cb, ca);
        }
        break;
      }
      default:
        // Recurse into children of unknown elements
        for (const child of node.children) {
          this.rasterizeNode(child, localXform, buf, bufW, bufH, px0, py0);
        }
        break;
    }
  }

  /** Path element — normalizes d, maps coords, renders via canvasPath. */
  path(attrs: CvgElementAttrs): CvgElement {
    if (!attrs.d) return new CvgElement(null);
    if (attrs.transform) this.pushTransform(attrs);
    const style = this.resolveStyle(attrs);
    const normalized = normalizePath(attrs.d);
    const mapped = this.mapPathCoords(normalized);
    const bounds = computePathBounds(mapped);
    const alpha = effectiveAlpha(style);
    const gradDef = resolveGradientFill(style.fill, this);
    const fillColor = gradDef ? undefined : resolveFillColor(style.fill, this, alpha);
    let strokeColor = resolveStrokeColor(style);
    const strokeGradDef = resolveGradientStroke(style.stroke, this);
    let sw = 0;
    if (strokeColor || strokeGradDef) {
      const [w, opacity] = this.mapStrokeWidth(style.strokeWidth ?? 1);
      sw = w;
      if (strokeColor && opacity < 1) strokeColor = applyOpacityToColor(strokeColor, opacity);
    }
    const margin = Math.ceil(sw / 2) + 2;
    const width = Math.max(bounds.maxX + margin, 10);
    const height = Math.max(bounds.maxY + margin, 10);

    const opts: any = {
      path: mapped,
      width,
      height,
      fillColor,
      strokeColor,
      strokeWidth: sw,
      lineCap: style.strokeLinecap || 'butt',
      lineJoin: style.strokeLinejoin === 'miter' ? 'bevel' : (style.strokeLinejoin || 'bevel'),
      fillRule: style.fillRule || undefined,
    };
    if (gradDef) {
      opts.fillGradient = this.buildFillGradient(gradDef, bounds, alpha);
    }
    if (strokeGradDef) {
      opts.strokeGradient = this.buildFillGradient(strokeGradDef, bounds);
    }

    const underlying = this.app.canvasPath(opts);
    const pathTransform = this.currentTransform();
    if (attrs.transform) this.popTransform();
    const el = new CvgElement(underlying);
    el.setBounds(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    // Store resize callback for path-based elements (polygons, rounded rects, ellipses, etc.)
    el.setPathResize(this.mapping, (newMapping) => {
      const remapped = this.remapPath(normalized, pathTransform, newMapping);
      const newBounds = computePathBounds(remapped);
      const newMargin = Math.ceil(sw / 2) + 2;
      underlying.update({
        path: remapped,
        width: Math.max(newBounds.maxX + newMargin, 10),
        height: Math.max(newBounds.maxY + newMargin, 10),
      });
    });
    this.trackElement(el);
    this.wireEventHandlers(el, attrs);
    return el;
  }

  /** Circle element. */
  circle(attrs: CvgElementAttrs): CvgElement {
    // Under projective transforms, render as bezier path (circle → conic under perspective)
    if (this.currentTransform() instanceof ProjectiveMatrix ||
        (attrs.transform && typeof attrs.transform === 'object' && attrs.transform.cosynePerspective)) {
      const ecx = this.parseLenX(attrs.cx ?? 0);
      const ecy = this.parseLenY(attrs.cy ?? 0);
      const er = this.parseLenX(attrs.r ?? 0);
      const k = 0.5522847498;  // 4*(sqrt(2)-1)/3
      const kr = er * k;
      const d = [
        `M ${ecx + er} ${ecy}`,
        `C ${ecx + er} ${ecy - kr} ${ecx + kr} ${ecy - er} ${ecx} ${ecy - er}`,
        `C ${ecx - kr} ${ecy - er} ${ecx - er} ${ecy - kr} ${ecx - er} ${ecy}`,
        `C ${ecx - er} ${ecy + kr} ${ecx - kr} ${ecy + er} ${ecx} ${ecy + er}`,
        `C ${ecx + kr} ${ecy + er} ${ecx + er} ${ecy + kr} ${ecx + er} ${ecy}`,
        'Z',
      ].join(' ');
      return this.path({ ...attrs, d });
    }

    if (attrs.transform) this.pushTransform(attrs);
    const style = this.resolveStyle(attrs);

    // If filter or clipPath, render as raster
    if (style.filterId || style.clipPathId) {
      const ccx = this.parseLenX(attrs.cx ?? 0);
      const ccy = this.parseLenY(attrs.cy ?? 0);
      const cr = this.parseLenX(attrs.r ?? 0);
      const fillStr = resolveFillColor(style.fill, this) ?? 'black';
      const result = this.renderAsRaster(
        { x: ccx - cr, y: ccy - cr, w: cr * 2, h: cr * 2 },
        fillStr,
        style,
        (buf, bufW, bufH, offX, offY, r, g, b, a) => {
          const pxR = this.mapLength(cr) * this.currentTransform().averageScale();
          fillCircleInBuffer(buf, bufW, bufH, offX + pxR, offY + pxR, pxR, r, g, b, a);
        },
      );
      if (attrs.transform) this.popTransform();
      this.wireEventHandlers(result, attrs);
      return result;
    }

    const [cx, cy] = this.mapPoint(this.parseLenX(attrs.cx ?? 0), this.parseLenY(attrs.cy ?? 0));
    const r = this.mapLength(this.parseLenX(attrs.r ?? 0)) * this.currentTransform().averageScale();
    const alpha = effectiveAlpha(style);
    const fillColor = resolveFillColor(style.fill, this, alpha);
    let strokeColor = resolveStrokeColor(style);
    let sw = 0;
    if (strokeColor) {
      const [w, opacity] = this.mapStrokeWidth(style.strokeWidth ?? 1);
      sw = w;
      if (opacity < 1) strokeColor = applyOpacityToColor(strokeColor, opacity);
    }
    const halfSw = sw / 2;
    const underlying = this.app.canvasCircle({
      x: cx - r - halfSw,
      y: cy - r - halfSw,
      x2: cx + r + halfSw,
      y2: cy + r + halfSw,
      fillColor,
      strokeColor,
      strokeWidth: sw,
    });
    const xform = this.currentTransform();
    if (attrs.transform) this.popTransform();
    const el = new CvgElement(underlying);
    el.setBounds(cx - r, cy - r, 2 * r, 2 * r);
    el.setShapeInfo('circle', this.mapping, {
      cx: this.parseLenX(attrs.cx ?? 0),
      cy: this.parseLenY(attrs.cy ?? 0),
      r: this.parseLenX(attrs.r ?? 0),
    }, xform);
    this.trackElement(el);
    this.wireEventHandlers(el, attrs);
    return el;
  }

  /** Ellipse element — renders as a path for full stroke/fill support. */
  ellipse(attrs: CvgElementAttrs): CvgElement {
    // Approximate ellipse as cubic Bezier path (4 arcs)
    const ecx = this.parseLenX(attrs.cx ?? 0);
    const ecy = this.parseLenY(attrs.cy ?? 0);
    const erx = this.parseLenX(attrs.rx ?? 0);
    const ery = this.parseLenY(attrs.ry ?? 0);
    // kappa = 4*(sqrt(2)-1)/3 ≈ 0.5522847498
    const k = 0.5522847498;
    const kx = erx * k;
    const ky = ery * k;
    const d = [
      `M ${ecx + erx} ${ecy}`,
      `C ${ecx + erx} ${ecy - ky} ${ecx + kx} ${ecy - ery} ${ecx} ${ecy - ery}`,
      `C ${ecx - kx} ${ecy - ery} ${ecx - erx} ${ecy - ky} ${ecx - erx} ${ecy}`,
      `C ${ecx - erx} ${ecy + ky} ${ecx - kx} ${ecy + ery} ${ecx} ${ecy + ery}`,
      `C ${ecx + kx} ${ecy + ery} ${ecx + erx} ${ecy + ky} ${ecx + erx} ${ecy}`,
      'Z',
    ].join(' ');
    return this.path({ ...attrs, d });
  }

  /** Rect element. */
  rect(attrs: CvgElementAttrs): CvgElement {
    if (attrs.transform) this.pushTransform(attrs);
    const style = this.resolveStyle(attrs);

    // If filter or clipPath, render as raster
    if (style.filterId || style.clipPathId) {
      const px = this.parseLenX(attrs.x ?? 0);
      const py = this.parseLenY(attrs.y ?? 0);
      const pw = this.parseLenX(attrs.width ?? 0);
      const ph = this.parseLenY(attrs.height ?? 0);
      const fillStr = resolveFillColor(style.fill, this) ?? 'black';
      const result = this.renderAsRaster(
        { x: px, y: py, w: pw, h: ph },
        fillStr,
        style,
        (buf, bufW, bufH, offX, offY, r, g, b, a) => {
          const pxW = this.mapLength(pw) * this.currentTransform().averageScale();
          const pxH = this.mapLength(ph) * this.currentTransform().averageScale();
          fillRectInBuffer(buf, bufW, bufH, offX, offY, pxW, pxH, r, g, b, a);
        },
      );
      if (attrs.transform) this.popTransform();
      this.wireEventHandlers(result, attrs);
      return result;
    }

    const gradDef = resolveGradientFill(style.fill, this);

    // Check if current transform includes rotation/skew/perspective
    const t = this.currentTransform();
    const isPerspective = t instanceof ProjectiveMatrix;
    const hasRotation = isPerspective || Math.abs(t.b) > 1e-6 || Math.abs(t.c) > 1e-6;

    // Rounded corners
    const hasRoundedCorners = parseNum(attrs.rx ?? 0) > 0 || parseNum(attrs.ry ?? 0) > 0;

    // If gradient fill, rotation, or rounded corners, render as path
    if (gradDef || hasRotation || hasRoundedCorners) {
      const px = this.parseLenX(attrs.x ?? 0);
      const py = this.parseLenY(attrs.y ?? 0);
      const pw = this.parseLenX(attrs.width ?? 0);
      const ph = this.parseLenY(attrs.height ?? 0);
      const crx = Math.min(this.parseLenX(attrs.rx ?? 0), pw / 2);
      const cry = Math.min(this.parseLenY(attrs.ry ?? 0), ph / 2);
      let rectPath: string;
      if (crx > 0 || cry > 0) {
        // Rounded rect — use arc commands for corners
        const cx = crx || cry;
        const cy = cry || crx;
        rectPath = [
          `M ${px + cx} ${py}`,
          `L ${px + pw - cx} ${py}`,
          `A ${cx} ${cy} 0 0 1 ${px + pw} ${py + cy}`,
          `L ${px + pw} ${py + ph - cy}`,
          `A ${cx} ${cy} 0 0 1 ${px + pw - cx} ${py + ph}`,
          `L ${px + cx} ${py + ph}`,
          `A ${cx} ${cy} 0 0 1 ${px} ${py + ph - cy}`,
          `L ${px} ${py + cy}`,
          `A ${cx} ${cy} 0 0 1 ${px + cx} ${py}`,
          'Z',
        ].join(' ');
      } else {
        rectPath = `M ${px} ${py} L ${px + pw} ${py} L ${px + pw} ${py + ph} L ${px} ${py + ph} Z`;
      }
      // Strip transform since rect() already pushed it — avoid double application
      const result = this.path({ ...attrs, transform: undefined, d: rectPath, fill: style.fill });
      if (attrs.transform) this.popTransform();
      return result;
    }

    const px = this.parseLenX(attrs.x ?? 0);
    const py = this.parseLenY(attrs.y ?? 0);
    const pw = this.parseLenX(attrs.width ?? 0);
    const ph = this.parseLenY(attrs.height ?? 0);
    // Transform all four corners and compute axis-aligned bounding box
    const [x1, y1] = this.mapPoint(px, py);
    const [x2, y2] = this.mapPoint(px + pw, py);
    const [x3, y3] = this.mapPoint(px + pw, py + ph);
    const [x4, y4] = this.mapPoint(px, py + ph);
    const minX = Math.min(x1, x2, x3, x4);
    const minY = Math.min(y1, y2, y3, y4);
    const maxX = Math.max(x1, x2, x3, x4);
    const maxY = Math.max(y1, y2, y3, y4);
    const fillColor = resolveFillColor(style.fill, this, effectiveAlpha(style));
    let strokeColor = resolveStrokeColor(style);
    let sw = 0;
    if (strokeColor) {
      const [w, opacity] = this.mapStrokeWidth(style.strokeWidth ?? 1);
      sw = w;
      if (opacity < 1) strokeColor = applyOpacityToColor(strokeColor, opacity);
    }
    // SVG strokes are centered on the boundary — expand by half stroke width
    // so the outer portion remains visible when a fill rect is layered on top
    const halfSw = sw / 2;

    const underlying = this.app.canvasRectangle({
      x: minX - halfSw,
      y: minY - halfSw,
      x2: maxX + halfSw,
      y2: maxY + halfSw,
      fillColor,
      strokeColor,
      strokeWidth: sw,
    });
    const xform = this.currentTransform();
    if (attrs.transform) this.popTransform();
    const el = new CvgElement(underlying);
    el.setBounds(minX, minY, maxX - minX, maxY - minY);
    el.setShapeInfo('rect', this.mapping, {
      x: px,
      y: py,
      width: pw,
      height: ph,
    }, xform);
    this.trackElement(el);
    this.wireEventHandlers(el, attrs);
    return el;
  }

  /** Line element. */
  line(attrs: CvgElementAttrs): CvgElement {
    if (attrs.transform) this.pushTransform(attrs);
    const [x1, y1] = this.mapPoint(parseNum(attrs.x1 ?? 0), parseNum(attrs.y1 ?? 0));
    const [x2, y2] = this.mapPoint(parseNum(attrs.x2 ?? 0), parseNum(attrs.y2 ?? 0));
    const style = this.resolveStyle(attrs);

    let lineStroke = resolveStrokeColor(style) || 'black';
    const [lineSw, lineSwOp] = this.mapStrokeWidth(style.strokeWidth ?? 1);
    if (lineSwOp < 1) lineStroke = applyOpacityToColor(lineStroke, lineSwOp);
    const underlying = this.app.canvasLine(x1, y1, x2, y2, {
      strokeColor: lineStroke,
      strokeWidth: lineSw,
    });
    const xform = this.currentTransform();
    if (attrs.transform) this.popTransform();
    const el = new CvgElement(underlying);
    const minX = Math.min(x1, x2), minY = Math.min(y1, y2);
    el.setBounds(minX, minY, Math.abs(x2 - x1), Math.abs(y2 - y1));
    el.setShapeInfo('line', this.mapping, {
      x1: parseNum(attrs.x1 ?? 0),
      y1: parseNum(attrs.y1 ?? 0),
      x2: parseNum(attrs.x2 ?? 0),
      y2: parseNum(attrs.y2 ?? 0),
    }, xform);
    this.trackElement(el);
    this.wireEventHandlers(el, attrs);
    return el;
  }

  /** Polyline element — convert points to a path. */
  polyline(attrs: CvgElementAttrs): CvgElement {
    if (!attrs.points) return new CvgElement(null);
    const pts = typeof attrs.points === 'string'
      ? attrs.points
      : attrs.points.map(([x, y]) => `${x},${y}`).join(' ');
    const d = pointsToPath(pts, false);
    // path() handles transform push/pop itself, pass attrs through
    return this.path({ ...attrs, d });
  }

  /** Polygon element — convert points to a closed path. */
  polygon(attrs: CvgElementAttrs): CvgElement {
    if (!attrs.points) return new CvgElement(null);
    const pts = typeof attrs.points === 'string'
      ? attrs.points
      : attrs.points.map(([x, y]) => `${x},${y}`).join(' ');
    const d = pointsToPath(pts, true);
    return this.path({ ...attrs, d });
  }

  /** Desc element — ignored (metadata only). */
  desc(_attrs?: CvgElementAttrs): void {}

  /** Defs element — run the builder so child elements (gradients, etc.) are registered. */
  defs(_attrs?: CvgElementAttrs, builder?: () => void): void {
    if (builder) builder();
  }

  /** Register a gradient definition for url(#id) resolution. */
  registerGradient(id: string, def: GradientDef): void {
    this.gradients.set(id, def);
  }

  /** Look up a registered gradient by id. */
  getGradient(id: string): GradientDef | undefined {
    return this.gradients.get(id);
  }

  /** Register a filter definition. */
  registerFilter(id: string, def: FilterDef): void {
    this.filters.set(id, def);
  }

  /** Look up a registered filter by id. */
  getFilter(id: string): FilterDef | undefined {
    return this.filters.get(id);
  }

  /** Register a clipPath definition. */
  registerClipPath(id: string, def: ClipPathDef): void {
    this.clipPaths.set(id, def);
  }

  /** Look up a registered clipPath by id. */
  getClipPath(id: string): ClipPathDef | undefined {
    return this.clipPaths.get(id);
  }

  /** Parse a <filter> node and register it. */
  filter(node: SvgNode): void {
    const id = node.attrs.id;
    if (!id) return;
    const def: FilterDef = {
      id,
      regionX: parseFilterRegion(node.attrs.x, -0.1),
      regionY: parseFilterRegion(node.attrs.y, -0.1),
      regionWidth: parseFilterRegion(node.attrs.width, 1.2),
      regionHeight: parseFilterRegion(node.attrs.height, 1.2),
    };
    // Find feGaussianBlur child
    for (const child of node.children) {
      if (child.tag === 'feGaussianBlur' && child.attrs.stdDeviation) {
        const parts = child.attrs.stdDeviation.trim().split(/\s+/);
        const sx = parseNum(parts[0]);
        const sy = parts.length > 1 ? parseNum(parts[1]) : sx;
        def.blur = { stdDeviationX: sx, stdDeviationY: sy };
        break;
      }
    }
    this.registerFilter(id, def);
  }

  /** Parse a <clipPath> node and register it. */
  clipPath(node: SvgNode): void {
    const id = node.attrs.id;
    if (!id) return;
    const shapes: ClipPathShape[] = [];
    for (const child of node.children) {
      if (child.tag === 'rect') {
        shapes.push({
          type: 'rect',
          x: parseNum(child.attrs.x ?? 0),
          y: parseNum(child.attrs.y ?? 0),
          width: parseNum(child.attrs.width ?? 0),
          height: parseNum(child.attrs.height ?? 0),
        });
      } else if (child.tag === 'circle') {
        shapes.push({
          type: 'circle',
          cx: parseNum(child.attrs.cx ?? 0),
          cy: parseNum(child.attrs.cy ?? 0),
          r: parseNum(child.attrs.r ?? 0),
        });
      }
    }
    this.registerClipPath(id, { id, shapes });
  }

  /**
   * Pre-render an element as a raster image (for filter/clipPath support).
   * Returns an CvgElement wrapping the created canvasRaster.
   */
  renderAsRaster(
    elemBounds: { x: number; y: number; w: number; h: number },
    fillColor: string,
    style: SvgStyle,
    shapeFiller: (buf: Uint8Array, bufW: number, bufH: number, offX: number, offY: number, r: number, g: number, b: number, a: number) => void,
  ): CvgElement {
    const filterDef = style.filterId ? this.getFilter(style.filterId) : undefined;
    const clipDef = style.clipPathId ? this.getClipPath(style.clipPathId) : undefined;

    // Compute blur radius in SVG units
    let blurSigmaX = 0, blurSigmaY = 0;
    if (filterDef?.blur) {
      blurSigmaX = filterDef.blur.stdDeviationX;
      blurSigmaY = filterDef.blur.stdDeviationY;
    }
    const blurRadiusX = Math.ceil(3 * blurSigmaX);
    const blurRadiusY = Math.ceil(3 * blurSigmaY);

    // Expand bounds by filter region and blur radius (in SVG coordinates)
    let expandX = blurRadiusX;
    let expandY = blurRadiusY;
    if (filterDef) {
      // Filter region can extend beyond element bounds
      expandX = Math.max(expandX, Math.ceil(Math.abs(filterDef.regionX) * elemBounds.w));
      expandY = Math.max(expandY, Math.ceil(Math.abs(filterDef.regionY) * elemBounds.h));
    }

    // Buffer bounds in SVG space
    const svgBufX = elemBounds.x - expandX;
    const svgBufY = elemBounds.y - expandY;
    const svgBufW = elemBounds.w + expandX * 2;
    const svgBufH = elemBounds.h + expandY * 2;

    // Map to pixel space
    const [pxBufX, pxBufY] = this.mapPoint(svgBufX, svgBufY);
    const [pxBufX2, pxBufY2] = this.mapPoint(svgBufX + svgBufW, svgBufY + svgBufH);
    const bufW = Math.max(Math.round(pxBufX2 - pxBufX), 1);
    const bufH = Math.max(Math.round(pxBufY2 - pxBufY), 1);

    // Allocate RGBA buffer (transparent black)
    const pixels = new Uint8Array(bufW * bufH * 4);

    // Parse fill color
    const [cr, cg, cb, ca] = parseColorToRGBA(fillColor);
    const alpha = effectiveAlpha(style);
    const finalA = alpha !== undefined ? Math.round(ca * alpha) : ca;

    // Fill shape into buffer at correct offset
    // The shape filler works in pixel space, offset from the buffer origin
    const [pxElemX, pxElemY] = this.mapPoint(elemBounds.x, elemBounds.y);
    const offX = pxElemX - pxBufX;
    const offY = pxElemY - pxBufY;
    shapeFiller(pixels, bufW, bufH, offX, offY, cr, cg, cb, finalA);

    // Apply blur
    if (blurSigmaX > 0 || blurSigmaY > 0) {
      // Scale sigma from SVG units to pixel units
      const pxSigmaX = this.mapLength(blurSigmaX) * this.currentTransform().averageScale();
      const pxSigmaY = this.mapLength(blurSigmaY) * this.currentTransform().averageScale();
      gaussianBlur(pixels, bufW, bufH, pxSigmaX, pxSigmaY);
    }

    // Crop to filter region (SVG spec: filter output is clipped to the filter region)
    // Instead of hard-clipping alpha, crop the buffer to the filter region extent.
    // This gives a natural blur falloff at the boundary (matching librsvg behavior).
    let outPixels = pixels;
    let outW = bufW;
    let outH = bufH;
    let outPxX = pxBufX;
    let outPxY = pxBufY;
    if (filterDef) {
      const frSvgX = elemBounds.x + filterDef.regionX * elemBounds.w;
      const frSvgY = elemBounds.y + filterDef.regionY * elemBounds.h;
      const frSvgW = filterDef.regionWidth * elemBounds.w;
      const frSvgH = filterDef.regionHeight * elemBounds.h;
      const [frPxX, frPxY] = this.mapPoint(frSvgX, frSvgY);
      const [frPxX2, frPxY2] = this.mapPoint(frSvgX + frSvgW, frSvgY + frSvgH);
      const cropX0 = Math.max(Math.round(frPxX - pxBufX), 0);
      const cropY0 = Math.max(Math.round(frPxY - pxBufY), 0);
      const cropX1 = Math.min(Math.round(frPxX2 - pxBufX), bufW);
      const cropY1 = Math.min(Math.round(frPxY2 - pxBufY), bufH);
      const cropW = Math.max(cropX1 - cropX0, 1);
      const cropH = Math.max(cropY1 - cropY0, 1);
      const cropped = new Uint8Array(cropW * cropH * 4);
      for (let y = 0; y < cropH; y++) {
        const srcOff = ((cropY0 + y) * bufW + cropX0) * 4;
        const dstOff = y * cropW * 4;
        cropped.set(pixels.subarray(srcOff, srcOff + cropW * 4), dstOff);
      }
      outPixels = cropped;
      outW = cropW;
      outH = cropH;
      outPxX = pxBufX + cropX0;
      outPxY = pxBufY + cropY0;
    }

    // Apply clip mask
    if (clipDef) {
      const mask = new Uint8Array(outW * outH * 4);
      for (const shape of clipDef.shapes) {
        if (shape.type === 'rect') {
          const [rx, ry] = this.mapPoint(shape.x ?? 0, shape.y ?? 0);
          const rw = this.mapLength(shape.width ?? 0) * this.currentTransform().averageScale();
          const rh = this.mapLength(shape.height ?? 0) * this.currentTransform().averageScale();
          fillRectInBuffer(mask, outW, outH, rx - outPxX, ry - outPxY, rw, rh, 255, 255, 255, 255);
        } else if (shape.type === 'circle') {
          const [ccx, ccy] = this.mapPoint(shape.cx ?? 0, shape.cy ?? 0);
          const cr2 = this.mapLength(shape.r ?? 0) * this.currentTransform().averageScale();
          fillCircleInBuffer(mask, outW, outH, ccx - outPxX, ccy - outPxY, cr2, 255, 255, 255, 255);
        }
      }
      applyClipMask(outPixels, mask, outW * outH);
    }

    // Encode as base64
    const rawPixels = uint8ArrayToBase64(outPixels);

    // Create canvasRaster at the correct position
    const underlying = this.app.canvasRaster(
      outW, outH,
      undefined, // no pixel tuples
      undefined, // no blend mode
      { x: Math.round(outPxX), y: Math.round(outPxY), rawPixels },
    );
    return new CvgElement(underlying);
  }

  /** Parse a linearGradient or radialGradient node and register its stops + geometry. */
  linearGradient(node: SvgNode): void {
    const id = node.attrs.id;
    if (!id) return;

    // Parse own stops
    let stops = node.children
      .filter(c => c.tag === 'stop')
      .map(c => {
        const style = parseStyleAttr(c.attrs.style);
        const color = c.attrs['stop-color'] ?? style['stop-color'] ?? 'black';
        const opacity = parseFloat(c.attrs['stop-opacity'] ?? style['stop-opacity'] ?? '1');
        const offsetStr = c.attrs.offset ?? '0';
        const offset = offsetStr.endsWith('%')
          ? parseFloat(offsetStr) / 100
          : parseFloat(offsetStr);
        // Apply stop-opacity by converting to rgba
        const finalColor = (!isNaN(opacity) && opacity < 1)
          ? applyOpacityToColor(color, opacity)
          : color;
        return { offset: isNaN(offset) ? 0 : offset, color: finalColor };
      });

    // xlink:href inheritance — inherit stops and geometry from referenced gradient
    const href = node.attrs['xlink:href'] ?? node.attrs.href;
    const refId = href?.replace(/^#/, '');
    let ref = refId ? this.getGradient(refId) : undefined;
    // Forward reference: referenced gradient not yet registered — process it now
    if (!ref && refId) {
      const refNode = this.nodesById.get(refId);
      if (refNode && (refNode.tag === 'linearGradient' || refNode.tag === 'radialGradient')) {
        this.linearGradient(refNode);
        ref = this.getGradient(refId);
      }
    }
    if (stops.length === 0 && ref) {
      stops = ref.stops;
    }

    const type = node.tag === 'radialGradient' ? 'radial' : 'linear';
    const units = (node.attrs.gradientUnits ?? ref?.units) as GradientDef['units'];
    const spreadMethod = (node.attrs.spreadMethod ?? ref?.spreadMethod) as GradientDef['spreadMethod'];

    if (type === 'radial') {
      // Radial gradient: cx, cy, r (default 0.5 in objectBoundingBox)
      const pctOrNum = (v: string | undefined, fallback: number) => {
        if (v === undefined) return fallback;
        if (v.endsWith('%')) return parseFloat(v) / 100;
        return parseNum(v);
      };
      let cx = node.attrs.cx !== undefined ? pctOrNum(node.attrs.cx, 0.5) : ref?.cx ?? 0.5;
      let cy = node.attrs.cy !== undefined ? pctOrNum(node.attrs.cy, 0.5) : ref?.cy ?? 0.5;
      let r = node.attrs.r !== undefined ? pctOrNum(node.attrs.r, 0.5) : ref?.r ?? 0.5;
      // Focal point defaults to (cx, cy) when not specified
      let fx = node.attrs.fx !== undefined ? pctOrNum(node.attrs.fx, cx) : ref?.fx ?? cx;
      let fy = node.attrs.fy !== undefined ? pctOrNum(node.attrs.fy, cy) : ref?.fy ?? cy;
      if (node.attrs.gradientTransform) {
        const m = parseTransform(node.attrs.gradientTransform);
        [cx, cy] = m.apply(cx, cy);
        [fx, fy] = m.apply(fx, fy);
        // Scale radius by average scale of transform
        r *= m.averageScale();
      }
      this.registerGradient(id, { type, stops, x1: 0, y1: 0, x2: 0, y2: 0, cx, cy, r, fx, fy, units, spreadMethod });
    } else {
      // Linear gradient: x1, y1, x2, y2
      let x1 = node.attrs.x1 !== undefined ? parseNum(node.attrs.x1) : ref?.x1 ?? 0;
      let y1 = node.attrs.y1 !== undefined ? parseNum(node.attrs.y1) : ref?.y1 ?? 0;
      let x2 = node.attrs.x2 !== undefined ? parseNum(node.attrs.x2) : ref?.x2 ?? 1;
      let y2 = node.attrs.y2 !== undefined ? parseNum(node.attrs.y2) : ref?.y2 ?? 0;
      // Handle percentage values (e.g. "0%", "100%")
      if (typeof node.attrs.x1 === 'string' && node.attrs.x1.endsWith('%')) x1 = parseFloat(node.attrs.x1) / 100;
      if (typeof node.attrs.y1 === 'string' && node.attrs.y1.endsWith('%')) y1 = parseFloat(node.attrs.y1) / 100;
      if (typeof node.attrs.x2 === 'string' && node.attrs.x2.endsWith('%')) x2 = parseFloat(node.attrs.x2) / 100;
      if (typeof node.attrs.y2 === 'string' && node.attrs.y2.endsWith('%')) y2 = parseFloat(node.attrs.y2) / 100;
      if (node.attrs.gradientTransform) {
        const m = parseTransform(node.attrs.gradientTransform);
        [x1, y1] = m.apply(x1, y1);
        [x2, y2] = m.apply(x2, y2);
      }
      this.registerGradient(id, { type, stops, x1, y1, x2, y2, units, spreadMethod });
    }
  }

  /** Text element — renders text using canvasText. Supports tspan children for multi-line. */
  text(attrs: CvgElementAttrs, content?: string, tspans?: SvgNode[]): CvgElement {
    if (attrs.transform) this.pushTransform(attrs);
    const style = this.resolveStyle(attrs);

    // Scale font size through viewBox mapping + current transform
    const baseFontSize = style.fontSize ?? 16;
    const tScale = this.currentTransform().averageScale();
    const textSize = this.mapLength(baseFontSize) * tScale;

    // Map text-anchor → alignment
    let alignment: 'leading' | 'center' | 'trailing' = 'leading';
    if (style.textAnchor === 'middle') alignment = 'center';
    else if (style.textAnchor === 'end') alignment = 'trailing';

    // Detect font styles
    const bold = style.fontWeight !== undefined &&
      (/bold/i.test(style.fontWeight) || parseFloat(style.fontWeight) >= 600);
    const italic = style.fontStyle !== undefined &&
      /^(italic|oblique)/i.test(style.fontStyle);
    const monospace = style.fontFamily !== undefined &&
      /mono|courier|consolas/i.test(style.fontFamily);

    const fillColor = resolveFillColor(style.fill, this, effectiveAlpha(style));
    // If this text element has its own stroke but no explicit fill, use stroke color
    // (we can't render actual text stroke, so this is the best approximation)
    const inlineS = attrs.style ? parseStyleAttr(attrs.style) : undefined;
    const hasOwnStroke = attrs.stroke !== undefined ||
      (inlineS !== undefined && inlineS.stroke !== undefined);
    const hasOwnFill = attrs.fill !== undefined ||
      (inlineS !== undefined && inlineS.fill !== undefined);
    const strokeColor = hasOwnStroke && style.stroke && style.stroke !== 'none'
      ? normalizeColor(style.stroke) : undefined;
    const color = (!hasOwnFill && strokeColor) ? strokeColor : (fillColor ?? 'black');

    // Baseline correction: SVG y is baseline; Fyne positions from top-left.
    const baselineOffset = textSize * 1.07;

    // Handle tspan children for multi-line text
    if (tspans && tspans.length > 0) {
      const baseX = parseNum(attrs.x ?? 0);
      const baseY = parseNum(attrs.y ?? 0);
      let curX = baseX;
      let curY = baseY;
      let lastUnderlying: any = null;

      for (const tspan of tspans) {
        if (!tspan.text) continue;
        // tspan x resets horizontal position
        if (tspan.attrs.x !== undefined) curX = parseNum(tspan.attrs.x);
        // tspan dx adds horizontal offset
        if (tspan.attrs.dx !== undefined) curX += parseDyEm(tspan.attrs.dx, baseFontSize);
        // tspan dy adds vertical offset
        if (tspan.attrs.dy !== undefined) curY += parseDyEm(tspan.attrs.dy, baseFontSize);

        const [mx, my] = this.mapPoint(curX, curY);
        lastUnderlying = this.app.canvasText(tspan.text, {
          x: mx,
          y: my - baselineOffset,
          color,
          textSize,
          bold,
          italic,
          monospace,
          alignment,
        });
      }
      if (attrs.transform) this.popTransform();
      const el = new CvgElement(lastUnderlying);
      this.trackElement(el);
      this.wireEventHandlers(el, attrs);
      return el;
    }

    // Simple text (no tspans)
    if (!content) {
      if (attrs.transform) this.popTransform();
      return new CvgElement(null);
    }

    const x = parseNum(attrs.x ?? 0);
    const y = parseNum(attrs.y ?? 0);
    const [mx, my] = this.mapPoint(x, y);

    const underlying = this.app.canvasText(content, {
      x: mx,
      y: my - baselineOffset,
      color,
      textSize,
      bold,
      italic,
      monospace,
      alignment,
    });
    if (attrs.transform) this.popTransform();
    const el = new CvgElement(underlying);
    // Estimate text bounds for hit testing (char width ≈ 0.6 × textSize)
    const estW = content.length * textSize * 0.6;
    const estH = textSize;
    let bx = mx;
    if (alignment === 'center') bx -= estW / 2;
    else if (alignment === 'trailing') bx -= estW;
    el.setBounds(bx, my - estH, estW, estH);
    this.trackElement(el);
    this.wireEventHandlers(el, attrs);
    return el;
  }

  /** Use element — clone and render a referenced element with optional transform. */
  use(attrs: CvgElementAttrs): void {
    const href = attrs['xlink:href'] ?? attrs.href;
    if (!href) return;
    const refId = href.replace(/^#/, '');
    const refNode = this.nodesById.get(refId);
    if (!refNode || !this.walkNodeFn) return;
    this.pushStyle(attrs);
    // SVG <use x="..." y="..."> creates an implicit translate(x, y)
    const ux = parseNum(attrs.x ?? 0);
    const uy = parseNum(attrs.y ?? 0);
    let combinedTransform = attrs.transform ?? '';
    if (ux !== 0 || uy !== 0) {
      combinedTransform = `translate(${ux},${uy}) ${combinedTransform}`;
    }
    this.pushTransform({ ...attrs, transform: combinedTransform || undefined });
    this.walkNodeFn(this, refNode);
    this.popTransform();
    this.popStyle();
  }

  // ─── Fluent PathBuilder ──────────────────────────────────────

  /**
   * Start building a path fluently.
   *
   * ```ts
   * s.pathBuilder()
   *   .moveTo(50, 30)
   *   .cubicTo(59, 8, 92, 6, 98, 30)
   *   .close()
   *   .fill('#F00');
   * ```
   */
  pathBuilder(): PathBuilder {
    return new PathBuilder(this);
  }

  /** Internal: render a PathBuilder's accumulated commands. */
  _renderPath(
    commands: string,
    style: { fill?: string; stroke?: string; strokeWidth?: number },
  ): any {
    const mapped = this.mapPathCoords(commands);
    const bounds = computePathBounds(mapped);
    let strokeColor = style.stroke && style.stroke !== 'none' ? style.stroke : undefined;
    const [sw, swOp] = this.mapStrokeWidth(style.strokeWidth ?? 1);
    if (strokeColor && swOp < 1) strokeColor = applyOpacityToColor(strokeColor, swOp);
    const margin = Math.ceil(sw / 2) + 2;
    const width = Math.max(bounds.maxX + margin, 10);
    const height = Math.max(bounds.maxY + margin, 10);

    return this.app.canvasPath({
      path: mapped,
      width,
      height,
      fillColor: resolveFillColor(style.fill, this, effectiveAlpha(style)),
      strokeColor,
      strokeWidth: sw,
      lineCap: 'butt',
      lineJoin: 'bevel',
    });
  }
}

/**
 * Fluent path builder — moveTo/lineTo/cubicTo/arc/close/fill/stroke.
 */
export class PathBuilder {
  private ctx: CvgContext;
  private parts: string[] = [];
  private cx = 0;
  private cy = 0;
  private _fill?: string;
  private _stroke?: string;
  private _strokeWidth?: number;

  constructor(ctx: CvgContext) {
    this.ctx = ctx;
  }

  moveTo(x: number, y: number): this {
    this.parts.push(`M ${x} ${y}`);
    this.cx = x; this.cy = y;
    return this;
  }

  lineTo(x: number, y: number): this {
    this.parts.push(`L ${x} ${y}`);
    this.cx = x; this.cy = y;
    return this;
  }

  cubicTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): this {
    this.parts.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y}`);
    this.cx = x; this.cy = y;
    return this;
  }

  /** Arc — converted to cubic bezier(s) via the normalizer. */
  arc(rx: number, ry: number, xRotation: number, largeArc: 0 | 1, sweep: 0 | 1, x: number, y: number): this {
    const tempPath = `M ${this.cx} ${this.cy} A ${rx} ${ry} ${xRotation} ${largeArc} ${sweep} ${x} ${y}`;
    const normalized = normalizePath(tempPath);
    const withoutM = normalized.replace(/^M\s+[\d.e+-]+\s+[\d.e+-]+\s*/, '');
    if (withoutM) this.parts.push(withoutM);
    this.cx = x; this.cy = y;
    return this;
  }

  /** Quadratic bezier — promoted to cubic via the normalizer. */
  quadraticTo(cpx: number, cpy: number, x: number, y: number): this {
    const tempPath = `M ${this.cx} ${this.cy} Q ${cpx} ${cpy} ${x} ${y}`;
    const normalized = normalizePath(tempPath);
    const withoutM = normalized.replace(/^M\s+[\d.e+-]+\s+[\d.e+-]+\s*/, '');
    if (withoutM) this.parts.push(withoutM);
    this.cx = x; this.cy = y;
    return this;
  }

  close(): this {
    this.parts.push('Z');
    return this;
  }

  /** Set fill color and render. */
  fill(color: string): this {
    this._fill = color;
    this._render();
    return this;
  }

  /** Set stroke and render. */
  stroke(color: string, width: number = 1): this {
    this._stroke = color;
    this._strokeWidth = width;
    this._render();
    return this;
  }

  private _render(): any {
    const d = this.parts.join(' ');
    return this.ctx._renderPath(d, {
      fill: this._fill,
      stroke: this._stroke,
      strokeWidth: this._strokeWidth,
    });
  }
}

// ─── Barrel re-exports ──────────────────────────────────────────
// Existing `import { ... } from './grammar'` statements continue to work.
export * from './grammar-types';
export * from './grammar-utils';
export { CvgBuilder, cvgBuilder, cvg, createCvgContext } from './grammar-factories';
