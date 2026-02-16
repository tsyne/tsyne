/**
 * CVG Grammar — Standalone utility functions.
 *
 * Parsing, color resolution, gradient helpers, and coordinate transforms
 * extracted from grammar.ts to reduce file size.
 */

import { SvgStyle } from './types';
import { GradientDef } from './grammar-types';
import type { Transform2D } from './transform';

/** @internal Minimal interface for utility functions that need CvgContext — avoids circular import. */
export interface CvgContextLike {
  getGradient(id: string): GradientDef | undefined;
  mapX(svgX: number): number;
  mapY(svgY: number): number;
}

// ─── Parsing helpers ────────────────────────────────────────────

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

export function parseNum(v: any): number {
  if (typeof v === 'number') return v;
  return parseLengthToPx(v);
}

/** Convert a CSS length value (possibly with units) to px. */
export function parseLengthToPx(v: any): number {
  const s = String(v).trim();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (s.endsWith('cm')) return n * 37.7953;
  if (s.endsWith('mm')) return n * 3.77953;
  if (s.endsWith('in')) return n * 96;
  if (s.endsWith('pt')) return n * 1.333;
  if (s.endsWith('pc')) return n * 16;
  return n; // px or unitless
}

/** Parse a font-size value, handling pt/px/em units. Returns size in px (SVG user units). */
export function parseFontSize(v: any): number {
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s.endsWith('pt')) return parseFloat(s) * 1.333;
  if (s.endsWith('em')) return parseFloat(s) * 16;
  if (s.endsWith('px')) return parseFloat(s);
  return parseFloat(s) || 0;
}

/** Parse a dy/dx value that may be in 'em' units (e.g. "1.1em") or plain numbers. */
export function parseDyEm(v: string, fontSize: number): number {
  const s = v.trim();
  if (s.endsWith('em')) {
    return parseFloat(s) * fontSize;
  }
  return parseFloat(s) || 0;
}

/** Parse a filter region attribute (percentage or fraction), returning a fraction. */
export function parseFilterRegion(val: string | undefined, fallback: number): number {
  if (val === undefined) return fallback;
  if (val.endsWith('%')) return parseFloat(val) / 100;
  return parseNum(val);
}

/** Extract the id from a url(#id) reference. */
export function extractUrlId(str: string): string | undefined {
  const m = str.match(/url\(#([^)]+)\)/);
  return m ? m[1] : undefined;
}

/** Convert a Uint8Array to a base64 string. Works in both Node.js and browser. */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
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

// ─── Color helpers ──────────────────────────────────────────────

/** Named CSS colors used in SVG gradients. */
export const CSS_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], green: [0, 128, 0],
  blue: [0, 0, 255], yellow: [255, 255, 0], cyan: [0, 255, 255], magenta: [255, 0, 255],
  orange: [255, 165, 0], gray: [128, 128, 128], grey: [128, 128, 128],
  silver: [192, 192, 192], maroon: [128, 0, 0], olive: [128, 128, 0],
  lime: [0, 255, 0], aqua: [0, 255, 255], teal: [0, 128, 128],
  navy: [0, 0, 128], fuchsia: [255, 0, 255], purple: [128, 0, 128],
};

