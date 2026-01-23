// @tsyne-app:name Pixel Editor
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="4" height="4" fill="currentColor"/><rect x="8" y="8" width="4" height="4" fill="currentColor"/><rect x="12" y="12" width="4" height="4" fill="currentColor"/><rect x="16" y="4" width="4" height="4"/><rect x="4" y="16" width="4" height="4"/><path d="M2 2h20v20H2z"/></svg>
// @tsyne-app:category graphics
// @tsyne-app:builder createPixelEditorApp
// @tsyne-app:args app,filePath,windowWidth,windowHeight

/**
 * Pixel Editor for Tsyne
 *
 * Ported from https://github.com/fyne-io/pixeledit
 * Original authors: Fyne.io contributors
 * License: See original repository
 *
 * This port demonstrates pixel editing capabilities in Tsyne, including:
 * - Main menu with File, Edit, Layer, Adjust, Effects, Channels, Transform operations
 * - File dialogs for Open/Save
 * - Recent files history (stored in preferences)
 * - Color picker for foreground/background color selection
 * - Power-of-2 zoom (100%, 200%, 400%, etc.)
 * - FG/BG color preview rectangles
 * - Undo/Redo system
 * - Multiple drawing tools (Pencil, Picker, Eraser, Bucket, Line, Rectangle, Circle, Select)
 * - Selection system with copy/cut/paste clipboard operations
 * - Multi-layer support with visibility, opacity, and compositing
 *
 * 35+ Image Effects:
 *
 * ADJUSTMENTS:
 * - Brightness, Contrast, Saturation, Gamma correction
 * - Auto Levels (normalize), Color Temperature, Tint
 *
 * COLOR EFFECTS:
 * - Grayscale, Sepia, Invert (negative)
 * - Posterize, Threshold, Solarize, Dither
 *
 * BLUR/SHARPEN:
 * - Box Blur, Sharpen (unsharp mask)
 *
 * ARTISTIC:
 * - Edge Detection (Sobel), Emboss
 * - Pixelate, Oil Paint, Pencil Sketch, Halftone
 *
 * FILM/PHOTO:
 * - Vignette, Film Grain, Vintage, Cross Process
 *
 * SPECIAL:
 * - Night Vision, Thermal/Heat Map
 * - Chromatic Aberration, Glitch, Color Splash
 *
 * CHANNELS:
 * - Red/Green/Blue channel isolation
 * - Channel swapping (RGB ↔ BGR, rotate channels)
 *
 * TRANSFORMS:
 * - Flip Horizontal/Vertical
 * - Rotate 90° CW, 90° CCW, 180°
 *
 * Supported Image Formats (via sharp):
 * - PNG (load/save)
 * - JPEG (load/save)
 * - WebP (load/save) - modern format with good compression
 * - AVIF (load/save) - next-gen format with excellent compression
 * - TIFF (load/save) - professional format
 * - GIF (load/save) - legacy format
 */

import { app, resolveTransport, TappableCanvasRaster } from 'tsyne';
import type { App, Window, CanvasRectangle, Label, Button } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

// Supported image formats
type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'tiff' | 'gif';

const SUPPORTED_FORMATS: Record<string, ImageFormat> = {
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.webp': 'webp',
  '.avif': 'avif',
  '.tiff': 'tiff',
  '.tif': 'tiff',
  '.gif': 'gif',
};

// Constants
const MAX_RECENT_FILES = 5;
const RECENT_COUNT_KEY = 'pixeledit_recentCount';
const RECENT_FORMAT_KEY = 'pixeledit_recent_';
const MAX_UNDO_HISTORY = 50;
const MAX_LAYERS = 16;

/**
 * Tool interface - defines the contract for editing tools
 * Based on: internal/api/tool.go
 */
interface Tool {
  name: string;
  icon?: string;
  clicked(x: number, y: number): void | Promise<void>;
  /** Optional: called when tool is deactivated */
  deactivate?(): void;
}

/**
 * Selection rectangle interface
 */
interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Clipboard data structure for copy/paste operations
 */
interface ClipboardData {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

/**
 * Layer structure for multi-layer support
 */
interface Layer {
  id: number;
  name: string;
  visible: boolean;
  opacity: number; // 0-255
  locked: boolean;
  pixels: Uint8ClampedArray;
}

/**
 * Blend modes for layer compositing
 */
type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'add';

/**
 * Color utility functions
 */
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

  static fromHex(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return new Color(0, 0, 0);
    return new Color(
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    );
  }

  equals(other: Color): boolean {
    return this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a);
  }
}

/**
 * Represents a single pixel change for undo/redo
 */
interface PixelChange {
  x: number;
  y: number;
  oldColor: Color;
  newColor: Color;
}

/**
 * Represents a batch of pixel changes (one operation)
 */
interface UndoOperation {
  changes: PixelChange[];
  description: string;
}

/**
 * Pencil tool - draws pixels with the current foreground color
 * Based on: internal/tool/pencil.go
 */
class PencilTool implements Tool {
  name = 'Pencil';
  icon = 'Pencil';

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    await this.editor.setPixelColor(x, y, this.editor.fgColor);
  }
}

/**
 * Eyedropper tool - samples color from the canvas and sets it as FG color
 * Click on any pixel to pick its color
 * Based on: internal/tool/picker.go
 */
class EyedropperTool implements Tool {
  name = 'Eyedropper';
  icon = 'Eyedropper';

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    const color = this.editor.getPixelColor(x, y);
    await this.editor.setFGColor(color);
  }
}

/**
 * Eraser tool - erases pixels by setting them to background color
 * Based on: internal/tool/eraser.go
 */
class EraserTool implements Tool {
  name = 'Eraser';
  icon = 'Eraser';

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    await this.editor.setPixelColor(x, y, this.editor.bgColor);
  }
}

/**
 * Bucket fill tool - flood fills an area with the current foreground color
 * Based on: internal/tool/bucket.go
 */
class BucketTool implements Tool {
  name = 'Bucket';
  icon = 'Bucket';

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    const targetColor = this.editor.getPixelColor(x, y);
    const fillColor = this.editor.fgColor;

    // Don't fill if target and fill colors are the same
    if (this.colorsEqual(targetColor, fillColor)) {
      return;
    }

    await this.floodFill(x, y, targetColor, fillColor);
  }

  private colorsEqual(c1: Color, c2: Color): boolean {
    return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
  }

  /**
   * Flood fill algorithm using a queue (BFS approach)
   * More efficient than recursive approach for large areas
   */
  private async floodFill(startX: number, startY: number, targetColor: Color, fillColor: Color): Promise<void> {
    const queue: Array<{x: number; y: number}> = [{x: startX, y: startY}];
    const visited = new Set<string>();
    const pixelsToUpdate: Array<{x: number; y: number}> = [];

    while (queue.length > 0) {
      const point = queue.shift();
      if (!point) break; // Type guard: shouldn't happen, but satisfies strict null checks
      const {x, y} = point;
      const key = `${x},${y}`;

      // Skip if already visited or out of bounds
      if (visited.has(key) || x < 0 || x >= this.editor.getImageWidth() || y < 0 || y >= this.editor.getImageHeight()) {
        continue;
      }

      visited.add(key);

      // Check if this pixel matches the target color
      const currentColor = this.editor.getPixelColor(x, y);
      if (!this.colorsEqual(currentColor, targetColor)) {
        continue;
      }

      // Add to pixels to update
      pixelsToUpdate.push({x, y});

      // Add neighbors to queue
      queue.push({x: x + 1, y});
      queue.push({x: x - 1, y});
      queue.push({x, y: y + 1});
      queue.push({x, y: y - 1});
    }

    // Update all pixels at once for better performance
    for (const {x, y} of pixelsToUpdate) {
      await this.editor.setPixelColor(x, y, fillColor);
    }
  }
}

/**
 * Line drawing tool - draws straight lines using Bresenham's algorithm
 */
class LineTool implements Tool {
  name = 'Line';
  icon = 'Line';
  private startX: number | null = null;
  private startY: number | null = null;
  private isDrawing = false;

  constructor(private editor: PixelEditor) {}

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
   * Bresenham's line algorithm for drawing straight lines (batched for performance)
   */
  private async drawLine(x0: number, y0: number, x1: number, y1: number): Promise<void> {
    const color = this.editor.fgColor;
    const lineWidth = this.editor.lineWidth;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      // Draw a filled circle at each point for thick lines
      this.drawThickPoint(x, y, color, lineWidth);

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

    // Send all pixel updates in a single message
    await this.editor.flushPixelUpdates();
  }

  /**
   * Draw a thick point (filled circle) for line width support
   */
  private drawThickPoint(cx: number, cy: number, color: Color, width: number): void {
    if (width <= 1) {
      this.editor.setPixelColorBatched(cx, cy, color);
      return;
    }

    const radius = Math.floor((width - 1) / 2);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          this.editor.setPixelColorBatched(cx + dx, cy + dy, color);
        }
      }
    }
  }
}

/**
 * Rectangle tool - draws rectangles with optional fill and line width
 */
class RectangleTool implements Tool {
  name = 'Rectangle';
  icon = 'Rectangle';
  private startX: number | null = null;
  private startY: number | null = null;
  private isDrawing = false;

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    if (!this.isDrawing) {
      // First click - set start corner
      this.startX = x;
      this.startY = y;
      this.isDrawing = true;
    } else {
      // Second click - draw rectangle to end corner
      if (this.startX !== null && this.startY !== null) {
        await this.drawRectangle(this.startX, this.startY, x, y);
      }
      // Reset state
      this.startX = null;
      this.startY = null;
      this.isDrawing = false;
    }
  }

  /**
   * Draw a rectangle from (x0, y0) to (x1, y1) (batched for performance)
   */
  private async drawRectangle(x0: number, y0: number, x1: number, y1: number): Promise<void> {
    const strokeColor = this.editor.fgColor;
    const fillColor = this.editor.fillColor;
    const lineWidth = this.editor.lineWidth;
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    // Fill interior first (if fill color is set)
    if (fillColor) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          this.editor.setPixelColorBatched(x, y, fillColor);
        }
      }
    }

    // Draw outline with line width
    const halfWidth = Math.floor((lineWidth - 1) / 2);

    // Top edge
    for (let x = minX; x <= maxX; x++) {
      this.drawThickPoint(x, minY, strokeColor, lineWidth);
    }
    // Bottom edge
    for (let x = minX; x <= maxX; x++) {
      this.drawThickPoint(x, maxY, strokeColor, lineWidth);
    }
    // Left edge (excluding corners)
    for (let y = minY + 1; y < maxY; y++) {
      this.drawThickPoint(minX, y, strokeColor, lineWidth);
    }
    // Right edge (excluding corners)
    for (let y = minY + 1; y < maxY; y++) {
      this.drawThickPoint(maxX, y, strokeColor, lineWidth);
    }

    // Send all pixel updates in a single message
    await this.editor.flushPixelUpdates();
  }

  /**
   * Draw a thick point (filled circle) for line width support
   */
  private drawThickPoint(cx: number, cy: number, color: Color, width: number): void {
    if (width <= 1) {
      this.editor.setPixelColorBatched(cx, cy, color);
      return;
    }

    const radius = Math.floor((width - 1) / 2);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          this.editor.setPixelColorBatched(cx + dx, cy + dy, color);
        }
      }
    }
  }
}

/**
 * Circle tool - draws circles with optional fill and line width
 * Uses midpoint circle algorithm
 */
class CircleTool implements Tool {
  name = 'Circle';
  icon = 'Circle';
  private centerX: number | null = null;
  private centerY: number | null = null;
  private isDrawing = false;

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    if (!this.isDrawing) {
      // First click - set center
      this.centerX = x;
      this.centerY = y;
      this.isDrawing = true;
    } else {
      // Second click - draw circle with radius to this point
      if (this.centerX !== null && this.centerY !== null) {
        const radius = Math.round(Math.sqrt(
          Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2)
        ));
        await this.drawCircle(this.centerX, this.centerY, radius);
      }
      // Reset state
      this.centerX = null;
      this.centerY = null;
      this.isDrawing = false;
    }
  }

  /**
   * Draw a circle using the midpoint circle algorithm
   */
  private async drawCircle(cx: number, cy: number, radius: number): Promise<void> {
    const strokeColor = this.editor.fgColor;
    const fillColor = this.editor.fillColor;
    const lineWidth = this.editor.lineWidth;

    if (radius === 0) {
      await this.editor.setPixelColor(cx, cy, strokeColor);
      return;
    }

    // Fill interior first (if fill color is set)
    if (fillColor) {
      for (let y = -radius; y <= radius; y++) {
        const halfWidth = Math.round(Math.sqrt(radius * radius - y * y));
        for (let x = -halfWidth; x <= halfWidth; x++) {
          this.editor.setPixelColorBatched(cx + x, cy + y, fillColor);
        }
      }
    }

    // Draw outline using midpoint circle algorithm with line width
    let x = radius;
    let y = 0;
    let err = 0;

    while (x >= y) {
      // Draw 8 octants with thick points
      this.drawThickPoint(cx + x, cy + y, strokeColor, lineWidth);
      this.drawThickPoint(cx + y, cy + x, strokeColor, lineWidth);
      this.drawThickPoint(cx - y, cy + x, strokeColor, lineWidth);
      this.drawThickPoint(cx - x, cy + y, strokeColor, lineWidth);
      this.drawThickPoint(cx - x, cy - y, strokeColor, lineWidth);
      this.drawThickPoint(cx - y, cy - x, strokeColor, lineWidth);
      this.drawThickPoint(cx + y, cy - x, strokeColor, lineWidth);
      this.drawThickPoint(cx + x, cy - y, strokeColor, lineWidth);

      y++;
      if (err <= 0) {
        err += 2 * y + 1;
      }
      if (err > 0) {
        x--;
        err -= 2 * x + 1;
      }
    }

    // Send all pixel updates in a single message
    await this.editor.flushPixelUpdates();
  }

  /**
   * Draw a thick point (filled circle) for line width support
   */
  private drawThickPoint(cx: number, cy: number, color: Color, width: number): void {
    if (width <= 1) {
      this.editor.setPixelColorBatched(cx, cy, color);
      return;
    }

    const radius = Math.floor((width - 1) / 2);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          this.editor.setPixelColorBatched(cx + dx, cy + dy, color);
        }
      }
    }
  }
}

/**
 * Selection tool - selects rectangular regions of the canvas
 * Used for copy/cut/paste operations
 */
class SelectionTool implements Tool {
  name = 'Select';
  icon = 'Select';
  private startX: number | null = null;
  private startY: number | null = null;
  private isSelecting = false;

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    if (!this.isSelecting) {
      // First click - start selection
      this.startX = x;
      this.startY = y;
      this.isSelecting = true;
    } else {
      // Second click - complete selection
      if (this.startX !== null && this.startY !== null) {
        const minX = Math.min(this.startX, x);
        const maxX = Math.max(this.startX, x);
        const minY = Math.min(this.startY, y);
        const maxY = Math.max(this.startY, y);

        const selection: Selection = {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1
        };

        this.editor.setSelection(selection);
      }
      // Reset state
      this.startX = null;
      this.startY = null;
      this.isSelecting = false;
    }
  }

  deactivate(): void {
    this.startX = null;
    this.startY = null;
    this.isSelecting = false;
  }
}

/**
 * ImageEffects - Collection of 30+ image effects
 * Includes basic adjustments, color effects, artistic filters, and transforms
 */
