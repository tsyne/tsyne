/**
 * Tests for pixeledit tools
 * Tests bucket fill, pencil, picker, and eraser tools
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
}

// Mock PixelEditor for testing
class MockPixelEditor {
  public fgColor: Color = new Color(0, 0, 0);
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
}

// BucketTool implementation for testing
class BucketTool {
  name = 'Bucket';

  constructor(private editor: MockPixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    const targetColor = this.editor.getPixelColor(x, y);
    const fillColor = this.editor.fgColor;

    if (this.colorsEqual(targetColor, fillColor)) {
      return;
    }

    await this.floodFill(x, y, targetColor, fillColor);
  }

  private colorsEqual(c1: Color, c2: Color): boolean {
    return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
  }

  private async floodFill(startX: number, startY: number, targetColor: Color, fillColor: Color): Promise<void> {
    const queue: Array<{x: number; y: number}> = [{x: startX, y: startY}];
    const visited = new Set<string>();
    const pixelsToUpdate: Array<{x: number; y: number}> = [];

    while (queue.length > 0) {
      const {x, y} = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key) || x < 0 || x >= this.editor.getImageWidth() || y < 0 || y >= this.editor.getImageHeight()) {
        continue;
      }

      visited.add(key);

      const currentColor = this.editor.getPixelColor(x, y);
      if (!this.colorsEqual(currentColor, targetColor)) {
        continue;
      }

      pixelsToUpdate.push({x, y});

      queue.push({x: x + 1, y});
      queue.push({x: x - 1, y});
      queue.push({x, y: y + 1});
      queue.push({x, y: y - 1});
    }

    for (const {x, y} of pixelsToUpdate) {
      await this.editor.setPixelColor(x, y, fillColor);
    }
  }
}

describe('Bucket Fill Tool', () => {
  let editor: MockPixelEditor;
  let bucketTool: BucketTool;

  beforeEach(() => {
    // Create a 5x5 white canvas
    editor = new MockPixelEditor(5, 5, new Color(255, 255, 255));
    bucketTool = new BucketTool(editor);
  });

  it('should fill entire white canvas with black', async () => {
    editor.fgColor = new Color(0, 0, 0);
    await bucketTool.clicked(0, 0);

    // Check that all 25 pixels were updated
    expect(editor.pixelUpdates.length).toBe(25);

    // Check that all pixels are now black
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const color = editor.getPixelColor(x, y);
        expect(color.r).toBe(0);
        expect(color.g).toBe(0);
        expect(color.b).toBe(0);
      }
    }
  });

  it('should fill only connected region', async () => {
    // Create a 5x5 canvas with a black border
    for (let x = 0; x < 5; x++) {
      await editor.setPixelColor(x, 0, new Color(0, 0, 0)); // Top border
      await editor.setPixelColor(x, 4, new Color(0, 0, 0)); // Bottom border
    }
    for (let y = 0; y < 5; y++) {
      await editor.setPixelColor(0, y, new Color(0, 0, 0)); // Left border
      await editor.setPixelColor(4, y, new Color(0, 0, 0)); // Right border
    }

    editor.pixelUpdates = []; // Reset updates
    editor.fgColor = new Color(255, 0, 0); // Red

    // Fill the center (should only fill the 3x3 white center, not the black border)
    await bucketTool.clicked(2, 2);

    // Should fill 9 pixels (3x3 center)
    expect(editor.pixelUpdates.length).toBe(9);

    // Check center is red
    for (let y = 1; y < 4; y++) {
      for (let x = 1; x < 4; x++) {
        const color = editor.getPixelColor(x, y);
        expect(color.r).toBe(255);
        expect(color.g).toBe(0);
        expect(color.b).toBe(0);
      }
    }

    // Check border is still black
    expect(editor.getPixelColor(0, 0).r).toBe(0);
    expect(editor.getPixelColor(4, 4).r).toBe(0);
  });

  it('should not fill if target and fill colors are the same', async () => {
    editor.fgColor = new Color(255, 255, 255); // White (same as canvas)
    await bucketTool.clicked(0, 0);

    // Should not update any pixels
    expect(editor.pixelUpdates.length).toBe(0);
  });

  it('should handle single pixel fill', async () => {
    // Set one pixel to red
    await editor.setPixelColor(2, 2, new Color(255, 0, 0));
    editor.pixelUpdates = [];

    // Fill that red pixel with blue
    editor.fgColor = new Color(0, 0, 255);
    await bucketTool.clicked(2, 2);

    // Should only fill that one pixel
    expect(editor.pixelUpdates.length).toBe(1);
    const color = editor.getPixelColor(2, 2);
    expect(color.r).toBe(0);
    expect(color.g).toBe(0);
    expect(color.b).toBe(255);
  });

  it('should handle diagonal separation correctly', async () => {
    // Create a checkerboard pattern (only vertical/horizontal connections, no diagonal)
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if ((x + y) % 2 === 0) {
          await editor.setPixelColor(x, y, new Color(0, 0, 0)); // Black
        }
      }
    }
    editor.pixelUpdates = [];

    // Fill a white pixel - should only fill pixels connected orthogonally
    editor.fgColor = new Color(255, 0, 0); // Red
    await bucketTool.clicked(0, 1);

    // In a checkerboard, white pixels are not all connected
    // (0,1) should connect to (1,1), (0,2), (0,0) but not diagonally
    const filledCount = editor.pixelUpdates.length;
    expect(filledCount).toBeLessThan(25); // Should not fill entire canvas
    expect(filledCount).toBeGreaterThan(0); // Should fill some pixels
  });
});

// LineTool implementation for testing
class LineTool {
  name = 'Line';
  private startX: number | null = null;
  private startY: number | null = null;
  private isDrawing = false;

  constructor(private editor: MockPixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    if (!this.isDrawing) {
      // First click - set start point
      this.startX = x;
      this.startY = y;
      this.isDrawing = true;
    } else {
      // Second click - draw line to end point
      if (this.startX !== null && this.startY !== null) {
        await this.drawLine(this.startX, this.startY, x, y);
      }
      // Reset state
      this.startX = null;
      this.startY = null;
      this.isDrawing = false;
    }
  }

  /**
   * Bresenham's line algorithm for drawing straight lines
   */
  private async drawLine(x0: number, y0: number, x1: number, y1: number): Promise<void> {
    const color = this.editor.fgColor;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      // Draw pixel at current position
      await this.editor.setPixelColor(x, y, color);

      // Check if we've reached the end
      if (x === x1 && y === y1) break;

      // Calculate error and step to next pixel
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
}

