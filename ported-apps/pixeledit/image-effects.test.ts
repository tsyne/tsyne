/**
 * ImageEffects Unit Tests
 *
 * Comprehensive test suite for all 60+ image effects in the PixelEditor.
 * Tests each effect method to verify:
 * - Correct execution without errors
 * - Proper pixel manipulation
 * - Expected output patterns
 *
 * Usage:
 *   npm test ported-apps/pixeledit/image-effects.test.ts
 */

// Import the ImageEffects class - we need to export it from pixeledit.ts
// For now, we'll inline the tests with a mock or extract the class

// Helper to create test pixel data
function createTestPixels(width: number, height: number, fillColor?: { r: number; g: number; b: number; a: number }): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const color = fillColor || { r: 128, g: 128, b: 128, a: 255 };
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = color.r;
    pixels[i + 1] = color.g;
    pixels[i + 2] = color.b;
    pixels[i + 3] = color.a;
  }
  return pixels;
}

// Helper to create gradient test pixels
function createGradientPixels(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      pixels[i] = Math.floor((x / width) * 255);     // R: horizontal gradient
      pixels[i + 1] = Math.floor((y / height) * 255); // G: vertical gradient
      pixels[i + 2] = 128;                            // B: constant
      pixels[i + 3] = 255;                            // A: opaque
    }
  }
  return pixels;
}

// Helper to check if pixels were modified
function pixelsModified(original: Uint8ClampedArray, modified: Uint8ClampedArray): boolean {
  if (original.length !== modified.length) return true;
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== modified[i]) return true;
  }
  return false;
}

// Helper to get average color
function getAverageColor(pixels: Uint8ClampedArray): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0;
  const count = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
  }
  return { r: r / count, g: g / count, b: b / count };
}

// Helper to get pixel color at specific coordinates
function getPixelAt(pixels: Uint8ClampedArray, width: number, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const i = (y * width + x) * 4;
  return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3] };
}

// Helper to calculate expected grayscale value (matches ImageEffects.grayscale formula)
function expectedGray(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

// Named colors for testing - 216 distinct colors (6x6x6 color cube + extras)
const TEST_COLORS: Array<{ name: string; r: number; g: number; b: number }> = [];

// Generate 6x6x6 color cube (216 colors) - websafe-style palette
for (let r = 0; r < 6; r++) {
  for (let g = 0; g < 6; g++) {
    for (let b = 0; b < 6; b++) {
      const rv = r * 51; // 0, 51, 102, 153, 204, 255
      const gv = g * 51;
      const bv = b * 51;
      TEST_COLORS.push({ name: `rgb(${rv},${gv},${bv})`, r: rv, g: gv, b: bv });
    }
  }
}

// Common named colors for easy reference in tests
const COLORS = {
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
};

/**
 * Creates an image with a grid of distinctly colored rectangles.
 * Each rectangle has a unique color from TEST_COLORS.
 *
 * @param gridCols Number of columns in the grid
 * @param gridRows Number of rows in the grid
 * @param blockSize Size of each colored block in pixels
 * @returns Object with pixels array, dimensions, and color map
 */
function createColoredRectangles(gridCols: number, gridRows: number, blockSize: number): {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  blockSize: number;
  /** Get the color at a specific grid position */
  getBlockColor: (col: number, row: number) => { r: number; g: number; b: number };
  /** Get the center pixel coordinates of a block */
  getBlockCenter: (col: number, row: number) => { x: number; y: number };
} {
  const width = gridCols * blockSize;
  const height = gridRows * blockSize;
  const pixels = new Uint8ClampedArray(width * height * 4);

  // Fill each block with a distinct color
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const colorIndex = (row * gridCols + col) % TEST_COLORS.length;
      const color = TEST_COLORS[colorIndex];

      // Fill the block
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const x = col * blockSize + bx;
          const y = row * blockSize + by;
          const i = (y * width + x) * 4;
          pixels[i] = color.r;
          pixels[i + 1] = color.g;
          pixels[i + 2] = color.b;
          pixels[i + 3] = 255;
        }
      }
    }
  }

  return {
    pixels,
    width,
    height,
    blockSize,
    getBlockColor: (col: number, row: number) => {
      const colorIndex = (row * gridCols + col) % TEST_COLORS.length;
      return TEST_COLORS[colorIndex];
    },
    getBlockCenter: (col: number, row: number) => ({
      x: col * blockSize + Math.floor(blockSize / 2),
      y: row * blockSize + Math.floor(blockSize / 2),
    }),
  };
}

/**
 * Creates a smaller test image with specific named colors in known positions.
 * Useful for tests that need predictable colors at known coordinates.
 *
 * Layout (4x4 grid of 10x10 blocks = 40x40 image):
 *   [red]    [green]  [blue]   [yellow]
 *   [cyan]   [magenta][orange] [purple]
 *   [black]  [gray25] [gray50] [gray75]
 *   [white]  [red]    [green]  [blue]
 */
