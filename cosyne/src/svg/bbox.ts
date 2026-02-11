/**
 * SVG Content Bounding Box
 *
 * Walks a parsed SvgNode tree and computes the axis-aligned bounding box
 * of all rendered elements. Used to determine the intrinsic size of SVGs
 * that lack explicit width/height/viewBox attributes.
 */

import { SvgNode } from './types';
import { AffineMatrix, parseTransform } from './transform';
import { parsePath, normalizeCommands } from './normalizer';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Tags that produce no rendered content — skip during bbox walk. */
const SKIP_TAGS = new Set(['defs', 'style', 'filter', 'clipPath', 'desc', 'title', 'metadata', 'symbol']);

/**
 * Compute the content bounding box of all rendered elements in the SVG tree.
 * Returns null if the tree has no renderable elements.
 */
export function computeContentBounds(root: SvgNode): Bounds | null {
  let bounds: Bounds | null = null;

  for (const child of root.children) {
    const b = nodeBounds(child, AffineMatrix.identity());
    if (b) bounds = unionBounds(bounds, b);
  }

  return bounds;
}

function nodeBounds(node: SvgNode, parentTransform: AffineMatrix): Bounds | null {
  if (SKIP_TAGS.has(node.tag)) return null;

  const localTransform = node.attrs.transform
    ? parentTransform.multiply(parseTransform(node.attrs.transform))
    : parentTransform;

  const sw = getStrokeWidth(node);

  switch (node.tag) {
    case 'circle':
      return circleBounds(node, localTransform, sw);
    case 'ellipse':
      return ellipseBounds(node, localTransform, sw);
    case 'rect':
      return rectBounds(node, localTransform, sw);
    case 'line':
      return lineBounds(node, localTransform, sw);
    case 'polyline':
    case 'polygon':
      return polyBounds(node, localTransform, sw);
    case 'path':
      return pathBounds(node, localTransform, sw);
    case 'text':
      return textBounds(node, localTransform);
    case 'g':
    case 'a':
    case 'svg': {
      let bounds: Bounds | null = null;
      for (const child of node.children) {
        const b = nodeBounds(child, localTransform);
        if (b) bounds = unionBounds(bounds, b);
      }
      return bounds;
    }
    default: {
      // Unknown element — recurse into children
      let bounds: Bounds | null = null;
      for (const child of node.children) {
        const b = nodeBounds(child, localTransform);
        if (b) bounds = unionBounds(bounds, b);
      }
      return bounds;
    }
  }
}

// ─── Element-specific bbox calculations ──────────────────────────

function circleBounds(node: SvgNode, transform: AffineMatrix, sw: number): Bounds | null {
  const cx = parseLengthToPx(node.attrs.cx) || 0;
  const cy = parseLengthToPx(node.attrs.cy) || 0;
  const r = parseLengthToPx(node.attrs.r);
  if (r <= 0) return null;
  const half = sw / 2;
  const localBounds: Bounds = {
    minX: cx - r - half,
    minY: cy - r - half,
    maxX: cx + r + half,
    maxY: cy + r + half,
  };
  return transformBounds(localBounds, transform);
}

function ellipseBounds(node: SvgNode, transform: AffineMatrix, sw: number): Bounds | null {
  const cx = parseLengthToPx(node.attrs.cx) || 0;
  const cy = parseLengthToPx(node.attrs.cy) || 0;
  const rx = parseLengthToPx(node.attrs.rx);
  const ry = parseLengthToPx(node.attrs.ry);
  if (rx <= 0 || ry <= 0) return null;
  const half = sw / 2;
  const localBounds: Bounds = {
    minX: cx - rx - half,
    minY: cy - ry - half,
    maxX: cx + rx + half,
    maxY: cy + ry + half,
  };
  return transformBounds(localBounds, transform);
}

function rectBounds(node: SvgNode, transform: AffineMatrix, sw: number): Bounds | null {
  const x = parseLengthToPx(node.attrs.x) || 0;
  const y = parseLengthToPx(node.attrs.y) || 0;
  const w = parseLengthToPx(node.attrs.width);
  const h = parseLengthToPx(node.attrs.height);
  if (w <= 0 || h <= 0) return null;
  const half = sw / 2;
  const localBounds: Bounds = {
    minX: x - half,
    minY: y - half,
    maxX: x + w + half,
    maxY: y + h + half,
  };
  return transformBounds(localBounds, transform);
}