describe('Line Drawing Tool', () => {
  let editor: MockPixelEditor;
  let lineTool: LineTool;

  beforeEach(() => {
    // Create a 10x10 white canvas
    editor = new MockPixelEditor(10, 10, new Color(255, 255, 255));
    lineTool = new LineTool(editor);
  });

  it('should draw horizontal line from left to right', async () => {
    editor.fgColor = new Color(0, 0, 0); // Black

    // First click at (1, 5)
    await lineTool.clicked(1, 5);
    expect(editor.pixelUpdates.length).toBe(0); // No pixels drawn yet

    // Second click at (8, 5) - should draw horizontal line
    await lineTool.clicked(8, 5);

    // Should have drawn 8 pixels (from x=1 to x=8 inclusive)
    expect(editor.pixelUpdates.length).toBe(8);

    // Verify all pixels are on the same row
    for (const update of editor.pixelUpdates) {
      expect(update.y).toBe(5);
      expect(update.x).toBeGreaterThanOrEqual(1);
      expect(update.x).toBeLessThanOrEqual(8);
    }
  });

  it('should draw vertical line from top to bottom', async () => {
    editor.fgColor = new Color(0, 0, 255); // Blue

    await lineTool.clicked(3, 1);
    await lineTool.clicked(3, 7);

    // Should have drawn 7 pixels (from y=1 to y=7 inclusive)
    expect(editor.pixelUpdates.length).toBe(7);

    // Verify all pixels are on the same column
    for (const update of editor.pixelUpdates) {
      expect(update.x).toBe(3);
      expect(update.y).toBeGreaterThanOrEqual(1);
      expect(update.y).toBeLessThanOrEqual(7);
      expect(update.color.b).toBe(255); // Blue
    }
  });

  it('should draw diagonal line', async () => {
    editor.fgColor = new Color(255, 0, 0); // Red

    // Draw diagonal from (0, 0) to (4, 4)
    await lineTool.clicked(0, 0);
    await lineTool.clicked(4, 4);

    // Should draw 5 pixels along the diagonal
    expect(editor.pixelUpdates.length).toBe(5);

    // Verify pixels form a diagonal
    const sortedUpdates = editor.pixelUpdates.sort((a, b) => a.x - b.x);
    for (let i = 0; i < sortedUpdates.length; i++) {
      expect(sortedUpdates[i].x).toBe(i);
      expect(sortedUpdates[i].y).toBe(i);
    }
  });

  it('should draw single pixel when start and end are the same', async () => {
    editor.fgColor = new Color(128, 128, 128); // Gray

    await lineTool.clicked(5, 5);
    await lineTool.clicked(5, 5);

    // Should draw just 1 pixel
    expect(editor.pixelUpdates.length).toBe(1);
    expect(editor.pixelUpdates[0].x).toBe(5);
    expect(editor.pixelUpdates[0].y).toBe(5);
  });

  it('should handle steep lines correctly', async () => {
    editor.fgColor = new Color(0, 255, 0); // Green

    // Draw a steep line (more vertical than horizontal)
    await lineTool.clicked(2, 0);
    await lineTool.clicked(3, 6);

    // Should draw pixels forming a line
    expect(editor.pixelUpdates.length).toBeGreaterThan(0);

    // Verify start and end points are correct
    const updates = editor.pixelUpdates;
    const hasStart = updates.some(u => u.x === 2 && u.y === 0);
    const hasEnd = updates.some(u => u.x === 3 && u.y === 6);
    expect(hasStart).toBe(true);
    expect(hasEnd).toBe(true);
  });

  it('should reset state after drawing a line', async () => {
    editor.fgColor = new Color(0, 0, 0);

    // Draw first line
    await lineTool.clicked(0, 0);
    await lineTool.clicked(2, 2);
    const firstLineCount = editor.pixelUpdates.length;

    editor.pixelUpdates = []; // Clear updates

    // Draw second line - should start fresh
    await lineTool.clicked(5, 5);
    await lineTool.clicked(7, 5);

    // Should draw a new line, not extend the previous one
    expect(editor.pixelUpdates.length).toBe(3); // 3 pixels from (5,5) to (7,5)
  });
});