/** Apply opacity to a CSS color, returning an rgba() string. */
export function applyOpacityToColor(color: string, opacity: number): string {
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

export function resolveFillColor(fill: string | undefined, ctx?: CvgContextLike, alpha?: number): string | undefined {
  if (fill === 'none') return undefined;
  let color: string;
  if (fill) {
    const urlMatch = fill.match(/url\(#([^)]+)\)/);
    if (urlMatch) {
      const grad = ctx?.getGradient(urlMatch[1]);
      // Use first gradient stop as fallback, or extract fallback color after url()
      const fallback = fill.replace(/url\([^)]*\)\s*/, '').trim();
      color = (grad && grad.stops.length > 0) ? grad.stops[0].color : (fallback || 'black');
    } else {
      color = fill;
    }
  } else {
    color = 'black';
  }
  if (alpha !== undefined && alpha < 1) {
    return applyOpacityToColor(color, alpha);
  }
  return normalizeColor(color);
}

/** Compute effective fill alpha from opacity and fill-opacity (both default to 1). */
export function effectiveAlpha(style: SvgStyle): number | undefined {
  const o = style.opacity ?? 1;
  const fo = style.fillOpacity ?? 1;
  const a = o * fo;
  return a < 1 ? a : undefined;
}

export function effectiveStrokeAlpha(style: SvgStyle): number | undefined {
  const o = style.opacity ?? 1;
  const so = style.strokeOpacity ?? 1;
  const a = o * so;
  return a < 1 ? a : undefined;
}

/** Resolve a stroke color, applying stroke-opacity and element opacity.
 *  Returns undefined if stroke is a gradient reference (url(#id)). */
export function resolveStrokeColor(style: SvgStyle): string | undefined {
  if (!style.stroke || style.stroke === 'none') return undefined;
  // Gradient references: extract fallback color if present
  if (style.stroke.startsWith('url(')) {
    const fallback = style.stroke.replace(/url\([^)]*\)\s*/, '').trim();
    if (!fallback) return undefined;
    const color = normalizeColor(fallback);
    const alpha = effectiveStrokeAlpha(style);
    if (alpha !== undefined) return applyOpacityToColor(color, alpha);
    return color;
  }
  const color = normalizeColor(style.stroke);
  const alpha = effectiveStrokeAlpha(style);
  if (alpha !== undefined) {
    return applyOpacityToColor(color, alpha);
  }
  return color;
}

/** Resolve a stroke value to a GradientDef if it references a gradient, undefined otherwise. */
export function resolveGradientStroke(stroke: string | undefined, ctx?: CvgContextLike): GradientDef | undefined {
  if (!stroke || stroke === 'none') return undefined;
  const urlMatch = stroke.match(/url\(#([^)]+)\)/);
  if (!urlMatch) return undefined;
  return ctx?.getGradient(urlMatch[1]);
}

/** Normalize CSS color formats (rgb(), named) to hex. */
export function normalizeColor(color: string): string {
  const c = color.trim();
  const rgbMatch = c.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  // Named CSS colors → hex
  const named = CSS_COLORS[c.toLowerCase()];
  if (named) {
    return `#${named[0].toString(16).padStart(2, '0')}${named[1].toString(16).padStart(2, '0')}${named[2].toString(16).padStart(2, '0')}`;
  }
  return c;
}

/** Parse preserveAspectRatio attribute value. */
export function parsePreserveAspectRatio(par: string): { alignX: string; alignY: string; meetOrSlice: string } {
  const parts = par.trim().split(/\s+/);
  const align = parts[0] || 'xMidYMid';
  const meetOrSlice = parts[1] || 'meet';
  const m = align.match(/^x(Min|Mid|Max)Y(Min|Mid|Max)$/);
  if (!m) return { alignX: 'Mid', alignY: 'Mid', meetOrSlice };
  return { alignX: m[1], alignY: m[2], meetOrSlice };
}

/** Transform a normalized path (M, L, C, Z) to buffer pixel coordinates. */
export function transformPathToBuffer(
  pathStr: string,
  xform: Transform2D,
  ctx: CvgContextLike,
  px0: number,
  py0: number,
): string {
  const re = /([MLCZ])\s*([-\d\s.e+]*)/gi;
  let result = '';
  let match;
  while ((match = re.exec(pathStr)) !== null) {
    const cmd = match[1].toUpperCase();
    if (cmd === 'Z') { result += 'Z '; continue; }
    const nums = match[2].trim();
    if (!nums) continue;
    const values = nums.split(/\s+/).map(Number);
    switch (cmd) {
      case 'M':
      case 'L': {
        const [tx, ty] = xform.apply(values[0], values[1]);
        result += `${cmd} ${ctx.mapX(tx) - px0} ${ctx.mapY(ty) - py0} `;
        break;
      }
      case 'C': {
        const [tx1, ty1] = xform.apply(values[0], values[1]);
        const [tx2, ty2] = xform.apply(values[2], values[3]);
        const [tx3, ty3] = xform.apply(values[4], values[5]);
        result += `C ${ctx.mapX(tx1) - px0} ${ctx.mapY(ty1) - py0} ${ctx.mapX(tx2) - px0} ${ctx.mapY(ty2) - py0} ${ctx.mapX(tx3) - px0} ${ctx.mapY(ty3) - py0} `;
        break;
      }
    }
  }
  return result;
}

/** Resolve a fill value to a GradientDef if it references a gradient, undefined otherwise. */
export function resolveGradientFill(fill: string | undefined, ctx?: CvgContextLike): GradientDef | undefined {
  if (!fill || fill === 'none') return undefined;
  const urlMatch = fill.match(/url\(#([^)]+)\)/);
  if (!urlMatch) return undefined;
  return ctx?.getGradient(urlMatch[1]);
}

export function pointsToPath(points: string, closed: boolean): string {
  const nums = points.trim().split(/[\s,]+/).map(Number);
  if (nums.length < 2) return '';
  let d = `M ${nums[0]} ${nums[1]}`;
  for (let i = 2; i + 1 < nums.length; i += 2) {
    d += ` L ${nums[i]} ${nums[i + 1]}`;
  }
  if (closed) d += ' Z';
  return d;
}

export function computePathBounds(mapped: string): { minX: number; minY: number; maxX: number; maxY: number } {
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
