/**
 * CVG Grammar — CvgContext defs/text/use methods + PathBuilder (prototype augmentation).
 *
 * Adds to CvgContext.prototype:
 * - defs, registerGradient, getGradient, registerFilter, getFilter, registerClipPath, getClipPath
 * - filter, clipPath (parsing)
 * - renderAsRaster
 * - linearGradient
 * - text
 * - use
 * - pathBuilder, _renderPath
 *
 * Also exports the PathBuilder class.
 *
 * Extracted from grammar.ts for manageability.
 */

import { SvgNode, SvgStyle, CvgElementAttrs, FilterDef, ClipPathDef, ClipPathShape } from './types';
import { parseTransform } from './transform';
import { type GradientDef } from './grammar-types';
import { normalizePath } from './normalizer';
import {
  parseStyleAttr, parseNum, parseFontSize, parseDyEm, parseFilterRegion,
  applyOpacityToColor, resolveFillColor, effectiveAlpha,
  resolveStrokeColor, normalizeColor, computePathBounds,
} from './grammar-utils';
import { gaussianBlur } from './blur';
import { fillRectInBuffer, fillCircleInBuffer, applyClipMask, parseColorToRGBA } from './rasterize';
import { uint8ArrayToBase64 } from './grammar-utils';
import { CvgContext } from './grammar-context';
import { CvgElement } from './grammar-element';

const proto = CvgContext.prototype as any;

/** Defs element — run the builder so child elements (gradients, etc.) are registered. */
proto.defs = function (this: any, _attrs?: CvgElementAttrs, builder?: () => void): void {
  if (builder) builder();
};

/** Register a gradient definition for url(#id) resolution. */
proto.registerGradient = function (this: any, id: string, def: GradientDef): void {
  this.gradients.set(id, def);
};

/** Look up a registered gradient by id. */
proto.getGradient = function (this: any, id: string): GradientDef | undefined {
  return this.gradients.get(id);
};

/** Register a filter definition. */
proto.registerFilter = function (this: any, id: string, def: FilterDef): void {
  this.filters.set(id, def);
};

/** Look up a registered filter by id. */
proto.getFilter = function (this: any, id: string): FilterDef | undefined {
  return this.filters.get(id);
};

/** Register a clipPath definition. */
proto.registerClipPath = function (this: any, id: string, def: ClipPathDef): void {
  this.clipPaths.set(id, def);
};

/** Look up a registered clipPath by id. */
proto.getClipPath = function (this: any, id: string): ClipPathDef | undefined {
  return this.clipPaths.get(id);
};

/** Parse a <filter> node and register it. */
proto.filter = function (this: any, node: SvgNode): void {
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
};

/** Parse a <clipPath> node and register it. */
proto.clipPath = function (this: any, node: SvgNode): void {
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
};

/**
 * Pre-render an element as a raster image (for filter/clipPath support).
 * Returns an CvgElement wrapping the created canvasRaster.
 */
proto.renderAsRaster = function (
  this: any,
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
};

/** Parse a linearGradient or radialGradient node and register its stops + geometry. */
proto.linearGradient = function (this: any, node: SvgNode): void {
  const id = node.attrs.id;
  if (!id) return;

  // Parse own stops
  let stops = node.children
    .filter((c: SvgNode) => c.tag === 'stop')
    .map((c: SvgNode) => {
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
};

/** Text element — renders text using canvasText. Supports tspan children for multi-line. */
proto.text = function (this: any, attrs: CvgElementAttrs, content?: string, tspans?: SvgNode[]): CvgElement {
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
};

/** Use element — clone and render a referenced element with optional transform. */
proto.use = function (this: any, attrs: CvgElementAttrs): void {
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
};

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
proto.pathBuilder = function (this: any): PathBuilder {
  return new PathBuilder(this);
};

/** Internal: render a PathBuilder's accumulated commands. */
proto._renderPath = function (
  this: any,
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
};

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
    return (this.ctx as any)._renderPath(d, {
      fill: this._fill,
      stroke: this._stroke,
      strokeWidth: this._strokeWidth,
    });
  }
}
