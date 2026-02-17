/**
 * CVG Grammar — CvgContext rendering methods (prototype augmentation).
 *
 * Adds to CvgContext.prototype:
 * - enableEvents, refresh
 * - CSS: registerCssStyle, getCssProps
 * - Node traversal: setWalkNode, indexNodes
 * - Style stack: currentStyle, pushStyle, popStyle
 * - Transform stack: currentTransform, pushTransform, popTransform
 * - Coordinate mapping: mapPoint, resolveStyle, mapX, mapY, mapLength, parseLenX, parseLenY, mapStrokeWidth
 * - Gradient: buildFillGradient
 * - Path mapping: remapPath, mapPathCoords
 * - Event wiring: wireEventHandlers, resolveWhen
 *
 * Extracted from grammar.ts for manageability.
 */

import { SvgNode, SvgStyle, CvgElementAttrs } from './types';
import { AffineMatrix, parseTransform, composeTransforms, transformFromSpec, type Transform2D } from './transform';
import { type GradientDef, type ViewBoxMapping } from './grammar-types';
import {
  parseStyleAttr, parseNum, parseFontSize, parseDyEm,
  extractUrlId, applyOpacityToColor,
} from './grammar-utils';
import { CvgContext } from './grammar-context';
import { CvgElement } from './grammar-element';

const proto = CvgContext.prototype as any;

/** Create a TappableCanvasRaster overlay that forwards taps and hovers to SVG element hit testing. */
proto.enableEvents = function (this: any): any {
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
};

/** Re-evaluate all .when() predicates, property bindings, binding regions, and show/hide elements.
 *  Call this after state changes that affect .when() conditions, bound properties, or data lists. */
proto.refresh = async function (this: any): Promise<void> {
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
};

/** Parse a CSS <style> block and register rules for class/element selectors. */
proto.registerCssStyle = function (this: any, cssText: string): void {
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
};

/** Get CSS properties that apply to an element with given tag and class attribute. */
proto.getCssProps = function (this: any, tag: string, className?: string): Record<string, string> {
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
};

/** Register the walkNode callback for <use> element support. */
proto.setWalkNode = function (this: any, fn: (s: CvgContext, node: SvgNode) => void): void {
  this.walkNodeFn = fn;
};

/** Index all nodes by id for <use> lookups. */
proto.indexNodes = function (this: any, root: SvgNode): void {
  const walk = (node: SvgNode) => {
    if (node.attrs.id) this.nodesById.set(node.attrs.id, node);
    for (const child of node.children) walk(child);
  };
  walk(root);
};

// ─── Style stack ─────────────────────────────────────────────

proto.currentStyle = function (this: any): SvgStyle {
  return this.styleStack[this.styleStack.length - 1];
};

proto.pushStyle = function (this: any, attrs: CvgElementAttrs): void {
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
};

proto.popStyle = function (this: any): void {
  if (this.styleStack.length > 1) this.styleStack.pop();
};

// ─── Transform stack ──────────────────────────────────────────

proto.currentTransform = function (this: any): Transform2D {
  return this.transformStack[this.transformStack.length - 1];
};

proto.pushTransform = function (this: any, attrs: CvgElementAttrs): void {
  const parent = this.currentTransform();
  if (attrs.transform) {
    const local = typeof attrs.transform === 'string'
      ? parseTransform(attrs.transform)
      : transformFromSpec(attrs.transform);
    this.transformStack.push(composeTransforms(parent, local));
  } else {
    this.transformStack.push(parent);
  }
};

proto.popTransform = function (this: any): void {
  if (this.transformStack.length > 1) this.transformStack.pop();
};

/** Apply current transform then viewBox mapping to a point. */
proto.mapPoint = function (this: any, x: number, y: number): [number, number] {
  const [tx, ty] = this.currentTransform().apply(x, y);
  return this.mapping.transform.apply(tx, ty);
};

/** Resolve final style: element attrs override inline style override CSS class override inherited. */
proto.resolveStyle = function (this: any, attrs: CvgElementAttrs): SvgStyle {
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
};

// ─── Coordinate mapping ──────────────────────────────────────

proto.mapX = function (this: any, x: number): number {
  const t = this.mapping.transform;
  return t.a * x + t.e;
};

proto.mapY = function (this: any, y: number): number {
  const t = this.mapping.transform;
  return t.d * y + t.f;
};

proto.mapLength = function (this: any, l: number): number {
  return l * this.mapping.scale;
};

/** Parse a length value, resolving percentages against the viewBox width. */
proto.parseLenX = function (this: any, v: any): number {
  if (typeof v === 'string' && v.endsWith('%')) {
    return (parseFloat(v) / 100) * this.mapping.vb.width;
  }
  return parseNum(v);
};

/** Parse a length value, resolving percentages against the viewBox height. */
proto.parseLenY = function (this: any, v: any): number {
  if (typeof v === 'string' && v.endsWith('%')) {
    return (parseFloat(v) / 100) * this.mapping.vb.height;
  }
  return parseNum(v);
};

/** Map a stroke-width value through viewBox scaling + current transform.
 *  Returns [width, opacityFactor]: sub-pixel strokes are rendered at 1px
 *  with proportionally reduced opacity (matching browser anti-aliasing). */
proto.mapStrokeWidth = function (this: any, raw: number): [number, number] {
  const w = this.mapLength(raw) * this.currentTransform().averageScale();
  if (w < 1) return [1, w];  // e.g. 0.38px → 1px at 38% opacity
  return [w, 1];
};

/** Build a fillGradient object for canvasPath, converting units as needed. */
proto.buildFillGradient = function (
  this: any,
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
};

/** Re-map a normalized path using a specific transform and mapping (for resize). */
proto.remapPath = function (this: any, pathStr: string, xform: Transform2D, mapping: ViewBoxMapping): string {
  return pathStr.replace(
    /([MLCZ])\s*([\d\s.e+-]*)/gi,
    (_: string, cmd: string, nums: string) => {
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
};

proto.mapPathCoords = function (this: any, pathStr: string): string {
  return pathStr.replace(
    /([MLCZ])\s*([\d\s.e+-]*)/gi,
    (_: string, cmd: string, nums: string) => {
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
};

// ─── Event handler wiring ───────────────────────────────────

/** Wire event handlers from attrs onto an CvgElement (consolidates all creation sites). */
proto.wireEventHandlers = function (this: any, el: CvgElement, attrs: CvgElementAttrs): void {
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
};

/** Combine an element's own when predicate with any active group-level when predicates. */
proto.resolveWhen = function (this: any, elementWhen?: () => boolean): (() => boolean) | undefined {
  if (this.whenStack.length === 0) return elementWhen;
  // Snapshot the current stack predicates (they may be popped later)
  const groupPredicates = [...this.whenStack];
  if (!elementWhen) {
    if (groupPredicates.length === 1) return groupPredicates[0];
    return () => groupPredicates.every((p: () => boolean) => p());
  }
  return () => groupPredicates.every((p: () => boolean) => p()) && elementWhen();
};
