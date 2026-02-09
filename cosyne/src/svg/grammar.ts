/**
 * SVG Grammar for Cosyne
 *
 * Provides an SvgContext that mirrors SVG element names (path, circle, g, etc.)
 * and a fluent PathBuilder for programmatic path construction.
 *
 * This is a separate branch of the Tsyne widget tree — it calls app.canvasPath(),
 * app.canvasCircle() etc. directly rather than going through CosyneContext.
 *
 * Two entry points:
 *
 * 1. Standalone `svg()` factory:
 *    svg(app, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
 *      s.path({ d: '...', fill: '#F00' });
 *    });
 *
 * 2. Builder-style `svgBuilder(app)`:
 *    const s = svgBuilder(app);
 *    s.svg({ viewBox: "0 0 100 100" }, () => {
 *      s.path({ d: "...", fill: "#069" });
 *      s.circle({ r: 15, cx: 50, cy: 18 }).fill("#900");
 *    });
 */

import { SvgNode, SvgStyle, SvgOptions, SvgElementAttrs, ViewBox } from './types';
import { normalizePath } from './normalizer';
import { parseViewBox } from './parser';
import { AffineMatrix, parseTransform } from './transform';

/** Gradient definition — stores stop colors and geometry for url(#id) resolution. */
export interface GradientDef {
  type: 'linear' | 'radial';
  stops: { offset: number; color: string }[];
  x1: number; y1: number; x2: number; y2: number;  // gradient line (bbox-relative 0-1)
}

/** Resolved viewBox mapping for coordinate transforms */
interface ViewBoxMapping {
  vb: ViewBox;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Wrapper returned by element methods — allows fluent .fill() / .stroke() chaining.
 *
 * ```ts
 * s.circle({ r: 15, cx: 50, cy: 18 }).fill("#900");
 * s.path({ d: "M10,10 L90,90" }).stroke("#000", 2);
 * ```
 */
export class SvgElement {
  private underlying: any;

  constructor(underlying: any) {
    this.underlying = underlying;
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

  /** Get the underlying Tsyne widget. */
  getUnderlying(): any {
    return this.underlying;
  }
}

/**
 * SVG rendering context. Mirrors SVG element names for a familiar API.
 *
 * Element methods return SvgElement wrappers supporting fluent .fill()/.stroke().
 */
export class SvgContext {
  private app: any;
  private mapping: ViewBoxMapping;
  private styleStack: SvgStyle[] = [{}];
  private transformStack: AffineMatrix[] = [AffineMatrix.identity()];
  private gradients: Map<string, GradientDef> = new Map();

  constructor(app: any, mapping: ViewBoxMapping) {
    this.app = app;
    this.mapping = mapping;
  }

  // ─── Style stack ─────────────────────────────────────────────

  private currentStyle(): SvgStyle {
    return this.styleStack[this.styleStack.length - 1];
  }

  private pushStyle(attrs: SvgElementAttrs): void {
    const parent = this.currentStyle();
    const merged: SvgStyle = { ...parent };
    const style = parseStyleAttr(attrs.style);
    if (attrs.fill !== undefined) merged.fill = attrs.fill;
    else if (style.fill) merged.fill = style.fill;
    if (attrs.stroke !== undefined) merged.stroke = attrs.stroke;
    else if (style.stroke) merged.stroke = style.stroke;
    if (attrs['stroke-width'] !== undefined) merged.strokeWidth = parseNum(attrs['stroke-width']);
    else if (style['stroke-width']) merged.strokeWidth = parseNum(style['stroke-width']);
    if (attrs['stroke-linecap'] !== undefined) merged.strokeLinecap = attrs['stroke-linecap'] as any;
    if (attrs['stroke-linejoin'] !== undefined) merged.strokeLinejoin = attrs['stroke-linejoin'] as any;
    // Text properties
    const fontSize = attrs['font-size'] ?? style['font-size'];
    if (fontSize !== undefined) merged.fontSize = parseNum(fontSize);
    const fontFamily = attrs['font-family'] ?? style['font-family'];
    if (fontFamily !== undefined) merged.fontFamily = fontFamily;
    const fontWeight = attrs['font-weight'] ?? style['font-weight'];
    if (fontWeight !== undefined) merged.fontWeight = fontWeight;
    const fontStyle = attrs['font-style'] ?? style['font-style'];
    if (fontStyle !== undefined) merged.fontStyle = fontStyle;
    const textAnchor = attrs['text-anchor'] ?? style['text-anchor'];
    if (textAnchor !== undefined) merged.textAnchor = textAnchor;
    this.styleStack.push(merged);
  }