class ImageEffects {
  /**
   * Apply brightness adjustment (-100 to +100)
   */
  static brightness(pixels: Uint8ClampedArray, amount: number): void {
    const factor = amount * 2.55; // Convert to 0-255 range
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + factor));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + factor));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + factor));
    }
  }

  /**
   * Apply contrast adjustment (-100 to +100)
   */
  static contrast(pixels: Uint8ClampedArray, amount: number): void {
    const factor = (259 * (amount + 255)) / (255 * (259 - amount));
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.max(0, Math.min(255, factor * (pixels[i] - 128) + 128));
      pixels[i + 1] = Math.max(0, Math.min(255, factor * (pixels[i + 1] - 128) + 128));
      pixels[i + 2] = Math.max(0, Math.min(255, factor * (pixels[i + 2] - 128) + 128));
    }
  }

  /**
   * Apply saturation adjustment (-100 to +100)
   */
  static saturation(pixels: Uint8ClampedArray, amount: number): void {
    const factor = (amount + 100) / 100;
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      pixels[i] = Math.max(0, Math.min(255, gray + factor * (pixels[i] - gray)));
      pixels[i + 1] = Math.max(0, Math.min(255, gray + factor * (pixels[i + 1] - gray)));
      pixels[i + 2] = Math.max(0, Math.min(255, gray + factor * (pixels[i + 2] - gray)));
    }
  }

  /**
   * Apply gamma correction (0.1 to 3.0)
   */
  static gamma(pixels: Uint8ClampedArray, gammaValue: number): void {
    const invGamma = 1 / gammaValue;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.pow(pixels[i] / 255, invGamma) * 255;
      pixels[i + 1] = Math.pow(pixels[i + 1] / 255, invGamma) * 255;
      pixels[i + 2] = Math.pow(pixels[i + 2] / 255, invGamma) * 255;
    }
  }

  /**
   * Convert to grayscale
   */
  static grayscale(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = Math.round(0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
      pixels[i] = gray;
      pixels[i + 1] = gray;
      pixels[i + 2] = gray;
    }
  }

  /**
   * Apply sepia tone effect
   */
  static sepia(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      pixels[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
      pixels[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
      pixels[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
    }
  }

  /**
   * Invert colors (negative)
   */
  static invert(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255 - pixels[i];
      pixels[i + 1] = 255 - pixels[i + 1];
      pixels[i + 2] = 255 - pixels[i + 2];
    }
  }

  /**
   * Posterize effect (reduce color levels)
   */
  static posterize(pixels: Uint8ClampedArray, levels: number): void {
    const step = 255 / (levels - 1);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.round(Math.round(pixels[i] / step) * step);
      pixels[i + 1] = Math.round(Math.round(pixels[i + 1] / step) * step);
      pixels[i + 2] = Math.round(Math.round(pixels[i + 2] / step) * step);
    }
  }

  /**
   * Threshold (black and white based on threshold value)
   */
  static threshold(pixels: Uint8ClampedArray, thresholdValue: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const val = gray >= thresholdValue ? 255 : 0;
      pixels[i] = val;
      pixels[i + 1] = val;
      pixels[i + 2] = val;
    }
  }

  /**
   * Solarize effect
   */
  static solarize(pixels: Uint8ClampedArray, thresholdValue: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = pixels[i] > thresholdValue ? 255 - pixels[i] : pixels[i];
      pixels[i + 1] = pixels[i + 1] > thresholdValue ? 255 - pixels[i + 1] : pixels[i + 1];
      pixels[i + 2] = pixels[i + 2] > thresholdValue ? 255 - pixels[i + 2] : pixels[i + 2];
    }
  }

  /**
   * Box blur effect
   */
  static blur(pixels: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);
    const size = radius * 2 + 1;
    const divisor = size * size;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const idx = (py * width + px) * 4;
            r += pixels[idx];
            g += pixels[idx + 1];
            b += pixels[idx + 2];
            a += pixels[idx + 3];
          }
        }
        const outIdx = (y * width + x) * 4;
        output[outIdx] = r / divisor;
        output[outIdx + 1] = g / divisor;
        output[outIdx + 2] = b / divisor;
        output[outIdx + 3] = a / divisor;
      }
    }
    return output;
  }

  /**
   * Sharpen effect
   */
  static sharpen(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);
    const kernel = [
      0, -amount, 0,
      -amount, 1 + 4 * amount, -amount,
      0, -amount, 0
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            r += pixels[idx] * kernel[ki];
            g += pixels[idx + 1] * kernel[ki];
            b += pixels[idx + 2] * kernel[ki];
            ki++;
          }
        }
        const outIdx = (y * width + x) * 4;
        output[outIdx] = Math.max(0, Math.min(255, r));
        output[outIdx + 1] = Math.max(0, Math.min(255, g));
        output[outIdx + 2] = Math.max(0, Math.min(255, b));
        output[outIdx + 3] = pixels[outIdx + 3];
      }
    }
    // Copy edges
    for (let x = 0; x < width; x++) {
      const topIdx = x * 4;
      const bottomIdx = ((height - 1) * width + x) * 4;
      for (let c = 0; c < 4; c++) {
        output[topIdx + c] = pixels[topIdx + c];
        output[bottomIdx + c] = pixels[bottomIdx + c];
      }
    }
    for (let y = 0; y < height; y++) {
      const leftIdx = (y * width) * 4;
      const rightIdx = (y * width + width - 1) * 4;
      for (let c = 0; c < 4; c++) {
        output[leftIdx + c] = pixels[leftIdx + c];
        output[rightIdx + c] = pixels[rightIdx + c];
      }
    }
    return output;
  }

  /**
   * Edge detection (Sobel operator)
   */
  static edgeDetect(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gxR = 0, gyR = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = 0.2989 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
            gxR += gray * sobelX[ki];
            gyR += gray * sobelY[ki];
            ki++;
          }
        }
        const magnitude = Math.min(255, Math.sqrt(gxR * gxR + gyR * gyR));
        const outIdx = (y * width + x) * 4;
        output[outIdx] = magnitude;
        output[outIdx + 1] = magnitude;
        output[outIdx + 2] = magnitude;
        output[outIdx + 3] = 255;
      }
    }
    return output;
  }

  /**
   * Emboss effect
   */
  static emboss(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);
    const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            r += pixels[idx] * kernel[ki];
            g += pixels[idx + 1] * kernel[ki];
            b += pixels[idx + 2] * kernel[ki];
            ki++;
          }
        }
        const outIdx = (y * width + x) * 4;
        output[outIdx] = Math.max(0, Math.min(255, r + 128));
        output[outIdx + 1] = Math.max(0, Math.min(255, g + 128));
        output[outIdx + 2] = Math.max(0, Math.min(255, b + 128));
        output[outIdx + 3] = pixels[outIdx + 3];
      }
    }
    // Copy edges
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 4; c++) {
        output[x * 4 + c] = pixels[x * 4 + c];
        output[((height - 1) * width + x) * 4 + c] = pixels[((height - 1) * width + x) * 4 + c];
      }
    }
    for (let y = 0; y < height; y++) {
      for (let c = 0; c < 4; c++) {
        output[(y * width) * 4 + c] = pixels[(y * width) * 4 + c];
        output[(y * width + width - 1) * 4 + c] = pixels[(y * width + width - 1) * 4 + c];
      }
    }
    return output;
  }

  /**
   * Pixelate effect
   */
  static pixelate(pixels: Uint8ClampedArray, width: number, height: number, blockSize: number): void {
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;
        // Sample block
        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const idx = ((y + by) * width + (x + bx)) * 4;
            r += pixels[idx];
            g += pixels[idx + 1];
            b += pixels[idx + 2];
            count++;
          }
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // Fill block
        for (let by = 0; by < blockSize && y + by < height; by++) {
          for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
            const idx = ((y + by) * width + (x + bx)) * 4;
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
          }
        }
      }
    }
  }

  /**
   * Oil painting effect
   */
  static oilPaint(pixels: Uint8ClampedArray, width: number, height: number, radius: number, levels: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const intensityCount: number[] = new Array(levels).fill(0);
        const avgR: number[] = new Array(levels).fill(0);
        const avgG: number[] = new Array(levels).fill(0);
        const avgB: number[] = new Array(levels).fill(0);

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const idx = (py * width + px) * 4;
            const intensity = Math.floor(((pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3) * levels / 256);
            const safeIntensity = Math.min(levels - 1, Math.max(0, intensity));
            intensityCount[safeIntensity]++;
            avgR[safeIntensity] += pixels[idx];
            avgG[safeIntensity] += pixels[idx + 1];
            avgB[safeIntensity] += pixels[idx + 2];
          }
        }

        let maxIndex = 0;
        let maxCount = 0;
        for (let i = 0; i < levels; i++) {
          if (intensityCount[i] > maxCount) {
            maxCount = intensityCount[i];
            maxIndex = i;
          }
        }

        const outIdx = (y * width + x) * 4;
        if (maxCount > 0) {
          output[outIdx] = avgR[maxIndex] / maxCount;
          output[outIdx + 1] = avgG[maxIndex] / maxCount;
          output[outIdx + 2] = avgB[maxIndex] / maxCount;
        } else {
          output[outIdx] = pixels[outIdx];
          output[outIdx + 1] = pixels[outIdx + 1];
          output[outIdx + 2] = pixels[outIdx + 2];
        }
        output[outIdx + 3] = pixels[outIdx + 3];
      }
    }
    return output;
  }

  /**
   * Vignette effect
   */
  static vignette(pixels: Uint8ClampedArray, width: number, height: number, strength: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vignette = 1 - (dist / maxDist) * strength;
        const idx = (y * width + x) * 4;
        pixels[idx] = Math.max(0, pixels[idx] * vignette);
        pixels[idx + 1] = Math.max(0, pixels[idx + 1] * vignette);
        pixels[idx + 2] = Math.max(0, pixels[idx + 2] * vignette);
      }
    }
  }

  /**
   * Film grain effect
   */
  static filmGrain(pixels: Uint8ClampedArray, amount: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const noise = (Math.random() - 0.5) * amount;
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + noise));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + noise));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + noise));
    }
  }

  /**
   * Vintage/Retro effect
   */
  static vintage(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      // Sepia-like with color shift
      pixels[i] = Math.min(255, r * 0.9 + g * 0.5 + b * 0.1);
      pixels[i + 1] = Math.min(255, r * 0.3 + g * 0.7 + b * 0.1);
      pixels[i + 2] = Math.min(255, r * 0.2 + g * 0.3 + b * 0.4);
    }
    // Add slight vignette
    // (handled separately if needed)
  }

  /**
   * Cross-process effect (like film cross-processing)
   */
  static crossProcess(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      // Boost contrast and shift colors
      pixels[i] = Math.min(255, Math.max(0, pixels[i] * 1.2 - 20)); // Red boost
      pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] * 0.9)); // Green reduce
      pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] * 1.3)); // Blue boost
    }
  }

  /**
   * Color temperature (warm/cool)
   */
  static colorTemperature(pixels: Uint8ClampedArray, temperature: number): void {
    // temperature: -100 (cool/blue) to +100 (warm/orange)
    const warmFactor = temperature / 100;
    for (let i = 0; i < pixels.length; i += 4) {
      if (warmFactor > 0) {
        pixels[i] = Math.min(255, pixels[i] + warmFactor * 30);
        pixels[i + 2] = Math.max(0, pixels[i + 2] - warmFactor * 30);
      } else {
        pixels[i] = Math.max(0, pixels[i] + warmFactor * 30);
        pixels[i + 2] = Math.min(255, pixels[i + 2] - warmFactor * 30);
      }
    }
  }

  /**
   * Red channel only
   */
  static redChannel(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
    }
  }

  /**
   * Green channel only
   */
  static greenChannel(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;
      pixels[i + 2] = 0;
    }
  }

  /**
   * Blue channel only
   */
  static blueChannel(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;
      pixels[i + 1] = 0;
    }
  }

  /**
   * Swap RGB channels
   */
  static swapChannels(pixels: Uint8ClampedArray, mode: 'rgb-bgr' | 'rgb-gbr' | 'rgb-brg'): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      switch (mode) {
        case 'rgb-bgr':
          pixels[i] = b;
          pixels[i + 2] = r;
          break;
        case 'rgb-gbr':
          pixels[i] = g;
          pixels[i + 1] = b;
          pixels[i + 2] = r;
          break;
        case 'rgb-brg':
          pixels[i] = b;
          pixels[i + 1] = r;
          pixels[i + 2] = g;
          break;
      }
    }
  }

  /**
   * Flip horizontal
   */
  static flipHorizontal(pixels: Uint8ClampedArray, width: number, height: number): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width / 2; x++) {
        const leftIdx = (y * width + x) * 4;
        const rightIdx = (y * width + (width - 1 - x)) * 4;
        for (let c = 0; c < 4; c++) {
          const temp = pixels[leftIdx + c];
          pixels[leftIdx + c] = pixels[rightIdx + c];
          pixels[rightIdx + c] = temp;
        }
      }
    }
  }

  /**
   * Flip vertical
   */
  static flipVertical(pixels: Uint8ClampedArray, width: number, height: number): void {
    for (let y = 0; y < height / 2; y++) {
      for (let x = 0; x < width; x++) {
        const topIdx = (y * width + x) * 4;
        const bottomIdx = ((height - 1 - y) * width + x) * 4;
        for (let c = 0; c < 4; c++) {
          const temp = pixels[topIdx + c];
          pixels[topIdx + c] = pixels[bottomIdx + c];
          pixels[bottomIdx + c] = temp;
        }
      }
    }
  }

  /**
   * Rotate 90 degrees clockwise
   */
  static rotate90CW(pixels: Uint8ClampedArray, width: number, height: number): { pixels: Uint8ClampedArray; width: number; height: number } {
    const newWidth = height;
    const newHeight = width;
    const output = new Uint8ClampedArray(pixels.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = (x * newWidth + (newWidth - 1 - y)) * 4;
        for (let c = 0; c < 4; c++) {
          output[dstIdx + c] = pixels[srcIdx + c];
        }
      }
    }
    return { pixels: output, width: newWidth, height: newHeight };
  }

  /**
   * Rotate 90 degrees counter-clockwise
   */
  static rotate90CCW(pixels: Uint8ClampedArray, width: number, height: number): { pixels: Uint8ClampedArray; width: number; height: number } {
    const newWidth = height;
    const newHeight = width;
    const output = new Uint8ClampedArray(pixels.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = ((newHeight - 1 - x) * newWidth + y) * 4;
        for (let c = 0; c < 4; c++) {
          output[dstIdx + c] = pixels[srcIdx + c];
        }
      }
    }
    return { pixels: output, width: newWidth, height: newHeight };
  }

  /**
   * Rotate 180 degrees
   */
  static rotate180(pixels: Uint8ClampedArray, width: number, height: number): void {
    const totalPixels = width * height;
    for (let i = 0; i < totalPixels / 2; i++) {
      const srcIdx = i * 4;
      const dstIdx = (totalPixels - 1 - i) * 4;
      for (let c = 0; c < 4; c++) {
        const temp = pixels[srcIdx + c];
        pixels[srcIdx + c] = pixels[dstIdx + c];
        pixels[dstIdx + c] = temp;
      }
    }
  }

  /**
   * Dithering (Floyd-Steinberg)
   */
  static dither(pixels: Uint8ClampedArray, width: number, height: number): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const oldVal = pixels[idx + c];
          const newVal = oldVal < 128 ? 0 : 255;
          pixels[idx + c] = newVal;
          const error = oldVal - newVal;
          // Distribute error to neighbors
          if (x + 1 < width) {
            pixels[idx + 4 + c] = Math.max(0, Math.min(255, pixels[idx + 4 + c] + error * 7 / 16));
          }
          if (y + 1 < height) {
            if (x > 0) {
              pixels[idx + width * 4 - 4 + c] = Math.max(0, Math.min(255, pixels[idx + width * 4 - 4 + c] + error * 3 / 16));
            }
            pixels[idx + width * 4 + c] = Math.max(0, Math.min(255, pixels[idx + width * 4 + c] + error * 5 / 16));
            if (x + 1 < width) {
              pixels[idx + width * 4 + 4 + c] = Math.max(0, Math.min(255, pixels[idx + width * 4 + 4 + c] + error * 1 / 16));
            }
          }
        }
      }
    }
  }

  /**
   * Chromatic aberration effect
   */
  static chromaticAberration(pixels: Uint8ClampedArray, width: number, height: number, offset: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Red channel shifted left
        const redX = Math.max(0, x - offset);
        const redIdx = (y * width + redX) * 4;
        output[idx] = pixels[redIdx];

        // Green channel stays
        output[idx + 1] = pixels[idx + 1];

        // Blue channel shifted right
        const blueX = Math.min(width - 1, x + offset);
        const blueIdx = (y * width + blueX) * 4;
        output[idx + 2] = pixels[blueIdx + 2];

        output[idx + 3] = pixels[idx + 3];
      }
    }
    return output;
  }

  /**
   * Glitch effect
   */
  static glitch(pixels: Uint8ClampedArray, width: number, height: number, intensity: number): void {
    const numGlitches = Math.floor(intensity * 10);
    for (let g = 0; g < numGlitches; g++) {
      const y = Math.floor(Math.random() * height);
      const sliceHeight = Math.floor(Math.random() * 10) + 1;
      const offset = Math.floor((Math.random() - 0.5) * 20);

      for (let dy = 0; dy < sliceHeight && y + dy < height; dy++) {
        for (let x = 0; x < width; x++) {
          const srcX = Math.max(0, Math.min(width - 1, x + offset));
          const srcIdx = ((y + dy) * width + srcX) * 4;
          const dstIdx = ((y + dy) * width + x) * 4;

          // Shift only red channel for RGB split effect
          if (Math.random() > 0.5) {
            pixels[dstIdx] = pixels[srcIdx];
          }
        }
      }
    }
  }

  /**
   * Tint effect - apply color overlay
   */
  static tint(pixels: Uint8ClampedArray, r: number, g: number, b: number, strength: number): void {
    const factor = strength / 100;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = pixels[i] * (1 - factor) + r * factor;
      pixels[i + 1] = pixels[i + 1] * (1 - factor) + g * factor;
      pixels[i + 2] = pixels[i + 2] * (1 - factor) + b * factor;
    }
  }

  /**
   * Halftone effect
   */
  static halftone(pixels: Uint8ClampedArray, width: number, height: number, dotSize: number): void {
    for (let y = 0; y < height; y += dotSize) {
      for (let x = 0; x < width; x += dotSize) {
        let sum = 0, count = 0;
        // Calculate average brightness in block
        for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
          for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            sum += 0.2989 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
            count++;
          }
        }
        const avgBrightness = sum / count;
        const radius = (1 - avgBrightness / 255) * (dotSize / 2);

        // Draw dot
        const centerX = x + dotSize / 2;
        const centerY = y + dotSize / 2;
        for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
          for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
            const px = x + dx;
            const py = y + dy;
            const dist = Math.sqrt((px - centerX) ** 2 + (py - centerY) ** 2);
            const idx = (py * width + px) * 4;
            if (dist <= radius) {
              pixels[idx] = 0;
              pixels[idx + 1] = 0;
              pixels[idx + 2] = 0;
            } else {
              pixels[idx] = 255;
              pixels[idx + 1] = 255;
              pixels[idx + 2] = 255;
            }
          }
        }
      }
    }
  }

  /**
   * Night vision effect
   */
  static nightVision(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const boosted = Math.min(255, gray * 1.5);
      pixels[i] = 0;
      pixels[i + 1] = boosted;
      pixels[i + 2] = 0;
    }
    // Add noise
    ImageEffects.filmGrain(pixels, 30);
  }

  /**
   * Thermal/Heat map effect
   */
  static thermal(pixels: Uint8ClampedArray): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const normalized = gray / 255;

      // Create heat map gradient (blue -> cyan -> green -> yellow -> red)
      let r: number, g: number, b: number;
      if (normalized < 0.25) {
        const t = normalized / 0.25;
        r = 0; g = 0; b = 128 + t * 127;
      } else if (normalized < 0.5) {
        const t = (normalized - 0.25) / 0.25;
        r = 0; g = t * 255; b = 255 - t * 128;
      } else if (normalized < 0.75) {
        const t = (normalized - 0.5) / 0.25;
        r = t * 255; g = 255; b = 0;
      } else {
        const t = (normalized - 0.75) / 0.25;
        r = 255; g = 255 - t * 255; b = 0;
      }
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }

  /**
   * Pencil sketch effect
   */
  static pencilSketch(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    // First grayscale
    ImageEffects.grayscale(pixels);
    // Then edge detect and invert
    const edges = ImageEffects.edgeDetect(pixels, width, height);
    ImageEffects.invert(edges);
    return edges;
  }

  /**
   * Color splash - keep one color, desaturate rest
   */
  static colorSplash(pixels: Uint8ClampedArray, targetR: number, targetG: number, targetB: number, tolerance: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const dist = Math.sqrt((r - targetR) ** 2 + (g - targetG) ** 2 + (b - targetB) ** 2);
      if (dist > tolerance) {
        const gray = Math.round(0.2989 * r + 0.587 * g + 0.114 * b);
        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;
      }
    }
  }

  /**
   * Normalize/Auto-levels
   */
  static normalize(pixels: Uint8ClampedArray): void {
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    // Find min/max for each channel
    for (let i = 0; i < pixels.length; i += 4) {
      minR = Math.min(minR, pixels[i]);
      maxR = Math.max(maxR, pixels[i]);
      minG = Math.min(minG, pixels[i + 1]);
      maxG = Math.max(maxG, pixels[i + 1]);
      minB = Math.min(minB, pixels[i + 2]);
      maxB = Math.max(maxB, pixels[i + 2]);
    }

    // Normalize
    const rangeR = maxR - minR || 1;
    const rangeG = maxG - minG || 1;
    const rangeB = maxB - minB || 1;

    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = ((pixels[i] - minR) / rangeR) * 255;
      pixels[i + 1] = ((pixels[i + 1] - minG) / rangeG) * 255;
      pixels[i + 2] = ((pixels[i + 2] - minB) / rangeB) * 255;
    }
  }

  // ============================================
  // Additional Effects (25+ more)
  // ============================================

  /**
   * Gaussian blur (approximated with multiple box blur passes)
   */
  static gaussianBlur(pixels: Uint8ClampedArray, width: number, height: number, sigma: number): Uint8ClampedArray {
    // Approximate Gaussian with 3 box blur passes
    const radius = Math.ceil(sigma * 2);
    let result = ImageEffects.blur(pixels, width, height, radius);
    result = ImageEffects.blur(result, width, height, radius);
    result = ImageEffects.blur(result, width, height, radius);
    return result;
  }

  /**
   * Motion blur effect
   */
  static motionBlur(pixels: Uint8ClampedArray, width: number, height: number, angle: number, distance: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);
    const radians = (angle * Math.PI) / 180;
    const dx = Math.cos(radians);
    const dy = Math.sin(radians);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let d = -distance; d <= distance; d++) {
          const sx = Math.round(x + dx * d);
          const sy = Math.round(y + dy * d);

          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const idx = (sy * width + sx) * 4;
            r += pixels[idx];
            g += pixels[idx + 1];
            b += pixels[idx + 2];
            a += pixels[idx + 3];
            count++;
          }
        }

        const outIdx = (y * width + x) * 4;
        output[outIdx] = r / count;
        output[outIdx + 1] = g / count;
        output[outIdx + 2] = b / count;
        output[outIdx + 3] = a / count;
      }
    }
    return output;
  }

  /**
   * Radial blur effect (zoom blur from center)
   */
  static radialBlur(pixels: Uint8ClampedArray, width: number, height: number, strength: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const samples = Math.max(1, Math.floor(dist * strength / 100));

        let r = 0, g = 0, b = 0, a = 0;

        for (let s = 0; s < samples; s++) {
          const t = s / samples;
          const sx = Math.round(centerX + dx * (1 - t * strength / 100));
          const sy = Math.round(centerY + dy * (1 - t * strength / 100));

          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const idx = (sy * width + sx) * 4;
            r += pixels[idx];
            g += pixels[idx + 1];
            b += pixels[idx + 2];
            a += pixels[idx + 3];
          }
        }

        const outIdx = (y * width + x) * 4;
        output[outIdx] = r / samples;
        output[outIdx + 1] = g / samples;
        output[outIdx + 2] = b / samples;
        output[outIdx + 3] = a / samples;
      }
    }
    return output;
  }

  /**
   * Median filter (noise reduction)
   */
  static medianFilter(pixels: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const rValues: number[] = [];
        const gValues: number[] = [];
        const bValues: number[] = [];

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const idx = (py * width + px) * 4;
            rValues.push(pixels[idx]);
            gValues.push(pixels[idx + 1]);
            bValues.push(pixels[idx + 2]);
          }
        }

        rValues.sort((a, b) => a - b);
        gValues.sort((a, b) => a - b);
        bValues.sort((a, b) => a - b);

        const mid = Math.floor(rValues.length / 2);
        const outIdx = (y * width + x) * 4;
        output[outIdx] = rValues[mid];
        output[outIdx + 1] = gValues[mid];
        output[outIdx + 2] = bValues[mid];
        output[outIdx + 3] = pixels[outIdx + 3];
      }
    }
    return output;
  }

  /**
   * High pass filter (edge enhancement)
   */
  static highPass(pixels: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const blurred = ImageEffects.blur(pixels, width, height, radius);
    const output = new Uint8ClampedArray(pixels.length);

    for (let i = 0; i < pixels.length; i += 4) {
      output[i] = Math.max(0, Math.min(255, 128 + (pixels[i] - blurred[i])));
      output[i + 1] = Math.max(0, Math.min(255, 128 + (pixels[i + 1] - blurred[i + 1])));
      output[i + 2] = Math.max(0, Math.min(255, 128 + (pixels[i + 2] - blurred[i + 2])));
      output[i + 3] = pixels[i + 3];
    }
    return output;
  }

  /**
   * Unsharp mask (sharpen based on blurred difference)
   */
  static unsharpMask(pixels: Uint8ClampedArray, width: number, height: number, amount: number, radius: number): Uint8ClampedArray {
    const blurred = ImageEffects.blur(pixels, width, height, radius);
    const output = new Uint8ClampedArray(pixels.length);

    for (let i = 0; i < pixels.length; i += 4) {
      output[i] = Math.max(0, Math.min(255, pixels[i] + (pixels[i] - blurred[i]) * amount));
      output[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + (pixels[i + 1] - blurred[i + 1]) * amount));
      output[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + (pixels[i + 2] - blurred[i + 2]) * amount));
      output[i + 3] = pixels[i + 3];
    }
    return output;
  }

  /**
   * Hue rotation (shift colors around the color wheel)
   */
  static hueRotate(pixels: Uint8ClampedArray, degrees: number): void {
    const angle = (degrees * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Hue rotation matrix
    const matrix = [
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.140,
      0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072
    ];

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      pixels[i] = Math.max(0, Math.min(255, r * matrix[0] + g * matrix[1] + b * matrix[2]));
      pixels[i + 1] = Math.max(0, Math.min(255, r * matrix[3] + g * matrix[4] + b * matrix[5]));
      pixels[i + 2] = Math.max(0, Math.min(255, r * matrix[6] + g * matrix[7] + b * matrix[8]));
    }
  }

  /**
   * Vibrance (smart saturation that protects skin tones)
   */
  static vibrance(pixels: Uint8ClampedArray, amount: number): void {
    const factor = amount / 100;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const max = Math.max(r, g, b);
      const avg = (r + g + b) / 3;
      const amt = ((max - avg) / 255) * factor * 2;

      pixels[i] = Math.max(0, Math.min(255, r + (max - r) * amt));
      pixels[i + 1] = Math.max(0, Math.min(255, g + (max - g) * amt));
      pixels[i + 2] = Math.max(0, Math.min(255, b + (max - b) * amt));
    }
  }

  /**
   * Duotone effect (two-color gradient based on luminance)
   */
  static duotone(pixels: Uint8ClampedArray, darkR: number, darkG: number, darkB: number, lightR: number, lightG: number, lightB: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = (0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) / 255;
      pixels[i] = darkR + (lightR - darkR) * gray;
      pixels[i + 1] = darkG + (lightG - darkG) * gray;
      pixels[i + 2] = darkB + (lightB - darkB) * gray;
    }
  }

  /**
   * Split toning (different tints for shadows and highlights)
   */
  static splitToning(pixels: Uint8ClampedArray, shadowR: number, shadowG: number, shadowB: number, highlightR: number, highlightG: number, highlightB: number, balance: number): void {
    const threshold = 128 + balance;

    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      const shadowAmt = Math.max(0, (threshold - gray) / threshold);
      const highlightAmt = Math.max(0, (gray - threshold) / (255 - threshold));

      pixels[i] = Math.max(0, Math.min(255, pixels[i] + (shadowR - 128) * shadowAmt * 0.5 + (highlightR - 128) * highlightAmt * 0.5));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + (shadowG - 128) * shadowAmt * 0.5 + (highlightG - 128) * highlightAmt * 0.5));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + (shadowB - 128) * shadowAmt * 0.5 + (highlightB - 128) * highlightAmt * 0.5));
    }
  }

  /**
   * Pop Art effect (posterize + high saturation + outline)
   */
  static popArt(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    // First posterize
    const posterized = new Uint8ClampedArray(pixels);
    ImageEffects.posterize(posterized, 4);

    // Then boost saturation
    ImageEffects.saturation(posterized, 80);

    // Add edge outlines
    const edges = ImageEffects.edgeDetect(pixels, width, height);

    for (let i = 0; i < posterized.length; i += 4) {
      if (edges[i] > 100) {
        posterized[i] = 0;
        posterized[i + 1] = 0;
        posterized[i + 2] = 0;
      }
    }

    return posterized;
  }

  /**
   * Cartoon/Cel shading effect
   */
  static cartoon(pixels: Uint8ClampedArray, width: number, height: number, levels: number, edgeThreshold: number): Uint8ClampedArray {
    // Posterize colors
    const output = new Uint8ClampedArray(pixels);
    ImageEffects.posterize(output, levels);

    // Detect edges
    const edges = ImageEffects.edgeDetect(pixels, width, height);

    // Draw black outlines
    for (let i = 0; i < output.length; i += 4) {
      if (edges[i] > edgeThreshold) {
        output[i] = 0;
        output[i + 1] = 0;
        output[i + 2] = 0;
      }
    }

    return output;
  }

  /**
   * Scanlines effect (CRT-like horizontal lines)
   */
  static scanlines(pixels: Uint8ClampedArray, width: number, height: number, spacing: number, intensity: number): void {
    const factor = 1 - intensity / 100;

    for (let y = 0; y < height; y++) {
      if (y % spacing === 0) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          pixels[idx] *= factor;
          pixels[idx + 1] *= factor;
          pixels[idx + 2] *= factor;
        }
      }
    }
  }

  /**
   * CRT effect (scanlines + vignette + slight blur)
   */
  static crt(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    // Apply scanlines
    ImageEffects.scanlines(pixels, width, height, 2, 30);

    // Apply slight curvature distortion and vignette
    ImageEffects.vignette(pixels, width, height, 0.4);

    // Add slight chromatic aberration
    return ImageEffects.chromaticAberration(pixels, width, height, 1);
  }

  /**
   * VHS effect (noise + scanlines + color shift)
   */
  static vhs(pixels: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
    // Add noise
    ImageEffects.filmGrain(pixels, 40);

    // Add scanlines
    ImageEffects.scanlines(pixels, width, height, 3, 20);

    // Chromatic aberration
    const result = ImageEffects.chromaticAberration(pixels, width, height, 2);

    // Color shift (reduce green slightly)
    for (let i = 0; i < result.length; i += 4) {
      result[i + 1] = Math.max(0, result[i + 1] - 10);
    }

    return result;
  }

  /**
   * Wave distortion effect
   */
  static wave(pixels: Uint8ClampedArray, width: number, height: number, amplitude: number, frequency: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offsetX = Math.round(amplitude * Math.sin(2 * Math.PI * y / frequency));
        const srcX = Math.min(width - 1, Math.max(0, x + offsetX));

        const srcIdx = (y * width + srcX) * 4;
        const dstIdx = (y * width + x) * 4;

        output[dstIdx] = pixels[srcIdx];
        output[dstIdx + 1] = pixels[srcIdx + 1];
        output[dstIdx + 2] = pixels[srcIdx + 2];
        output[dstIdx + 3] = pixels[srcIdx + 3];
      }
    }
    return output;
  }

  /**
   * Swirl/Twirl effect
   */
  static swirl(pixels: Uint8ClampedArray, width: number, height: number, strength: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const swirlAngle = angle + (strength * (maxRadius - dist) / maxRadius) * Math.PI / 180;
        const srcX = Math.round(centerX + dist * Math.cos(swirlAngle));
        const srcY = Math.round(centerY + dist * Math.sin(swirlAngle));

        const dstIdx = (y * width + x) * 4;

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcIdx = (srcY * width + srcX) * 4;
          output[dstIdx] = pixels[srcIdx];
          output[dstIdx + 1] = pixels[srcIdx + 1];
          output[dstIdx + 2] = pixels[srcIdx + 2];
          output[dstIdx + 3] = pixels[srcIdx + 3];
        } else {
          output[dstIdx] = 0;
          output[dstIdx + 1] = 0;
          output[dstIdx + 2] = 0;
          output[dstIdx + 3] = 255;
        }
      }
    }
    return output;
  }

  /**
   * Spherize effect (bulge)
   */
  static spherize(pixels: Uint8ClampedArray, width: number, height: number, strength: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - centerX) / radius;
        const dy = (y - centerY) / radius;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let srcX: number, srcY: number;

        if (dist < 1) {
          const factor = Math.pow(dist, strength / 100);
          srcX = Math.round(centerX + dx * factor * radius);
          srcY = Math.round(centerY + dy * factor * radius);
        } else {
          srcX = x;
          srcY = y;
        }

        const dstIdx = (y * width + x) * 4;
        srcX = Math.min(width - 1, Math.max(0, srcX));
        srcY = Math.min(height - 1, Math.max(0, srcY));
        const srcIdx = (srcY * width + srcX) * 4;

        output[dstIdx] = pixels[srcIdx];
        output[dstIdx + 1] = pixels[srcIdx + 1];
        output[dstIdx + 2] = pixels[srcIdx + 2];
        output[dstIdx + 3] = pixels[srcIdx + 3];
      }
    }
    return output;
  }

  /**
   * Pinch effect (opposite of spherize)
   */
  static pinch(pixels: Uint8ClampedArray, width: number, height: number, strength: number): Uint8ClampedArray {
    return ImageEffects.spherize(pixels, width, height, -strength);
  }

  /**
   * Ripple effect
   */
  static ripple(pixels: Uint8ClampedArray, width: number, height: number, amplitude: number, wavelength: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const offset = amplitude * Math.sin(2 * Math.PI * dist / wavelength);
        const angle = Math.atan2(dy, dx);

        const srcX = Math.round(x + offset * Math.cos(angle));
        const srcY = Math.round(y + offset * Math.sin(angle));

        const dstIdx = (y * width + x) * 4;

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcIdx = (srcY * width + srcX) * 4;
          output[dstIdx] = pixels[srcIdx];
          output[dstIdx + 1] = pixels[srcIdx + 1];
          output[dstIdx + 2] = pixels[srcIdx + 2];
          output[dstIdx + 3] = pixels[srcIdx + 3];
        } else {
          output[dstIdx] = pixels[dstIdx];
          output[dstIdx + 1] = pixels[dstIdx + 1];
          output[dstIdx + 2] = pixels[dstIdx + 2];
          output[dstIdx + 3] = pixels[dstIdx + 3];
        }
      }
    }
    return output;
  }

  /**
   * Frosted glass effect
   */
  static frostedGlass(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offsetX = Math.round((Math.random() - 0.5) * amount);
        const offsetY = Math.round((Math.random() - 0.5) * amount);

        const srcX = Math.min(width - 1, Math.max(0, x + offsetX));
        const srcY = Math.min(height - 1, Math.max(0, y + offsetY));

        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (y * width + x) * 4;

        output[dstIdx] = pixels[srcIdx];
        output[dstIdx + 1] = pixels[srcIdx + 1];
        output[dstIdx + 2] = pixels[srcIdx + 2];
        output[dstIdx + 3] = pixels[srcIdx + 3];
      }
    }
    return output;
  }

  /**
   * Mosaic/Stained glass effect
   */
  static mosaic(pixels: Uint8ClampedArray, width: number, height: number, cellSize: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(pixels.length);

    // Generate random cell centers
    const cellsX = Math.ceil(width / cellSize);
    const cellsY = Math.ceil(height / cellSize);
    const centers: Array<{x: number; y: number; r: number; g: number; b: number}> = [];

    for (let cy = 0; cy < cellsY; cy++) {
      for (let cx = 0; cx < cellsX; cx++) {
        const x = cx * cellSize + Math.random() * cellSize;
        const y = cy * cellSize + Math.random() * cellSize;
        const px = Math.min(width - 1, Math.max(0, Math.floor(x)));
        const py = Math.min(height - 1, Math.max(0, Math.floor(y)));
        const idx = (py * width + px) * 4;
        centers.push({
          x, y,
          r: pixels[idx],
          g: pixels[idx + 1],
          b: pixels[idx + 2]
        });
      }
    }

    // For each pixel, find nearest center
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minDist = Infinity;
        let nearestCenter = centers[0];

        for (const center of centers) {
          const dist = (x - center.x) ** 2 + (y - center.y) ** 2;
          if (dist < minDist) {
            minDist = dist;
            nearestCenter = center;
          }
        }

        const dstIdx = (y * width + x) * 4;
        output[dstIdx] = nearestCenter.r;
        output[dstIdx + 1] = nearestCenter.g;
        output[dstIdx + 2] = nearestCenter.b;
        output[dstIdx + 3] = 255;
      }
    }

    return output;
  }

  /**
   * Pointillism effect
   */
  static pointillism(pixels: Uint8ClampedArray, width: number, height: number, dotSize: number, density: number): Uint8ClampedArray {
    // Start with white background
    const output = new Uint8ClampedArray(pixels.length);
    for (let i = 0; i < output.length; i += 4) {
      output[i] = 255;
      output[i + 1] = 255;
      output[i + 2] = 255;
      output[i + 3] = 255;
    }

    // Draw random dots
    const numDots = Math.floor((width * height * density) / 100);

    for (let d = 0; d < numDots; d++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const srcIdx = (y * width + x) * 4;

      const r = pixels[srcIdx];
      const g = pixels[srcIdx + 1];
      const b = pixels[srcIdx + 2];

      // Draw a dot
      const radius = Math.floor(dotSize / 2);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const dstIdx = (py * width + px) * 4;
              output[dstIdx] = r;
              output[dstIdx + 1] = g;
              output[dstIdx + 2] = b;
            }
          }
        }
      }
    }

    return output;
  }

  /**
   * Color quantize (reduce to N colors using median cut)
   */
  static colorQuantize(pixels: Uint8ClampedArray, numColors: number): void {
    // Simple quantization by rounding to fewer levels per channel
    const levels = Math.max(2, Math.ceil(Math.pow(numColors, 1/3)));
    const step = 255 / (levels - 1);

    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.round(Math.round(pixels[i] / step) * step);
      pixels[i + 1] = Math.round(Math.round(pixels[i + 1] / step) * step);
      pixels[i + 2] = Math.round(Math.round(pixels[i + 2] / step) * step);
    }
  }

  /**
   * Exposure adjustment
   */
  static exposure(pixels: Uint8ClampedArray, stops: number): void {
    const factor = Math.pow(2, stops);

    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.max(0, Math.min(255, pixels[i] * factor));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] * factor));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] * factor));
    }
  }

  /**
   * Shadows/Highlights adjustment
   */
  static shadowsHighlights(pixels: Uint8ClampedArray, shadows: number, highlights: number): void {
    const shadowFactor = 1 + shadows / 100;
    const highlightFactor = 1 - highlights / 100;

    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.2989 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];

      let factor: number;
      if (gray < 128) {
        // Shadow region
        factor = shadowFactor + (1 - shadowFactor) * (gray / 128);
      } else {
        // Highlight region
        factor = 1 + (highlightFactor - 1) * ((gray - 128) / 127);
      }

      pixels[i] = Math.max(0, Math.min(255, pixels[i] * factor));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] * factor));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] * factor));
    }
  }

  /**
   * Clarity (local contrast enhancement)
   */
  static clarity(pixels: Uint8ClampedArray, width: number, height: number, amount: number): Uint8ClampedArray {
    const blurred = ImageEffects.blur(pixels, width, height, 3);
    const output = new Uint8ClampedArray(pixels.length);
    const factor = amount / 100;

    for (let i = 0; i < pixels.length; i += 4) {
      const diff = pixels[i] - blurred[i];
      output[i] = Math.max(0, Math.min(255, pixels[i] + diff * factor));
      output[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + (pixels[i + 1] - blurred[i + 1]) * factor));
      output[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + (pixels[i + 2] - blurred[i + 2]) * factor));
      output[i + 3] = pixels[i + 3];
    }
    return output;
  }

  /**
   * Color balance (adjust RGB levels for shadows/midtones/highlights)
   */
  static colorBalance(pixels: Uint8ClampedArray, redCyan: number, greenMagenta: number, blueYellow: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + redCyan));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + greenMagenta));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + blueYellow));
    }
  }

  /**
   * Replace color (replace one color with another)
   */
  static replaceColor(pixels: Uint8ClampedArray, fromR: number, fromG: number, fromB: number, toR: number, toG: number, toB: number, tolerance: number): void {
    for (let i = 0; i < pixels.length; i += 4) {
      const dist = Math.sqrt(
        (pixels[i] - fromR) ** 2 +
        (pixels[i + 1] - fromG) ** 2 +
        (pixels[i + 2] - fromB) ** 2
      );

      if (dist <= tolerance) {
        const blend = 1 - dist / tolerance;
        pixels[i] = Math.round(pixels[i] + (toR - pixels[i]) * blend);
        pixels[i + 1] = Math.round(pixels[i + 1] + (toG - pixels[i + 1]) * blend);
        pixels[i + 2] = Math.round(pixels[i + 2] + (toB - pixels[i + 2]) * blend);
      }
    }
  }

  /**
   * Lens blur (depth-based blur simulation)
   */
  static lensBlur(pixels: Uint8ClampedArray, width: number, height: number, radius: number, brightness: number): Uint8ClampedArray {
    // Simplified lens blur using hexagonal bokeh approximation
    const output = new Uint8ClampedArray(pixels.length);
    const kernel: Array<{dx: number; dy: number}> = [];

    // Create hexagonal kernel
    for (let angle = 0; angle < 360; angle += 60) {
      for (let r = 1; r <= radius; r++) {
        const rad = (angle * Math.PI) / 180;
        kernel.push({
          dx: Math.round(r * Math.cos(rad)),
          dy: Math.round(r * Math.sin(rad))
        });
      }
    }

    const boostFactor = 1 + brightness / 100;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0;

        for (const k of kernel) {
          const px = Math.min(width - 1, Math.max(0, x + k.dx));
          const py = Math.min(height - 1, Math.max(0, y + k.dy));
          const idx = (py * width + px) * 4;

          // Boost bright pixels (bokeh effect)
          const lum = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
          const boost = lum > 200 ? boostFactor : 1;

          r += pixels[idx] * boost;
          g += pixels[idx + 1] * boost;
          b += pixels[idx + 2] * boost;
          count++;
        }

        const outIdx = (y * width + x) * 4;
        output[outIdx] = Math.min(255, r / count);
        output[outIdx + 1] = Math.min(255, g / count);
        output[outIdx + 2] = Math.min(255, b / count);
        output[outIdx + 3] = pixels[outIdx + 3];
      }
    }

    return output;
  }
}

