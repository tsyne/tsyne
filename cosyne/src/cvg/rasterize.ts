/**
 * Software rasterizer for filling shapes into RGBA pixel buffers.
 * Used by the SVG filter/clipPath pipeline to pre-render elements.
 */

/** Named CSS colors (subset used in SVG). */
const CSS_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], green: [0, 128, 0],
  blue: [0, 0, 255], yellow: [255, 255, 0], cyan: [0, 255, 255], magenta: [255, 0, 255],
  orange: [255, 165, 0], gray: [128, 128, 128], grey: [128, 128, 128],
  silver: [192, 192, 192], maroon: [128, 0, 0], olive: [128, 128, 0],
  lime: [0, 255, 0], aqua: [0, 255, 255], teal: [0, 128, 128],
  navy: [0, 0, 128], fuchsia: [255, 0, 255], purple: [128, 0, 128],
  darkred: [139, 0, 0], darkgreen: [0, 100, 0], darkblue: [0, 0, 139],
  lightgray: [211, 211, 211], lightgrey: [211, 211, 211],
  dimgray: [105, 105, 105], dimgrey: [105, 105, 105],
  coral: [255, 127, 80], crimson: [220, 20, 60], gold: [255, 215, 0],
  indigo: [75, 0, 130], khaki: [240, 230, 140], lavender: [230, 230, 250],
  pink: [255, 192, 203], plum: [221, 160, 221], salmon: [250, 128, 114],
  sienna: [160, 82, 45], tan: [210, 180, 140], tomato: [255, 99, 71],
  turquoise: [64, 224, 208], violet: [238, 130, 238], wheat: [245, 222, 179],
};

/**
 * Parse a CSS color string to [r, g, b, a] (0-255 each).
 * Handles: hex (#rgb, #rrggbb), rgb(), rgba(), named colors.
 */
export function parseColorToRGBA(cssColor: string): [number, number, number, number] {
  const c = cssColor.trim().toLowerCase();

  // Hex
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        255,
      ];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        255,
      ];
    }
    if (hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        parseInt(hex.slice(6, 8), 16),
      ];
    }
  }

  // rgba(r, g, b, a)
  const rgbaMatch = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    const a = rgbaMatch[4] !== undefined ? Math.round(parseFloat(rgbaMatch[4]) * 255) : 255;
    return [+rgbaMatch[1], +rgbaMatch[2], +rgbaMatch[3], a];
  }

  // Named
  const named = CSS_COLORS[c];
  if (named) return [named[0], named[1], named[2], 255];

  // Fallback: black
  return [0, 0, 0, 255];
}

/**
 * Fill a rectangular region in an RGBA pixel buffer.
 * Coordinates are in buffer pixel space. Out-of-bounds pixels are clipped.
 */
export function fillRectInBuffer(
  buf: Uint8Array,
  bufW: number,
  bufH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const x0 = Math.max(Math.round(x), 0);
  const y0 = Math.max(Math.round(y), 0);
  const x1 = Math.min(Math.round(x + w), bufW);
  const y1 = Math.min(Math.round(y + h), bufH);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const idx = (py * bufW + px) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }
}

/**
 * Fill a circle in an RGBA pixel buffer.
 * Uses distance-based anti-aliasing at the edges.
 */
export function fillCircleInBuffer(
  buf: Uint8Array,
  bufW: number,
  bufH: number,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const x0 = Math.max(Math.floor(cx - radius - 1), 0);
  const y0 = Math.max(Math.floor(cy - radius - 1), 0);
  const x1 = Math.min(Math.ceil(cx + radius + 1), bufW);
  const y1 = Math.min(Math.ceil(cy + radius + 1), bufH);
  const r2 = radius * radius;

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        const idx = (py * bufW + px) * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = a;
      }
    }
  }
}

// ─── SVG Path Rasterizer ───────────────────────────────────────────

interface Edge {
  x1: number; y1: number;
  x2: number; y2: number;
}

/** Flatten a cubic Bezier curve into line segment edges via recursive subdivision. */
function flattenCubic(
  x0: number, y0: number,
  cp1x: number, cp1y: number,
  cp2x: number, cp2y: number,
  x3: number, y3: number,
  edges: Edge[],
  depth = 0,
): void {
  const tolerance = 0.5;
  if (depth < 8) {
    const dx = x3 - x0;
    const dy = y3 - y0;
    const d2 = dx * dx + dy * dy;
    if (d2 > 0.001) {
      const invLen = 1 / Math.sqrt(d2);
      const d1 = Math.abs((cp1x - x0) * dy - (cp1y - y0) * dx) * invLen;
      const d2v = Math.abs((cp2x - x0) * dy - (cp2y - y0) * dx) * invLen;
      if (d1 > tolerance || d2v > tolerance) {
        const mx01 = (x0 + cp1x) / 2, my01 = (y0 + cp1y) / 2;
        const mx12 = (cp1x + cp2x) / 2, my12 = (cp1y + cp2y) / 2;
        const mx23 = (cp2x + x3) / 2, my23 = (cp2y + y3) / 2;
        const mx012 = (mx01 + mx12) / 2, my012 = (my01 + my12) / 2;
        const mx123 = (mx12 + mx23) / 2, my123 = (my12 + my23) / 2;
        const mid = [(mx012 + mx123) / 2, (my012 + my123) / 2];
        flattenCubic(x0, y0, mx01, my01, mx012, my012, mid[0], mid[1], edges, depth + 1);
        flattenCubic(mid[0], mid[1], mx123, my123, mx23, my23, x3, y3, edges, depth + 1);
        return;
      }
    }
  }
  edges.push({ x1: x0, y1: y0, x2: x3, y2: y3 });
}

