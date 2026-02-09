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

import { SvgNode, SvgStyle, SvgOptions, SvgElementAttrs, ViewBox, FilterDef, ClipPathDef, ClipPathShape } from './types';
import { normalizePath } from './normalizer';
import { parseViewBox } from './parser';
import { AffineMatrix, parseTransform } from './transform';
import { gaussianBlur } from './blur';
import { fillRectInBuffer, fillCircleInBuffer, applyClipMask, parseColorToRGBA } from './rasterize';

/** Gradient definition — stores stop colors and geometry for url(#id) resolution. */
export interface GradientDef {
  type: 'linear' | 'radial';
  stops: { offset: number; color: string }[];
  x1: number; y1: number; x2: number; y2: number;  // linear: gradient line
  cx?: number; cy?: number; r?: number;              // radial: center + radius (bbox 0-1)
  units?: 'userSpaceOnUse' | 'objectBoundingBox';   // default objectBoundingBox
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
  private filters: Map<string, FilterDef> = new Map();
  private clipPaths: Map<string, ClipPathDef> = new Map();
  private nodesById: Map<string, SvgNode> = new Map();
  private walkNodeFn?: (s: SvgContext, node: SvgNode) => void;

  constructor(app: any, mapping: ViewBoxMapping, rootStyle?: SvgStyle) {
    this.app = app;
    this.mapping = mapping;
    if (rootStyle) this.styleStack[0] = rootStyle;
  }

  /** Register the walkNode callback for <use> element support. */
  setWalkNode(fn: (s: SvgContext, node: SvgNode) => void): void {
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
    const strokeWidth = attrs['stroke-width'] ?? style['stroke-width'];
    const strokeLinecap = attrs['stroke-linecap'] ?? style['stroke-linecap'];
    const strokeLinejoin = attrs['stroke-linejoin'] ?? style['stroke-linejoin'];
    const opacity = attrs.opacity ?? style.opacity;
    const fillOpacity = attrs['fill-opacity'] ?? style['fill-opacity'];
    const strokeOpacity = attrs['stroke-opacity'] ?? style['stroke-opacity'];
    // Extract filter and clip-path references
    const filterStr = attrs.filter ?? style.filter;
    const clipPathStr = attrs['clip-path'] ?? style['clip-path'];
    const filterId = filterStr ? extractUrlId(filterStr) : undefined;
    const clipPathId = clipPathStr ? extractUrlId(clipPathStr) : undefined;

    return {
      fill: attrs.fill !== undefined ? attrs.fill : (style.fill ?? inherited.fill),
      stroke: attrs.stroke !== undefined ? attrs.stroke : (style.stroke ?? inherited.stroke),
      strokeWidth: strokeWidth !== undefined ? parseNum(strokeWidth) : inherited.strokeWidth,
      strokeLinecap: (strokeLinecap as any) || inherited.strokeLinecap,
      strokeLinejoin: (strokeLinejoin as any) || inherited.strokeLinejoin,
      opacity: opacity !== undefined ? parseNum(opacity) : inherited.opacity,
      fillOpacity: fillOpacity !== undefined ? parseNum(fillOpacity) : inherited.fillOpacity,
      strokeOpacity: strokeOpacity !== undefined ? parseNum(strokeOpacity) : inherited.strokeOpacity,
      fontSize: fontSize !== undefined ? parseNum(fontSize) : inherited.fontSize,
      fontFamily: fontFamily !== undefined ? fontFamily : inherited.fontFamily,
      fontWeight: fontWeight !== undefined ? fontWeight : inherited.fontWeight,
      fontStyle: fontStyleVal !== undefined ? fontStyleVal : inherited.fontStyle,
      textAnchor: textAnchor !== undefined ? textAnchor : inherited.textAnchor,
      filterId,
      clipPathId,
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

  /** Map a stroke-width value through viewBox scaling + current transform. */
  private mapStrokeWidth(raw: number): number {
    return this.mapLength(raw) * this.currentTransform().averageScale();
  }

  /** Build a fillGradient object for canvasPath, converting units as needed. */
  private buildFillGradient(
    gradDef: GradientDef,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
  ): any {
    const bw = bounds.maxX - bounds.minX || 1;
    const bh = bounds.maxY - bounds.minY || 1;

    if (gradDef.type === 'radial') {
      let cx = gradDef.cx ?? 0.5;
      let cy = gradDef.cy ?? 0.5;
      let r = gradDef.r ?? 0.5;
      if (gradDef.units === 'userSpaceOnUse') {
        // Pass pixel-space center + radius to preserve circular shape
        const [mcx, mcy] = this.mapPoint(cx, cy);
        const rPx = this.mapLength(r);
        return { type: 'radial', cx: mcx, cy: mcy, rx: rPx, ry: rPx, pixelSpace: true, stops: gradDef.stops };
      }
      // objectBoundingBox: r is same in both axes (circle in bbox space)
      return { type: 'radial', cx, cy, rx: r, ry: r, stops: gradDef.stops };
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
      };
    }
    return {
      type: 'linear',
      x1: gradDef.x1, y1: gradDef.y1,
      x2: gradDef.x2, y2: gradDef.y2,
      stops: gradDef.stops,
    };
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
    const alpha = effectiveAlpha(style);
    const gradDef = resolveGradientFill(style.fill, this);
    const fillColor = gradDef ? undefined : resolveFillColor(style.fill, this, alpha);
    const strokeColor = resolveStrokeColor(style);
    const sw = strokeColor ? this.mapStrokeWidth(style.strokeWidth ?? 1) : 0;
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
    };
    if (gradDef) {
      opts.fillGradient = this.buildFillGradient(gradDef, bounds);
    }

    const underlying = this.app.canvasPath(opts);
    if (attrs.transform) this.popTransform();
    return new SvgElement(underlying);
  }