/**
 * PixelEditor - main editor class managing image state and operations
 * Based on: internal/api/editor.go and internal/ui/editor.go
 */
class PixelEditor {
  public fgColor: Color = new Color(0, 0, 0); // Black default
  public bgColor: Color = new Color(255, 255, 255); // White default
  public lineWidth: number = 1; // Line width for shapes and lines
  public fillColor: Color | null = null; // Fill color for shapes (null = no fill)
  private currentTool: Tool;
  private tools: Tool[] = [];
  private zoom: number = 1; // Power of 2: 1, 2, 4, 8, 16
  private imageWidth: number = 32;
  private imageHeight: number = 32;
  private pixels: Uint8ClampedArray | null = null; // RGBA pixel data
  private originalPixels: Uint8ClampedArray | null = null; // For reload
  private currentFile: string | null = null;
  private currentFormat: ImageFormat = 'png';
  private hasUnsavedChanges: boolean = false;

  // UI widget references - initialized during buildUI
  private statusLabel: Label | null = null;
  private zoomLabel: Label | null = null;
  private colorLabel: Label | null = null;
  private bgColorLabel: Label | null = null;
  private toolLabel: Label | null = null;
  private coordLabel: Label | null = null;
  private selectionLabel: Label | null = null;
  private layerLabel: Label | null = null;
  private fgPreview: CanvasRectangle | null = null;
  private bgPreview: CanvasRectangle | null = null;
  private fillPreview: CanvasRectangle | null = null;
  private fillColorLabel: Label | null = null;
  private lineWidthLabel: Label | null = null;
  private canvasRaster: TappableCanvasRaster | null = null;
  private win: Window | null = null;
  private recentFiles: string[] = [];
  private toolButtons: Map<string, Button> = new Map();