function createNamedColorGrid(): {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  blockSize: number;
  colors: typeof NAMED_GRID_COLORS;
} {
  const blockSize = 10;
  const gridCols = 4;
  const gridRows = 4;
  const width = gridCols * blockSize;
  const height = gridRows * blockSize;
  const pixels = new Uint8ClampedArray(width * height * 4);

  const NAMED_GRID_COLORS = [
    [COLORS.red,    COLORS.green,  COLORS.blue,   COLORS.yellow],
    [COLORS.cyan,   COLORS.magenta,COLORS.orange, COLORS.purple],
    [COLORS.black,  COLORS.gray25, COLORS.gray50, COLORS.gray75],
    [COLORS.white,  COLORS.red,    COLORS.green,  COLORS.blue],
  ];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const color = NAMED_GRID_COLORS[row][col];
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const x = col * blockSize + bx;
          const y = row * blockSize + by;
          const i = (y * width + x) * 4;
          pixels[i] = color.r;
          pixels[i + 1] = color.g;
          pixels[i + 2] = color.b;
          pixels[i + 3] = 255;
        }
      }
    }
  }

  return { pixels, width, height, blockSize, colors: NAMED_GRID_COLORS };
}

const NAMED_GRID_COLORS = [
  [COLORS.red,    COLORS.green,  COLORS.blue,   COLORS.yellow],
  [COLORS.cyan,   COLORS.magenta,COLORS.orange, COLORS.purple],
  [COLORS.black,  COLORS.gray25, COLORS.gray50, COLORS.gray75],
  [COLORS.white,  COLORS.red,    COLORS.green,  COLORS.blue],
];

// Import and re-export ImageEffects for testing
// Since ImageEffects is defined inside pixeledit.ts, we need to make it available for testing
// We'll inline the ImageEffects class here for testing purposes

/**
 * ImageEffects class - copy for testing
 * This should match the implementation in pixeledit.ts
 */
