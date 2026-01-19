/**
 * Raster rendering utilities for the torus demo
 *
 * Provides pixel-based drawing to a buffer that can be sent to CanvasRaster
 */

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * A simple pixel buffer for software rendering
 */
export class PixelBuffer {
  private data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  /**
   * Clear the buffer to a solid color
   */
  clear(color: Color): void {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = color.r;
      this.data[i + 1] = color.g;
      this.data[i + 2] = color.b;
      this.data[i + 3] = color.a;
    }
  }

  /**
   * Set a single pixel (with bounds checking)
   */
  setPixel(x: number, y: number, color: Color): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
      return;
    }
    const idx = (iy * this.width + ix) * 4;
    this.data[idx] = color.r;
    this.data[idx + 1] = color.g;
    this.data[idx + 2] = color.b;
    this.data[idx + 3] = color.a;
  }

  /**
   * Set a pixel with alpha blending
   */
  setPixelAlpha(x: number, y: number, color: Color, alpha: number): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
      return;
    }
    const idx = (iy * this.width + ix) * 4;
    const a = alpha * (color.a / 255);
    const invA = 1 - a;

    this.data[idx] = Math.round(color.r * a + this.data[idx] * invA);
    this.data[idx + 1] = Math.round(color.g * a + this.data[idx + 1] * invA);
    this.data[idx + 2] = Math.round(color.b * a + this.data[idx + 2] * invA);
    this.data[idx + 3] = 255;
  }

  /**
   * Draw a line using Bresenham's algorithm
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, color: Color, alpha: number = 1): void {
    // Convert to integers
    let ix1 = Math.floor(x1);
    let iy1 = Math.floor(y1);
    let ix2 = Math.floor(x2);
    let iy2 = Math.floor(y2);

    const dx = Math.abs(ix2 - ix1);
    const dy = Math.abs(iy2 - iy1);
    const sx = ix1 < ix2 ? 1 : -1;
    const sy = iy1 < iy2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (alpha < 1) {
        this.setPixelAlpha(ix1, iy1, color, alpha);
      } else {
        this.setPixel(ix1, iy1, color);
      }

      if (ix1 === ix2 && iy1 === iy2) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ix1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        iy1 += sy;
      }
    }
  }

  /**
   * Draw a thick line (draws multiple parallel lines)
   */
  drawThickLine(x1: number, y1: number, x2: number, y2: number, color: Color, thickness: number, alpha: number = 1): void {
    if (thickness <= 1) {
      this.drawLine(x1, y1, x2, y2, color, alpha);
      return;
    }

    // Calculate perpendicular offset
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      this.setPixelAlpha(Math.floor(x1), Math.floor(y1), color, alpha);
      return;
    }

    // Perpendicular unit vector
    const px = -dy / len;
    const py = dx / len;

    // Draw multiple lines for thickness
    const halfThick = thickness / 2;
    for (let i = -halfThick; i <= halfThick; i += 0.5) {
      this.drawLine(
        x1 + px * i, y1 + py * i,
        x2 + px * i, y2 + py * i,
        color, alpha
      );
    }
  }

  /**
   * Draw a filled circle
   */
  drawCircle(cx: number, cy: number, radius: number, color: Color, alpha: number = 1): void {
    const r = Math.floor(radius);
    const icx = Math.floor(cx);
    const icy = Math.floor(cy);

    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) {
          if (alpha < 1) {
            this.setPixelAlpha(icx + x, icy + y, color, alpha);
          } else {
            this.setPixel(icx + x, icy + y, color);
          }
        }
      }
    }
  }

  /**
   * Draw a filled triangle using scanline algorithm
   */
  drawTriangle(
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    color: Color,
    alpha: number = 1
  ): void {
    // Sort vertices by y coordinate
    let pts = [
      { x: Math.floor(x1), y: Math.floor(y1) },
      { x: Math.floor(x2), y: Math.floor(y2) },
      { x: Math.floor(x3), y: Math.floor(y3) }
    ];
    pts.sort((a, b) => a.y - b.y);

    const [p0, p1, p2] = pts;

    // Helper to interpolate x for a given y along an edge
    const interpX = (ya: number, xa: number, yb: number, xb: number, y: number): number => {
      if (yb === ya) return xa;
      return xa + (xb - xa) * (y - ya) / (yb - ya);
    };

    // Fill top part (p0 to p1)
    for (let y = p0.y; y <= p1.y; y++) {
      if (y < 0 || y >= this.height) continue;
      const xLeft = interpX(p0.y, p0.x, p2.y, p2.x, y);
      const xRight = interpX(p0.y, p0.x, p1.y, p1.x, y);
      const minX = Math.max(0, Math.floor(Math.min(xLeft, xRight)));
      const maxX = Math.min(this.width - 1, Math.floor(Math.max(xLeft, xRight)));
      for (let x = minX; x <= maxX; x++) {
        if (alpha < 1) {
          this.setPixelAlpha(x, y, color, alpha);
        } else {
          this.setPixel(x, y, color);
        }
      }
    }

    // Fill bottom part (p1 to p2)
    for (let y = p1.y; y <= p2.y; y++) {
      if (y < 0 || y >= this.height) continue;
      const xLeft = interpX(p0.y, p0.x, p2.y, p2.x, y);
      const xRight = interpX(p1.y, p1.x, p2.y, p2.x, y);
      const minX = Math.max(0, Math.floor(Math.min(xLeft, xRight)));
      const maxX = Math.min(this.width - 1, Math.floor(Math.max(xLeft, xRight)));
      for (let x = minX; x <= maxX; x++) {
        if (alpha < 1) {
          this.setPixelAlpha(x, y, color, alpha);
        } else {
          this.setPixel(x, y, color);
        }
      }
    }
  }

  /**
   * Draw a filled quad (as two triangles)
   */
  drawQuad(
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    x4: number, y4: number,
    color: Color,
    alpha: number = 1
  ): void {
    this.drawTriangle(x1, y1, x2, y2, x3, y3, color, alpha);
    this.drawTriangle(x1, y1, x3, y3, x4, y4, color, alpha);
  }

  /**
   * Get the pixel data as an array suitable for CanvasRaster
   * Returns Array<[r, g, b, a]> in row-major order
   */
  toPixelArray(): Array<[number, number, number, number]> {
    const result: Array<[number, number, number, number]> = [];
    for (let i = 0; i < this.data.length; i += 4) {
      result.push([
        this.data[i],
        this.data[i + 1],
        this.data[i + 2],
        this.data[i + 3]
      ]);
    }
    return result;
  }

  /**
   * Get raw pixel data for direct buffer updates
   * Returns as Uint8Array for compatibility with setPixelBuffer
   */
  getRawData(): Uint8Array {
    return new Uint8Array(this.data.buffer);
  }
}

/**
 * Parse a hex color string to Color
 */
export function parseColor(hex: string): Color {
  // Remove # if present
  hex = hex.replace('#', '');

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
    a: 255
  };
}

/**
 * Create a color from RGB values
 */
export function rgb(r: number, g: number, b: number, a: number = 255): Color {
  return { r, g, b, a };
}
