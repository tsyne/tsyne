/**
 * Shared test utilities for image effects
 */

export type RGB = { r: number; g: number; b: number };
export type RGBA = RGB & { a: number };

/** Named colors for testing */
export const COLORS = {
  black:   { r: 0,   g: 0,   b: 0   },
  white:   { r: 255, g: 255, b: 255 },
  red:     { r: 255, g: 0,   b: 0   },
  green:   { r: 0,   g: 255, b: 0   },
  blue:    { r: 0,   g: 0,   b: 255 },
  yellow:  { r: 255, g: 255, b: 0   },
  cyan:    { r: 0,   g: 255, b: 255 },
  magenta: { r: 255, g: 0,   b: 255 },
  orange:  { r: 255, g: 153, b: 0   },
  purple:  { r: 153, g: 0,   b: 255 },
  gray50:  { r: 128, g: 128, b: 128 },
  gray25:  { r: 64,  g: 64,  b: 64  },
  gray75:  { r: 192, g: 192, b: 192 },
} as const;

/** Grid layout for createNamedColorGrid */
export const GRID_COLORS = [
  [COLORS.red,    COLORS.green,  COLORS.blue,   COLORS.yellow],
  [COLORS.cyan,   COLORS.magenta,COLORS.orange, COLORS.purple],
  [COLORS.black,  COLORS.gray25, COLORS.gray50, COLORS.gray75],
  [COLORS.white,  COLORS.red,    COLORS.green,  COLORS.blue],
];

/** Create solid color pixel array */
export function createPixels(w: number, h: number, color: RGB = COLORS.gray50): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = color.r;
    px[i + 1] = color.g;
    px[i + 2] = color.b;
    px[i + 3] = 255;
  }
  return px;
}

/** Create 4x4 named color grid (40x40 px, blockSize=10) */
export function createNamedColorGrid(): { pixels: Uint8ClampedArray; width: number; height: number } {
  const blockSize = 10, w = 40, h = 40;
  const px = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const c = GRID_COLORS[row][col];
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const i = ((row * blockSize + by) * w + col * blockSize + bx) * 4;
          px[i] = c.r; px[i + 1] = c.g; px[i + 2] = c.b; px[i + 3] = 255;
        }
      }
    }
  }
  return { pixels: px, width: w, height: h };
}

/** Get pixel at coordinates */
export function getPixel(px: Uint8ClampedArray, w: number, x: number, y: number): RGBA {
  const i = (y * w + x) * 4;
  return { r: px[i], g: px[i + 1], b: px[i + 2], a: px[i + 3] };
}

/** Get center of a block in the named color grid */
export function blockCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * 10 + 5, y: row * 10 + 5 };
}

/** Expected grayscale value using standard luminance formula */
export function toGray(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/** Check if pixels were modified */
export function wasModified(original: Uint8ClampedArray, modified: Uint8ClampedArray): boolean {
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== modified[i]) return true;
  }
  return false;
}

/** Clone pixel array */
export function clonePixels(px: Uint8ClampedArray): Uint8ClampedArray {
  return new Uint8ClampedArray(px);
}

/** Create gradient pixel array (for testing blur/sharpen effects) */
export function createGradientPixels(w: number, h: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = Math.round((x / w) * 255);
      px[i] = v;
      px[i + 1] = v;
      px[i + 2] = v;
      px[i + 3] = 255;
    }
  }
  return px;
}