  private popStyle(): void {
    if (this.styleStack.length > 1) this.styleStack.pop();
  }

  // ─── Transform stack ──────────────────────────────────────────

  private currentTransform(): AffineMatrix {
    return this.transformStack[this.transformStack.length - 1];
  }

  private pushTransform(attrs: SvgElementAttrs): void {
    const parent = this.currentTransform();
    if (attrs.transform) {
      const local = parseTransform(attrs.transform);
      this.transformStack.push(parent.multiply(local));
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
    return [this.mapX(tx), this.mapY(ty)];
  }

  /** Resolve final style: element attrs override inherited group style. */
  private resolveStyle(attrs: SvgElementAttrs): SvgStyle {
    const inherited = this.currentStyle();
    const style = parseStyleAttr(attrs.style);
    const fontSize = attrs['font-size'] ?? style['font-size'];
    const fontFamily = attrs['font-family'] ?? style['font-family'];
    const fontWeight = attrs['font-weight'] ?? style['font-weight'];
    const fontStyleVal = attrs['font-style'] ?? style['font-style'];
    const textAnchor = attrs['text-anchor'] ?? style['text-anchor'];
    return {
      fill: attrs.fill !== undefined ? attrs.fill : (style.fill ?? inherited.fill),
      stroke: attrs.stroke !== undefined ? attrs.stroke : (style.stroke ?? inherited.stroke),
      strokeWidth: attrs['stroke-width'] !== undefined ? parseNum(attrs['stroke-width']) : inherited.strokeWidth,
      strokeLinecap: (attrs['stroke-linecap'] as any) || inherited.strokeLinecap,
      strokeLinejoin: (attrs['stroke-linejoin'] as any) || inherited.strokeLinejoin,
      fontSize: fontSize !== undefined ? parseNum(fontSize) : inherited.fontSize,
      fontFamily: fontFamily !== undefined ? fontFamily : inherited.fontFamily,
      fontWeight: fontWeight !== undefined ? fontWeight : inherited.fontWeight,
      fontStyle: fontStyleVal !== undefined ? fontStyleVal : inherited.fontStyle,
      textAnchor: textAnchor !== undefined ? textAnchor : inherited.textAnchor,
    };
  }

  // ─── Coordinate mapping ──────────────────────────────────────

  mapX(x: number): number {
    return (x - this.mapping.vb.minX) * this.mapping.scale + this.mapping.offsetX;
  }

  mapY(y: number): number {
    return (y - this.mapping.vb.minY) * this.mapping.scale + this.mapping.offsetY;
  }

  mapLength(l: number): number {
    return l * this.mapping.scale;
  }

  /** Map all coordinate args in a normalized path string, applying current transform. */
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

  // ─── SVG Element Methods ─────────────────────────────────────

  /** Group element — pushes style and transform onto stacks, runs builder, pops both. */
  g(attrs: SvgElementAttrs, builder: () => void): void {
    this.pushStyle(attrs);
    this.pushTransform(attrs);
    builder();
    this.popTransform();
    this.popStyle();
  }

  /** Path element — normalizes d, maps coords, renders via canvasPath. */
  path(attrs: SvgElementAttrs): SvgElement {
    if (!attrs.d) return new SvgElement(null);
    if (attrs.transform) this.pushTransform(attrs);
    const style = this.resolveStyle(attrs);
    const normalized = normalizePath(attrs.d);
    const mapped = this.mapPathCoords(normalized);
    const bounds = computePathBounds(mapped);
    const width = Math.max(bounds.maxX + 10, 10);
    const height = Math.max(bounds.maxY + 10, 10);
    const gradDef = resolveGradientFill(style.fill, this);
    const fillColor = gradDef ? undefined : resolveFillColor(style.fill, this);
    const strokeColor = style.stroke && style.stroke !== 'none' ? style.stroke : undefined;

    const opts: any = {
      path: mapped,
      width,
      height,
      fillColor,
      strokeColor,
      strokeWidth: strokeColor ? (style.strokeWidth ?? 1) : 0,
    };
    if (gradDef) {
      opts.fillGradient = {
        type: gradDef.type,
        x1: gradDef.x1, y1: gradDef.y1,
        x2: gradDef.x2, y2: gradDef.y2,
        stops: gradDef.stops,
      };
    }

    const underlying = this.app.canvasPath(opts);
    if (attrs.transform) this.popTransform();
    return new SvgElement(underlying);
  }

  /** Circle element. */
  circle(attrs: SvgElementAttrs): SvgElement {
    if (attrs.transform) this.pushTransform(attrs);
    const [cx, cy] = this.mapPoint(parseNum(attrs.cx ?? 0), parseNum(attrs.cy ?? 0));
    const r = this.mapLength(parseNum(attrs.r ?? 0)) * this.currentTransform().averageScale();
    const style = this.resolveStyle(attrs);
    const fillColor = resolveFillColor(style.fill, this);
    const strokeColor = style.stroke && style.stroke !== 'none' ? style.stroke : undefined;

    const underlying = this.app.canvasCircle({
      x: cx - r,
      y: cy - r,
      x2: cx + r,
      y2: cy + r,
      fillColor,
      strokeColor,
      strokeWidth: strokeColor ? (style.strokeWidth ?? 1) : 0,
    });
    if (attrs.transform) this.popTransform();
    return new SvgElement(underlying);
  }

  /** Ellipse element. */
  ellipse(attrs: SvgElementAttrs): SvgElement {
    if (attrs.transform) this.pushTransform(attrs);
    const [cx, cy] = this.mapPoint(parseNum(attrs.cx ?? 0), parseNum(attrs.cy ?? 0));
    const tScale = this.currentTransform().averageScale();
    const rx = this.mapLength(parseNum(attrs.rx ?? 0)) * tScale;
    const ry = this.mapLength(parseNum(attrs.ry ?? 0)) * tScale;
    const style = this.resolveStyle(attrs);
    const fillColor = resolveFillColor(style.fill, this);

    const underlying = this.app.canvasEllipse({
      x: cx - rx,
      y: cy - ry,
      width: rx * 2,
      height: ry * 2,
      fillColor,
    });
    if (attrs.transform) this.popTransform();
    return new SvgElement(underlying);
  }

  /** Rect element. */
  rect(attrs: SvgElementAttrs): SvgElement {
    if (attrs.transform) this.pushTransform(attrs);
    const rx = parseNum(attrs.x ?? 0);
    const ry = parseNum(attrs.y ?? 0);
    const rw = parseNum(attrs.width ?? 0);
    const rh = parseNum(attrs.height ?? 0);
    // Transform all four corners and compute axis-aligned bounding box
    const [x1, y1] = this.mapPoint(rx, ry);
    const [x2, y2] = this.mapPoint(rx + rw, ry);
    const [x3, y3] = this.mapPoint(rx + rw, ry + rh);
    const [x4, y4] = this.mapPoint(rx, ry + rh);
    const minX = Math.min(x1, x2, x3, x4);
    const minY = Math.min(y1, y2, y3, y4);
    const maxX = Math.max(x1, x2, x3, x4);
    const maxY = Math.max(y1, y2, y3, y4);
    const style = this.resolveStyle(attrs);
    const fillColor = resolveFillColor(style.fill, this);
    const strokeColor = style.stroke && style.stroke !== 'none' ? style.stroke : undefined;

    const underlying = this.app.canvasRectangle({
      x: minX,
      y: minY,
      x2: maxX,
      y2: maxY,
      fillColor,
      strokeColor,
      strokeWidth: strokeColor ? (style.strokeWidth ?? 1) : 0,
    });
    if (attrs.transform) this.popTransform();
    return new SvgElement(underlying);
  }

  /** Line element. */
  line(attrs: SvgElementAttrs): SvgElement {
    if (attrs.transform) this.pushTransform(attrs);
    const [x1, y1] = this.mapPoint(parseNum(attrs.x1 ?? 0), parseNum(attrs.y1 ?? 0));
    const [x2, y2] = this.mapPoint(parseNum(attrs.x2 ?? 0), parseNum(attrs.y2 ?? 0));
    const style = this.resolveStyle(attrs);

    const underlying = this.app.canvasLine(x1, y1, x2, y2, {
      strokeColor: style.stroke || 'black',
      strokeWidth: style.strokeWidth ?? 1,
    });
    if (attrs.transform) this.popTransform();
    return new SvgElement(underlying);
  }

  /** Polyline element — convert points to a path. */
  polyline(attrs: SvgElementAttrs): SvgElement {
    if (!attrs.points) return new SvgElement(null);
    const d = pointsToPath(attrs.points, false);
    // path() handles transform push/pop itself, pass attrs through
    return this.path({ ...attrs, d });
  }

  /** Polygon element — convert points to a closed path. */
  polygon(attrs: SvgElementAttrs): SvgElement {
    if (!attrs.points) return new SvgElement(null);
    const d = pointsToPath(attrs.points, true);
    return this.path({ ...attrs, d });
  }

  /** Desc element — ignored (metadata only). */
  desc(_attrs?: SvgElementAttrs): void {}

  /** Defs element — run the builder so child elements (gradients, etc.) are registered. */
  defs(_attrs?: SvgElementAttrs, builder?: () => void): void {
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

  /** Parse a linearGradient or radialGradient node and register its stops + geometry. */
  linearGradient(node: SvgNode): void {
    const id = node.attrs.id;
    if (!id) return;
    const stops = node.children
      .filter(c => c.tag === 'stop')
      .map(c => {
        const style = parseStyleAttr(c.attrs.style);
        const color = c.attrs['stop-color'] ?? style['stop-color'] ?? 'black';
        const offsetStr = c.attrs.offset ?? '0';
        const offset = offsetStr.endsWith('%')
          ? parseFloat(offsetStr) / 100
          : parseFloat(offsetStr);
        return { offset: isNaN(offset) ? 0 : offset, color };
      });

    // Parse gradient geometry (SVG defaults: left-to-right, objectBoundingBox)
    let x1 = parseNum(node.attrs.x1 ?? 0);
    let y1 = parseNum(node.attrs.y1 ?? 0);
    let x2 = parseNum(node.attrs.x2 ?? 1);
    let y2 = parseNum(node.attrs.y2 ?? 0);

    // Handle percentage values (e.g. "0%", "100%")
    if (typeof node.attrs.x1 === 'string' && node.attrs.x1.endsWith('%')) x1 = parseFloat(node.attrs.x1) / 100;
    if (typeof node.attrs.y1 === 'string' && node.attrs.y1.endsWith('%')) y1 = parseFloat(node.attrs.y1) / 100;
    if (typeof node.attrs.x2 === 'string' && node.attrs.x2.endsWith('%')) x2 = parseFloat(node.attrs.x2) / 100;
    if (typeof node.attrs.y2 === 'string' && node.attrs.y2.endsWith('%')) y2 = parseFloat(node.attrs.y2) / 100;

    // Apply gradientTransform to gradient endpoints
    if (node.attrs.gradientTransform) {
      const m = parseTransform(node.attrs.gradientTransform);
      [x1, y1] = m.apply(x1, y1);
      [x2, y2] = m.apply(x2, y2);
    }

    const type = node.tag === 'radialGradient' ? 'radial' : 'linear';
    this.registerGradient(id, { type, stops, x1, y1, x2, y2 });
  }

  /** Text element — renders text using canvasText. */
  text(attrs: SvgElementAttrs, content?: string): SvgElement {
    if (!content) return new SvgElement(null);
    if (attrs.transform) this.pushTransform(attrs);
    const style = this.resolveStyle(attrs);
    const x = parseNum(attrs.x ?? 0);
    const y = parseNum(attrs.y ?? 0);
    const [mx, my] = this.mapPoint(x, y);

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

    const fillColor = resolveFillColor(style.fill, this);
    const color = fillColor ?? 'black';

    const underlying = this.app.canvasText(content, {
      x: mx,
      y: my,
      color,
      textSize,
      bold,
      italic,
      monospace,
      alignment,
    });
    if (attrs.transform) this.popTransform();
    return new SvgElement(underlying);
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
    const width = Math.max(bounds.maxX + 10, 10);
    const height = Math.max(bounds.maxY + 10, 10);

    return this.app.canvasPath({
      path: mapped,
      width,
      height,
      fillColor: resolveFillColor(style.fill, this),
      strokeColor: style.stroke && style.stroke !== 'none' ? style.stroke : undefined,
      strokeWidth: style.strokeWidth ?? 1,
    });
  }
}

/**
 * Fluent path builder — moveTo/lineTo/cubicTo/arc/close/fill/stroke.
 */
export class PathBuilder {
  private ctx: SvgContext;
  private parts: string[] = [];
  private cx = 0;
  private cy = 0;
  private _fill?: string;
  private _stroke?: string;
  private _strokeWidth?: number;

  constructor(ctx: SvgContext) {
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

// ─── SvgBuilder — builder-style entry point ─────────────────────

/**
 * Builder-style SVG context. Use `svgBuilder(app)` to create, then call `.svg()`.
 *
 * ```ts
 * const s = svgBuilder(app);
 * s.svg({ viewBox: "0 0 100 100" }, () => {
 *   s.path({ d: "M19,16a46,46 0,1,0 62,0...", fill: "#069" });
 *   s.circle({ r: 15, cx: 50, cy: 18 }).fill("#900");
 * });
 * ```
 */
export class SvgBuilder {
  private app: any;
  private ctx: SvgContext | null = null;

  constructor(app: any) {
    this.app = app;
  }

  /** Create an SVG context with viewBox and run the builder. */
  svg(options: SvgOptions, builder: (s: SvgContext) => void): SvgContext;
  svg(options: SvgOptions, builder: () => void): SvgContext;
  svg(options: SvgOptions, builder: ((s: SvgContext) => void) | (() => void)): SvgContext {
    const ctx = createSvgContext(this.app, options);
    this.ctx = ctx;
    // Call builder — if it takes args, pass the context; otherwise `this` methods delegate to ctx
    if (builder.length > 0) {
      (builder as (s: SvgContext) => void)(ctx);
    } else {
      (builder as () => void)();
    }
    return ctx;
  }

  // ─── Delegate element methods to active context ──────────────

  g(attrs: SvgElementAttrs, builder: () => void): void {
    this.ctx!.g(attrs, builder);
  }

  path(attrs: SvgElementAttrs): SvgElement {
    return this.ctx!.path(attrs);
  }

  circle(attrs: SvgElementAttrs): SvgElement {
    return this.ctx!.circle(attrs);
  }

  ellipse(attrs: SvgElementAttrs): SvgElement {
    return this.ctx!.ellipse(attrs);
  }

  rect(attrs: SvgElementAttrs): SvgElement {
    return this.ctx!.rect(attrs);
  }

  line(attrs: SvgElementAttrs): SvgElement {
    return this.ctx!.line(attrs);
  }

  polyline(attrs: SvgElementAttrs): SvgElement {
    return this.ctx!.polyline(attrs);
  }

  polygon(attrs: SvgElementAttrs): SvgElement {
    return this.ctx!.polygon(attrs);
  }

  text(attrs: SvgElementAttrs, content?: string): SvgElement {
    return this.ctx!.text(attrs, content);
  }

  desc(attrs?: SvgElementAttrs): void {
    this.ctx?.desc(attrs);
  }

  defs(attrs?: SvgElementAttrs, builder?: () => void): void {
    this.ctx?.defs(attrs, builder);
  }

  pathBuilder(): PathBuilder {
    return this.ctx!.pathBuilder();
  }
}

/**
 * Create an SvgBuilder for builder-style usage.
 *
 * ```ts
 * const s = svgBuilder(app);
 * s.svg({ viewBox: "0 0 100 100" }, () => {
 *   s.circle({ r: 15, cx: 50, cy: 18 }).fill("#900");
 * });
 * ```
 */
export function svgBuilder(app: any): SvgBuilder {
  return new SvgBuilder(app);
}

// ─── svg() Factory (standalone) ─────────────────────────────────

/**
 * Create an SVG rendering context (standalone factory).
 *
 * ```ts
 * svg(app, { viewBox: '0 0 100 100', width: 400, height: 400 }, (s) => {
 *   s.path({ d: 'M50,30c9-22...', fill: '#F00' });
 * });
 * ```
 */
export function svg(
  app: any,
  options: SvgOptions,
  builder: (s: SvgContext) => void,
): SvgContext {
  const ctx = createSvgContext(app, options);
  builder(ctx);
  return ctx;
}

/** Shared: create an SvgContext from options. */
function createSvgContext(app: any, options: SvgOptions): SvgContext {
  const canvasWidth = options.width ?? 400;
  const canvasHeight = options.height ?? 400;

  let vb: ViewBox;
  if (!options.viewBox) {
    vb = { minX: 0, minY: 0, width: canvasWidth, height: canvasHeight };
  } else if (typeof options.viewBox === 'string') {
    const parsed = parseViewBox(options.viewBox);
    vb = parsed ?? { minX: 0, minY: 0, width: canvasWidth, height: canvasHeight };
  } else {
    vb = options.viewBox;
  }

  const scaleX = canvasWidth / vb.width;
  const scaleY = canvasHeight / vb.height;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (canvasWidth - vb.width * scale) / 2;
  const offsetY = (canvasHeight - vb.height * scale) / 2;

  const mapping: ViewBoxMapping = { vb, canvasWidth, canvasHeight, scale, offsetX, offsetY };
  return new SvgContext(app, mapping);
}

// ─── Helpers ───────────────────────────────────────────────────

/** Parse an inline `style` attribute into a key-value map. */
export function parseStyleAttr(str: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!str) return result;
  for (const part of str.split(';')) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    const key = part.slice(0, colon).trim();
    const val = part.slice(colon + 1).trim();
    if (key && val) result[key] = val;
  }
  return result;
}

function parseNum(v: any): number {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function resolveFillColor(fill: string | undefined, ctx?: SvgContext): string | undefined {
  if (fill === 'none') return undefined;
  if (fill) {
    const urlMatch = fill.match(/^url\(#([^)]+)\)$/);
    if (urlMatch) {
      const grad = ctx?.getGradient(urlMatch[1]);
      if (grad && grad.stops.length > 0) return grad.stops[0].color;
      return 'black';
    }
  }
  return fill ?? 'black';
}

/** Resolve a fill value to a GradientDef if it references a gradient, undefined otherwise. */
function resolveGradientFill(fill: string | undefined, ctx?: SvgContext): GradientDef | undefined {
  if (!fill || fill === 'none') return undefined;
  const urlMatch = fill.match(/^url\(#([^)]+)\)$/);
  if (!urlMatch) return undefined;
  return ctx?.getGradient(urlMatch[1]);
}

function pointsToPath(points: string, closed: boolean): string {
  const nums = points.trim().split(/[\s,]+/).map(Number);
  if (nums.length < 2) return '';
  let d = `M ${nums[0]} ${nums[1]}`;
  for (let i = 2; i + 1 < nums.length; i += 2) {
    d += ` L ${nums[i]} ${nums[i + 1]}`;
  }
  if (closed) d += ' Z';
  return d;
}

function computePathBounds(mapped: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const numRe = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
  const nums: number[] = [];
  let m: RegExpExecArray | null;
  const segments = mapped.split(/[MLCZ]/);
  for (const seg of segments) {
    while ((m = numRe.exec(seg)) !== null) {
      nums.push(parseFloat(m[0]));
    }
  }
  if (nums.length < 2) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}