  // Hamburger panel state
  private panelCollapsed: boolean = true;
  private panelContainer: any = null;

  // Undo/Redo system
  private undoStack: UndoOperation[] = [];
  private redoStack: UndoOperation[] = [];
  private currentOperation: PixelChange[] = [];
  private isRecordingOperation: boolean = false;

  // Selection system
  private selection: Selection | null = null;

  // Clipboard system
  private clipboard: ClipboardData | null = null;

  // Layer system
  private layers: Layer[] = [];
  private activeLayerIndex: number = 0;
  private nextLayerId: number = 1;

  // Raster buffer for efficient canvas updates
  private rasterBuffer: Uint8Array | null = null;
  private rasterBufferDirty: boolean = false;

  constructor(private a: App) {
    // Initialize tools
    this.tools = [
      new PencilTool(this),
      new EyedropperTool(this),
      new EraserTool(this),
      new BucketTool(this),
      new LineTool(this),
      new RectangleTool(this),
      new CircleTool(this),
      new SelectionTool(this)
    ];
    this.currentTool = this.tools[0]; // Default to pencil

    // Recent files loaded lazily when window is set up
  }

  /**
   * Load recent files from preferences
   * Based on: history.go loadRecent()
   */
  private async loadRecentFiles(): Promise<void> {
    const count = await this.a.getPreferenceInt(RECENT_COUNT_KEY, 0);
    this.recentFiles = [];
    for (let i = 0; i < count && i < MAX_RECENT_FILES; i++) {
      const file = await this.a.getPreference(`${RECENT_FORMAT_KEY}${i}`, '');
      if (file) {
        this.recentFiles.push(file);
      }
    }
  }

  /**
   * Save recent files to preferences
   * Based on: history.go addRecent()
   */
  private async saveRecentFiles(): Promise<void> {
    await this.a.setPreference(RECENT_COUNT_KEY, this.recentFiles.length.toString());
    for (let i = 0; i < this.recentFiles.length; i++) {
      await this.a.setPreference(`${RECENT_FORMAT_KEY}${i}`, this.recentFiles[i]);
    }
  }

  /**
   * Add a file to recent files list
   */
  private async addToRecentFiles(filepath: string): Promise<void> {
    // Remove if already exists
    this.recentFiles = this.recentFiles.filter(f => f !== filepath);
    // Add to front
    this.recentFiles.unshift(filepath);
    // Limit to max
    if (this.recentFiles.length > MAX_RECENT_FILES) {
      this.recentFiles = this.recentFiles.slice(0, MAX_RECENT_FILES);
    }
    await this.saveRecentFiles();
    // Update menu
    this.updateMainMenu();
  }

  /**
   * Get image dimensions
   */
  getImageWidth(): number { return this.imageWidth; }
  getImageHeight(): number { return this.imageHeight; }

  /**
   * Get pixel color at coordinates
   * Based on: editor.go PixelColor()
   */
  getPixelColor(x: number, y: number): Color {
    if (!this.pixels) return new Color(255, 255, 255);

    const index = (y * this.imageWidth + x) * 4;
    if (index < 0 || index >= this.pixels.length) {
      return new Color(255, 255, 255);
    }

    return new Color(
      this.pixels[index],
      this.pixels[index + 1],
      this.pixels[index + 2],
      this.pixels[index + 3]
    );
  }

  /**
   * Set pixel color at coordinates
   * Based on: editor.go SetPixelColor()
   */
  async setPixelColor(x: number, y: number, color: Color): Promise<void> {
    if (!this.pixels) return;

    const index = (y * this.imageWidth + x) * 4;
    if (index < 0 || index >= this.pixels.length) return;

    // Record old color for undo
    const oldColor = new Color(
      this.pixels[index],
      this.pixels[index + 1],
      this.pixels[index + 2],
      this.pixels[index + 3]
    );

    // Skip if color is the same
    if (oldColor.equals(color)) return;

    // Record change for undo
    this.currentOperation.push({
      x,
      y,
      oldColor,
      newColor: color.clone()
    });

    this.pixels[index] = color.r;
    this.pixels[index + 1] = color.g;
    this.pixels[index + 2] = color.b;
    this.pixels[index + 3] = color.a;

    this.hasUnsavedChanges = true;

    // Update the visual raster if it exists
    // Each logical pixel becomes zoom×zoom pixels in the zoomed raster
    if (this.canvasRaster) {
      const updates: Array<{x: number; y: number; r: number; g: number; b: number; a: number}> = [];

      for (let dy = 0; dy < this.zoom; dy++) {
        for (let dx = 0; dx < this.zoom; dx++) {
          const rasterX = x * this.zoom + dx;
          const rasterY = y * this.zoom + dy;
          updates.push({
            x: rasterX,
            y: rasterY,
            r: color.r,
            g: color.g,
            b: color.b,
            a: color.a
          });
        }
      }

      await this.canvasRaster.setPixels(updates);
    }

    this.updateStatus();
  }

  /**
   * Set pixel color without immediately sending to canvas (batched mode)
   * Call flushPixelUpdates() when done to send all updates at once
   */
  setPixelColorBatched(x: number, y: number, color: Color): void {
    if (!this.pixels) return;

    const index = (y * this.imageWidth + x) * 4;
    if (index < 0 || index >= this.pixels.length) return;

    // Record old color for undo
    const oldColor = new Color(
      this.pixels[index],
      this.pixels[index + 1],
      this.pixels[index + 2],
      this.pixels[index + 3]
    );

    // Skip if color is the same
    if (oldColor.equals(color)) return;

    // Record change for undo
    this.currentOperation.push({
      x,
      y,
      oldColor,
      newColor: color.clone()
    });

    this.pixels[index] = color.r;
    this.pixels[index + 1] = color.g;
    this.pixels[index + 2] = color.b;
    this.pixels[index + 3] = color.a;

    this.hasUnsavedChanges = true;

    // Update the raster buffer directly (zoom×zoom pixels per logical pixel)
    if (this.rasterBuffer) {
      const displayWidth = this.imageWidth * this.zoom;
      for (let dy = 0; dy < this.zoom; dy++) {
        for (let dx = 0; dx < this.zoom; dx++) {
          const rasterX = x * this.zoom + dx;
          const rasterY = y * this.zoom + dy;
          const rasterIdx = (rasterY * displayWidth + rasterX) * 4;
          if (rasterIdx >= 0 && rasterIdx + 3 < this.rasterBuffer.length) {
            this.rasterBuffer[rasterIdx] = color.r;
            this.rasterBuffer[rasterIdx + 1] = color.g;
            this.rasterBuffer[rasterIdx + 2] = color.b;
            this.rasterBuffer[rasterIdx + 3] = color.a;
          }
        }
      }
      this.rasterBufferDirty = true;
    }
  }

  /**
   * Flush all pending pixel updates to the canvas in a single message
   */
  async flushPixelUpdates(): Promise<void> {
    if (!this.rasterBufferDirty || !this.rasterBuffer) return;

    if (this.canvasRaster) {
      const displayWidth = this.imageWidth * this.zoom;
      const displayHeight = this.imageHeight * this.zoom;
      // Use stripes for large images to avoid msgpack message size limits
      await this.canvasRaster.setPixelBufferInStripes(this.rasterBuffer, displayWidth, displayHeight);
    }

    this.rasterBufferDirty = false;
    this.updateStatus();
  }

  /**
   * Begin recording an undo operation
   */
  beginOperation(): void {
    this.currentOperation = [];
  }

  /**
   * End recording and push to undo stack
   */
  endOperation(description: string): void {
    if (this.currentOperation.length > 0) {
      this.undoStack.push({
        changes: [...this.currentOperation],
        description
      });
      // Limit history size
      while (this.undoStack.length > MAX_UNDO_HISTORY) {
        this.undoStack.shift();
      }
      // Clear redo stack when new operation is performed
      this.redoStack = [];
    }
    this.currentOperation = [];
  }

  /**
   * Undo last operation
   */
  async undo(): Promise<void> {
    const operation = this.undoStack.pop();
    if (!operation) {
      console.error('Undo: Nothing to undo');
      return;
    }

    // Apply changes in reverse
    for (let i = operation.changes.length - 1; i >= 0; i--) {
      const change = operation.changes[i];
      await this.setPixelColorDirect(change.x, change.y, change.oldColor);
    }

    // Push to redo stack
    this.redoStack.push(operation);
    this.updateStatus();
  }

  /**
   * Redo last undone operation
   */
  async redo(): Promise<void> {
    const operation = this.redoStack.pop();
    if (!operation) {
      console.error('Redo: Nothing to redo');
      return;
    }


    // Apply changes forward
    for (const change of operation.changes) {
      await this.setPixelColorDirect(change.x, change.y, change.newColor);
    }

    // Push back to undo stack
    this.undoStack.push(operation);
    this.updateStatus();
  }

  /**
   * Set pixel color without recording undo (for undo/redo operations)
   */
  private async setPixelColorDirect(x: number, y: number, color: Color): Promise<void> {
    if (!this.pixels) return;

    const index = (y * this.imageWidth + x) * 4;
    if (index < 0 || index >= this.pixels.length) return;

    this.pixels[index] = color.r;
    this.pixels[index + 1] = color.g;
    this.pixels[index + 2] = color.b;
    this.pixels[index + 3] = color.a;

    // Update the visual raster
    if (this.canvasRaster) {
      const updates: Array<{x: number; y: number; r: number; g: number; b: number; a: number}> = [];

      for (let dy = 0; dy < this.zoom; dy++) {
        for (let dx = 0; dx < this.zoom; dx++) {
          const rasterX = x * this.zoom + dx;
          const rasterY = y * this.zoom + dy;
          updates.push({
            x: rasterX,
            y: rasterY,
            r: color.r,
            g: color.g,
            b: color.b,
            a: color.a
          });
        }
      }

      await this.canvasRaster.setPixels(updates);
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // ============================================
  // Selection System
  // ============================================

  /**
   * Set the current selection
   */
  setSelection(sel: Selection | null): void {
    this.selection = sel;
    this.updateSelectionDisplay();
  }

  /**
   * Get the current selection
   */
  getSelection(): Selection | null {
    return this.selection;
  }

  /**
   * Clear the current selection
   */
  clearSelection(): void {
    this.selection = null;
    this.updateSelectionDisplay();
  }

  /**
   * Select all pixels in the image
   */
  selectAll(): void {
    this.selection = {
      x: 0,
      y: 0,
      width: this.imageWidth,
      height: this.imageHeight
    };
    this.updateSelectionDisplay();
  }

  /**
   * Update selection display in status bar
   */
  private updateSelectionDisplay(): void {
    if (this.selectionLabel) {
      if (this.selection) {
        this.selectionLabel.setText(`Sel: ${this.selection.width}x${this.selection.height}`);
      } else {
        this.selectionLabel.setText('');
      }
    }
  }

  // ============================================
  // Clipboard System
  // ============================================

  /**
   * Copy selected region to clipboard
   */
  async copy(suppressDialog = false): Promise<void> {
    if (!this.selection || !this.pixels) {
      if (!suppressDialog && this.win) {
        await this.win.showInfo('Copy', 'Please select an area first');
      }
      return;
    }

    const { x, y, width, height } = this.selection;
    const clipPixels = new Uint8ClampedArray(width * height * 4);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const srcX = x + px;
        const srcY = y + py;

        if (srcX >= 0 && srcX < this.imageWidth && srcY >= 0 && srcY < this.imageHeight) {
          const srcIdx = (srcY * this.imageWidth + srcX) * 4;
          const dstIdx = (py * width + px) * 4;

          clipPixels[dstIdx] = this.pixels[srcIdx];
          clipPixels[dstIdx + 1] = this.pixels[srcIdx + 1];
          clipPixels[dstIdx + 2] = this.pixels[srcIdx + 2];
          clipPixels[dstIdx + 3] = this.pixels[srcIdx + 3];
        }
      }
    }

    this.clipboard = {
      width,
      height,
      pixels: clipPixels
    };

  }

