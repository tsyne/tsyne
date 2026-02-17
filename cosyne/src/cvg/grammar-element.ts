/**
 * CVG Grammar — CvgElement class.
 *
 * Wrapper returned by element methods — allows fluent .fill() / .stroke() chaining,
 * event handling, property bindings, and animations.
 *
 * Extracted from grammar.ts for manageability.
 */

import { type ViewBoxMapping, type AnimationOptions, AnimationHandle, type EasingFn, Easing, SVG_GEOM_KEYS, lerpColor, lerp, resolveEasing } from './grammar-types';
import { AffineMatrix, type Transform2D } from './transform';

// Forward-declare CvgContext to avoid circular imports at runtime.
// The actual class is in grammar-context.ts; we only need the type for
// CvgElement.setContext / getContext / addAnimation.
import type { CvgContext } from './grammar-context';

/** @internal Tracked binding region for bindTo(). */
export interface BindingRegion<T = any> {
  items: () => T[];
  render: (item: T, index: number) => CvgElement | CvgElement[];
  trackBy: (item: T) => string | number;
  update?: (item: T, elements: CvgElement[]) => void;
  /** Map from trackBy key → { item, elements } for current items */
  current: Map<string | number, { item: T; elements: CvgElement[] }>;
}

/** @internal Active animation state tracked by the animation manager. */
export interface ActiveAnimation {
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
