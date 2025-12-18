// @tsyne-app:name Pixel Editor
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="4" height="4" fill="currentColor"/><rect x="8" y="8" width="4" height="4" fill="currentColor"/><rect x="12" y="12" width="4" height="4" fill="currentColor"/><rect x="16" y="4" width="4" height="4"/><rect x="4" y="16" width="4" height="4"/><path d="M2 2h20v20H2z"/></svg>
// @tsyne-app:category creativity
// @tsyne-app:builder createPixelEditorApp

/**
 * Pixel Editor for Tsyne
 *
 * Ported from https://github.com/fyne-io/pixeledit
 * Original authors: Fyne.io contributors
 * License: See original repository
 *
 * This port demonstrates pixel editing capabilities in Tsyne, including:
 * - Main menu with File, Edit, and Layer operations
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
 * Supported Image Formats (via sharp):
 * - PNG (load/save)
 * - JPEG (load/save)
 * - WebP (load/save) - modern format with good compression
 * - AVIF (load/save) - next-gen format with excellent compression
 * - TIFF (load/save) - professional format
 * - GIF (load/save) - legacy format
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { CanvasRectangle } from '../../core/src/widgets/canvas';
import type { Label } from '../../core/src/widgets/display';
import type { Button } from '../../core/src/widgets/inputs';
import { TappableCanvasRaster } from '../../core/src/widgets/canvas';
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
      await this.canvasRaster.setPixelBuffer(this.rasterBuffer);
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
    this.zoom = Math.max(1, Math.min(16, level));
    if (this.zoomLabel) {
      await this.zoomLabel.setText(`${this.zoom * 100}%`);
    }
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
      const msg = `${filename}${unsaved} | ${this.imageWidth}x${this.imageHeight} | ${formatLabel} | ${this.zoom * 100}%`;
      await this.statusLabel.setText(msg);
    }
    if (this.toolLabel) {
      await this.toolLabel.setText(`Tool: ${this.currentTool.name}`);
    }
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
      }
    ]);
  }

  /**
   * Build the UI
   * Based on: ui/main.go BuildUI()
   */
  async buildUI(win: Window): Promise<void> {
    this.win = win;
    await this.loadRecentFiles();
    this.updateMainMenu();

    // Create initial blank image if no pixels exist
    if (!this.pixels) {
      this.createBlankImage(32, 32);
    }

    this.a.border({
      top: () => {
        // Top toolbar
        this.buildToolbar();
      },
      left: () => {
        // Left palette
        this.buildPalette();
      },
      center: () => {
        // Main canvas area
        this.buildCanvas();
      },
      bottom: () => {
        // Bottom status bar
        this.buildStatusBar();
      }
    });

    // Populate canvas with pixel data after UI is built
    // This uses setPixelBuffer for efficiency with large images
    await this.populateCanvasBuffer();
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
              const btn = this.a.button(buttonLabel).onClick(() => {
                this.setTool(tool);
              });
              this.toolButtons.set(tool.name, btn);
            }
          });
        }
      },
      {
        title: 'Zoom',
        builder: () => {
          this.a.hbox(() => {
            this.a.button('-').onClick(() => this.zoomOut());
            this.zoomLabel = this.a.label(`${this.zoom * 100}%`);
            this.a.button('+').onClick(() => this.zoomIn());
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

    // Create/resize the raster buffer for the zoomed display
    this.rasterBuffer = new Uint8Array(displayWidth * displayHeight * 4);

    // Fill buffer with zoomed pixel data
    for (let dy = 0; dy < displayHeight; dy++) {
      for (let dx = 0; dx < displayWidth; dx++) {
        const srcX = Math.floor(dx / this.zoom);
        const srcY = Math.floor(dy / this.zoom);
        const srcIdx = (srcY * this.imageWidth + srcX) * 4;
        const dstIdx = (dy * displayWidth + dx) * 4;

        if (srcIdx >= 0 && srcIdx < this.pixels.length) {
          this.rasterBuffer[dstIdx] = this.pixels[srcIdx];
          this.rasterBuffer[dstIdx + 1] = this.pixels[srcIdx + 1];
          this.rasterBuffer[dstIdx + 2] = this.pixels[srcIdx + 2];
          this.rasterBuffer[dstIdx + 3] = this.pixels[srcIdx + 3];
        } else {
          // White for out of bounds
          this.rasterBuffer[dstIdx] = 255;
          this.rasterBuffer[dstIdx + 1] = 255;
          this.rasterBuffer[dstIdx + 2] = 255;
          this.rasterBuffer[dstIdx + 3] = 255;
        }
      }
    }

    await this.canvasRaster.setPixelBuffer(this.rasterBuffer);
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
export function createPixelEditorApp(a: App): PixelEditor {
  const editor = new PixelEditor(a);

  a.window({ title: 'Pixel Editor', width: 520, height: 320 }, (win: Window) => {
    win.setContent(async () => {
      await editor.buildUI(win);
    });
    win.show();
  });

  return editor;
}

// Export classes and types for testing
export { PixelEditor, Color, SelectionTool, SUPPORTED_FORMATS };
export type { Selection, ClipboardData, Layer, BlendMode, ImageFormat };

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Pixel Editor' }, async (a: App) => {
    // Pre-load file from command line if provided (before building UI)
    // This ensures the canvas is created with the correct dimensions
    let preloadedFile: string | null = null;
    if (process.argv.length > 2) {
      preloadedFile = process.argv[2];
    }

    const editor = new PixelEditor(a);

    // Load file before creating window to get correct dimensions
    if (preloadedFile) {
      try {
        await editor.loadFile(preloadedFile);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to load file from command line: ${errorMessage}`);
        // Continue with blank canvas - error will be handled in loadFile
      }
    }

    // Now create window with correct dimensions
    a.window({ title: 'Pixel Editor', width: 520, height: 320 }, async (win: Window) => {
      win.setContent(async () => {
        await editor.buildUI(win);
      });
      win.show();
    });
  });
}