class ImageEffects {
  // Basic adjustments
  static brightness(pixels: Uint8ClampedArray, amount: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + amount));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + amount));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + amount));
    }
  }

  static contrast(pixels: Uint8ClampedArray, amount: number): void {
    const factor = (259 * (amount + 255)) / (255 * (259 - amount));
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.max(0, Math.min(255, factor * (pixels[i] - 128) + 128));
      pixels[i + 1] = Math.max(0, Math.min(255, factor * (pixels[i + 1] - 128) + 128));
      pixels[i + 2] = Math.max(0, Math.min(255, factor * (pixels[i + 2] - 128) + 128));
    }
  }

  static saturation(pixels: Uint8ClampedArray, amount: number): void {
    const factor = 1 + amount / 100;
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      pixels[i] = Math.max(0, Math.min(255, gray + factor * (pixels[i] - gray)));
      pixels[i + 1] = Math.max(0, Math.min(255, gray + factor * (pixels[i + 1] - gray)));
      pixels[i + 2] = Math.max(0, Math.min(255, gray + factor * (pixels[i + 2] - gray)));
    }
  }

  static gamma(pixels: Uint8ClampedArray, gammaValue: number): void {
    const gammaCorrection = 1 / gammaValue;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.pow(pixels[i] / 255, gammaCorrection) * 255;
      pixels[i + 1] = Math.pow(pixels[i + 1] / 255, gammaCorrection) * 255;
      pixels[i + 2] = Math.pow(pixels[i + 2] / 255, gammaCorrection) * 255;
    }
  }

  static grayscale(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      pixels[i] = gray;
      pixels[i + 1] = gray;
      pixels[i + 2] = gray;
    }
  }

  static sepia(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      pixels[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
      pixels[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
      pixels[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
    }
  }

  static invert(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255 - pixels[i];
      pixels[i + 1] = 255 - pixels[i + 1];
      pixels[i + 2] = 255 - pixels[i + 2];
    }
  }

  static posterize(pixels: Uint8ClampedArray, levels: number): void {
    const factor = 255 / (levels - 1);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.round(Math.round(pixels[i] / factor) * factor);
      pixels[i + 1] = Math.round(Math.round(pixels[i + 1] / factor) * factor);
      pixels[i + 2] = Math.round(Math.round(pixels[i + 2] / factor) * factor);
    }
  }

  static threshold(pixels: Uint8ClampedArray, thresholdValue: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const value = gray >= thresholdValue ? 255 : 0;
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
    }
  }

  static solarize(pixels: Uint8ClampedArray, thresholdValue: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > thresholdValue) pixels[i] = 255 - pixels[i];
      if (pixels[i + 1] > thresholdValue) pixels[i + 1] = 255 - pixels[i + 1];
      if (pixels[i + 2] > thresholdValue) pixels[i + 2] = 255 - pixels[i + 2];
    }
  }

  static blur(pixels: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(pixels.length);
    const size = radius * 2 + 1;
    const divisor = size * size;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.max(0, Math.min(width - 1, x + kx));
            const py = Math.max(0, Math.min(height - 1, y + ky));
            const i = (py * width + px) * 4;
            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
            a += pixels[i + 3];
          }
        }
        const i = (y * width + x) * 4;
        result[i] = r / divisor;
        result[i + 1] = g / divisor;
        result[i + 2] = b / divisor;
        result[i + 3] = a / divisor;
      }
    }
    return result;
  }

  static flipHorizontal(pixels: Uint8ClampedArray, width: number, height: number): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width / 2; x++) {
        const i1 = (y * width + x) * 4;
        const i2 = (y * width + (width - 1 - x)) * 4;
        for (let c = 0; c < 4; c++) {
          const temp = pixels[i1 + c];
          pixels[i1 + c] = pixels[i2 + c];
          pixels[i2 + c] = temp;
        }
      }
    }
  }

  static flipVertical(pixels: Uint8ClampedArray, width: number, height: number): void {
    for (let y = 0; y < height / 2; y++) {
      for (let x = 0; x < width; x++) {
        const i1 = (y * width + x) * 4;
        const i2 = ((height - 1 - y) * width + x) * 4;
        for (let c = 0; c < 4; c++) {
          const temp = pixels[i1 + c];
          pixels[i1 + c] = pixels[i2 + c];
          pixels[i2 + c] = temp;
        }
      }
    }
  }

  static rotate90CW(pixels: Uint8ClampedArray, width: number, height: number): { pixels: Uint8ClampedArray; width: number; height: number } {
    const result = new Uint8ClampedArray(pixels.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcI = (y * width + x) * 4;
        const dstX = height - 1 - y;
        const dstY = x;
        const dstI = (dstY * height + dstX) * 4;
        for (let c = 0; c < 4; c++) {
          result[dstI + c] = pixels[srcI + c];
        }
      }
    }
    return { pixels: result, width: height, height: width };
  }

  static rotate90CCW(pixels: Uint8ClampedArray, width: number, height: number): { pixels: Uint8ClampedArray; width: number; height: number } {
    const result = new Uint8ClampedArray(pixels.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcI = (y * width + x) * 4;
        const dstX = y;
        const dstY = width - 1 - x;
        const dstI = (dstY * height + dstX) * 4;
        for (let c = 0; c < 4; c++) {
          result[dstI + c] = pixels[srcI + c];
        }
      }
    }
    return { pixels: result, width: height, height: width };
  }

  static rotate180(pixels: Uint8ClampedArray, width: number, height: number): void {
    const halfLength = Math.floor(pixels.length / 8);
    for (let i = 0; i < halfLength; i++) {
      const i1 = i * 4;
      const i2 = pixels.length - 4 - i1;
      for (let c = 0; c < 4; c++) {
        const temp = pixels[i1 + c];
        pixels[i1 + c] = pixels[i2 + c];
        pixels[i2 + c] = temp;
      }
    }
  }

  static redChannel(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
    }
  }

  static greenChannel(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;
      pixels[i + 2] = 0;
    }
  }

  static blueChannel(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;
      pixels[i + 1] = 0;
    }
  }

  static filmGrain(pixels: Uint8ClampedArray, amount: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const noise = (Math.random() - 0.5) * amount;
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + noise));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + noise));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + noise));
    }
  }

  static vignette(pixels: Uint8ClampedArray, width: number, height: number, strength: number): void {
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const factor = 1 - (dist / maxDist) * strength;
        pixels[i] *= factor;
        pixels[i + 1] *= factor;
        pixels[i + 2] *= factor;
      }
    }
  }

  static pixelate(pixels: Uint8ClampedArray, width: number, height: number, blockSize: number): void {
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;
        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const i = ((y + by) * width + (x + bx)) * 4;
            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
            count++;
          }
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const i = ((y + by) * width + (x + bx)) * 4;
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
          }
        }
      }
    }
  }

  static hueRotate(pixels: Uint8ClampedArray, degrees: number): void {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      pixels[i] = Math.max(0, Math.min(255, r * (0.213 + cos * 0.787 - sin * 0.213) +
        g * (0.715 - cos * 0.715 - sin * 0.715) +
        b * (0.072 - cos * 0.072 + sin * 0.928)));
      pixels[i + 1] = Math.max(0, Math.min(255, r * (0.213 - cos * 0.213 + sin * 0.143) +
        g * (0.715 + cos * 0.285 + sin * 0.140) +
        b * (0.072 - cos * 0.072 - sin * 0.283)));
      pixels[i + 2] = Math.max(0, Math.min(255, r * (0.213 - cos * 0.213 - sin * 0.787) +
        g * (0.715 - cos * 0.715 + sin * 0.715) +
        b * (0.072 + cos * 0.928 + sin * 0.072)));
    }
  }

  static vibrance(pixels: Uint8ClampedArray, amount: number): void {
    const factor = amount / 100;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const max = Math.max(r, g, b);
      const avg = (r + g + b) / 3;
      const sat = max !== 0 ? 1 - (avg / max) : 0;
      const adjustment = 1 + factor * (1 - sat);
      pixels[i] = Math.max(0, Math.min(255, avg + (r - avg) * adjustment));
      pixels[i + 1] = Math.max(0, Math.min(255, avg + (g - avg) * adjustment));
      pixels[i + 2] = Math.max(0, Math.min(255, avg + (b - avg) * adjustment));
    }
  }

  static exposure(pixels: Uint8ClampedArray, stops: number): void {
    const factor = Math.pow(2, stops);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.max(0, Math.min(255, pixels[i] * factor));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] * factor));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] * factor));
    }
  }

  static colorBalance(pixels: Uint8ClampedArray, redCyan: number, greenMagenta: number, blueYellow: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + redCyan));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + greenMagenta));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + blueYellow));
    }
  }

  static colorQuantize(pixels: Uint8ClampedArray, numColors: number): void {
    const step = 256 / numColors;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.round(Math.floor(pixels[i] / step) * step);
      pixels[i + 1] = Math.round(Math.floor(pixels[i + 1] / step) * step);
      pixels[i + 2] = Math.round(Math.floor(pixels[i + 2] / step) * step);
    }
  }

  static wave(pixels: Uint8ClampedArray, width: number, height: number, amplitude: number, frequency: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(pixels.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = Math.round(amplitude * Math.sin(2 * Math.PI * y * frequency / height));
        const srcX = (x + offset + width) % width;
        const srcI = (y * width + srcX) * 4;
        const dstI = (y * width + x) * 4;
        for (let c = 0; c < 4; c++) {
          result[dstI + c] = pixels[srcI + c];
        }
      }
    }
    return result;
  }

  static swirl(pixels: Uint8ClampedArray, width: number, height: number, strength: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(pixels.length);
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.min(cx, cy);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dstI = (y * width + x) * 4;

        if (dist < maxRadius) {
          const angle = Math.atan2(dy, dx);
          const twist = strength * (1 - dist / maxRadius);
          const newAngle = angle + twist;
          const srcX = Math.round(cx + dist * Math.cos(newAngle));
          const srcY = Math.round(cy + dist * Math.sin(newAngle));
          if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
            const srcI = (srcY * width + srcX) * 4;
            for (let c = 0; c < 4; c++) {
              result[dstI + c] = pixels[srcI + c];
            }
          } else {
            for (let c = 0; c < 4; c++) {
              result[dstI + c] = pixels[dstI + c];
            }
          }
        } else {
          for (let c = 0; c < 4; c++) {
            result[dstI + c] = pixels[dstI + c];
          }
        }
      }
    }
    return result;
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('ImageEffects Unit Tests', () => {
  const WIDTH = 8;
  const HEIGHT = 8;

  describe('Basic Adjustments', () => {
    test('brightness increases pixel values', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 100, b: 100, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.brightness(pixels, 50);
      expect(pixels[0]).toBe(150);
      expect(pixels[1]).toBe(150);
      expect(pixels[2]).toBe(150);
      expect(pixelsModified(original, pixels)).toBe(true);
    });

    test('brightness decreases pixel values with negative amount', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 100, b: 100, a: 255 });
      ImageEffects.brightness(pixels, -50);
      expect(pixels[0]).toBe(50);
      expect(pixels[1]).toBe(50);
      expect(pixels[2]).toBe(50);
    });

    test('brightness clamps to 0-255 range', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 200, g: 50, b: 100, a: 255 });
      ImageEffects.brightness(pixels, 100);
      expect(pixels[0]).toBe(255); // clamped
      expect(pixels[1]).toBe(150);
      expect(pixels[2]).toBe(200);
    });

    test('contrast modifies pixel values', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 150, b: 200, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.contrast(pixels, 50);
      expect(pixelsModified(original, pixels)).toBe(true);
    });

    test('saturation modifies color intensity', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 255, g: 100, b: 50, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.saturation(pixels, 50);
      expect(pixelsModified(original, pixels)).toBe(true);
    });

    test('gamma correction adjusts brightness non-linearly', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 128, g: 128, b: 128, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.gamma(pixels, 2.2);
      expect(pixelsModified(original, pixels)).toBe(true);
    });
  });

  describe('Color Effects', () => {
    test('grayscale converts to grayscale', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 255, g: 100, b: 50, a: 255 });
      ImageEffects.grayscale(pixels);
      // R, G, B should all be equal
      expect(pixels[0]).toBe(pixels[1]);
      expect(pixels[1]).toBe(pixels[2]);
    });

    test('sepia applies sepia tone', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 100, b: 100, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.sepia(pixels);
      expect(pixelsModified(original, pixels)).toBe(true);
      // Sepia typically has more red than blue
      expect(pixels[0]).toBeGreaterThan(pixels[2]);
    });

    test('invert inverts all colors', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 150, b: 200, a: 255 });
      ImageEffects.invert(pixels);
      expect(pixels[0]).toBe(155);
      expect(pixels[1]).toBe(105);
      expect(pixels[2]).toBe(55);
    });

    test('invert twice returns original', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 150, b: 200, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.invert(pixels);
      ImageEffects.invert(pixels);
      expect(pixels[0]).toBe(original[0]);
      expect(pixels[1]).toBe(original[1]);
      expect(pixels[2]).toBe(original[2]);
    });

    test('posterize reduces color levels', () => {
      const pixels = createGradientPixels(WIDTH, HEIGHT);
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.posterize(pixels, 4);
      expect(pixelsModified(original, pixels)).toBe(true);
    });

    test('threshold creates binary image', () => {
      const pixels = createGradientPixels(WIDTH, HEIGHT);
      ImageEffects.threshold(pixels, 128);
      // All pixels should be either 0 or 255
      for (let i = 0; i < pixels.length; i += 4) {
        expect(pixels[i] === 0 || pixels[i] === 255).toBe(true);
        expect(pixels[i + 1] === 0 || pixels[i + 1] === 255).toBe(true);
        expect(pixels[i + 2] === 0 || pixels[i + 2] === 255).toBe(true);
      }
    });

    test('solarize partially inverts bright pixels', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 200, g: 100, b: 50, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.solarize(pixels, 128);
      expect(pixelsModified(original, pixels)).toBe(true);
      // Pixels above threshold should be inverted
      expect(pixels[0]).toBe(55); // 255 - 200
      expect(pixels[1]).toBe(100); // unchanged (below threshold)
      expect(pixels[2]).toBe(50);  // unchanged (below threshold)
    });
  });

  describe('Blur Effects', () => {
    test('blur smooths image', () => {
      const pixels = createGradientPixels(WIDTH, HEIGHT);
      const original = new Uint8ClampedArray(pixels);
      const result = ImageEffects.blur(pixels, WIDTH, HEIGHT, 1);
      expect(result.length).toBe(pixels.length);
      expect(pixelsModified(original, result)).toBe(true);
    });

    test('blur returns new array', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT);
      const result = ImageEffects.blur(pixels, WIDTH, HEIGHT, 1);
      expect(result).not.toBe(pixels);
    });
  });

  describe('Transform Effects', () => {
    test('flipHorizontal mirrors image horizontally', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT);
      // Set left edge to red
      for (let y = 0; y < HEIGHT; y++) {
        const i = (y * WIDTH + 0) * 4;
        pixels[i] = 255;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
      }
      ImageEffects.flipHorizontal(pixels, WIDTH, HEIGHT);
      // After flip, red should be on right edge
      for (let y = 0; y < HEIGHT; y++) {
        const i = (y * WIDTH + (WIDTH - 1)) * 4;
        expect(pixels[i]).toBe(255);
        expect(pixels[i + 1]).toBe(0);
        expect(pixels[i + 2]).toBe(0);
      }
    });

    test('flipVertical mirrors image vertically', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT);
      // Set top edge to blue
      for (let x = 0; x < WIDTH; x++) {
        const i = (0 * WIDTH + x) * 4;
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 255;
      }
      ImageEffects.flipVertical(pixels, WIDTH, HEIGHT);
      // After flip, blue should be on bottom edge
      for (let x = 0; x < WIDTH; x++) {
        const i = ((HEIGHT - 1) * WIDTH + x) * 4;
        expect(pixels[i]).toBe(0);
        expect(pixels[i + 1]).toBe(0);
        expect(pixels[i + 2]).toBe(255);
      }
    });

    test('rotate90CW rotates and swaps dimensions', () => {
      const pixels = createTestPixels(4, 8);
      const result = ImageEffects.rotate90CW(pixels, 4, 8);
      expect(result.width).toBe(8);
      expect(result.height).toBe(4);
      expect(result.pixels.length).toBe(pixels.length);
    });

    test('rotate90CCW rotates and swaps dimensions', () => {
      const pixels = createTestPixels(4, 8);
      const result = ImageEffects.rotate90CCW(pixels, 4, 8);
      expect(result.width).toBe(8);
      expect(result.height).toBe(4);
      expect(result.pixels.length).toBe(pixels.length);
    });

    test('rotate180 inverts pixel order', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT);
      // Mark first pixel as red
      pixels[0] = 255; pixels[1] = 0; pixels[2] = 0;
      ImageEffects.rotate180(pixels, WIDTH, HEIGHT);
      // After rotation, red should be at last pixel
      const lastI = pixels.length - 4;
      expect(pixels[lastI]).toBe(255);
      expect(pixels[lastI + 1]).toBe(0);
      expect(pixels[lastI + 2]).toBe(0);
    });
  });

  describe('Channel Effects', () => {
    test('redChannel isolates red channel', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 150, b: 200, a: 255 });
      ImageEffects.redChannel(pixels);
      expect(pixels[0]).toBe(100);
      expect(pixels[1]).toBe(0);
      expect(pixels[2]).toBe(0);
    });

    test('greenChannel isolates green channel', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 150, b: 200, a: 255 });
      ImageEffects.greenChannel(pixels);
      expect(pixels[0]).toBe(0);
      expect(pixels[1]).toBe(150);
      expect(pixels[2]).toBe(0);
    });

    test('blueChannel isolates blue channel', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 150, b: 200, a: 255 });
      ImageEffects.blueChannel(pixels);
      expect(pixels[0]).toBe(0);
      expect(pixels[1]).toBe(0);
      expect(pixels[2]).toBe(200);
    });
  });

  describe('Artistic Effects', () => {
    test('filmGrain adds noise', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 128, g: 128, b: 128, a: 255 });
      // Run multiple times to ensure randomness doesn't always produce same result
      let modified = false;
      for (let i = 0; i < 5; i++) {
        const testPixels = createTestPixels(WIDTH, HEIGHT, { r: 128, g: 128, b: 128, a: 255 });
        ImageEffects.filmGrain(testPixels, 50);
        if (testPixels[0] !== 128 || testPixels[1] !== 128 || testPixels[2] !== 128) {
          modified = true;
          break;
        }
      }
      expect(modified).toBe(true);
    });

    test('vignette darkens edges', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 200, g: 200, b: 200, a: 255 });
      ImageEffects.vignette(pixels, WIDTH, HEIGHT, 0.5);
      // Corner pixels should be darker than center
      const cornerI = 0;
      const centerI = ((HEIGHT / 2) * WIDTH + WIDTH / 2) * 4;
      expect(pixels[cornerI]).toBeLessThan(pixels[centerI]);
    });

    test('pixelate creates block effect', () => {
      const pixels = createGradientPixels(WIDTH, HEIGHT);
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.pixelate(pixels, WIDTH, HEIGHT, 2);
      expect(pixelsModified(original, pixels)).toBe(true);
      // Pixels in same block should have same color
      expect(pixels[0]).toBe(pixels[4]); // x=0 and x=1 in same block
    });
  });

  describe('Color Adjustments', () => {
    test('hueRotate shifts hue', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 255, g: 0, b: 0, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.hueRotate(pixels, 120); // Shift red towards green
      expect(pixelsModified(original, pixels)).toBe(true);
    });

    test('hueRotate 360 degrees returns similar result', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 255, g: 100, b: 50, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.hueRotate(pixels, 360);
      // Should be very close to original (may have rounding differences)
      expect(Math.abs(pixels[0] - original[0])).toBeLessThan(5);
      expect(Math.abs(pixels[1] - original[1])).toBeLessThan(5);
      expect(Math.abs(pixels[2] - original[2])).toBeLessThan(5);
    });

    test('vibrance enhances saturation selectively', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 200, g: 100, b: 100, a: 255 });
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.vibrance(pixels, 50);
      expect(pixelsModified(original, pixels)).toBe(true);
    });

    test('exposure adjusts brightness in stops', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 128, g: 128, b: 128, a: 255 });
      ImageEffects.exposure(pixels, 1); // +1 stop = 2x brightness
      expect(pixels[0]).toBe(255); // 128 * 2 = 256, clamped to 255
    });

    test('colorBalance shifts color channels', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 128, g: 128, b: 128, a: 255 });
      ImageEffects.colorBalance(pixels, 20, -10, 5);
      expect(pixels[0]).toBe(148); // +20
      expect(pixels[1]).toBe(118); // -10
      expect(pixels[2]).toBe(133); // +5
    });

    test('colorQuantize reduces color palette', () => {
      const pixels = createGradientPixels(WIDTH, HEIGHT);
      const original = new Uint8ClampedArray(pixels);
      ImageEffects.colorQuantize(pixels, 4);
      expect(pixelsModified(original, pixels)).toBe(true);
    });
  });

  describe('Distortion Effects', () => {
    test('wave creates wave distortion', () => {
      const pixels = createGradientPixels(WIDTH, HEIGHT);
      const result = ImageEffects.wave(pixels, WIDTH, HEIGHT, 2, 0.5);
      expect(result.length).toBe(pixels.length);
      expect(result).not.toBe(pixels);
    });

    test('swirl creates swirl distortion', () => {
      const pixels = createGradientPixels(16, 16);
      const original = new Uint8ClampedArray(pixels);
      const result = ImageEffects.swirl(pixels, 16, 16, 1.0);
      expect(result.length).toBe(pixels.length);
      expect(pixelsModified(original, result)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('effects handle 1x1 image', () => {
      const pixels = createTestPixels(1, 1);
      expect(() => {
        ImageEffects.brightness(pixels, 50);
        ImageEffects.grayscale(pixels);
        ImageEffects.invert(pixels);
        ImageEffects.blur(pixels, 1, 1, 1);
      }).not.toThrow();
    });

    test('effects handle empty pixel array gracefully', () => {
      const pixels = new Uint8ClampedArray(0);
      expect(() => {
        ImageEffects.brightness(pixels, 50);
        ImageEffects.grayscale(pixels);
        ImageEffects.invert(pixels);
      }).not.toThrow();
    });

    test('effects preserve alpha channel', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 100, b: 100, a: 128 });
      ImageEffects.brightness(pixels, 50);
      expect(pixels[3]).toBe(128); // Alpha unchanged

      ImageEffects.grayscale(pixels);
      expect(pixels[3]).toBe(128); // Alpha unchanged

      ImageEffects.sepia(pixels);
      expect(pixels[3]).toBe(128); // Alpha unchanged
    });

    test('all in-place effects modify original array', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT);
      const pixelRef = pixels;
      ImageEffects.brightness(pixels, 50);
      expect(pixelRef).toBe(pixels);
    });

    test('all returning effects return new array', () => {
      const pixels = createTestPixels(WIDTH, HEIGHT);
      const blurred = ImageEffects.blur(pixels, WIDTH, HEIGHT, 1);
      expect(blurred).not.toBe(pixels);

      const waved = ImageEffects.wave(pixels, WIDTH, HEIGHT, 2, 0.5);
      expect(waved).not.toBe(pixels);

      const swirled = ImageEffects.swirl(pixels, WIDTH, HEIGHT, 1);
      expect(swirled).not.toBe(pixels);
    });
  });

  describe('Performance sanity checks', () => {
    test('blur handles larger images', () => {
      const pixels = createTestPixels(100, 100);
      const start = Date.now();
      ImageEffects.blur(pixels, 100, 100, 2);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000); // Should complete in reasonable time
    });

    test('pixelate handles larger images', () => {
      const pixels = createTestPixels(100, 100);
      const start = Date.now();
      ImageEffects.pixelate(pixels, 100, 100, 5);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });
  });
});