  /** Circle element. */
  circle(attrs: SvgElementAttrs): SvgElement {
    if (attrs.transform) this.pushTransform(attrs);
    const style = this.resolveStyle(attrs);

    // If filter or clipPath, render as raster
    if (style.filterId || style.clipPathId) {
      const ccx = parseNum(attrs.cx ?? 0);
      const ccy = parseNum(attrs.cy ?? 0);
      const cr = parseNum(attrs.r ?? 0);
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
      return result;
    }

    const [cx, cy] = this.mapPoint(parseNum(attrs.cx ?? 0), parseNum(attrs.cy ?? 0));
    const r = this.mapLength(parseNum(attrs.r ?? 0)) * this.currentTransform().averageScale();
    const alpha = effectiveAlpha(style);
    const fillColor = resolveFillColor(style.fill, this, alpha);
    const strokeColor = resolveStrokeColor(style);

    const sw = strokeColor ? this.mapStrokeWidth(style.strokeWidth ?? 1) : 0;
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
    if (attrs.transform) this.popTransform();
    return new SvgElement(underlying);
  }

  /** Ellipse element — renders as a path for full stroke/fill support. */
  ellipse(attrs: SvgElementAttrs): SvgElement {
    // Approximate ellipse as cubic Bezier path (4 arcs)
    const ecx = parseNum(attrs.cx ?? 0);
    const ecy = parseNum(attrs.cy ?? 0);
    const erx = parseNum(attrs.rx ?? 0);
    const ery = parseNum(attrs.ry ?? 0);
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
  rect(attrs: SvgElementAttrs): SvgElement {
    if (attrs.transform) this.pushTransform(attrs);
    const style = this.resolveStyle(attrs);

    // If filter or clipPath, render as raster
    if (style.filterId || style.clipPathId) {
      const px = parseNum(attrs.x ?? 0);
      const py = parseNum(attrs.y ?? 0);
      const pw = parseNum(attrs.width ?? 0);
      const ph = parseNum(attrs.height ?? 0);
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
      return result;
    }

    const gradDef = resolveGradientFill(style.fill, this);

    // Check if current transform includes rotation/skew
    const t = this.currentTransform();
    const hasRotation = Math.abs(t.b) > 1e-6 || Math.abs(t.c) > 1e-6;

    // Rounded corners
    const hasRoundedCorners = parseNum(attrs.rx ?? 0) > 0 || parseNum(attrs.ry ?? 0) > 0;

    // If gradient fill, rotation, or rounded corners, render as path
    if (gradDef || hasRotation || hasRoundedCorners) {
      const px = parseNum(attrs.x ?? 0);
      const py = parseNum(attrs.y ?? 0);
      const pw = parseNum(attrs.width ?? 0);
      const ph = parseNum(attrs.height ?? 0);
      const crx = Math.min(parseNum(attrs.rx ?? 0), pw / 2);
      const cry = Math.min(parseNum(attrs.ry ?? 0), ph / 2);
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
      const result = this.path({ ...attrs, d: rectPath, fill: style.fill });
      if (attrs.transform) this.popTransform();
      return result;
    }

    const px = parseNum(attrs.x ?? 0);
    const py = parseNum(attrs.y ?? 0);
    const pw = parseNum(attrs.width ?? 0);
    const ph = parseNum(attrs.height ?? 0);
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
    const strokeColor = resolveStrokeColor(style);

    const underlying = this.app.canvasRectangle({
      x: minX,
      y: minY,
      x2: maxX,
      y2: maxY,
      fillColor,
      strokeColor,
      strokeWidth: strokeColor ? this.mapStrokeWidth(style.strokeWidth ?? 1) : 0,
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
      strokeColor: resolveStrokeColor(style) || 'black',
      strokeWidth: this.mapStrokeWidth(style.strokeWidth ?? 1),
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
   * Returns an SvgElement wrapping the created canvasRaster.
   */
  renderAsRaster(
    elemBounds: { x: number; y: number; w: number; h: number },
    fillColor: string,
    style: SvgStyle,
    shapeFiller: (buf: Uint8Array, bufW: number, bufH: number, offX: number, offY: number, r: number, g: number, b: number, a: number) => void,
  ): SvgElement {
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

    // Clip to filter region (SVG spec: filter output is clipped to the filter region)
    if (filterDef) {
      const frSvgX = elemBounds.x + filterDef.regionX * elemBounds.w;
      const frSvgY = elemBounds.y + filterDef.regionY * elemBounds.h;
      const frSvgW = filterDef.regionWidth * elemBounds.w;
      const frSvgH = filterDef.regionHeight * elemBounds.h;
      const [frPxX, frPxY] = this.mapPoint(frSvgX, frSvgY);
      const [frPxX2, frPxY2] = this.mapPoint(frSvgX + frSvgW, frSvgY + frSvgH);
      // Zero out pixels outside the filter region
      const frX0 = Math.round(frPxX - pxBufX);
      const frY0 = Math.round(frPxY - pxBufY);
      const frX1 = Math.round(frPxX2 - pxBufX);
      const frY1 = Math.round(frPxY2 - pxBufY);
      for (let py = 0; py < bufH; py++) {
        for (let px = 0; px < bufW; px++) {
          if (px < frX0 || px >= frX1 || py < frY0 || py >= frY1) {
            const idx = (py * bufW + px) * 4;
            pixels[idx + 3] = 0; // zero alpha
          }
        }
      }
    }

    // Apply clip mask
    if (clipDef) {
      const mask = new Uint8Array(bufW * bufH * 4);
      for (const shape of clipDef.shapes) {
        if (shape.type === 'rect') {
          const [rx, ry] = this.mapPoint(shape.x ?? 0, shape.y ?? 0);
          const rw = this.mapLength(shape.width ?? 0) * this.currentTransform().averageScale();
          const rh = this.mapLength(shape.height ?? 0) * this.currentTransform().averageScale();
          fillRectInBuffer(mask, bufW, bufH, rx - pxBufX, ry - pxBufY, rw, rh, 255, 255, 255, 255);
        } else if (shape.type === 'circle') {
          const [ccx, ccy] = this.mapPoint(shape.cx ?? 0, shape.cy ?? 0);
          const cr2 = this.mapLength(shape.r ?? 0) * this.currentTransform().averageScale();
          fillCircleInBuffer(mask, bufW, bufH, ccx - pxBufX, ccy - pxBufY, cr2, 255, 255, 255, 255);
        }
      }
      applyClipMask(pixels, mask, bufW * bufH);
    }

    // Encode as base64
    const rawPixels = uint8ArrayToBase64(pixels);

    // Create canvasRaster at the correct position
    const underlying = this.app.canvasRaster(
      bufW, bufH,
      undefined, // no pixel tuples
      undefined, // no blend mode
      { x: Math.round(pxBufX), y: Math.round(pxBufY), rawPixels },
    );
    return new SvgElement(underlying);
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
    const ref = refId ? this.getGradient(refId) : undefined;
    if (stops.length === 0 && ref) {
      stops = ref.stops;
    }

    const type = node.tag === 'radialGradient' ? 'radial' : 'linear';
    const units = (node.attrs.gradientUnits ?? ref?.units) as GradientDef['units'];

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
      if (node.attrs.gradientTransform) {
        const m = parseTransform(node.attrs.gradientTransform);
        [cx, cy] = m.apply(cx, cy);
        // Scale radius by average scale of transform
        r *= m.averageScale();
      }
      this.registerGradient(id, { type, stops, x1: 0, y1: 0, x2: 0, y2: 0, cx, cy, r, units });
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
      this.registerGradient(id, { type, stops, x1, y1, x2, y2, units });
    }
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

    const fillColor = resolveFillColor(style.fill, this, effectiveAlpha(style));
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

  /** Use element — clone and render a referenced element with optional transform. */
  use(attrs: SvgElementAttrs): void {
    const href = attrs['xlink:href'] ?? attrs.href;
    if (!href) return;
    const refId = href.replace(/^#/, '');
    const refNode = this.nodesById.get(refId);
    if (!refNode || !this.walkNodeFn) return;
    if (attrs.transform) this.pushTransform(attrs);
    this.walkNodeFn(this, refNode);
    if (attrs.transform) this.popTransform();
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
    const strokeColor = style.stroke && style.stroke !== 'none' ? style.stroke : undefined;
    const sw = this.mapStrokeWidth(style.strokeWidth ?? 1);
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

  // Build initial inherited style from root <svg> attributes
  let rootStyle: SvgStyle | undefined;
  const ra = options.rootAttrs;
  if (ra) {
    rootStyle = {};
    if (ra.fill) rootStyle.fill = ra.fill;
    if (ra.stroke) rootStyle.stroke = ra.stroke;
    if (ra['stroke-width']) rootStyle.strokeWidth = parseNum(ra['stroke-width']);
    if (ra['stroke-linecap']) rootStyle.strokeLinecap = ra['stroke-linecap'] as any;
    if (ra['stroke-linejoin']) rootStyle.strokeLinejoin = ra['stroke-linejoin'] as any;
    if (ra['font-size']) rootStyle.fontSize = parseNum(ra['font-size']);
    if (ra['font-family']) rootStyle.fontFamily = ra['font-family'];
  }

  return new SvgContext(app, mapping, rootStyle);
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

/** Parse a filter region attribute (percentage or fraction), returning a fraction. */
function parseFilterRegion(val: string | undefined, fallback: number): number {
  if (val === undefined) return fallback;
  if (val.endsWith('%')) return parseFloat(val) / 100;
  return parseNum(val);
}

/** Extract the id from a url(#id) reference. */
function extractUrlId(str: string): string | undefined {
  const m = str.match(/url\(#([^)]+)\)/);
  return m ? m[1] : undefined;
}

/** Convert a Uint8Array to a base64 string. Works in both Node.js and browser. */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  // Browser fallback
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Named CSS colors used in SVG gradients. */
const CSS_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], green: [0, 128, 0],
  blue: [0, 0, 255], yellow: [255, 255, 0], cyan: [0, 255, 255], magenta: [255, 0, 255],
  orange: [255, 165, 0], gray: [128, 128, 128], grey: [128, 128, 128],
  silver: [192, 192, 192], maroon: [128, 0, 0], olive: [128, 128, 0],
  lime: [0, 255, 0], aqua: [0, 255, 255], teal: [0, 128, 128],
  navy: [0, 0, 128], fuchsia: [255, 0, 255], purple: [128, 0, 128],
};

/** Apply opacity to a CSS color, returning an rgba() string. */
function applyOpacityToColor(color: string, opacity: number): string {
  let r = 0, g = 0, b = 0;
  const c = color.trim().toLowerCase();

  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (c.startsWith('rgb')) {
    const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
  } else if (CSS_COLORS[c]) {
    [r, g, b] = CSS_COLORS[c];
  }

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function resolveFillColor(fill: string | undefined, ctx?: SvgContext, alpha?: number): string | undefined {
  if (fill === 'none') return undefined;
  let color: string;
  if (fill) {
    const urlMatch = fill.match(/^url\(#([^)]+)\)$/);
    if (urlMatch) {
      const grad = ctx?.getGradient(urlMatch[1]);
      color = (grad && grad.stops.length > 0) ? grad.stops[0].color : 'black';
    } else {
      color = fill;
    }
  } else {
    color = 'black';
  }
  if (alpha !== undefined && alpha < 1) {
    return applyOpacityToColor(color, alpha);
  }
  return color;
}

/** Compute effective fill alpha from opacity and fill-opacity (both default to 1). */
function effectiveAlpha(style: SvgStyle): number | undefined {
  const o = style.opacity ?? 1;
  const fo = style.fillOpacity ?? 1;
  const a = o * fo;
  return a < 1 ? a : undefined;
}

function effectiveStrokeAlpha(style: SvgStyle): number | undefined {
  const o = style.opacity ?? 1;
  const so = style.strokeOpacity ?? 1;
  const a = o * so;
  return a < 1 ? a : undefined;
}

/** Resolve a stroke color, applying stroke-opacity and element opacity. */
function resolveStrokeColor(style: SvgStyle): string | undefined {
  if (!style.stroke || style.stroke === 'none') return undefined;
  const color = normalizeColor(style.stroke);
  const alpha = effectiveStrokeAlpha(style);
  if (alpha !== undefined) {
    return applyOpacityToColor(color, alpha);
  }
  return color;
}

/** Normalize CSS color formats (rgb(), named) to hex. */
function normalizeColor(color: string): string {
  const c = color.trim();
  const rgbMatch = c.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  return c;
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
