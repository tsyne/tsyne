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
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
import type { CanvasRectangle } from '../../src/widgets/canvas';
import { TappableCanvasRaster } from '../../src/widgets/canvas';
import * as fs from 'fs';
import * as path from 'path';

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
    console.error(`Pencil: Drew at (${x}, ${y}) with color ${this.editor.fgColor.toHex()}`);
  }
}

/**
 * Color picker tool - samples color from the canvas
 * Based on: internal/tool/picker.go
 */
class PickerTool implements Tool {
  name = 'Picker';
  icon = 'Picker';

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    const color = this.editor.getPixelColor(x, y);
    await this.editor.setFGColor(color);
    console.error(`Picker: Sampled color ${color.toHex()} from (${x}, ${y})`);
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
    console.error(`Eraser: Erased pixel at (${x}, ${y}) with BG color ${this.editor.bgColor.toHex()}`);
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
      console.error(`Bucket: Target and fill colors are same, skipping fill`);
      return;
    }

    console.error(`Bucket: Filling from (${x}, ${y}) with ${fillColor.toHex()}`);
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
      const {x, y} = queue.shift()!;
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
    console.error(`Bucket: Filling ${pixelsToUpdate.length} pixels`);
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
      console.error(`Line: Started at (${x}, ${y})`);
    } else {
      // Second click - draw line to end point
      if (this.startX !== null && this.startY !== null) {
        await this.drawLine(this.startX, this.startY, x, y);
        console.error(`Line: Drew from (${this.startX}, ${this.startY}) to (${x}, ${y})`);
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

/**
 * Rectangle tool - draws rectangles (filled or outline)
 */
class RectangleTool implements Tool {
  name = 'Rectangle';
  icon = 'Rectangle';
  private startX: number | null = null;
  private startY: number | null = null;
  private isDrawing = false;
  public filled = false; // Can be toggled via UI

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    if (!this.isDrawing) {
      // First click - set start corner
      this.startX = x;
      this.startY = y;
      this.isDrawing = true;
      console.error(`Rectangle: Started at (${x}, ${y})`);
    } else {
      // Second click - draw rectangle to end corner
      if (this.startX !== null && this.startY !== null) {
        await this.drawRectangle(this.startX, this.startY, x, y);
        console.error(`Rectangle: Drew from (${this.startX}, ${this.startY}) to (${x}, ${y})`);
      }
      // Reset state
      this.startX = null;
      this.startY = null;
      this.isDrawing = false;
    }
  }

  /**
   * Draw a rectangle from (x0, y0) to (x1, y1)
   */
  private async drawRectangle(x0: number, y0: number, x1: number, y1: number): Promise<void> {
    const color = this.editor.fgColor;
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    if (this.filled) {
      // Filled rectangle
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          await this.editor.setPixelColor(x, y, color);
        }
      }
    } else {
      // Outline only
      // Top and bottom edges
      for (let x = minX; x <= maxX; x++) {
        await this.editor.setPixelColor(x, minY, color);
        await this.editor.setPixelColor(x, maxY, color);
      }
      // Left and right edges (excluding corners already drawn)
      for (let y = minY + 1; y < maxY; y++) {
        await this.editor.setPixelColor(minX, y, color);
        await this.editor.setPixelColor(maxX, y, color);
      }
    }
  }
}

/**
 * Circle tool - draws circles (filled or outline)
 * Uses midpoint circle algorithm
 */
class CircleTool implements Tool {
  name = 'Circle';
  icon = 'Circle';
  private centerX: number | null = null;
  private centerY: number | null = null;
  private isDrawing = false;
  public filled = false;

  constructor(private editor: PixelEditor) {}