function lineBounds(node: SvgNode, transform: AffineMatrix, sw: number): Bounds | null {
  const x1 = parseLengthToPx(node.attrs.x1) || 0;
  const y1 = parseLengthToPx(node.attrs.y1) || 0;
  const x2 = parseLengthToPx(node.attrs.x2) || 0;
  const y2 = parseLengthToPx(node.attrs.y2) || 0;
  const half = sw / 2;
  const localBounds: Bounds = {
    minX: Math.min(x1, x2) - half,
    minY: Math.min(y1, y2) - half,
    maxX: Math.max(x1, x2) + half,
    maxY: Math.max(y1, y2) + half,
  };
  return transformBounds(localBounds, transform);
}

function polyBounds(node: SvgNode, transform: AffineMatrix, sw: number): Bounds | null {
  const pointsStr = node.attrs.points;
  if (!pointsStr) return null;
  const nums = pointsStr.trim().split(/[\s,]+/).map(Number);
  if (nums.length < 2) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const px = nums[i], py = nums[i + 1];
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  const half = sw / 2;
  return transformBounds({
    minX: minX - half,
    minY: minY - half,
    maxX: maxX + half,
    maxY: maxY + half,
  }, transform);
}

function pathBounds(node: SvgNode, transform: AffineMatrix, sw: number): Bounds | null {
  const d = node.attrs.d;
  if (!d) return null;
  const cmds = normalizeCommands(parsePath(d));
  if (cmds.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasPoints = false;

  for (const cmd of cmds) {
    if (cmd.type === 'Z') continue;
    // M: [x, y], L: [x, y], C: [x1, y1, x2, y2, x3, y3]
    for (let i = 0; i + 1 < cmd.args.length; i += 2) {
      const px = cmd.args[i], py = cmd.args[i + 1];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
      hasPoints = true;
    }
  }

  if (!hasPoints) return null;
  const half = sw / 2;
  return transformBounds({
    minX: minX - half,
    minY: minY - half,
    maxX: maxX + half,
    maxY: maxY + half,
  }, transform);
}

function textBounds(node: SvgNode, transform: AffineMatrix): Bounds | null {
  const x = parseLengthToPx(node.attrs.x) || 0;
  const y = parseLengthToPx(node.attrs.y) || 0;
  const fontSize = parseLengthToPx(node.attrs['font-size']) || 16;
  const text = node.text || '';
  if (!text) return null;
  // Approximate: text baseline at (x, y), ascent ~fontSize, width ~0.6 * fontSize per char
  const localBounds: Bounds = {
    minX: x,
    minY: y - fontSize,
    maxX: x + fontSize * text.length * 0.6,
    maxY: y,
  };
  return transformBounds(localBounds, transform);
}

// ─── Utilities ───────────────────────────────────────────────────

/** Apply an affine transform to the 4 corners of a bounds, return the AABB. */
function transformBounds(bounds: Bounds, transform: AffineMatrix): Bounds {
  if (transform.isIdentity()) return bounds;

  const corners: [number, number][] = [
    [bounds.minX, bounds.minY],
    [bounds.maxX, bounds.minY],
    [bounds.minX, bounds.maxY],
    [bounds.maxX, bounds.maxY],
  ];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [cx, cy] of corners) {
    const [tx, ty] = transform.apply(cx, cy);
    if (tx < minX) minX = tx;
    if (ty < minY) minY = ty;
    if (tx > maxX) maxX = tx;
    if (ty > maxY) maxY = ty;
  }

  return { minX, minY, maxX, maxY };
}

function unionBounds(a: Bounds | null, b: Bounds): Bounds {
  if (!a) return b;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** Extract stroke-width from inline style or element attribute. */
function getStrokeWidth(node: SvgNode): number {
  // Check inline style first (e.g. style="stroke-width:0.1cm")
  const style = node.attrs.style;
  if (style) {
    const m = /stroke-width\s*:\s*([^;]+)/i.exec(style);
    if (m) return parseLengthToPx(m[1].trim());
  }
  // Then check attribute
  if (node.attrs['stroke-width']) {
    return parseLengthToPx(node.attrs['stroke-width']);
  }
  return 0;
}

/** Convert a CSS length value (possibly with units) to px. */
function parseLengthToPx(v: any): number {
  if (v === undefined || v === null) return 0;
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