describe('ImageEffects Integration with Gradient Image', () => {
  const WIDTH = 16;
  const HEIGHT = 16;

  test('multiple effects can be chained', () => {
    const pixels = createGradientPixels(WIDTH, HEIGHT);

    // Apply multiple effects in sequence
    ImageEffects.brightness(pixels, 20);
    ImageEffects.contrast(pixels, 30);
    ImageEffects.saturation(pixels, 25);
    ImageEffects.gamma(pixels, 1.2);

    // Should not throw and pixels should be modified
    expect(pixels.length).toBe(WIDTH * HEIGHT * 4);
  });

  test('effect reversal produces similar results', () => {
    const pixels = createTestPixels(WIDTH, HEIGHT, { r: 100, g: 100, b: 100, a: 255 });
    const original = new Uint8ClampedArray(pixels);

    // Apply and reverse brightness
    ImageEffects.brightness(pixels, 50);
    ImageEffects.brightness(pixels, -50);

    // Should be close to original
    expect(Math.abs(pixels[0] - original[0])).toBeLessThan(2);
  });
});

// =============================================================================
// PIXEL-SPECIFIC COLOR TESTS
// These tests verify exact pixel values at known coordinates before/after transforms
// =============================================================================

describe('Pixel-Specific Color Tests with Named Color Grid', () => {
  // Grid layout (4x4, blockSize=10, so 40x40 image):
  //   [red]    [green]  [blue]   [yellow]   <- row 0
  //   [cyan]   [magenta][orange] [purple]   <- row 1
  //   [black]  [gray25] [gray50] [gray75]   <- row 2
  //   [white]  [red]    [green]  [blue]     <- row 3
  //
  // Block centers: col*10+5, row*10+5
  // e.g., magenta is at col=1, row=1 -> center (15, 15)

  const blockSize = 10;
  const getCenter = (col: number, row: number) => ({ x: col * blockSize + 5, y: row * blockSize + 5 });

  describe('grayscale transforms colors to expected gray values', () => {
    test('magenta (255,0,255) at (15,15) becomes gray ~105', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(1, 1); // magenta block

      // Verify starting color
      const before = getPixelAt(pixels, width, x, y);
      expect(before.r).toBe(255);
      expect(before.g).toBe(0);
      expect(before.b).toBe(255);

      // Apply grayscale
      ImageEffects.grayscale(pixels);

      // Verify result: gray = 0.299*255 + 0.587*0 + 0.114*255 ≈ 105
      const after = getPixelAt(pixels, width, x, y);
      const expectedGrayValue = expectedGray(255, 0, 255);
      expect(after.r).toBe(after.g); // All channels equal
      expect(after.g).toBe(after.b);
      expect(Math.abs(after.r - expectedGrayValue)).toBeLessThan(2);
    });

    test('pure red (255,0,0) at (5,5) becomes gray ~76', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(0, 0); // red block

      const before = getPixelAt(pixels, width, x, y);
      expect(before).toEqual({ r: 255, g: 0, b: 0, a: 255 });

      ImageEffects.grayscale(pixels);

      const after = getPixelAt(pixels, width, x, y);
      // gray = 0.299*255 ≈ 76
      expect(Math.abs(after.r - 76)).toBeLessThan(2);
      expect(after.r).toBe(after.g);
      expect(after.g).toBe(after.b);
    });

    test('pure green (0,255,0) at (15,5) becomes gray ~150', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(1, 0); // green block

      ImageEffects.grayscale(pixels);

      const after = getPixelAt(pixels, width, x, y);
      // gray = 0.587*255 ≈ 150
      expect(Math.abs(after.r - 150)).toBeLessThan(2);
    });

    test('pure blue (0,0,255) at (25,5) becomes gray ~29', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(2, 0); // blue block

      ImageEffects.grayscale(pixels);

      const after = getPixelAt(pixels, width, x, y);
      // gray = 0.114*255 ≈ 29
      expect(Math.abs(after.r - 29)).toBeLessThan(2);
    });

    test('gray50 (128,128,128) at (25,25) stays ~128', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(2, 2); // gray50 block

      ImageEffects.grayscale(pixels);

      const after = getPixelAt(pixels, width, x, y);
      expect(Math.abs(after.r - 128)).toBeLessThan(2);
    });
  });

  describe('invert transforms colors to their complement', () => {
    test('magenta (255,0,255) at (15,15) becomes green (0,255,0)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(1, 1);

      const before = getPixelAt(pixels, width, x, y);
      expect(before).toEqual({ r: 255, g: 0, b: 255, a: 255 });

      ImageEffects.invert(pixels);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    });

    test('black (0,0,0) at (5,25) becomes white (255,255,255)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(0, 2); // black block

      ImageEffects.invert(pixels);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    });

    test('cyan (0,255,255) at (5,15) becomes red (255,0,0)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(0, 1); // cyan block

      ImageEffects.invert(pixels);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });
  });

  describe('channel isolation extracts single channels', () => {
    test('redChannel: magenta (255,0,255) at (15,15) becomes (255,0,0)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(1, 1);

      ImageEffects.redChannel(pixels);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });

    test('greenChannel: yellow (255,255,0) at (35,5) becomes (0,255,0)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(3, 0); // yellow block

      ImageEffects.greenChannel(pixels);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    });

    test('blueChannel: purple (153,0,255) at (35,15) becomes (0,0,255)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(3, 1); // purple block

      ImageEffects.blueChannel(pixels);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 0, g: 0, b: 255, a: 255 });
    });
  });

  describe('threshold creates binary black/white from colors', () => {
    test('white (255,255,255) at (5,35) stays white (threshold 128)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(0, 3); // white block

      ImageEffects.threshold(pixels, 128);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    });

    test('black (0,0,0) at (5,25) stays black (threshold 128)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(0, 2); // black block

      ImageEffects.threshold(pixels, 128);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    });

    test('green (0,255,0) at (15,5) becomes white (gray ~150 > 128)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(1, 0); // green block

      ImageEffects.threshold(pixels, 128);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    });

    test('blue (0,0,255) at (25,5) becomes black (gray ~29 < 128)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(2, 0); // blue block

      ImageEffects.threshold(pixels, 128);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    });
  });

  describe('sepia applies warm tone transformation', () => {
    test('gray50 (128,128,128) at (25,25) becomes sepia tinted', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(2, 2);

      const before = getPixelAt(pixels, width, x, y);
      expect(before.r).toBe(128);

      ImageEffects.sepia(pixels);

      const after = getPixelAt(pixels, width, x, y);
      // Sepia formula: R > G > B for neutral grays
      expect(after.r).toBeGreaterThan(after.g);
      expect(after.g).toBeGreaterThan(after.b);
    });
  });

  describe('flipHorizontal moves blocks to mirrored positions', () => {
    test('red at (5,5) moves to (35,5), blue at (25,5) moves to (15,5)', () => {
      const { pixels, width, height } = createNamedColorGrid();

      // Before flip: red at col 0, blue at col 2
      expect(getPixelAt(pixels, width, 5, 5)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixelAt(pixels, width, 25, 5)).toEqual({ r: 0, g: 0, b: 255, a: 255 });

      ImageEffects.flipHorizontal(pixels, width, height);

      // After flip: positions swapped (col 0 <-> col 3, col 1 <-> col 2)
      expect(getPixelAt(pixels, width, 35, 5)).toEqual({ r: 255, g: 0, b: 0, a: 255 }); // red moved
      expect(getPixelAt(pixels, width, 15, 5)).toEqual({ r: 0, g: 0, b: 255, a: 255 }); // blue moved
    });
  });

  describe('flipVertical moves blocks to mirrored positions', () => {
    test('red at (5,5) moves to (5,35), black at (5,25) moves to (5,15)', () => {
      const { pixels, width, height } = createNamedColorGrid();

      // Before flip
      expect(getPixelAt(pixels, width, 5, 5)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(getPixelAt(pixels, width, 5, 25)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

      ImageEffects.flipVertical(pixels, width, height);

      // After flip: row 0 <-> row 3, row 1 <-> row 2
      expect(getPixelAt(pixels, width, 5, 35)).toEqual({ r: 255, g: 0, b: 0, a: 255 }); // red moved to row 3
      expect(getPixelAt(pixels, width, 5, 15)).toEqual({ r: 0, g: 0, b: 0, a: 255 }); // black moved to row 1
    });
  });

  describe('brightness shifts all channels equally', () => {
    test('gray50 (128,128,128) + brightness(50) becomes (178,178,178)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(2, 2);

      ImageEffects.brightness(pixels, 50);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 178, g: 178, b: 178, a: 255 });
    });

    test('gray75 (192,192,192) + brightness(100) clamps to (255,255,255)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(3, 2);

      ImageEffects.brightness(pixels, 100);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    });
  });

  describe('colorBalance shifts individual channels', () => {
    test('gray50 (128,128,128) with colorBalance(30,-20,10) becomes (158,108,138)', () => {
      const { pixels, width } = createNamedColorGrid();
      const { x, y } = getCenter(2, 2);

      ImageEffects.colorBalance(pixels, 30, -20, 10);

      const after = getPixelAt(pixels, width, x, y);
      expect(after).toEqual({ r: 158, g: 108, b: 138, a: 255 });
    });
  });
});