  async clicked(x: number, y: number): Promise<void> {
    if (!this.isDrawing) {
      // First click - set center
      this.centerX = x;
      this.centerY = y;
      this.isDrawing = true;
      console.error(`Circle: Center at (${x}, ${y})`);
    } else {
      // Second click - draw circle with radius to this point
      if (this.centerX !== null && this.centerY !== null) {
        const radius = Math.round(Math.sqrt(
          Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2)
        ));
        await this.drawCircle(this.centerX, this.centerY, radius);
        console.error(`Circle: Drew circle at (${this.centerX}, ${this.centerY}) with radius ${radius}`);
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
    const color = this.editor.fgColor;

    if (radius === 0) {
      await this.editor.setPixelColor(cx, cy, color);
      return;
    }

    if (this.filled) {
      // Filled circle using scanline approach
      for (let y = -radius; y <= radius; y++) {
        const halfWidth = Math.round(Math.sqrt(radius * radius - y * y));
        for (let x = -halfWidth; x <= halfWidth; x++) {
          await this.editor.setPixelColor(cx + x, cy + y, color);
        }
      }
    } else {
      // Outline using midpoint circle algorithm
      let x = radius;
      let y = 0;
      let err = 0;

      while (x >= y) {
        // Draw 8 octants
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
      console.error(`Select: Started at (${x}, ${y})`);
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
        console.error(`Select: Created selection ${selection.width}x${selection.height} at (${selection.x}, ${selection.y})`);
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
  private currentTool: Tool;
  private tools: Tool[] = [];
  private zoom: number = 1; // Power of 2: 1, 2, 4, 8, 16
  private imageWidth: number = 32;
  private imageHeight: number = 32;
  private pixels: Uint8ClampedArray | null = null; // RGBA pixel data
  private originalPixels: Uint8ClampedArray | null = null; // For reload
  private currentFile: string | null = null;
  private hasUnsavedChanges: boolean = false;
  private statusLabel: any = null;
  private zoomLabel: any = null;
  private colorLabel: any = null;
  private bgColorLabel: any = null;
  private toolLabel: any = null;
  private coordLabel: any = null;
  private selectionLabel: any = null;
  private layerLabel: any = null;
  private fgPreview: CanvasRectangle | null = null;
  private bgPreview: CanvasRectangle | null = null;
  private canvasRaster: TappableCanvasRaster | null = null; // Interactive raster canvas
  private win: Window | null = null;
  private recentFiles: string[] = [];
  private toolButtons: Map<string, any> = new Map(); // Track tool buttons for highlighting

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

  constructor(private a: App) {
    // Initialize tools
    this.tools = [
      new PencilTool(this),
      new PickerTool(this),
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

    console.error(`Undo: ${operation.description}`);

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

    console.error(`Redo: ${operation.description}`);

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
    console.error('Selection cleared');
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
    console.error(`Selected all: ${this.imageWidth}x${this.imageHeight}`);
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
  async copy(): Promise<void> {
    if (!this.selection || !this.pixels) {
      console.error('Copy: No selection or no image');
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

    console.error(`Copied ${width}x${height} pixels to clipboard`);
  }

  /**
   * Cut selected region to clipboard (copy + clear to background)
   */
  async cut(): Promise<void> {
    if (!this.selection || !this.pixels) {
      console.error('Cut: No selection or no image');
      return;
    }

    // First copy
    await this.copy();

    // Then clear the selection to background color
    this.beginOperation();
    const { x, y, width, height } = this.selection;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        await this.setPixelColor(x + px, y + py, this.bgColor);
      }
    }
    this.endOperation('Cut selection');

    console.error(`Cut ${width}x${height} pixels`);
  }

  /**
   * Paste clipboard at specified position (or selection start)
   */
  async paste(destX?: number, destY?: number): Promise<void> {
    if (!this.clipboard || !this.pixels) {
      console.error('Paste: No clipboard data or no image');
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
    console.error(`Pasted ${this.clipboard.width}x${this.clipboard.height} pixels at (${px}, ${py})`);
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
  removeLayer(index: number): void {
    if (this.layers.length <= 1) {
      console.error('Cannot remove the last layer');
      return;
    }

    if (index < 0 || index >= this.layers.length) {
      console.error('Invalid layer index');
      return;
    }

    const removedLayer = this.layers.splice(index, 1)[0];
    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1;
    }

    this.flattenToPixels();
    this.updateLayerDisplay();
    console.error(`Removed layer: ${removedLayer.name}`);
  }

  /**
   * Set active layer by index
   */
  setActiveLayer(index: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.activeLayerIndex = index;
      this.updateLayerDisplay();
      console.error(`Active layer: ${this.layers[index].name}`);
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
      console.error(`Layer ${this.layers[index].name} visibility: ${this.layers[index].visible}`);
    }
  }

  /**
   * Set layer opacity (0-255)
   */
  setLayerOpacity(index: number, opacity: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].opacity = Math.max(0, Math.min(255, opacity));
      this.flattenToPixels();
      console.error(`Layer ${this.layers[index].name} opacity: ${this.layers[index].opacity}`);
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
  mergeLayerDown(index: number): void {
    if (index <= 0 || index >= this.layers.length) {
      console.error('Cannot merge: no layer below');
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
    console.error(`Foreground color set to ${color.toHex()}`);
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
    console.error(`Background color set to ${color.toHex()}`);
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
    if (previousTool && this.toolButtons.has(previousTool.name)) {
      const prevBtn = this.toolButtons.get(previousTool.name);
      if (prevBtn?.setText) {
        await prevBtn.setText(previousTool.name);
      }
    }

    // Add highlight to new tool button
    if (this.toolButtons.has(tool.name)) {
      const newBtn = this.toolButtons.get(tool.name);
      if (newBtn?.setText) {
        await newBtn.setText(`▶ ${tool.name}`);
      }
    }

    console.error(`Switched to ${tool.name} tool`);
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
   */
  async loadFile(filepath: string): Promise<void> {
    console.error(`Loading file: ${filepath}`);

    try {
      // Try to load actual image using jimp
      const Jimp = await import('jimp');
      const image = await Jimp.Jimp.read(filepath);

      this.imageWidth = image.width;
      this.imageHeight = image.height;
      const size = this.imageWidth * this.imageHeight * 4;
      this.pixels = new Uint8ClampedArray(size);

      // Copy pixel data from jimp image
      for (let y = 0; y < this.imageHeight; y++) {
        for (let x = 0; x < this.imageWidth; x++) {
          const color = image.getPixelColor(x, y);
          const index = (y * this.imageWidth + x) * 4;
          // Jimp stores as RGBA
          this.pixels[index] = (color >> 24) & 0xFF;     // R
          this.pixels[index + 1] = (color >> 16) & 0xFF; // G
          this.pixels[index + 2] = (color >> 8) & 0xFF;  // B
          this.pixels[index + 3] = color & 0xFF;         // A
        }
      }

      // Store original for reload
      this.originalPixels = new Uint8ClampedArray(this.pixels);
      this.currentFile = filepath;
      this.hasUnsavedChanges = false;

      // Clear undo/redo history
      this.undoStack = [];
      this.redoStack = [];

      await this.addToRecentFiles(filepath);
      console.error(`Loaded image: ${this.imageWidth}x${this.imageHeight}`);
    } catch (error) {
      console.error(`Failed to load image: ${error}`);
      // Fallback to blank image
      this.createBlankImage(32, 32);
      this.currentFile = filepath;
    }

    this.updateStatus();
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

    if (result && result.submitted) {
      const width = parseInt(result.values.width as string, 10) || 32;
      const height = parseInt(result.values.height as string, 10) || 32;

      // Limit to reasonable dimensions
      const finalWidth = Math.max(1, Math.min(1024, width));
      const finalHeight = Math.max(1, Math.min(1024, height));

      this.createBlankImage(finalWidth, finalHeight);
      this.currentFile = null;
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
      console.error(`Failed to save image: ${error}`);
      if (this.win) {
        await this.win.showError('Save Error', `Failed to save image: ${error}`);
      }
    }
  }

  /**
   * Save image to a specific file path using jimp
   */
  private async saveToFile(filepath: string): Promise<void> {
    if (!this.pixels) {
      throw new Error('No image data to save');
    }

    const Jimp = await import('jimp');

    // Create a new jimp image
    const image = new Jimp.Jimp({ width: this.imageWidth, height: this.imageHeight });

    // Copy pixel data
    for (let y = 0; y < this.imageHeight; y++) {
      for (let x = 0; x < this.imageWidth; x++) {
        const index = (y * this.imageWidth + x) * 4;
        const r = this.pixels[index];
        const g = this.pixels[index + 1];
        const b = this.pixels[index + 2];
        const a = this.pixels[index + 3];

        // Jimp stores as RGBA packed into 32-bit int
        const color = ((r & 0xFF) << 24) | ((g & 0xFF) << 16) | ((b & 0xFF) << 8) | (a & 0xFF);
        image.setPixelColor(color, x, y);
      }
    }

    // Ensure the file has .png extension
    const finalPath = filepath.endsWith('.png') ? filepath : `${filepath}.png`;
    await image.write(finalPath as `${string}.${string}`);
    console.error(`Saved image to ${finalPath}`);
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
      const msg = `${filename}${unsaved} | ${this.imageWidth}x${this.imageHeight} | ${this.zoom * 100}%`;
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
   * Build palette with tools and zoom controls
   * Based on: ui/palette.go newPalette()
   */
  private buildPalette(): void {
    this.a.vbox(() => {
      // Tool selection
      this.a.label('Tools');

      // Create tool buttons with highlighting support
      // Based on: palette.go - uses HighImportance for selected tool
      for (const tool of this.tools) {
        const isSelected = tool === this.currentTool;
        const buttonLabel = isSelected ? `▶ ${tool.name}` : tool.name;
        const btn = this.a.button(buttonLabel, () => {
          this.setTool(tool);
        });
        this.toolButtons.set(tool.name, btn);
      }

      this.a.separator();

      // Zoom controls (power of 2, shown as percentage)
      this.a.hbox(() => {
        this.a.button('-', () => this.zoomOut());
        this.zoomLabel = this.a.label(`${this.zoom * 100}%`);
        this.a.button('+', () => this.zoomIn());
      });

      this.a.separator();

      // Foreground color preview with clickable color picker
      this.a.label('FG Color');
      this.fgPreview = this.a.canvasRectangle({
        width: 32,
        height: 32,
        fillColor: this.fgColor.toHex(),
        strokeColor: '#000000',
        strokeWidth: 1
      });
      this.colorLabel = this.a.label(this.fgColor.toHex());
      this.a.button('Pick FG', () => this.pickFGColor());

      this.a.separator();

      // Background color preview with clickable color picker
      this.a.label('BG Color');
      this.bgPreview = this.a.canvasRectangle({
        width: 32,
        height: 32,
        fillColor: this.bgColor.toHex(),
        strokeColor: '#000000',
        strokeWidth: 1
      });
      this.bgColorLabel = this.a.label(this.bgColor.toHex());
      this.a.button('Pick BG', () => this.pickBGColor());

      this.a.separator();

      // Swap colors button
      this.a.button('Swap FG/BG', () => this.swapColors());
    });
  }

  /**
   * Build main canvas area
   * Based on: ui/editor.go and ui/raster.go
   */
  private buildCanvas(): void {
    this.a.scroll(() => {
      this.a.center(() => {
        // Create a CanvasRaster widget to display the pixel image
        // The raster will be scaled by the zoom factor
        const zoomedWidth = this.imageWidth * this.zoom;
        const zoomedHeight = this.imageHeight * this.zoom;

        // Create the raster with initial pixel data
        // Each pixel in the original image becomes zoom×zoom pixels in the raster
        const pixelArray: Array<[number, number, number, number]> = [];
        for (let y = 0; y < zoomedHeight; y++) {
          for (let x = 0; x < zoomedWidth; x++) {
            const pixX = Math.floor(x / this.zoom);
            const pixY = Math.floor(y / this.zoom);
            const idx = (pixY * this.imageWidth + pixX) * 4;
            if (this.pixels && idx >= 0 && idx < this.pixels.length) {
              pixelArray.push([
                this.pixels[idx],
                this.pixels[idx + 1],
                this.pixels[idx + 2],
                this.pixels[idx + 3]
              ]);
            } else {
              pixelArray.push([255, 255, 255, 255]); // White for out of bounds
            }
          }
        }

        // Create tappable raster with tap handler
        this.canvasRaster = new TappableCanvasRaster(
          this.a.getContext(),
          zoomedWidth,
          zoomedHeight,
          pixelArray,
          async (screenX: number, screenY: number) => {
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
        );
      });
    });
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
export { PixelEditor, Color, SelectionTool };
export type { Selection, ClipboardData, Layer, BlendMode };

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
        console.error(`Loaded file from command line: ${preloadedFile}`);
      } catch (error) {
        console.error(`Failed to load file from command line: ${error}`);
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