  /**
   * Cut selected region to clipboard (copy + clear to background)
   */
  async cut(): Promise<void> {
    if (!this.selection || !this.pixels) {
      console.error('Cut: No selection or no image');
      return;
    }

    // First copy (suppress dialog since this is internal operation)
    await this.copy(true);

    // Then clear the selection to background color
    this.beginOperation();
    const { x, y, width, height } = this.selection;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        await this.setPixelColor(x + px, y + py, this.bgColor);
      }
    }
    this.endOperation('Cut selection');

  }

  /**
   * Paste clipboard at specified position (or selection start)
   */
  async paste(destX?: number, destY?: number, suppressDialog = false): Promise<void> {
    if (!this.clipboard || !this.pixels) {
      if (!suppressDialog && this.win) {
        await this.win.showInfo('Paste', 'No clipboard data available');
      }
      return;
    }

    // Default to selection position or (0, 0)
    const px = destX ?? (this.selection?.x ?? 0);
    const py = destY ?? (this.selection?.y ?? 0);

    this.beginOperation();

    for (let y = 0; y < this.clipboard.height; y++) {
      for (let x = 0; x < this.clipboard.width; x++) {
        const destPx = px + x;
        const destPy = py + y;

        if (destPx >= 0 && destPx < this.imageWidth && destPy >= 0 && destPy < this.imageHeight) {
          const srcIdx = (y * this.clipboard.width + x) * 4;
          const color = new Color(
            this.clipboard.pixels[srcIdx],
            this.clipboard.pixels[srcIdx + 1],
            this.clipboard.pixels[srcIdx + 2],
            this.clipboard.pixels[srcIdx + 3]
          );
          await this.setPixelColor(destPx, destPy, color);
        }
      }
    }

    this.endOperation(`Paste at (${px}, ${py})`);
  }

  /**
   * Check if clipboard has content
   */
  hasClipboard(): boolean {
    return this.clipboard !== null;
  }

  // ============================================
  // Layer System
  // ============================================

  /**
   * Initialize layers (called when creating/loading an image)
   */
  private initializeLayers(): void {
    if (this.layers.length === 0) {
      // Create a default background layer
      this.addLayer('Background');
    }
  }

  /**
   * Add a new layer
   */
  addLayer(name?: string): Layer {
    if (this.layers.length >= MAX_LAYERS) {
      console.error('Maximum layer count reached');
      return this.layers[this.activeLayerIndex];
    }

    const layer: Layer = {
      id: this.nextLayerId++,
      name: name || `Layer ${this.nextLayerId}`,
      visible: true,
      opacity: 255,
      locked: false,
      pixels: new Uint8ClampedArray(this.imageWidth * this.imageHeight * 4)
    };

    // Initialize with transparent pixels
    for (let i = 0; i < layer.pixels.length; i += 4) {
      layer.pixels[i] = 0;
      layer.pixels[i + 1] = 0;
      layer.pixels[i + 2] = 0;
      layer.pixels[i + 3] = 0;
    }

    this.layers.push(layer);
    this.activeLayerIndex = this.layers.length - 1;
    this.updateLayerDisplay();

    return layer;
  }

  /**
   * Remove a layer by index
   */
  async removeLayer(index: number, suppressDialog = false): Promise<void> {
    if (this.layers.length <= 1) {
      if (!suppressDialog && this.win) {
        await this.win.showInfo('Remove Layer', 'Cannot remove the last layer');
      }
      return;
    }

    if (index < 0 || index >= this.layers.length) {
      console.error('Invalid layer index');
      return;
    }

    const removedLayers = this.layers.splice(index, 1);
    if (removedLayers.length === 0) {
      return; // Type guard: splice returned empty array
    }
    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1;
    }

    this.flattenToPixels();
    this.updateLayerDisplay();
  }

  /**
   * Set active layer by index
   */
  setActiveLayer(index: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.activeLayerIndex = index;
      this.updateLayerDisplay();
    }
  }

  /**
   * Get active layer
   */
  getActiveLayer(): Layer | null {
    return this.layers[this.activeLayerIndex] || null;
  }

  /**
   * Get all layers
   */
  getLayers(): Layer[] {
    return [...this.layers];
  }

  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility(index: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].visible = !this.layers[index].visible;
      this.flattenToPixels();
      this.updateLayerDisplay();
    }
  }

  /**
   * Set layer opacity (0-255)
   */
  setLayerOpacity(index: number, opacity: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].opacity = Math.max(0, Math.min(255, opacity));
      this.flattenToPixels();
    }
  }

  /**
   * Move layer up in stack
   */
  moveLayerUp(index: number): void {
    if (index > 0 && index < this.layers.length) {
      const temp = this.layers[index];
      this.layers[index] = this.layers[index - 1];
      this.layers[index - 1] = temp;
      if (this.activeLayerIndex === index) {
        this.activeLayerIndex = index - 1;
      } else if (this.activeLayerIndex === index - 1) {
        this.activeLayerIndex = index;
      }
      this.flattenToPixels();
      this.updateLayerDisplay();
    }
  }

  /**
   * Move layer down in stack
   */
  moveLayerDown(index: number): void {
    if (index >= 0 && index < this.layers.length - 1) {
      const temp = this.layers[index];
      this.layers[index] = this.layers[index + 1];
      this.layers[index + 1] = temp;
      if (this.activeLayerIndex === index) {
        this.activeLayerIndex = index + 1;
      } else if (this.activeLayerIndex === index + 1) {
        this.activeLayerIndex = index;
      }
      this.flattenToPixels();
      this.updateLayerDisplay();
    }
  }

  /**
   * Merge layer down (merge with layer below)
   */
  async mergeLayerDown(index: number, suppressDialog = false): Promise<void> {
    if (index <= 0 || index >= this.layers.length) {
      if (!suppressDialog && this.win) {
        await this.win.showInfo('Merge Layer', 'Cannot merge: no layer below');
      }
      return;
    }

    const topLayer = this.layers[index];
    const bottomLayer = this.layers[index - 1];

    // Blend top layer onto bottom layer
    for (let i = 0; i < topLayer.pixels.length; i += 4) {
      if (topLayer.visible && topLayer.pixels[i + 3] > 0) {
        const srcAlpha = (topLayer.pixels[i + 3] * topLayer.opacity) / 255 / 255;
        const dstAlpha = bottomLayer.pixels[i + 3] / 255;
        const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);

        if (outAlpha > 0) {
          bottomLayer.pixels[i] = Math.round(
            (topLayer.pixels[i] * srcAlpha + bottomLayer.pixels[i] * dstAlpha * (1 - srcAlpha)) / outAlpha
          );
          bottomLayer.pixels[i + 1] = Math.round(
            (topLayer.pixels[i + 1] * srcAlpha + bottomLayer.pixels[i + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha
          );
          bottomLayer.pixels[i + 2] = Math.round(
            (topLayer.pixels[i + 2] * srcAlpha + bottomLayer.pixels[i + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha
          );
          bottomLayer.pixels[i + 3] = Math.round(outAlpha * 255);
        }
      }
    }

    // Remove the merged layer
    this.layers.splice(index, 1);
    if (this.activeLayerIndex >= index) {
      this.activeLayerIndex = Math.max(0, this.activeLayerIndex - 1);
    }

    this.flattenToPixels();
    this.updateLayerDisplay();
  }

  /**
   * Flatten all layers into the main pixels array
   */
  flattenToPixels(): void {
    if (!this.pixels) return;

    // Start with background color
    for (let i = 0; i < this.pixels.length; i += 4) {
      this.pixels[i] = this.bgColor.r;
      this.pixels[i + 1] = this.bgColor.g;
      this.pixels[i + 2] = this.bgColor.b;
      this.pixels[i + 3] = this.bgColor.a;
    }

    // Composite layers from bottom to top
    for (const layer of this.layers) {
      if (!layer.visible) continue;

      for (let i = 0; i < layer.pixels.length; i += 4) {
        const srcAlpha = (layer.pixels[i + 3] * layer.opacity) / 255 / 255;
        if (srcAlpha > 0) {
          const dstAlpha = this.pixels[i + 3] / 255;
          const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);

          if (outAlpha > 0) {
            this.pixels[i] = Math.round(
              (layer.pixels[i] * srcAlpha + this.pixels[i] * dstAlpha * (1 - srcAlpha)) / outAlpha
            );
            this.pixels[i + 1] = Math.round(
              (layer.pixels[i + 1] * srcAlpha + this.pixels[i + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha
            );
            this.pixels[i + 2] = Math.round(
              (layer.pixels[i + 2] * srcAlpha + this.pixels[i + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha
            );
            this.pixels[i + 3] = Math.round(outAlpha * 255);
          }
        }
      }
    }
  }

  /**
   * Update layer display in UI
   */
  private updateLayerDisplay(): void {
    if (this.layerLabel) {
      const layer = this.layers[this.activeLayerIndex];
      if (layer) {
        this.layerLabel.setText(`Layer: ${layer.name} (${this.activeLayerIndex + 1}/${this.layers.length})`);
      }
    }
  }

  // ============================================
  // Image Effects System (30+ effects)
  // ============================================

  /**
   * Apply an effect and refresh the canvas
   */
  private async applyEffect(effectFn: () => void | Uint8ClampedArray, description: string): Promise<void> {
    if (!this.pixels) return;

    this.beginOperation();
    // Store old pixels for undo
    const oldPixels = new Uint8ClampedArray(this.pixels);

    const result = effectFn();

    // If effect returns new pixels (for effects that change dimensions or return new arrays)
    if (result instanceof Uint8ClampedArray) {
      this.pixels = result;
    }

    // Record all changed pixels for undo
    for (let i = 0; i < this.pixels.length; i += 4) {
      const x = (i / 4) % this.imageWidth;
      const y = Math.floor((i / 4) / this.imageWidth);
      const oldColor = new Color(oldPixels[i], oldPixels[i + 1], oldPixels[i + 2], oldPixels[i + 3]);
      const newColor = new Color(this.pixels[i], this.pixels[i + 1], this.pixels[i + 2], this.pixels[i + 3]);
      if (!oldColor.equals(newColor)) {
        this.currentOperation.push({ x, y, oldColor, newColor });
      }
    }

    this.endOperation(description);
    this.hasUnsavedChanges = true;

    await this.refreshCanvas();
    this.updateStatus();
  }

  /**
   * Apply effect with dimension change (for rotations)
   */
  private async applyEffectWithDimensionChange(
    effectFn: () => { pixels: Uint8ClampedArray; width: number; height: number },
    description: string
  ): Promise<void> {
    if (!this.pixels) return;

    const result = effectFn();
    this.pixels = result.pixels;
    this.imageWidth = result.width;
    this.imageHeight = result.height;

    // Clear undo for dimension changes (too complex to undo)
    this.undoStack = [];
    this.redoStack = [];
    this.hasUnsavedChanges = true;

    await this.rebuildCanvasIfNeeded();
    this.updateStatus();
  }

  // --- Basic Adjustments ---

  async effectBrightness(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Brightness', [
      { name: 'amount', type: 'entry', label: 'Amount (-100 to 100)', placeholder: '20' }
    ]);
    if (result?.submitted && result.values?.amount) {
      const amount = parseInt(result.values.amount as string, 10) || 0;
      await this.applyEffect(() => ImageEffects.brightness(this.pixels!, amount), `Brightness ${amount}`);
    }
  }

  async effectContrast(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Contrast', [
      { name: 'amount', type: 'entry', label: 'Amount (-100 to 100)', placeholder: '30' }
    ]);
    if (result?.submitted && result.values?.amount) {
      const amount = parseInt(result.values.amount as string, 10) || 0;
      await this.applyEffect(() => ImageEffects.contrast(this.pixels!, amount), `Contrast ${amount}`);
    }
  }

  async effectSaturation(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Saturation', [
      { name: 'amount', type: 'entry', label: 'Amount (-100 to 100)', placeholder: '30' }
    ]);
    if (result?.submitted && result.values?.amount) {
      const amount = parseInt(result.values.amount as string, 10) || 0;
      await this.applyEffect(() => ImageEffects.saturation(this.pixels!, amount), `Saturation ${amount}`);
    }
  }

  async effectGamma(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Gamma Correction', [
      { name: 'gamma', type: 'entry', label: 'Gamma (0.1 to 3.0)', placeholder: '1.2' }
    ]);
    if (result?.submitted && result.values?.gamma) {
      const gamma = parseFloat(result.values.gamma as string) || 1.0;
      await this.applyEffect(() => ImageEffects.gamma(this.pixels!, gamma), `Gamma ${gamma}`);
    }
  }

  async effectNormalize(): Promise<void> {
    await this.applyEffect(() => ImageEffects.normalize(this.pixels!), 'Auto Levels');
  }

  // --- Color Effects ---

  async effectGrayscale(): Promise<void> {
    await this.applyEffect(() => ImageEffects.grayscale(this.pixels!), 'Grayscale');
  }

  async effectSepia(): Promise<void> {
    await this.applyEffect(() => ImageEffects.sepia(this.pixels!), 'Sepia');
  }

  async effectInvert(): Promise<void> {
    await this.applyEffect(() => ImageEffects.invert(this.pixels!), 'Invert');
  }

  async effectPosterize(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Posterize', [
      { name: 'levels', type: 'entry', label: 'Color levels (2-16)', placeholder: '4' }
    ]);
    if (result?.submitted && result.values?.levels) {
      const levels = Math.max(2, Math.min(16, parseInt(result.values.levels as string, 10) || 4));
      await this.applyEffect(() => ImageEffects.posterize(this.pixels!, levels), `Posterize ${levels}`);
    }
  }

  async effectThreshold(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Threshold', [
      { name: 'threshold', type: 'entry', label: 'Threshold (0-255)', placeholder: '128' }
    ]);
    if (result?.submitted && result.values?.threshold) {
      const threshold = parseInt(result.values.threshold as string, 10) || 128;
      await this.applyEffect(() => ImageEffects.threshold(this.pixels!, threshold), `Threshold ${threshold}`);
    }
  }

  async effectSolarize(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Solarize', [
      { name: 'threshold', type: 'entry', label: 'Threshold (0-255)', placeholder: '128' }
    ]);
    if (result?.submitted && result.values?.threshold) {
      const threshold = parseInt(result.values.threshold as string, 10) || 128;
      await this.applyEffect(() => ImageEffects.solarize(this.pixels!, threshold), `Solarize ${threshold}`);
    }
  }

  async effectDither(): Promise<void> {
    await this.applyEffect(() => ImageEffects.dither(this.pixels!, this.imageWidth, this.imageHeight), 'Dither');
  }

  // --- Blur/Sharpen ---

  async effectBlur(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Blur', [
      { name: 'radius', type: 'entry', label: 'Radius (1-10)', placeholder: '2' }
    ]);
    if (result?.submitted && result.values?.radius) {
      const radius = Math.max(1, Math.min(10, parseInt(result.values.radius as string, 10) || 2));
      await this.applyEffect(() => ImageEffects.blur(this.pixels!, this.imageWidth, this.imageHeight, radius), `Blur ${radius}`);
    }
  }

  async effectSharpen(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Sharpen', [
      { name: 'amount', type: 'entry', label: 'Amount (0.1-2.0)', placeholder: '0.5' }
    ]);
    if (result?.submitted && result.values?.amount) {
      const amount = Math.max(0.1, Math.min(2.0, parseFloat(result.values.amount as string) || 0.5));
      await this.applyEffect(() => ImageEffects.sharpen(this.pixels!, this.imageWidth, this.imageHeight, amount), `Sharpen ${amount}`);
    }
  }

  // --- Artistic Effects ---

  async effectEdgeDetect(): Promise<void> {
    await this.applyEffect(() => ImageEffects.edgeDetect(this.pixels!, this.imageWidth, this.imageHeight), 'Edge Detect');
  }

  async effectEmboss(): Promise<void> {
    await this.applyEffect(() => ImageEffects.emboss(this.pixels!, this.imageWidth, this.imageHeight), 'Emboss');
  }

  async effectPixelate(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Pixelate', [
      { name: 'size', type: 'entry', label: 'Block size (2-32)', placeholder: '4' }
    ]);
    if (result?.submitted && result.values?.size) {
      const size = Math.max(2, Math.min(32, parseInt(result.values.size as string, 10) || 4));
      await this.applyEffect(() => ImageEffects.pixelate(this.pixels!, this.imageWidth, this.imageHeight, size), `Pixelate ${size}`);
    }
  }

  async effectOilPaint(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Oil Paint', [
      { name: 'radius', type: 'entry', label: 'Radius (1-5)', placeholder: '3' },
      { name: 'levels', type: 'entry', label: 'Intensity levels (5-30)', placeholder: '20' }
    ]);
    if (result?.submitted && result.values?.radius) {
      const radius = Math.max(1, Math.min(5, parseInt(result.values.radius as string, 10) || 3));
      const levels = Math.max(5, Math.min(30, parseInt(result.values.levels as string, 10) || 20));
      await this.applyEffect(() => ImageEffects.oilPaint(this.pixels!, this.imageWidth, this.imageHeight, radius, levels), 'Oil Paint');
    }
  }

  async effectPencilSketch(): Promise<void> {
    await this.applyEffect(() => ImageEffects.pencilSketch(this.pixels!, this.imageWidth, this.imageHeight), 'Pencil Sketch');
  }

  async effectHalftone(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Halftone', [
      { name: 'size', type: 'entry', label: 'Dot size (4-16)', placeholder: '6' }
    ]);
    if (result?.submitted && result.values?.size) {
      const size = Math.max(4, Math.min(16, parseInt(result.values.size as string, 10) || 6));
      await this.applyEffect(() => ImageEffects.halftone(this.pixels!, this.imageWidth, this.imageHeight, size), `Halftone ${size}`);
    }
  }

  // --- Film/Photo Effects ---

  async effectVignette(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Vignette', [
      { name: 'strength', type: 'entry', label: 'Strength (0.1-1.0)', placeholder: '0.5' }
    ]);
    if (result?.submitted && result.values?.strength) {
      const strength = Math.max(0.1, Math.min(1.0, parseFloat(result.values.strength as string) || 0.5));
      await this.applyEffect(() => ImageEffects.vignette(this.pixels!, this.imageWidth, this.imageHeight, strength), `Vignette ${strength}`);
    }
  }

  async effectFilmGrain(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Film Grain', [
      { name: 'amount', type: 'entry', label: 'Amount (10-100)', placeholder: '30' }
    ]);
    if (result?.submitted && result.values?.amount) {
      const amount = Math.max(10, Math.min(100, parseInt(result.values.amount as string, 10) || 30));
      await this.applyEffect(() => ImageEffects.filmGrain(this.pixels!, amount), `Film Grain ${amount}`);
    }
  }

  async effectVintage(): Promise<void> {
    await this.applyEffect(() => ImageEffects.vintage(this.pixels!), 'Vintage');
  }

  async effectCrossProcess(): Promise<void> {
    await this.applyEffect(() => ImageEffects.crossProcess(this.pixels!), 'Cross Process');
  }

  async effectColorTemperature(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Color Temperature', [
      { name: 'temp', type: 'entry', label: 'Temperature (-100 cool, +100 warm)', placeholder: '30' }
    ]);
    if (result?.submitted && result.values?.temp) {
      const temp = parseInt(result.values.temp as string, 10) || 0;
      await this.applyEffect(() => ImageEffects.colorTemperature(this.pixels!, temp), `Temperature ${temp}`);
    }
  }

  async effectNightVision(): Promise<void> {
    await this.applyEffect(() => ImageEffects.nightVision(this.pixels!), 'Night Vision');
  }

  async effectThermal(): Promise<void> {
    await this.applyEffect(() => ImageEffects.thermal(this.pixels!), 'Thermal');
  }

  // --- Color Channel Effects ---

  async effectRedChannel(): Promise<void> {
    await this.applyEffect(() => ImageEffects.redChannel(this.pixels!), 'Red Channel Only');
  }

  async effectGreenChannel(): Promise<void> {
    await this.applyEffect(() => ImageEffects.greenChannel(this.pixels!), 'Green Channel Only');
  }

  async effectBlueChannel(): Promise<void> {
    await this.applyEffect(() => ImageEffects.blueChannel(this.pixels!), 'Blue Channel Only');
  }

  async effectSwapRGB_BGR(): Promise<void> {
    await this.applyEffect(() => ImageEffects.swapChannels(this.pixels!, 'rgb-bgr'), 'Swap R↔B');
  }

  async effectSwapRGB_GBR(): Promise<void> {
    await this.applyEffect(() => ImageEffects.swapChannels(this.pixels!, 'rgb-gbr'), 'Rotate RGB→GBR');
  }

  async effectSwapRGB_BRG(): Promise<void> {
    await this.applyEffect(() => ImageEffects.swapChannels(this.pixels!, 'rgb-brg'), 'Rotate RGB→BRG');
  }

  // --- Special Effects ---

  async effectChromaticAberration(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Chromatic Aberration', [
      { name: 'offset', type: 'entry', label: 'Offset (1-10)', placeholder: '3' }
    ]);
    if (result?.submitted && result.values?.offset) {
      const offset = Math.max(1, Math.min(10, parseInt(result.values.offset as string, 10) || 3));
      await this.applyEffect(() => ImageEffects.chromaticAberration(this.pixels!, this.imageWidth, this.imageHeight, offset), 'Chromatic Aberration');
    }
  }

  async effectGlitch(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Glitch', [
      { name: 'intensity', type: 'entry', label: 'Intensity (1-10)', placeholder: '5' }
    ]);
    if (result?.submitted && result.values?.intensity) {
      const intensity = Math.max(1, Math.min(10, parseInt(result.values.intensity as string, 10) || 5));
      await this.applyEffect(() => ImageEffects.glitch(this.pixels!, this.imageWidth, this.imageHeight, intensity), 'Glitch');
    }
  }

  async effectTint(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const colorResult = await this.win.showColorPicker('Choose Tint Color', '#FF0000');
    if (colorResult) {
      const result = await this.win.showForm('Tint Strength', [
        { name: 'strength', type: 'entry', label: 'Strength (10-80)', placeholder: '30' }
      ]);
      if (result?.submitted && result.values?.strength) {
        const strength = Math.max(10, Math.min(80, parseInt(result.values.strength as string, 10) || 30));
        await this.applyEffect(() => ImageEffects.tint(this.pixels!, colorResult.r, colorResult.g, colorResult.b, strength), 'Tint');
      }
    }
  }

  async effectColorSplash(): Promise<void> {
    if (!this.win || !this.pixels) return;
    await this.win.showInfo('Color Splash', 'Click on a pixel to select the color to keep. All other colors will become grayscale.');
    const colorResult = await this.win.showColorPicker('Choose Color to Keep', this.fgColor.toHex());
    if (colorResult) {
      const result = await this.win.showForm('Tolerance', [
        { name: 'tolerance', type: 'entry', label: 'Tolerance (10-150)', placeholder: '50' }
      ]);
      if (result?.submitted && result.values?.tolerance) {
        const tolerance = Math.max(10, Math.min(150, parseInt(result.values.tolerance as string, 10) || 50));
        await this.applyEffect(() => ImageEffects.colorSplash(this.pixels!, colorResult.r, colorResult.g, colorResult.b, tolerance), 'Color Splash');
      }
    }
  }

  // --- Transform Effects ---

  async effectFlipHorizontal(): Promise<void> {
    await this.applyEffect(() => ImageEffects.flipHorizontal(this.pixels!, this.imageWidth, this.imageHeight), 'Flip Horizontal');
  }

  async effectFlipVertical(): Promise<void> {
    await this.applyEffect(() => ImageEffects.flipVertical(this.pixels!, this.imageWidth, this.imageHeight), 'Flip Vertical');
  }

  async effectRotate90CW(): Promise<void> {
    await this.applyEffectWithDimensionChange(
      () => ImageEffects.rotate90CW(this.pixels!, this.imageWidth, this.imageHeight),
      'Rotate 90° CW'
    );
  }

  async effectRotate90CCW(): Promise<void> {
    await this.applyEffectWithDimensionChange(
      () => ImageEffects.rotate90CCW(this.pixels!, this.imageWidth, this.imageHeight),
      'Rotate 90° CCW'
    );
  }

  async effectRotate180(): Promise<void> {
    await this.applyEffect(() => ImageEffects.rotate180(this.pixels!, this.imageWidth, this.imageHeight), 'Rotate 180°');
  }

  // --- Additional Effects (25+ more) ---

  async effectGaussianBlur(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Gaussian Blur', [
      { name: 'sigma', type: 'entry', label: 'Sigma (1-10)', placeholder: '2' }
    ]);
    if (result?.submitted && result.values?.sigma) {
      const sigma = Math.max(1, Math.min(10, parseFloat(result.values.sigma as string) || 2));
      await this.applyEffect(() => ImageEffects.gaussianBlur(this.pixels!, this.imageWidth, this.imageHeight, sigma), 'Gaussian Blur');
    }
  }

  async effectMotionBlur(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Motion Blur', [
      { name: 'angle', type: 'entry', label: 'Angle (0-360)', placeholder: '45' },
      { name: 'distance', type: 'entry', label: 'Distance (1-20)', placeholder: '10' }
    ]);
    if (result?.submitted && result.values?.angle) {
      const angle = parseInt(result.values.angle as string, 10) || 45;
      const distance = Math.max(1, Math.min(20, parseInt(result.values.distance as string, 10) || 10));
      await this.applyEffect(() => ImageEffects.motionBlur(this.pixels!, this.imageWidth, this.imageHeight, angle, distance), 'Motion Blur');
    }
  }

  async effectRadialBlur(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Radial Blur', [
      { name: 'strength', type: 'entry', label: 'Strength (1-50)', placeholder: '10' }
    ]);
    if (result?.submitted && result.values?.strength) {
      const strength = Math.max(1, Math.min(50, parseInt(result.values.strength as string, 10) || 10));
      await this.applyEffect(() => ImageEffects.radialBlur(this.pixels!, this.imageWidth, this.imageHeight, strength), 'Radial Blur');
    }
  }

  async effectMedianFilter(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Median Filter (Noise Reduction)', [
      { name: 'radius', type: 'entry', label: 'Radius (1-3)', placeholder: '1' }
    ]);
    if (result?.submitted && result.values?.radius) {
      const radius = Math.max(1, Math.min(3, parseInt(result.values.radius as string, 10) || 1));
      await this.applyEffect(() => ImageEffects.medianFilter(this.pixels!, this.imageWidth, this.imageHeight, radius), 'Median Filter');
    }
  }

  async effectHighPass(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('High Pass Filter', [
      { name: 'radius', type: 'entry', label: 'Radius (1-10)', placeholder: '3' }
    ]);
    if (result?.submitted && result.values?.radius) {
      const radius = Math.max(1, Math.min(10, parseInt(result.values.radius as string, 10) || 3));
      await this.applyEffect(() => ImageEffects.highPass(this.pixels!, this.imageWidth, this.imageHeight, radius), 'High Pass');
    }
  }

  async effectUnsharpMask(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Unsharp Mask', [
      { name: 'amount', type: 'entry', label: 'Amount (0.5-3)', placeholder: '1.5' },
      { name: 'radius', type: 'entry', label: 'Radius (1-5)', placeholder: '2' }
    ]);
    if (result?.submitted && result.values?.amount) {
      const amount = Math.max(0.5, Math.min(3, parseFloat(result.values.amount as string) || 1.5));
      const radius = Math.max(1, Math.min(5, parseInt(result.values.radius as string, 10) || 2));
      await this.applyEffect(() => ImageEffects.unsharpMask(this.pixels!, this.imageWidth, this.imageHeight, amount, radius), 'Unsharp Mask');
    }
  }

  async effectHueRotate(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Hue Rotate', [
      { name: 'degrees', type: 'entry', label: 'Degrees (0-360)', placeholder: '90' }
    ]);
    if (result?.submitted && result.values?.degrees) {
      const degrees = parseInt(result.values.degrees as string, 10) || 0;
      await this.applyEffect(() => ImageEffects.hueRotate(this.pixels!, degrees), `Hue Rotate ${degrees}°`);
    }
  }

  async effectVibrance(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Vibrance', [
      { name: 'amount', type: 'entry', label: 'Amount (-100 to 100)', placeholder: '50' }
    ]);
    if (result?.submitted && result.values?.amount) {
      const amount = parseInt(result.values.amount as string, 10) || 0;
      await this.applyEffect(() => ImageEffects.vibrance(this.pixels!, amount), `Vibrance ${amount}`);
    }
  }

  async effectDuotone(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const darkColor = await this.win.showColorPicker('Choose Dark Color', '#000080');
    if (!darkColor) return;
    const lightColor = await this.win.showColorPicker('Choose Light Color', '#FFD700');
    if (!lightColor) return;
    await this.applyEffect(() => ImageEffects.duotone(this.pixels!, darkColor.r, darkColor.g, darkColor.b, lightColor.r, lightColor.g, lightColor.b), 'Duotone');
  }

  async effectPopArt(): Promise<void> {
    await this.applyEffect(() => ImageEffects.popArt(this.pixels!, this.imageWidth, this.imageHeight), 'Pop Art');
  }

  async effectCartoon(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Cartoon Effect', [
      { name: 'levels', type: 'entry', label: 'Color levels (3-8)', placeholder: '5' },
      { name: 'threshold', type: 'entry', label: 'Edge threshold (50-150)', placeholder: '80' }
    ]);
    if (result?.submitted && result.values?.levels) {
      const levels = Math.max(3, Math.min(8, parseInt(result.values.levels as string, 10) || 5));
      const threshold = Math.max(50, Math.min(150, parseInt(result.values.threshold as string, 10) || 80));
      await this.applyEffect(() => ImageEffects.cartoon(this.pixels!, this.imageWidth, this.imageHeight, levels, threshold), 'Cartoon');
    }
  }

  async effectScanlines(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Scanlines', [
      { name: 'spacing', type: 'entry', label: 'Spacing (2-8)', placeholder: '2' },
      { name: 'intensity', type: 'entry', label: 'Intensity (10-80)', placeholder: '30' }
    ]);
    if (result?.submitted && result.values?.spacing) {
      const spacing = Math.max(2, Math.min(8, parseInt(result.values.spacing as string, 10) || 2));
      const intensity = Math.max(10, Math.min(80, parseInt(result.values.intensity as string, 10) || 30));
      await this.applyEffect(() => ImageEffects.scanlines(this.pixels!, this.imageWidth, this.imageHeight, spacing, intensity), 'Scanlines');
    }
  }

  async effectCRT(): Promise<void> {
    await this.applyEffect(() => ImageEffects.crt(this.pixels!, this.imageWidth, this.imageHeight), 'CRT');
  }

  async effectVHS(): Promise<void> {
    await this.applyEffect(() => ImageEffects.vhs(this.pixels!, this.imageWidth, this.imageHeight), 'VHS');
  }

  async effectWave(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Wave Distortion', [
      { name: 'amplitude', type: 'entry', label: 'Amplitude (5-30)', placeholder: '10' },
      { name: 'frequency', type: 'entry', label: 'Frequency (10-50)', placeholder: '20' }
    ]);
    if (result?.submitted && result.values?.amplitude) {
      const amplitude = Math.max(5, Math.min(30, parseInt(result.values.amplitude as string, 10) || 10));
      const frequency = Math.max(10, Math.min(50, parseInt(result.values.frequency as string, 10) || 20));
      await this.applyEffect(() => ImageEffects.wave(this.pixels!, this.imageWidth, this.imageHeight, amplitude, frequency), 'Wave');
    }
  }

  async effectSwirl(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Swirl/Twirl', [
      { name: 'strength', type: 'entry', label: 'Strength (-360 to 360)', placeholder: '90' }
    ]);
    if (result?.submitted && result.values?.strength) {
      const strength = parseInt(result.values.strength as string, 10) || 90;
      await this.applyEffect(() => ImageEffects.swirl(this.pixels!, this.imageWidth, this.imageHeight, strength), 'Swirl');
    }
  }

  async effectSpherize(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Spherize (Bulge)', [
      { name: 'strength', type: 'entry', label: 'Strength (10-200)', placeholder: '50' }
    ]);
    if (result?.submitted && result.values?.strength) {
      const strength = Math.max(10, Math.min(200, parseInt(result.values.strength as string, 10) || 50));
      await this.applyEffect(() => ImageEffects.spherize(this.pixels!, this.imageWidth, this.imageHeight, strength), 'Spherize');
    }
  }

  async effectPinch(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Pinch', [
      { name: 'strength', type: 'entry', label: 'Strength (10-200)', placeholder: '50' }
    ]);
    if (result?.submitted && result.values?.strength) {
      const strength = Math.max(10, Math.min(200, parseInt(result.values.strength as string, 10) || 50));
      await this.applyEffect(() => ImageEffects.pinch(this.pixels!, this.imageWidth, this.imageHeight, strength), 'Pinch');
    }
  }

  async effectRipple(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Ripple', [
      { name: 'amplitude', type: 'entry', label: 'Amplitude (3-15)', placeholder: '5' },
      { name: 'wavelength', type: 'entry', label: 'Wavelength (10-50)', placeholder: '20' }
    ]);
    if (result?.submitted && result.values?.amplitude) {
      const amplitude = Math.max(3, Math.min(15, parseInt(result.values.amplitude as string, 10) || 5));
      const wavelength = Math.max(10, Math.min(50, parseInt(result.values.wavelength as string, 10) || 20));
      await this.applyEffect(() => ImageEffects.ripple(this.pixels!, this.imageWidth, this.imageHeight, amplitude, wavelength), 'Ripple');
    }
  }

  async effectFrostedGlass(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Frosted Glass', [
      { name: 'amount', type: 'entry', label: 'Amount (2-20)', placeholder: '5' }
    ]);
    if (result?.submitted && result.values?.amount) {
      const amount = Math.max(2, Math.min(20, parseInt(result.values.amount as string, 10) || 5));
      await this.applyEffect(() => ImageEffects.frostedGlass(this.pixels!, this.imageWidth, this.imageHeight, amount), 'Frosted Glass');
    }
  }

  async effectMosaic(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Mosaic/Stained Glass', [
      { name: 'cellSize', type: 'entry', label: 'Cell size (5-30)', placeholder: '15' }
    ]);
    if (result?.submitted && result.values?.cellSize) {
      const cellSize = Math.max(5, Math.min(30, parseInt(result.values.cellSize as string, 10) || 15));
      await this.applyEffect(() => ImageEffects.mosaic(this.pixels!, this.imageWidth, this.imageHeight, cellSize), 'Mosaic');
    }
  }

  async effectPointillism(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Pointillism', [
      { name: 'dotSize', type: 'entry', label: 'Dot size (2-8)', placeholder: '4' },
      { name: 'density', type: 'entry', label: 'Density (20-80)', placeholder: '50' }
    ]);
    if (result?.submitted && result.values?.dotSize) {
      const dotSize = Math.max(2, Math.min(8, parseInt(result.values.dotSize as string, 10) || 4));
      const density = Math.max(20, Math.min(80, parseInt(result.values.density as string, 10) || 50));
      await this.applyEffect(() => ImageEffects.pointillism(this.pixels!, this.imageWidth, this.imageHeight, dotSize, density), 'Pointillism');
    }
  }

  async effectColorQuantize(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Reduce Colors', [
      { name: 'colors', type: 'entry', label: 'Number of colors (2-64)', placeholder: '8' }
    ]);
    if (result?.submitted && result.values?.colors) {
      const colors = Math.max(2, Math.min(64, parseInt(result.values.colors as string, 10) || 8));
      await this.applyEffect(() => ImageEffects.colorQuantize(this.pixels!, colors), `Reduce to ${colors} colors`);
    }
  }

  async effectExposure(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Exposure', [
      { name: 'stops', type: 'entry', label: 'Stops (-3 to +3)', placeholder: '1' }
    ]);
    if (result?.submitted && result.values?.stops) {
      const stops = Math.max(-3, Math.min(3, parseFloat(result.values.stops as string) || 0));
      await this.applyEffect(() => ImageEffects.exposure(this.pixels!, stops), `Exposure ${stops > 0 ? '+' : ''}${stops}`);
    }
  }

  async effectShadowsHighlights(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Shadows/Highlights', [
      { name: 'shadows', type: 'entry', label: 'Shadows (-100 to 100)', placeholder: '30' },
      { name: 'highlights', type: 'entry', label: 'Highlights (-100 to 100)', placeholder: '-20' }
    ]);
    if (result?.submitted && result.values?.shadows) {
      const shadows = parseInt(result.values.shadows as string, 10) || 0;
      const highlights = parseInt(result.values.highlights as string, 10) || 0;
      await this.applyEffect(() => ImageEffects.shadowsHighlights(this.pixels!, shadows, highlights), 'Shadows/Highlights');
    }
  }

  async effectClarity(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Clarity', [
      { name: 'amount', type: 'entry', label: 'Amount (0-100)', placeholder: '50' }
    ]);
    if (result?.submitted && result.values?.amount) {
      const amount = Math.max(0, Math.min(100, parseInt(result.values.amount as string, 10) || 50));
      await this.applyEffect(() => ImageEffects.clarity(this.pixels!, this.imageWidth, this.imageHeight, amount), 'Clarity');
    }
  }

  async effectColorBalance(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Color Balance', [
      { name: 'redCyan', type: 'entry', label: 'Red/Cyan (-100 to 100)', placeholder: '0' },
      { name: 'greenMagenta', type: 'entry', label: 'Green/Magenta (-100 to 100)', placeholder: '0' },
      { name: 'blueYellow', type: 'entry', label: 'Blue/Yellow (-100 to 100)', placeholder: '0' }
    ]);
    if (result?.submitted) {
      const redCyan = parseInt(result.values?.redCyan as string, 10) || 0;
      const greenMagenta = parseInt(result.values?.greenMagenta as string, 10) || 0;
      const blueYellow = parseInt(result.values?.blueYellow as string, 10) || 0;
      await this.applyEffect(() => ImageEffects.colorBalance(this.pixels!, redCyan, greenMagenta, blueYellow), 'Color Balance');
    }
  }

  async effectReplaceColor(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const fromColor = await this.win.showColorPicker('Choose Color to Replace', '#FF0000');
    if (!fromColor) return;
    const toColor = await this.win.showColorPicker('Choose Replacement Color', '#00FF00');
    if (!toColor) return;
    const result = await this.win.showForm('Tolerance', [
      { name: 'tolerance', type: 'entry', label: 'Tolerance (10-150)', placeholder: '50' }
    ]);
    if (result?.submitted && result.values?.tolerance) {
      const tolerance = Math.max(10, Math.min(150, parseInt(result.values.tolerance as string, 10) || 50));
      await this.applyEffect(() => ImageEffects.replaceColor(this.pixels!, fromColor.r, fromColor.g, fromColor.b, toColor.r, toColor.g, toColor.b, tolerance), 'Replace Color');
    }
  }

  async effectLensBlur(): Promise<void> {
    if (!this.win || !this.pixels) return;
    const result = await this.win.showForm('Lens Blur', [
      { name: 'radius', type: 'entry', label: 'Radius (2-10)', placeholder: '5' },
      { name: 'brightness', type: 'entry', label: 'Bokeh brightness (0-100)', placeholder: '30' }
    ]);
    if (result?.submitted && result.values?.radius) {
      const radius = Math.max(2, Math.min(10, parseInt(result.values.radius as string, 10) || 5));
      const brightness = Math.max(0, Math.min(100, parseInt(result.values.brightness as string, 10) || 30));
      await this.applyEffect(() => ImageEffects.lensBlur(this.pixels!, this.imageWidth, this.imageHeight, radius, brightness), 'Lens Blur');
    }
  }

  /**
   * Set foreground color
   * Based on: editor.go SetFGColor()
   */
  async setFGColor(color: Color): Promise<void> {
    this.fgColor = color;
    if (this.colorLabel) {
      await this.colorLabel.setText(`${color.toHex()}`);
    }
    if (this.fgPreview) {
      await this.fgPreview.update({ fillColor: color.toHex() });
    }
  }

  /**
   * Open color picker dialog for FG color
   */
  async pickFGColor(): Promise<void> {
    if (!this.win) return;
    const result = await this.win.showColorPicker('Choose Foreground Color', this.fgColor.toHex());
    if (result) {
      await this.setFGColor(new Color(result.r, result.g, result.b, result.a));
    }
  }

  /**
   * Set background color
   */
  async setBGColor(color: Color): Promise<void> {
    this.bgColor = color;
    if (this.bgColorLabel) {
      await this.bgColorLabel.setText(`${color.toHex()}`);
    }
    if (this.bgPreview) {
      await this.bgPreview.update({ fillColor: color.toHex() });
    }
  }

  /**
   * Open color picker dialog for BG color
   */
  async pickBGColor(): Promise<void> {
    if (!this.win) return;
    const result = await this.win.showColorPicker('Choose Background Color', this.bgColor.toHex());
    if (result) {
      await this.setBGColor(new Color(result.r, result.g, result.b, result.a));
    }
  }

  /**
   * Swap foreground and background colors
   */
  async swapColors(): Promise<void> {
    const temp = this.fgColor;
    await this.setFGColor(this.bgColor);
    await this.setBGColor(temp);
  }

  /**
   * Set line width
   */
  async setLineWidth(width: number): Promise<void> {
    this.lineWidth = Math.max(1, Math.min(32, width)); // Clamp between 1 and 32
    if (this.lineWidthLabel) {
      await this.lineWidthLabel.setText(`${this.lineWidth}px`);
    }
  }

  /**
   * Set fill color (null for no fill)
   */
  async setFillColor(color: Color | null): Promise<void> {
    this.fillColor = color;
    if (this.fillColorLabel) {
      await this.fillColorLabel.setText(color ? 'Set' : 'None');
    }
    if (this.fillPreview) {
      if (color) {
        await this.fillPreview.setFillColor(color.toHex());
      } else {
        // Show gray for "no fill"
        await this.fillPreview.setFillColor('#CCCCCC');
      }
    }
  }

  /**
   * Show fill color picker dialog
   */
  async pickFillColor(): Promise<void> {
    if (!this.win) return;
    const currentHex = this.fillColor ? this.fillColor.toHex() : '#FFFFFF';
    const result = await this.win.showColorPicker('Choose Fill Color', currentHex);
    if (result) {
      await this.setFillColor(new Color(result.r, result.g, result.b, result.a));
    }
  }

  /**
   * Clear fill color (set to no fill)
   */
  async clearFillColor(): Promise<void> {
    await this.setFillColor(null);
  }

  /**
   * Set active tool
   * Based on: editor.go setTool()
   */
  async setTool(tool: Tool): Promise<void> {
    // Deactivate the previous tool if it has a deactivate method
    if (this.currentTool && this.currentTool.deactivate) {
      this.currentTool.deactivate();
    }

    // Update button highlighting (like original palette.go HighImportance)
    const previousTool = this.currentTool;
    this.currentTool = tool;

    // Remove highlight from previous tool button
    const prevBtn = previousTool ? this.toolButtons.get(previousTool.name) : undefined;
    if (prevBtn) {
      await prevBtn.setText(previousTool.name);
    }

    // Add highlight to new tool button
    const newBtn = this.toolButtons.get(tool.name);
    if (newBtn) {
      await newBtn.setText(`▶ ${tool.name}`);
    }

    if (this.toolLabel) {
      await this.toolLabel.setText(`Tool: ${tool.name}`);
    }
  }

  /**
   * Set zoom level (power of 2: 1, 2, 4, 8, 16)
   * Based on: editor.go setZoom() - uses power of 2 zoom like original
   */
  async setZoom(level: number): Promise<void> {
    const newZoom = Math.max(1, Math.min(16, level));
    if (newZoom === this.zoom) return; // No change

    // Check if zoomed buffer would be too large (limit to ~100MB to avoid OOM)
    const maxBufferSize = 100 * 1024 * 1024; // 100MB
    const zoomedSize = this.imageWidth * newZoom * this.imageHeight * newZoom * 4;
    if (zoomedSize > maxBufferSize) {
      console.log(`Zoom ${newZoom * 100}% would require ${Math.round(zoomedSize / 1024 / 1024)}MB - too large`);
      if (this.win) {
        await this.win.showError('Zoom Limited', `Cannot zoom to ${newZoom * 100}% - image too large (would need ${Math.round(zoomedSize / 1024 / 1024)}MB)`);
      }
      return;
    }

    this.zoom = newZoom;
    if (this.zoomLabel) {
      await this.zoomLabel.setText(`${this.zoom * 100}%`);
    }

    // Rebuild canvas at new zoom level
    await this.rebuildCanvasIfNeeded();
    this.updateStatus();
  }

  /**
   * Zoom in (double the zoom level)
   * Based on: palette.go updateZoom - uses *2 for zoom in
   */
  async zoomIn(): Promise<void> {
    await this.setZoom(this.zoom * 2);
  }

  /**
   * Zoom out (halve the zoom level)
   * Based on: palette.go updateZoom - uses /2 for zoom out
   */
  async zoomOut(): Promise<void> {
    await this.setZoom(Math.floor(this.zoom / 2));
  }

  /**
   * Load image from file
   * Based on: editor.go LoadFile()
   * Supports: PNG, JPEG, WebP, AVIF, TIFF, GIF
   */
  async loadFile(filepath: string): Promise<void> {
    // Show loading status
    if (this.statusLabel) {
      await this.statusLabel.setText('Loading...');
    }

    try {
      // Use sharp for broad format support including AVIF, WebP
      const image = sharp(filepath);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Could not determine image dimensions');
      }

      this.imageWidth = metadata.width;
      this.imageHeight = metadata.height;
      const size = this.imageWidth * this.imageHeight * 4;
      this.pixels = new Uint8ClampedArray(size);

      // Extract raw RGBA pixel data
      const { data, info } = await image
        .ensureAlpha() // Ensure we have an alpha channel
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Copy pixel data (sharp outputs as RGBA when ensureAlpha is used)
      for (let i = 0; i < size; i++) {
        this.pixels[i] = data[i];
      }

      // Store original for reload
      this.originalPixels = new Uint8ClampedArray(this.pixels);
      this.currentFile = filepath;
      this.hasUnsavedChanges = false;

      // Detect format from file
      const ext = path.extname(filepath).toLowerCase();
      if (SUPPORTED_FORMATS[ext]) {
        this.currentFormat = SUPPORTED_FORMATS[ext];
      }

      // Clear undo/redo history
      this.undoStack = [];
      this.redoStack = [];

      await this.addToRecentFiles(filepath);

      // Rebuild UI if it was already built (to update canvas dimensions)
      await this.rebuildCanvasIfNeeded();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load image: ${errorMessage}`);

      // Show error to user
      if (this.win) {
        await this.win.showError('Load Error', `Failed to load image: ${errorMessage}`);
      }

      // Fallback to blank image
      this.createBlankImage(32, 32);
      this.currentFile = filepath;
    }

    this.updateStatus();
  }

  /**
   * Load image from URL
   * Fetches the image data and loads it into the editor
   */
  async loadFromURL(url: string): Promise<void> {
    // Show loading status
    if (this.statusLabel) {
      await this.statusLabel.setText('Loading...');
    }

    try {
      // Fetch the image data
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      // Use sharp to process the image buffer
      const image = sharp(buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Could not determine image dimensions');
      }

      this.imageWidth = metadata.width;
      this.imageHeight = metadata.height;
      const size = this.imageWidth * this.imageHeight * 4;
      this.pixels = new Uint8ClampedArray(size);

      // Extract raw RGBA pixel data
      const { data } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Copy pixel data
      for (let i = 0; i < size; i++) {
        this.pixels[i] = data[i];
      }

      // Store original for reload
      this.originalPixels = new Uint8ClampedArray(this.pixels);

      // Extract filename from URL for display
      const urlPath = new URL(url).pathname;
      const filename = urlPath.split('/').pop() || 'remote-image';
      this.currentFile = filename;
      this.hasUnsavedChanges = false;

      // Detect format from URL or content-type
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        this.currentFormat = 'jpeg';
      } else if (contentType.includes('png')) {
        this.currentFormat = 'png';
      } else if (contentType.includes('webp')) {
        this.currentFormat = 'webp';
      } else {
        this.currentFormat = 'png'; // Default
      }

      // Clear undo/redo history
      this.undoStack = [];
      this.redoStack = [];

      // Rebuild UI if it was already built
      await this.rebuildCanvasIfNeeded();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load image from URL: ${errorMessage}`);

      if (this.win) {
        await this.win.showError('Load Error', `Failed to load image from URL: ${errorMessage}`);
      }

      // Fallback to blank image
      this.createBlankImage(32, 32);
    }

    this.updateStatus();
  }

  /**
   * Rebuild the canvas if the UI was already built
   * This is needed when loading a file after the UI is created,
   * since the canvas dimensions may have changed.
   */
  private async rebuildCanvasIfNeeded(): Promise<void> {
    const win = this.win;
    if (win && this.canvasRaster) {
      // UI was already built - need to rebuild window content
      // to create a new canvas with correct dimensions
      await win.setContent(async () => {
        await this.buildUI(win);
      });
    }
  }

  /**
   * Create a blank image
   */
  createBlankImage(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;
    // Create image filled with background color
    const size = width * height * 4;
    this.pixels = new Uint8ClampedArray(size);
    // Fill with background color
    for (let i = 0; i < size; i += 4) {
      this.pixels[i] = this.bgColor.r;
      this.pixels[i + 1] = this.bgColor.g;
      this.pixels[i + 2] = this.bgColor.b;
      this.pixels[i + 3] = this.bgColor.a;
    }

    // Store original for reload
    this.originalPixels = new Uint8ClampedArray(this.pixels);
    this.hasUnsavedChanges = false;

    // Clear undo/redo history
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Create a new blank image with dialog
   */
  async newImage(): Promise<void> {
    if (!this.win) return;

    // Show form dialog for dimensions
    const result = await this.win.showForm('New Image', [
      { name: 'width', type: 'entry', label: 'Width', placeholder: '32' },
      { name: 'height', type: 'entry', label: 'Height', placeholder: '32' }
    ]);

    if (result?.submitted && result.values) {
      const widthStr = typeof result.values.width === 'string' ? result.values.width : '32';
      const heightStr = typeof result.values.height === 'string' ? result.values.height : '32';
      const width = parseInt(widthStr, 10) || 32;
      const height = parseInt(heightStr, 10) || 32;

      // Limit to reasonable dimensions
      const finalWidth = Math.max(1, Math.min(1024, width));
      const finalHeight = Math.max(1, Math.min(1024, height));

      this.createBlankImage(finalWidth, finalHeight);
      this.currentFile = null;

      // Rebuild canvas to match new dimensions
      await this.rebuildCanvasIfNeeded();
      this.updateStatus();
    }
  }

  /**
   * Save current image
   * Based on: editor.go Save()
   */
  async save(): Promise<void> {
    if (!this.currentFile) {
      await this.saveAs();
      return;
    }

    try {
      await this.saveToFile(this.currentFile);
      this.hasUnsavedChanges = false;
      this.updateStatus();
      if (this.win) {
        await this.win.showInfo('Save', `Image saved to ${this.currentFile}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to save image: ${errorMessage}`);
      if (this.win) {
        await this.win.showError('Save Error', `Failed to save image: ${errorMessage}`);
      }
    }
  }

  /**
   * Save image to a specific file path using sharp
   * Supports: PNG, JPEG, WebP, AVIF, TIFF
   */
  private async saveToFile(filepath: string, format?: ImageFormat): Promise<void> {
    if (!this.pixels) {
      throw new Error('No image data to save');
    }

    // Determine format from extension or parameter
    const ext = path.extname(filepath).toLowerCase();
    const saveFormat = format || SUPPORTED_FORMATS[ext] || this.currentFormat;

    // Create sharp image from raw RGBA buffer
    const image = sharp(Buffer.from(this.pixels), {
      raw: {
        width: this.imageWidth,
        height: this.imageHeight,
        channels: 4
      }
    });

    // Ensure file has correct extension
    let finalPath = filepath;
    const expectedExt = this.getExtensionForFormat(saveFormat);
    if (!filepath.toLowerCase().endsWith(expectedExt)) {
      finalPath = filepath + expectedExt;
    }

    // Apply format-specific options and save
    switch (saveFormat) {
      case 'png':
        await image.png({ compressionLevel: 9 }).toFile(finalPath);
        break;
      case 'jpeg':
        await image.jpeg({ quality: 90 }).toFile(finalPath);
        break;
      case 'webp':
        await image.webp({ quality: 90, lossless: false }).toFile(finalPath);
        break;
      case 'avif':
        await image.avif({ quality: 80, lossless: false }).toFile(finalPath);
        break;
      case 'tiff':
        await image.tiff({ compression: 'lzw' }).toFile(finalPath);
        break;
      case 'gif':
        await image.gif().toFile(finalPath);
        break;
      default:
        await image.png().toFile(finalPath);
    }

    console.log(`Saved ${finalPath} as ${saveFormat}`);
  }

  /**
   * Get file extension for a given format
   */
  private getExtensionForFormat(format: ImageFormat): string {
    const extensions: Record<ImageFormat, string> = {
      png: '.png',
      jpeg: '.jpg',
      webp: '.webp',
      avif: '.avif',
      tiff: '.tiff',
      gif: '.gif'
    };
    return extensions[format] || '.png';
  }

  /**
   * Save image to new file
   * Based on: editor.go SaveAs() and ui/main.go fileSaveAs()
   */
  async saveAs(): Promise<void> {
    if (!this.win) return;
    const filepath = await this.win.showFileSave('image.png');
    if (filepath) {
      this.currentFile = filepath;
      await this.addToRecentFiles(filepath);
      await this.save();
    }
  }

  /**
   * Export image with format selection
   * Allows saving in different formats: PNG, JPEG, WebP, AVIF, TIFF, GIF
   */
  async exportAs(): Promise<void> {
    if (!this.win) return;

    // Show format selection dialog
    const formatOptions = [
      { name: 'PNG', value: 'png' },
      { name: 'JPEG', value: 'jpeg' },
      { name: 'WebP', value: 'webp' },
      { name: 'AVIF', value: 'avif' },
      { name: 'TIFF', value: 'tiff' },
      { name: 'GIF', value: 'gif' }
    ];

    const result = await this.win.showForm('Export As', [
      {
        name: 'format',
        type: 'select',
        label: 'Format',
        options: formatOptions.map(f => f.name)
      }
    ]);

    if (!result?.submitted || !result.values) return;

    const selectedName = typeof result.values.format === 'string' ? result.values.format : '';
    const format = formatOptions.find(f => f.name === selectedName);
    if (!format) return;

    const defaultName = `image${this.getExtensionForFormat(format.value as ImageFormat)}`;
    const filepath = await this.win.showFileSave(defaultName);

    if (filepath) {
      try {
        await this.saveToFile(filepath, format.value as ImageFormat);
        await this.win.showInfo('Export', `Exported to ${filepath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Export failed: ${errorMessage}`);
        await this.win.showError('Export Error', `Failed to export: ${errorMessage}`);
      }
    }
  }

  /**
   * Open file dialog
   * Based on: ui/main.go fileOpen()
   */
  async fileOpen(): Promise<void> {
    if (!this.win) return;
    const filepath = await this.win.showFileOpen();
    if (filepath) {
      await this.loadFile(filepath);
    }
  }

  /**
   * Open URL dialog - prompts user for URL and loads image
   */
  async fileOpenURL(): Promise<void> {
    if (!this.win) return;
    const result = await this.win.showForm('Open URL', [
      { name: 'url', type: 'entry', label: 'Image URL', placeholder: 'https://example.com/image.png' }
    ]);
    if (result?.submitted && result.values?.url) {
      const url = result.values.url as string;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        await this.loadFromURL(url);
      } else {
        await this.win.showError('Invalid URL', 'Please enter a valid HTTP or HTTPS URL');
      }
    }
  }

  /**
   * Reset to original image with confirmation
   * Based on: ui/main.go fileReset()
   */
  async fileReset(): Promise<void> {
    if (!this.win) return;
    const confirmed = await this.win.showConfirm('Reset content?', 'Are you sure you want to re-load the image?');
    if (confirmed) {
      await this.reload();
    }
  }

  /**
   * Reload original image
   * Based on: editor.go Reload()
   */
  async reload(): Promise<void> {
    // If we have original pixels, restore them
    if (this.originalPixels) {
      this.pixels = new Uint8ClampedArray(this.originalPixels);
      this.hasUnsavedChanges = false;
      this.undoStack = [];
      this.redoStack = [];
      // Refresh canvas display
      await this.refreshCanvas();
      this.updateStatus();
      return;
    }

    // Otherwise reload from file or create blank
    if (this.currentFile) {
      await this.loadFile(this.currentFile);
    } else {
      this.createBlankImage(32, 32);
      this.updateStatus();
    }
  }

  /**
   * Refresh the canvas display with current pixel data
   */
  private async refreshCanvas(): Promise<void> {
    if (!this.canvasRaster || !this.pixels) return;

    const updates: Array<{x: number; y: number; r: number; g: number; b: number; a: number}> = [];

    for (let py = 0; py < this.imageHeight; py++) {
      for (let px = 0; px < this.imageWidth; px++) {
        const idx = (py * this.imageWidth + px) * 4;
        const r = this.pixels[idx];
        const g = this.pixels[idx + 1];
        const b = this.pixels[idx + 2];
        const a = this.pixels[idx + 3];

        for (let dy = 0; dy < this.zoom; dy++) {
          for (let dx = 0; dx < this.zoom; dx++) {
            updates.push({
              x: px * this.zoom + dx,
              y: py * this.zoom + dy,
              r, g, b, a
            });
          }
        }
      }
    }

    await this.canvasRaster.setPixels(updates);
  }

  /**
   * Update status bar with enhanced information
   */
  private async updateStatus(): Promise<void> {
    if (this.statusLabel && this.pixels) {
      const filename = this.currentFile ? this.currentFile.split('/').pop() : 'New Image';
      const unsaved = this.hasUnsavedChanges ? '*' : '';
      const formatLabel = this.currentFormat.toUpperCase();
      const prefix = this.currentFile ? 'Loaded: ' : '';
      const msg = `${prefix}${filename}${unsaved} | ${this.imageWidth}x${this.imageHeight} | ${formatLabel} | ${this.zoom * 100}%`;
      await this.statusLabel.setText(msg);
    }
    if (this.toolLabel) {
      await this.toolLabel.setText(`Tool: ${this.currentTool.name}`);
    }
  }

  /**
   * Public wrapper for updateStatus (called after UI is built)
   */
  async updateStatusPublic(): Promise<void> {
    await this.updateStatus();
  }

  /**
   * Get the current pixel buffer (for testing)
   */
  getPixels(): Uint8ClampedArray | null {
    return this.pixels;
  }

  /**
   * Apply grayscale effect (public wrapper for testing)
   */
  async applyGrayscale(): Promise<void> {
    await this.effectGrayscale();
  }

  /**
   * Update coordinate display (called on mouse move/click)
   */
  async updateCoordinates(x: number, y: number): Promise<void> {
    if (this.coordLabel) {
      if (x >= 0 && x < this.imageWidth && y >= 0 && y < this.imageHeight) {
        const color = this.getPixelColor(x, y);
        await this.coordLabel.setText(`(${x}, ${y}) ${color.toHex()}`);
      } else {
        await this.coordLabel.setText('');
      }
    }
  }

  /**
   * Build main menu
   * Based on: ui/main.go buildMainMenu()
   * Note: Tsyne's menu API uses onSelected (not onClick) and doesn't support nested submenus
   */
  private updateMainMenu(): void {
    if (!this.win) return;

    // Build File menu items
    const fileMenuItems: Array<{label: string; onSelected?: () => void; isSeparator?: boolean}> = [
      { label: 'New ...', onSelected: () => this.newImage() },
      { label: 'Open ...', onSelected: () => this.fileOpen() },
      { label: 'Open URL ...', onSelected: () => this.fileOpenURL() },
      { label: 'isSeparator', isSeparator: true },
    ];

    // Add recent files directly to menu
    if (this.recentFiles.length > 0) {
      for (const filepath of this.recentFiles.slice(0, 3)) { // Show up to 3 recent
        const filename = filepath.split('/').pop() || filepath;
        fileMenuItems.push({ label: `Recent: ${filename}`, onSelected: () => this.loadFile(filepath) });
      }
      fileMenuItems.push({ label: 'isSeparator', isSeparator: true });
    }

    fileMenuItems.push({ label: 'Reset ...', onSelected: () => this.fileReset() });
    fileMenuItems.push({ label: 'Save', onSelected: () => this.save() });
    fileMenuItems.push({ label: 'Save As ...', onSelected: () => this.saveAs() });
    fileMenuItems.push({ label: 'Export As ...', onSelected: () => this.exportAs() });

    // Build Edit menu items
    const editMenuItems: Array<{label: string; onSelected?: () => void; isSeparator?: boolean}> = [
      { label: 'Undo', onSelected: () => this.undo() },
      { label: 'Redo', onSelected: () => this.redo() },
      { label: 'isSeparator', isSeparator: true },
      { label: 'Cut', onSelected: () => this.cut() },
      { label: 'Copy', onSelected: () => this.copy() },
      { label: 'Paste', onSelected: () => this.paste() },
      { label: 'isSeparator', isSeparator: true },
      { label: 'Select All', onSelected: () => this.selectAll() },
      { label: 'Deselect', onSelected: () => this.clearSelection() },
      { label: 'isSeparator', isSeparator: true },
      { label: 'Swap FG/BG Colors', onSelected: () => this.swapColors() },
    ];

    // Build Layer menu items
    const layerMenuItems: Array<{label: string; onSelected?: () => void; isSeparator?: boolean}> = [
      { label: 'Add Layer', onSelected: () => this.addLayer() },
      { label: 'Remove Layer', onSelected: () => this.removeLayer(this.activeLayerIndex) },
      { label: 'isSeparator', isSeparator: true },
      { label: 'Move Layer Up', onSelected: () => this.moveLayerUp(this.activeLayerIndex) },
      { label: 'Move Layer Down', onSelected: () => this.moveLayerDown(this.activeLayerIndex) },
      { label: 'Merge Down', onSelected: () => this.mergeLayerDown(this.activeLayerIndex) },
      { label: 'isSeparator', isSeparator: true },
      { label: 'Toggle Visibility', onSelected: () => this.toggleLayerVisibility(this.activeLayerIndex) },
    ];

    // Build Adjust menu items (basic adjustments)
    const adjustMenuItems: Array<{label: string; onSelected?: () => void; isSeparator?: boolean}> = [
      { label: 'Brightness ...', onSelected: () => this.effectBrightness() },
      { label: 'Contrast ...', onSelected: () => this.effectContrast() },
      { label: 'Saturation ...', onSelected: () => this.effectSaturation() },
      { label: 'Gamma ...', onSelected: () => this.effectGamma() },
      { label: 'Exposure ...', onSelected: () => this.effectExposure() },
      { label: 'Auto Levels', onSelected: () => this.effectNormalize() },
      { label: 'isSeparator', isSeparator: true },
      { label: 'Hue/Rotate ...', onSelected: () => this.effectHueRotate() },
      { label: 'Vibrance ...', onSelected: () => this.effectVibrance() },
      { label: 'Color Temperature ...', onSelected: () => this.effectColorTemperature() },
      { label: 'Tint ...', onSelected: () => this.effectTint() },
      { label: 'Color Balance ...', onSelected: () => this.effectColorBalance() },
      { label: 'isSeparator', isSeparator: true },
      { label: 'Shadows/Highlights ...', onSelected: () => this.effectShadowsHighlights() },
      { label: 'Clarity ...', onSelected: () => this.effectClarity() },
    ];

    // Build Effects menu items (filters and artistic effects)
    const effectsMenuItems: Array<{label: string; onSelected?: () => void; isSeparator?: boolean}> = [
      // Color Effects
      { label: 'Grayscale', onSelected: () => this.effectGrayscale() },
      { label: 'Sepia', onSelected: () => this.effectSepia() },
      { label: 'Invert', onSelected: () => this.effectInvert() },
      { label: 'Posterize ...', onSelected: () => this.effectPosterize() },
      { label: 'Threshold ...', onSelected: () => this.effectThreshold() },
      { label: 'Solarize ...', onSelected: () => this.effectSolarize() },
      { label: 'Dither', onSelected: () => this.effectDither() },
      { label: 'Duotone ...', onSelected: () => this.effectDuotone() },
      { label: 'Color Quantize ...', onSelected: () => this.effectColorQuantize() },
      { label: 'Replace Color ...', onSelected: () => this.effectReplaceColor() },
      { label: 'isSeparator', isSeparator: true },
      // Blur/Sharpen
      { label: 'Box Blur ...', onSelected: () => this.effectBlur() },
      { label: 'Gaussian Blur ...', onSelected: () => this.effectGaussianBlur() },
      { label: 'Motion Blur ...', onSelected: () => this.effectMotionBlur() },
      { label: 'Radial Blur ...', onSelected: () => this.effectRadialBlur() },
      { label: 'Lens Blur ...', onSelected: () => this.effectLensBlur() },
      { label: 'Frosted Glass ...', onSelected: () => this.effectFrostedGlass() },
      { label: 'Median Filter ...', onSelected: () => this.effectMedianFilter() },
      { label: 'Sharpen ...', onSelected: () => this.effectSharpen() },
      { label: 'Unsharp Mask ...', onSelected: () => this.effectUnsharpMask() },
      { label: 'High Pass ...', onSelected: () => this.effectHighPass() },
      { label: 'isSeparator', isSeparator: true },
      // Artistic
      { label: 'Edge Detect', onSelected: () => this.effectEdgeDetect() },
      { label: 'Emboss', onSelected: () => this.effectEmboss() },
      { label: 'Pixelate ...', onSelected: () => this.effectPixelate() },
      { label: 'Mosaic ...', onSelected: () => this.effectMosaic() },
      { label: 'Oil Paint ...', onSelected: () => this.effectOilPaint() },
      { label: 'Pencil Sketch', onSelected: () => this.effectPencilSketch() },
      { label: 'Cartoon ...', onSelected: () => this.effectCartoon() },
      { label: 'Pop Art', onSelected: () => this.effectPopArt() },
      { label: 'Pointillism ...', onSelected: () => this.effectPointillism() },
      { label: 'Halftone ...', onSelected: () => this.effectHalftone() },
      { label: 'isSeparator', isSeparator: true },
      // Film/Photo/Retro
      { label: 'Vignette ...', onSelected: () => this.effectVignette() },
      { label: 'Film Grain ...', onSelected: () => this.effectFilmGrain() },
      { label: 'Vintage', onSelected: () => this.effectVintage() },
      { label: 'Cross Process', onSelected: () => this.effectCrossProcess() },
      { label: 'Scanlines ...', onSelected: () => this.effectScanlines() },
      { label: 'CRT Effect', onSelected: () => this.effectCRT() },
      { label: 'VHS Effect', onSelected: () => this.effectVHS() },
      { label: 'isSeparator', isSeparator: true },
      // Special
      { label: 'Night Vision', onSelected: () => this.effectNightVision() },
      { label: 'Thermal', onSelected: () => this.effectThermal() },
      { label: 'Chromatic Aberration ...', onSelected: () => this.effectChromaticAberration() },
      { label: 'Glitch ...', onSelected: () => this.effectGlitch() },
      { label: 'Color Splash ...', onSelected: () => this.effectColorSplash() },
    ];

    // Build Channels menu items
    const channelsMenuItems: Array<{label: string; onSelected?: () => void; isSeparator?: boolean}> = [
      { label: 'Red Channel Only', onSelected: () => this.effectRedChannel() },
      { label: 'Green Channel Only', onSelected: () => this.effectGreenChannel() },
      { label: 'Blue Channel Only', onSelected: () => this.effectBlueChannel() },
      { label: 'isSeparator', isSeparator: true },
      { label: 'Swap R ↔ B', onSelected: () => this.effectSwapRGB_BGR() },
      { label: 'Rotate RGB → GBR', onSelected: () => this.effectSwapRGB_GBR() },
      { label: 'Rotate RGB → BRG', onSelected: () => this.effectSwapRGB_BRG() },
    ];

    // Build Transform menu items
    const transformMenuItems: Array<{label: string; onSelected?: () => void; isSeparator?: boolean}> = [
      { label: 'Flip Horizontal', onSelected: () => this.effectFlipHorizontal() },
      { label: 'Flip Vertical', onSelected: () => this.effectFlipVertical() },
      { label: 'isSeparator', isSeparator: true },
      { label: 'Rotate 90° CW', onSelected: () => this.effectRotate90CW() },
      { label: 'Rotate 90° CCW', onSelected: () => this.effectRotate90CCW() },
      { label: 'Rotate 180°', onSelected: () => this.effectRotate180() },
      { label: 'isSeparator', isSeparator: true },
      // Distortions
      { label: 'Wave ...', onSelected: () => this.effectWave() },
      { label: 'Swirl ...', onSelected: () => this.effectSwirl() },
      { label: 'Spherize ...', onSelected: () => this.effectSpherize() },
      { label: 'Pinch ...', onSelected: () => this.effectPinch() },
      { label: 'Ripple ...', onSelected: () => this.effectRipple() },
    ];

    this.win.setMainMenu([
      {
        label: 'File',
        items: fileMenuItems
      },
      {
        label: 'Edit',
        items: editMenuItems
      },
      {
        label: 'Layer',
        items: layerMenuItems
      },
      {
        label: 'Adjust',
        items: adjustMenuItems
      },
      {
        label: 'Effects',
        items: effectsMenuItems
      },
      {
        label: 'Channels',
        items: channelsMenuItems
      },
      {
        label: 'Transform',
        items: transformMenuItems
      }
    ]);
  }

  /**
   * Build the UI
   * Based on: ui/main.go BuildUI()
   * Uses hamburger menu pattern for LHS tools panel (inspired by Paris density simulation)
   */
  /**
   * Build UI in embedded mode (no window)
   */
  buildUIEmbedded(): void {
    this.loadRecentFiles().catch(() => {});

    if (!this.pixels) {
      this.createBlankImage(32, 32);
    }

    this.buildUIContent();
    setTimeout(() => this.populateCanvasBuffer(), 0);
  }

  async buildUI(win: Window): Promise<void> {
    this.win = win;
    await this.loadRecentFiles();
    this.updateMainMenu();

    // Create initial blank image if no pixels exist
    if (!this.pixels) {
      this.createBlankImage(32, 32);
    }

    this.buildUIContent();

    // Populate canvas with pixel data after UI is built
    await this.populateCanvasBuffer();
  }

  private buildUIContent(): void {
    // Use border layout to pin toolbar at top, status at bottom, canvas fills center
    this.a.border({
      top: () => this.buildToolbar(),
      bottom: () => this.buildStatusBar(),
      center: () => {
        // Main area: stack with canvas and hamburger panel overlay
        this.a.stack(() => {
          // Bottom layer: canvas (fills available space)
          this.buildCanvas();

          // Top layer: hamburger panel overlay on left
          this.a.hbox(() => {
            this.a.themeoverride('dark', () => {
              this.a.vbox(() => {
                // Hamburger button row (always visible, with opaque background)
                this.a.max(() => {
                  this.a.rectangle('#1a1a2e', 150, 36);
                  this.a.hbox(() => {
                    this.a.button('☰').onClick(() => {
                      this.panelCollapsed = !this.panelCollapsed;
                      if (this.panelContainer) {
                        if (this.panelCollapsed) {
                          this.panelContainer.hide();
                        } else {
                          this.panelContainer.show();
                        }
                      }
                    }).withId('hamburgerBtn');
                    this.a.label(' Tools');
                  });
                });

                // Collapsible panel container with scroll
                this.panelContainer = this.a.scroll(() => {
                  this.a.max(() => {
                    this.a.rectangle('#1a1a2e', 150, 500); // Background for content
                    this.a.vbox(() => {
                      // Accordion palette content
                      this.buildPalette();
                    });
                  });
                });

                // Hide panel initially since panelCollapsed defaults to true
                if (this.panelCollapsed && this.panelContainer) {
                  this.panelContainer.hide();
                }
              });
            });
            this.a.spacer();
          });
        });
      }
    });
  }

  /**
   * Build toolbar with file operations
   * Based on: ui/main.go buildToolbar()
   */
  private buildToolbar(): void {
    this.a.toolbar([
      this.a.toolbarAction('Open', () => this.fileOpen()),
      this.a.toolbarAction('Reset', () => this.fileReset()),
      this.a.toolbarAction('Save', () => this.save())
    ]);
  }

  /**
   * Build palette with tools and zoom controls using accordion sections
   * Based on: ui/palette.go newPalette()
   */
  private buildPalette(): void {
    this.a.accordion([
      {
        title: 'Tools',
        open: true,
        builder: () => {
          this.a.vbox(() => {
            // Create tool buttons with highlighting support
            for (const tool of this.tools) {
              const isSelected = tool === this.currentTool;
              const buttonLabel = isSelected ? `▶ ${tool.name}` : tool.name;
              const toolId = `tool-${tool.name.toLowerCase()}`;
              const btn = this.a.button(buttonLabel).withId(toolId).onClick(() => {
                this.setTool(tool);
              });
              this.toolButtons.set(tool.name, btn);
            }
          });
        }
      },
      {
        title: 'Zoom',
        open: true,
        builder: () => {
          this.a.hbox(() => {
            this.a.button('-').withId('zoom-out').onClick(() => this.zoomOut());
            this.zoomLabel = this.a.label(`${this.zoom * 100}%`).withId('zoom-level');
            this.a.button('+').withId('zoom-in').onClick(() => this.zoomIn());
          });
        }
      },
      {
        title: 'Colors',
        open: true,
        builder: () => {
          this.a.vbox(() => {
            // FG/BG/Fill colors in a compact layout
            this.a.hbox(() => {
              this.a.vbox(() => {
                this.a.label('FG');
                this.fgPreview = this.a.canvasRectangle({
                  width: 28,
                  height: 28,
                  fillColor: this.fgColor.toHex(),
                  strokeColor: '#000000',
                  strokeWidth: 1,
                  onClick: () => this.pickFGColor()
                });
              });
              this.a.vbox(() => {
                this.a.label('BG');
                this.bgPreview = this.a.canvasRectangle({
                  width: 28,
                  height: 28,
                  fillColor: this.bgColor.toHex(),
                  strokeColor: '#000000',
                  strokeWidth: 1,
                  onClick: () => this.pickBGColor()
                });
              });
              this.a.vbox(() => {
                this.a.label('Fill');
                this.fillPreview = this.a.canvasRectangle({
                  width: 28,
                  height: 28,
                  fillColor: this.fillColor ? this.fillColor.toHex() : '#CCCCCC',
                  strokeColor: '#000000',
                  strokeWidth: 1,
                  onClick: () => this.pickFillColor()
                });
              });
            });
            this.a.hbox(() => {
              this.a.button('⇄').onClick(() => this.swapColors());
              this.a.button('No Fill').onClick(() => this.clearFillColor());
            });
          });
        }
      },
      {
        title: 'Line Width',
        builder: () => {
          this.a.hbox(() => {
            this.a.button('-').onClick(() => this.setLineWidth(this.lineWidth - 1));
            this.lineWidthLabel = this.a.label(`${this.lineWidth}px`);
            this.a.button('+').onClick(() => this.setLineWidth(this.lineWidth + 1));
          });
        }
      }
    ]);
  }

  /**
   * Build main canvas area
   * Based on: ui/editor.go and ui/raster.go
   */
  private buildCanvas(): void {
    this.a.scroll(() => {
      this.a.center(() => {
        // Create a CanvasRaster widget to display the pixel image
        // For large images, we display at 1:1 to avoid memory issues
        // The zoom factor is applied to the display size
        const displayWidth = this.imageWidth * this.zoom;
        const displayHeight = this.imageHeight * this.zoom;

        // Create tappable raster WITHOUT initial pixel data to avoid huge array
        // We'll use setPixelBuffer() after creation for efficiency
        this.canvasRaster = new TappableCanvasRaster(
          this.a.getContext(),
          displayWidth,
          displayHeight,
          {
            onTap: async (screenX: number, screenY: number) => {
              // Convert screen coordinates to pixel coordinates by dividing by zoom
              const pixelX = Math.floor(screenX / this.zoom);
              const pixelY = Math.floor(screenY / this.zoom);

              // Bounds checking
              if (pixelX < 0 || pixelX >= this.imageWidth || pixelY < 0 || pixelY >= this.imageHeight) {
                return;
              }

              // Update coordinate display
              await this.updateCoordinates(pixelX, pixelY);

              // Begin undo operation
              this.beginOperation();

              // Delegate to current tool
              await this.currentTool.clicked(pixelX, pixelY);

              // End undo operation with tool name
              this.endOperation(`${this.currentTool.name} at (${pixelX}, ${pixelY})`);
            }
          }
        );

        // Note: Canvas buffer will be populated after UI build completes
      });
    });
  }

  /**
   * Populate the canvas raster with current pixel data using setPixelBuffer
   * This is more efficient than passing pixel arrays for large images
   */
  private async populateCanvasBuffer(): Promise<void> {
    if (!this.canvasRaster || !this.pixels) return;

    const displayWidth = this.imageWidth * this.zoom;
    const displayHeight = this.imageHeight * this.zoom;

    // For zoom=1, send original pixels directly (no copy needed)
    if (this.zoom === 1) {
      // Use pixels directly as Uint8Array
      const buffer = new Uint8Array(this.pixels.buffer, this.pixels.byteOffset, this.pixels.byteLength);
      this.rasterBuffer = buffer;
      await this.canvasRaster.setPixelBufferInStripes(buffer, displayWidth, displayHeight);
      this.rasterBufferDirty = false;
      return;
    }

    // For zoom > 1, create scaled buffer using row-based copying (more efficient)
    this.rasterBuffer = new Uint8Array(displayWidth * displayHeight * 4);
    const srcRowBytes = this.imageWidth * 4;
    const dstRowBytes = displayWidth * 4;

    for (let srcY = 0; srcY < this.imageHeight; srcY++) {
      const srcRowStart = srcY * srcRowBytes;
      // Copy this source row to multiple destination rows (zoom times)
      for (let z = 0; z < this.zoom; z++) {
        const dstY = srcY * this.zoom + z;
        const dstRowStart = dstY * dstRowBytes;
        // For each pixel in source row, duplicate horizontally
        for (let srcX = 0; srcX < this.imageWidth; srcX++) {
          const srcIdx = srcRowStart + srcX * 4;
          const r = this.pixels[srcIdx];
          const g = this.pixels[srcIdx + 1];
          const b = this.pixels[srcIdx + 2];
          const a = this.pixels[srcIdx + 3];
          // Write zoom copies horizontally
          for (let zx = 0; zx < this.zoom; zx++) {
            const dstIdx = dstRowStart + (srcX * this.zoom + zx) * 4;
            this.rasterBuffer[dstIdx] = r;
            this.rasterBuffer[dstIdx + 1] = g;
            this.rasterBuffer[dstIdx + 2] = b;
            this.rasterBuffer[dstIdx + 3] = a;
          }
        }
      }
    }

    // Use stripes for large images to avoid msgpack message size limits
    await this.canvasRaster.setPixelBufferInStripes(this.rasterBuffer, displayWidth, displayHeight);
    this.rasterBufferDirty = false;
  }

  /**
   * Build status bar with enhanced information
   * Based on: ui/status.go
   */
  private buildStatusBar(): void {
    this.a.hbox(() => {
      // Main status (file info)
      this.statusLabel = this.a.label('Open a file');
      this.a.separator();
      // Current tool
      this.toolLabel = this.a.label(`Tool: ${this.currentTool.name}`);
      this.a.separator();
      // Selection info
      this.selectionLabel = this.a.label('');
      this.a.separator();
      // Layer info
      this.layerLabel = this.a.label('');
      this.a.separator();
      // Coordinates and color under cursor
      this.coordLabel = this.a.label('');
    });
  }

  // Expose for testing
  getZoom(): number {
    return this.zoom;
  }

  getCurrentFile(): string | null {
    return this.currentFile;
  }

  getRecentFiles(): string[] {
    return [...this.recentFiles];
  }
}