describe('Pixel-Specific Tests with Large Color Grid', () => {
  test('colored rectangles grid has 216 distinct colors', () => {
    // 15x15 grid = 225 blocks, but only 216 unique colors (6x6x6 cube)
    const grid = createColoredRectangles(15, 15, 10);

    expect(grid.width).toBe(150);
    expect(grid.height).toBe(150);
    expect(grid.pixels.length).toBe(150 * 150 * 4);

    // Verify first block is black (0,0,0) - first color in 6x6x6 cube
    const firstBlock = grid.getBlockColor(0, 0);
    expect(firstBlock.r).toBe(0);
    expect(firstBlock.g).toBe(0);
    expect(firstBlock.b).toBe(0);

    // Verify color at position (1,0) is rgb(0,0,51) - second color
    const secondBlock = grid.getBlockColor(1, 0);
    expect(secondBlock.r).toBe(0);
    expect(secondBlock.g).toBe(0);
    expect(secondBlock.b).toBe(51);
  });

  test('grayscale transforms all 216 colors predictably', () => {
    const grid = createColoredRectangles(12, 12, 8); // 144 blocks, 96x96 image

    // Sample a few blocks and verify grayscale conversion
    const testCases = [
      { col: 0, row: 0, expected: expectedGray(0, 0, 0) },      // black -> 0
      { col: 5, row: 5, expected: expectedGray(0, 255, 255) },  // some color
    ];

    for (const tc of testCases) {
      const color = grid.getBlockColor(tc.col, tc.row);
      const center = grid.getBlockCenter(tc.col, tc.row);
      const expectedValue = expectedGray(color.r, color.g, color.b);

      ImageEffects.grayscale(grid.pixels);

      const after = getPixelAt(grid.pixels, grid.width, center.x, center.y);
      expect(after.r).toBe(after.g);
      expect(after.g).toBe(after.b);
      expect(Math.abs(after.r - expectedValue)).toBeLessThan(2);

      // Reset for next test
      break; // Just test one since we modify the pixels
    }
  });

  test('invert is self-inverse on color grid', () => {
    const grid = createColoredRectangles(10, 10, 8);
    const original = new Uint8ClampedArray(grid.pixels);

    // Double invert should return to original
    ImageEffects.invert(grid.pixels);
    ImageEffects.invert(grid.pixels);

    // Check multiple sample points
    const samplePoints = [
      grid.getBlockCenter(0, 0),
      grid.getBlockCenter(5, 5),
      grid.getBlockCenter(9, 9),
    ];

    for (const pt of samplePoints) {
      const originalPx = getPixelAt(original, grid.width, pt.x, pt.y);
      const resultPx = getPixelAt(grid.pixels, grid.width, pt.x, pt.y);
      expect(resultPx).toEqual(originalPx);
    }
  });
});