/** Parse a normalized SVG path string (M, L, C, Z only) into line segment edges.
 *  offX/offY are added to all coordinates. */
function pathToEdges(pathStr: string, offX: number, offY: number): Edge[] {
  const edges: Edge[] = [];
  let cx = 0, cy = 0;
  let sx = 0, sy = 0;
  const re = /([MLCZ])\s*([-\d\s.e+]*)/gi;
  let match;
  while ((match = re.exec(pathStr)) !== null) {
    const cmd = match[1].toUpperCase();
    const nums = match[2].trim();
    if (cmd === 'Z') {
      if (Math.abs(cx - sx) > 0.01 || Math.abs(cy - sy) > 0.01) {
        edges.push({ x1: cx, y1: cy, x2: sx, y2: sy });
      }
      cx = sx; cy = sy;
      continue;
    }
    if (!nums) continue;
    const values = nums.split(/\s+/).map(Number);
    switch (cmd) {
      case 'M':
        cx = values[0] + offX; cy = values[1] + offY;
        sx = cx; sy = cy;
        break;
      case 'L':
        edges.push({ x1: cx, y1: cy, x2: values[0] + offX, y2: values[1] + offY });
        cx = values[0] + offX; cy = values[1] + offY;
        break;
      case 'C':
        flattenCubic(cx, cy,
          values[0] + offX, values[1] + offY,
          values[2] + offX, values[3] + offY,
          values[4] + offX, values[5] + offY,
          edges);
        cx = values[4] + offX; cy = values[5] + offY;
        break;
    }
  }
  return edges;
}

/**
 * Fill an SVG path into an RGBA pixel buffer using scanline rendering.
 * Path must be normalized (M, L, C, Z commands only, absolute coordinates).
 * offX/offY are added to all path coordinates to convert to buffer space.
 */
export function fillPathInBuffer(
  buf: Uint8Array,
  bufW: number,
  bufH: number,
  pathStr: string,
  offX: number,
  offY: number,
  r: number,
  g: number,
  b: number,
  a: number,
  fillRule: 'nonzero' | 'evenodd' = 'nonzero',
): void {
  const edges = pathToEdges(pathStr, offX, offY);
  if (edges.length === 0) return;

  for (let y = 0; y < bufH; y++) {
    const scanY = y + 0.5;
    const crossings: { x: number; dir: number }[] = [];
    for (const edge of edges) {
      if ((edge.y1 <= scanY && edge.y2 > scanY) || (edge.y2 <= scanY && edge.y1 > scanY)) {
        const t = (scanY - edge.y1) / (edge.y2 - edge.y1);
        const x = edge.x1 + t * (edge.x2 - edge.x1);
        const dir = edge.y2 > edge.y1 ? 1 : -1;
        crossings.push({ x, dir });
      }
    }
    if (crossings.length === 0) continue;
    crossings.sort((ca, cb) => ca.x - cb.x);

    if (fillRule === 'evenodd') {
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const x0 = Math.max(Math.round(crossings[i].x), 0);
        const x1 = Math.min(Math.round(crossings[i + 1].x), bufW);
        for (let px = x0; px < x1; px++) {
          const idx = (y * bufW + px) * 4;
          buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
        }
      }
    } else {
      let winding = 0;
      let spanStart = -1;
      for (const crossing of crossings) {
        const prevWinding = winding;
        winding += crossing.dir;
        if (prevWinding === 0 && winding !== 0) {
          spanStart = crossing.x;
        } else if (prevWinding !== 0 && winding === 0) {
          const x0 = Math.max(Math.round(spanStart), 0);
          const x1 = Math.min(Math.round(crossing.x), bufW);
          for (let px = x0; px < x1; px++) {
            const idx = (y * bufW + px) * 4;
            buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
          }
        }
      }
    }
  }
}

/**
 * Multiply target alpha by mask alpha for each pixel (in-place on target).
 * Both buffers must have the same pixel count.
 */
export function applyClipMask(
  target: Uint8Array,
  mask: Uint8Array,
  pixelCount: number,
): void {
  for (let i = 0; i < pixelCount; i++) {
    const ti = i * 4 + 3; // target alpha
    const mi = i * 4 + 3; // mask alpha
    target[ti] = Math.round((target[ti] * mask[mi]) / 255);
  }
}