/**
 * Create the pixel editor app
 * Based on: main.go
 */
export function createPixelEditorApp(a: App, filePath?: string, windowWidth?: number, windowHeight?: number): PixelEditor {
  const editor = new PixelEditor(a);
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  if (isEmbedded) {
    editor.buildUIEmbedded();
    if (filePath) {
      editor.loadFile(filePath).catch(err => {
        console.error('Failed to load image:', err);
      });
    }
  } else {
    a.window({ title: 'Pixel Editor', width: 640, height: 480 }, (win: Window) => {
      win.setContent(async () => {
        await editor.buildUI(win);

        if (filePath) {
          editor.loadFile(filePath).catch(err => {
            console.error('Failed to load image:', err);
          });
        }
      });
      win.show();
    });
  }

  return editor;
}

// Export classes and types for testing
export { PixelEditor, Color, SelectionTool, SUPPORTED_FORMATS };
export type { Selection, ClipboardData, Layer, BlendMode, ImageFormat };

/**
 * Main application entry point
 */
if (require.main === module) {
  app(resolveTransport(), { title: 'Pixel Editor' }, async (a: App) => {
    // Pre-load file or URL from command line if provided (before building UI)
    // This ensures the canvas is created with the correct dimensions
    let preloadArg: string | null = null;
    if (process.argv.length > 2) {
      preloadArg = process.argv[2];
    }

    const editor = new PixelEditor(a);

    // Load file or URL before creating window to get correct dimensions
    if (preloadArg) {
      try {
        if (preloadArg.startsWith('http://') || preloadArg.startsWith('https://')) {
          await editor.loadFromURL(preloadArg);
        } else {
          await editor.loadFile(preloadArg);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to load from command line: ${errorMessage}`);
        // Continue with blank canvas - error will be handled in load methods
      }
    }

    // Now create window with correct dimensions
    a.window({ title: 'Pixel Editor', width: 520, height: 320 }, async (win: Window) => {
      win.setContent(async () => {
        await editor.buildUI(win);
        // Update status after UI is built (in case file was pre-loaded)
        await editor.updateStatusPublic();
      });
      win.show();
    });
  });
}
