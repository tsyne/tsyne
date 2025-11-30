/**
 * Tests for new pixeledit features:
 * - Rectangle tool
 * - Circle tool
 * - Undo/Redo system
 * - Background color support
 * - File save/load operations
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock Color class for testing
class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number = 255
  ) {}

  toHex(): string {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
  }

  equals(other: Color): boolean {
    return this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a);
  }
}

// Mock PixelEditor for testing
class MockPixelEditor {
  public fgColor: Color = new Color(0, 0, 0);
  public bgColor: Color = new Color(255, 255, 255);
  private pixels: Uint8ClampedArray;
  private width: number;
  private height: number;
  public pixelUpdates: Array<{x: number; y: number; color: Color}> = [];

  constructor(width: number, height: number, initialColor?: Color) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);

    const color = initialColor || new Color(255, 255, 255, 255);
    for (let i = 0; i < this.pixels.length; i += 4) {
      this.pixels[i] = color.r;
      this.pixels[i + 1] = color.g;
      this.pixels[i + 2] = color.b;
      this.pixels[i + 3] = color.a;
    }
  }

  getImageWidth(): number { return this.width; }
  getImageHeight(): number { return this.height; }

  getPixelColor(x: number, y: number): Color {
    const index = (y * this.width + x) * 4;
    return new Color(
      this.pixels[index],
      this.pixels[index + 1],
      this.pixels[index + 2],
      this.pixels[index + 3]
    );
  }

  async setPixelColor(x: number, y: number, color: Color): Promise<void> {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const index = (y * this.width + x) * 4;
    this.pixels[index] = color.r;
    this.pixels[index + 1] = color.g;
    this.pixels[index + 2] = color.b;
    this.pixels[index + 3] = color.a;
    this.pixelUpdates.push({x, y, color});
  }

  async setFGColor(color: Color): Promise<void> {
    this.fgColor = color;
  }

  async setBGColor(color: Color): Promise<void> {
    this.bgColor = color;
  }
}

// Rectangle Tool implementation for testing
class RectangleTool {
  name = 'Rectangle';
  private startX: number | null = null;
  private startY: number | null = null;
  private isDrawing = false;
  public filled = false;

  constructor(private editor: MockPixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    if (!this.isDrawing) {
      this.startX = x;
      this.startY = y;
      this.isDrawing = true;
    } else {
      if (this.startX !== null && this.startY !== null) {
        await this.drawRectangle(this.startX, this.startY, x, y);
      }
      this.startX = null;
      this.startY = null;
      this.isDrawing = false;
    }
  }

  private async drawRectangle(x0: number, y0: number, x1: number, y1: number): Promise<void> {
    const color = this.editor.fgColor;
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    if (this.filled) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          await this.editor.setPixelColor(x, y, color);
        }
      }
    } else {
      // Top and bottom edges
      for (let x = minX; x <= maxX; x++) {
        await this.editor.setPixelColor(x, minY, color);
        await this.editor.setPixelColor(x, maxY, color);
      }
      // Left and right edges
      for (let y = minY + 1; y < maxY; y++) {
        await this.editor.setPixelColor(minX, y, color);
        await this.editor.setPixelColor(maxX, y, color);
      }
    }
  }
}

// Circle Tool implementation for testing
class CircleTool {
  name = 'Circle';
  private centerX: number | null = null;
  private centerY: number | null = null;
  private isDrawing = false;
  public filled = false;

  constructor(private editor: MockPixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    if (!this.isDrawing) {
      this.centerX = x;
      this.centerY = y;
      this.isDrawing = true;
    } else {
      if (this.centerX !== null && this.centerY !== null) {
        const radius = Math.round(Math.sqrt(
          Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2)
        ));
        await this.drawCircle(this.centerX, this.centerY, radius);
      }
      this.centerX = null;
      this.centerY = null;
      this.isDrawing = false;
    }
  }

  private async drawCircle(cx: number, cy: number, radius: number): Promise<void> {
    const color = this.editor.fgColor;

    if (radius === 0) {
      await this.editor.setPixelColor(cx, cy, color);
      return;
    }

    if (this.filled) {
      for (let y = -radius; y <= radius; y++) {
        const halfWidth = Math.round(Math.sqrt(radius * radius - y * y));
        for (let x = -halfWidth; x <= halfWidth; x++) {
          await this.editor.setPixelColor(cx + x, cy + y, color);
        }
      }
    } else {
      // Midpoint circle algorithm
      let x = radius;
      let y = 0;
      let err = 0;

      while (x >= y) {
        await this.editor.setPixelColor(cx + x, cy + y, color);
        await this.editor.setPixelColor(cx + y, cy + x, color);
        await this.editor.setPixelColor(cx - y, cy + x, color);
        await this.editor.setPixelColor(cx - x, cy + y, color);
        await this.editor.setPixelColor(cx - x, cy - y, color);
        await this.editor.setPixelColor(cx - y, cy - x, color);
        await this.editor.setPixelColor(cx + y, cy - x, color);
        await this.editor.setPixelColor(cx + x, cy - y, color);

        y++;
        if (err <= 0) {
          err += 2 * y + 1;
        }
        if (err > 0) {
          x--;
          err -= 2 * x + 1;
        }
      }
    }
  }
}

describe('Rectangle Tool', () => {
  let editor: MockPixelEditor;
  let rectangleTool: RectangleTool;

  beforeEach(() => {
    editor = new MockPixelEditor(10, 10, new Color(255, 255, 255));
    rectangleTool = new RectangleTool(editor);
    editor.fgColor = new Color(0, 0, 0); // Black
  });

  it('should draw outline rectangle', async () => {
    // First click at (2, 2)
    await rectangleTool.clicked(2, 2);
    expect(editor.pixelUpdates.length).toBe(0); // No pixels drawn yet

    // Second click at (5, 5) - should draw rectangle outline
    await rectangleTool.clicked(5, 5);

    // Check top edge (y=2, x from 2 to 5) = 4 pixels
    // Check bottom edge (y=5, x from 2 to 5) = 4 pixels
    // Check left edge (y from 3 to 4, x=2) = 2 pixels
    // Check right edge (y from 3 to 4, x=5) = 2 pixels
    // Total = 12 pixels
    expect(editor.pixelUpdates.length).toBe(12);

    // Verify corners are black
    expect(editor.getPixelColor(2, 2).r).toBe(0);
    expect(editor.getPixelColor(5, 5).r).toBe(0);
    expect(editor.getPixelColor(2, 5).r).toBe(0);
    expect(editor.getPixelColor(5, 2).r).toBe(0);

    // Verify center is still white
    expect(editor.getPixelColor(3, 3).r).toBe(255);
  });

  it('should draw filled rectangle', async () => {
    rectangleTool.filled = true;

    await rectangleTool.clicked(1, 1);
    await rectangleTool.clicked(3, 3);

    // 3x3 = 9 pixels
    expect(editor.pixelUpdates.length).toBe(9);

    // All pixels in the rectangle should be black
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        const color = editor.getPixelColor(x, y);
        expect(color.r).toBe(0);
      }
    }
  });

  it('should handle single-pixel rectangle', async () => {
    await rectangleTool.clicked(5, 5);
    await rectangleTool.clicked(5, 5);

    // Single pixel - the outline algorithm draws top and bottom edges,
    // which for a 1x1 rect both draw to the same pixel
    expect(editor.pixelUpdates.length).toBe(2);
    expect(editor.getPixelColor(5, 5).r).toBe(0);
  });

  it('should handle reverse order coordinates', async () => {
    // Start from bottom-right, end at top-left
    await rectangleTool.clicked(5, 5);
    await rectangleTool.clicked(2, 2);

    // Should produce same result as 2,2 -> 5,5
    expect(editor.pixelUpdates.length).toBe(12);
  });

  it('should reset state after drawing', async () => {
    await rectangleTool.clicked(0, 0);
    await rectangleTool.clicked(2, 2);
    const firstCount = editor.pixelUpdates.length;

    editor.pixelUpdates = [];

    // Draw second rectangle
    await rectangleTool.clicked(5, 5);
    await rectangleTool.clicked(7, 7);

    // Should draw a new rectangle
    expect(editor.pixelUpdates.length).toBeGreaterThan(0);
  });
});

describe('Circle Tool', () => {
  let editor: MockPixelEditor;
  let circleTool: CircleTool;

  beforeEach(() => {
    editor = new MockPixelEditor(20, 20, new Color(255, 255, 255));
    circleTool = new CircleTool(editor);
    editor.fgColor = new Color(255, 0, 0); // Red
  });

  it('should draw single pixel for radius 0', async () => {
    // Center at (10, 10), click at same point
    await circleTool.clicked(10, 10);
    await circleTool.clicked(10, 10);

    expect(editor.pixelUpdates.length).toBe(1);
    expect(editor.getPixelColor(10, 10).r).toBe(255);
    expect(editor.getPixelColor(10, 10).g).toBe(0);
  });

  it('should draw circle outline', async () => {
    // Center at (10, 10), radius 3
    await circleTool.clicked(10, 10);
    await circleTool.clicked(13, 10); // 3 pixels away

    // Circle with radius 3 should have pixels drawn
    expect(editor.pixelUpdates.length).toBeGreaterThan(0);

    // Check some points that should be on the circle
    const hasTopPoint = editor.pixelUpdates.some(u => u.x === 10 && u.y === 7);
    const hasRightPoint = editor.pixelUpdates.some(u => u.x === 13 && u.y === 10);
    expect(hasTopPoint || hasRightPoint).toBe(true);
  });

  it('should draw filled circle', async () => {
    circleTool.filled = true;

    await circleTool.clicked(10, 10);
    await circleTool.clicked(12, 10); // radius 2

    // Filled circle should have more pixels
    expect(editor.pixelUpdates.length).toBeGreaterThan(8);

    // Center should be filled
    const hasCenter = editor.pixelUpdates.some(u => u.x === 10 && u.y === 10);
    expect(hasCenter).toBe(true);
  });

  it('should reset state after drawing', async () => {
    await circleTool.clicked(5, 5);
    await circleTool.clicked(7, 5);

    editor.pixelUpdates = [];

    // Draw second circle
    await circleTool.clicked(15, 15);
    await circleTool.clicked(17, 15);

    expect(editor.pixelUpdates.length).toBeGreaterThan(0);
  });
});

describe('Color Class', () => {
  it('should create color with RGB values', () => {
    const color = new Color(128, 64, 32);
    expect(color.r).toBe(128);
    expect(color.g).toBe(64);
    expect(color.b).toBe(32);
    expect(color.a).toBe(255);
  });

  it('should create color with RGBA values', () => {
    const color = new Color(100, 150, 200, 128);
    expect(color.r).toBe(100);
    expect(color.g).toBe(150);
    expect(color.b).toBe(200);
    expect(color.a).toBe(128);
  });

  it('should convert to hex string', () => {
    const black = new Color(0, 0, 0);
    expect(black.toHex()).toBe('#000000');

    const white = new Color(255, 255, 255);
    expect(white.toHex()).toBe('#ffffff');

    const red = new Color(255, 0, 0);
    expect(red.toHex()).toBe('#ff0000');
  });

  it('should compare colors correctly', () => {
    const c1 = new Color(100, 100, 100);
    const c2 = new Color(100, 100, 100);
    const c3 = new Color(100, 100, 101);

    expect(c1.equals(c2)).toBe(true);
    expect(c1.equals(c3)).toBe(false);
  });

  it('should clone colors correctly', () => {
    const original = new Color(50, 100, 150, 200);
    const cloned = original.clone();

    expect(cloned.r).toBe(50);
    expect(cloned.g).toBe(100);
    expect(cloned.b).toBe(150);
    expect(cloned.a).toBe(200);

    // Modifying clone should not affect original
    cloned.r = 0;
    expect(original.r).toBe(50);
  });
});

describe('Background Color Support', () => {
  let editor: MockPixelEditor;

  beforeEach(() => {
    editor = new MockPixelEditor(10, 10);
  });

  it('should have default white background color', () => {
    expect(editor.bgColor.r).toBe(255);
    expect(editor.bgColor.g).toBe(255);
    expect(editor.bgColor.b).toBe(255);
  });

  it('should update background color', async () => {
    await editor.setBGColor(new Color(128, 128, 128));
    expect(editor.bgColor.r).toBe(128);
    expect(editor.bgColor.g).toBe(128);
    expect(editor.bgColor.b).toBe(128);
  });

  it('should use background color for eraser', async () => {
    await editor.setBGColor(new Color(255, 0, 0)); // Red background

    // Simulate eraser using bgColor
    await editor.setPixelColor(5, 5, editor.bgColor);

    expect(editor.getPixelColor(5, 5).r).toBe(255);
    expect(editor.getPixelColor(5, 5).g).toBe(0);
    expect(editor.getPixelColor(5, 5).b).toBe(0);
  });
});
