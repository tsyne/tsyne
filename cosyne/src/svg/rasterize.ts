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
