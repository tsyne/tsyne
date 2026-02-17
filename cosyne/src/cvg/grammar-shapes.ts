/**
 * CVG Grammar — CvgContext SVG shape methods (prototype augmentation).
 *
 * Adds to CvgContext.prototype:
 * - g, nestedSvg, renderSlicedNestedSvg, rasterizeNode
 * - path, circle, ellipse, rect, line, polyline, polygon, desc
 *
 * Extracted from grammar.ts for manageability.
 */

import { SvgNode, SvgStyle, CvgElementAttrs } from './types';
import { AffineMatrix, parseTransform, ProjectiveMatrix, composeTransforms, type Transform2D } from './transform';
import { normalizePath } from './normalizer';
import { parseViewBox } from './parser';
import { type ViewBoxMapping } from './grammar-types';
import {
  parseStyleAttr, parseNum,
  uint8ArrayToBase64, applyOpacityToColor, resolveFillColor,
  effectiveAlpha, effectiveStrokeAlpha, resolveStrokeColor, resolveGradientStroke,
  normalizeColor, parsePreserveAspectRatio, transformPathToBuffer, resolveGradientFill,
  pointsToPath, computePathBounds,
} from './grammar-utils';
import { fillRectInBuffer, fillCircleInBuffer, fillPathInBuffer, parseColorToRGBA } from './rasterize';
import { CvgContext } from './grammar-context';
import { CvgElement } from './grammar-element';

const proto = CvgContext.prototype as any;

// ─── SVG Element Methods ─────────────────────────────────────

/** Group element — pushes style, transform, and optional when predicate onto stacks, runs builder, pops all. */
proto.g = function (this: any, attrs: CvgElementAttrs, builder: () => void): void {
  this.pushStyle(attrs);
  this.pushTransform(attrs);
  if (attrs.when) this.whenStack.push(attrs.when);
  builder();
  if (attrs.when) this.whenStack.pop();
  this.popTransform();
  this.popStyle();
};

/** Nested <svg> element — applies viewport transform with preserveAspectRatio. */
proto.nestedSvg = function (this: any, attrs: CvgElementAttrs, children: SvgNode[], builder: () => void): void {
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
};

/** Render a nested SVG in slice mode as a clipped raster buffer. */
proto.renderSlicedNestedSvg = function (
  this: any,
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
};

/** Recursively rasterize an SvgNode tree into a pixel buffer for slice clipping. */
proto.rasterizeNode = function (
  this: any,
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
};

/** Path element — normalizes d, maps coords, renders via canvasPath. */
proto.path = function (this: any, attrs: CvgElementAttrs): CvgElement {
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
  el.setPathResize(this.mapping, (newMapping: ViewBoxMapping) => {
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
};

/** Circle element. */
proto.circle = function (this: any, attrs: CvgElementAttrs): CvgElement {
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
      (buf: Uint8Array, bufW: number, bufH: number, offX: number, offY: number, r: number, g: number, b: number, a: number) => {
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
};

/** Ellipse element — renders as a path for full stroke/fill support. */
proto.ellipse = function (this: any, attrs: CvgElementAttrs): CvgElement {
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
};

/** Rect element. */
proto.rect = function (this: any, attrs: CvgElementAttrs): CvgElement {
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
      (buf: Uint8Array, bufW: number, bufH: number, offX: number, offY: number, r: number, g: number, b: number, a: number) => {
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
};

/** Line element. */
proto.line = function (this: any, attrs: CvgElementAttrs): CvgElement {
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
};

/** Polyline element — convert points to a path. */
proto.polyline = function (this: any, attrs: CvgElementAttrs): CvgElement {
  if (!attrs.points) return new CvgElement(null);
  const pts = typeof attrs.points === 'string'
    ? attrs.points
    : attrs.points.map(([x, y]: [number, number]) => `${x},${y}`).join(' ');
  const d = pointsToPath(pts, false);
  // path() handles transform push/pop itself, pass attrs through
  return this.path({ ...attrs, d });
};

/** Polygon element — convert points to a closed path. */
proto.polygon = function (this: any, attrs: CvgElementAttrs): CvgElement {
  if (!attrs.points) return new CvgElement(null);
  const pts = typeof attrs.points === 'string'
    ? attrs.points
    : attrs.points.map(([x, y]: [number, number]) => `${x},${y}`).join(' ');
  const d = pointsToPath(pts, true);
  return this.path({ ...attrs, d });
};

/** Desc element — ignored (metadata only). */
proto.desc = function (this: any, _attrs?: CvgElementAttrs): void {};
