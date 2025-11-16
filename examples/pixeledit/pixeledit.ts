/**
 * Pixel Editor for Tsyne
 *
 * Ported from https://github.com/fyne-io/pixeledit
 * Original authors: Fyne.io contributors
 * License: See original repository
 *
 * This is a simplified port to demonstrate pixel editing capabilities in Tsyne.
 * The original implementation uses Fyne's custom raster widgets for pixel-level
 * manipulation. This version adapts the concepts to work with Tsyne's architecture.
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';

/**
 * Tool interface - defines the contract for editing tools
 * Based on: internal/api/tool.go
 */
interface Tool {
  name: string;
  icon?: string;
  clicked(x: number, y: number): void;
}

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
      const hex = n.toString(16);
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
}

/**
 * Pencil tool - draws pixels with the current foreground color
 * Based on: internal/tool/pencil.go
 */
class PencilTool implements Tool {
  name = 'Pencil';
  icon = 'Pencil';

  constructor(private editor: PixelEditor) {}

  clicked(x: number, y: number): void {
    this.editor.setPixelColor(x, y, this.editor.fgColor);
    console.log(`Pencil: Drew at (${x}, ${y}) with color ${this.editor.fgColor.toHex()}`);
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
    console.log(`Picker: Sampled color ${color.toHex()} from (${x}, ${y})`);
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
  private zoom: number = 1;
  private imageWidth: number = 32;
  private imageHeight: number = 32;
  private pixels: Uint8ClampedArray | null = null; // RGBA pixel data
  private currentFile: string | null = null;
  private statusLabel: any = null; // Will hold reference to label widget
  private zoomLabel: any = null;
  private colorLabel: any = null;

  constructor(private a: App) {
    // Initialize tools
    this.tools = [
      new PencilTool(this),
      new PickerTool(this)
    ];
    this.currentTool = this.tools[0]; // Default to pencil
  }

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
  setPixelColor(x: number, y: number, color: Color): void {
    if (!this.pixels) return;

    const index = (y * this.imageWidth + x) * 4;
    if (index < 0 || index >= this.pixels.length) return;

    this.pixels[index] = color.r;
    this.pixels[index + 1] = color.g;
    this.pixels[index + 2] = color.b;
    this.pixels[index + 3] = color.a;

    // TODO: Refresh canvas display
    this.updateStatus();
  }

  /**
   * Set foreground color
   * Based on: editor.go SetFGColor()
   */
  async setFGColor(color: Color): Promise<void> {
    this.fgColor = color;
    console.log(`Foreground color set to ${color.toHex()}`);
    if (this.colorLabel) {
      await this.colorLabel.setText(`Color: ${color.toHex()}`);
    }
  }

  /**
   * Set active tool
   * Based on: editor.go setTool()
   */
  setTool(tool: Tool): void {
    this.currentTool = tool;
    console.log(`Switched to ${tool.name} tool`);
  }

  /**
   * Set zoom level (1-16)
   * Based on: editor.go setZoom()
   */
  async setZoom(level: number): Promise<void> {
    this.zoom = Math.max(1, Math.min(16, level));
    console.log(`Zoom set to ${this.zoom}x`);
    if (this.zoomLabel) {
      await this.zoomLabel.setText(`Zoom: ${this.zoom}x`);
    }
  }

  /**
   * Load image from file
   * Based on: editor.go LoadFile()
   */
  async loadFile(filepath: string): Promise<void> {
    console.log(`Loading file: ${filepath}`);
    this.currentFile = filepath;
    // TODO: Implement actual file loading
    // For now, create a blank 32x32 image
    this.createBlankImage(32, 32);
    this.updateStatus();
  }

  /**
   * Create a blank image
   */
  private createBlankImage(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;
    // Create a white image
    const size = width * height * 4;
    this.pixels = new Uint8ClampedArray(size);
    // Fill with white (255, 255, 255, 255)
    for (let i = 0; i < size; i += 4) {
      this.pixels[i] = 255;     // R
      this.pixels[i + 1] = 255; // G
      this.pixels[i + 2] = 255; // B
      this.pixels[i + 3] = 255; // A
    }
  }

  /**
   * Save current image
   * Based on: editor.go Save()
   */
  async save(): Promise<void> {
    if (!this.currentFile) {
      console.log('No file to save');
      return;
    }
    console.log(`Saving to ${this.currentFile}`);
    // TODO: Implement actual file saving
  }

  /**
   * Save image to new file
   * Based on: editor.go SaveAs()
   */
  async saveAs(filepath: string): Promise<void> {
    this.currentFile = filepath;
    await this.save();
  }

  /**
   * Reload original image
   * Based on: editor.go Reload()
   */
  async reload(): Promise<void> {
    if (!this.currentFile) return;
    await this.loadFile(this.currentFile);
  }

  /**
   * Update status bar
   */
  private async updateStatus(): Promise<void> {
    if (this.statusLabel && this.pixels) {
      const msg = this.currentFile
        ? `${this.currentFile} (${this.imageWidth}x${this.imageHeight})`
        : `New Image (${this.imageWidth}x${this.imageHeight})`;
      await this.statusLabel.setText(msg);
    }
  }

  /**
   * Build the UI
   * Based on: ui/main.go BuildUI()
   */
  buildUI(win: Window): void {
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
      this.a.label('Tools:');

      for (const tool of this.tools) {
        this.a.button(tool.name, () => {
          this.setTool(tool);
        });
      }

      this.a.separator();

      // Zoom controls
      this.zoomLabel = this.a.label(`Zoom: ${this.zoom}x`);
      this.a.button('Zoom In', () => {
        this.setZoom(this.zoom + 1);
      });
      this.a.button('Zoom Out', () => {
        this.setZoom(this.zoom - 1);
      });

      this.a.separator();

      // Color preview
      this.a.label('Foreground:');
      this.colorLabel = this.a.label(this.fgColor.toHex());
    });
  }

  /**
   * Build main canvas area
   * Based on: ui/editor.go and ui/raster.go
   */
  private buildCanvas(): void {
    this.a.scroll(() => {
      this.a.center(() => {
        this.a.vbox(() => {
          this.a.label('Pixel canvas will be rendered here');
          this.a.label('(Custom raster widget needed for full functionality)');
          // TODO: Implement custom raster widget or use Image with click handling
        });
      });
    });
  }

  /**
   * Build status bar
   * Based on: ui/status.go
   */
  private buildStatusBar(): void {
    this.statusLabel = this.a.label('Ready');
  }

  /**
   * File operations
   * Based on: ui/main.go file handlers
   */
  private async fileOpen(): Promise<void> {
    console.log('File open dialog');
    // TODO: Integrate with file dialog when available
    await this.loadFile('untitled.png');
  }

  private async fileReset(): Promise<void> {
    console.log('Reset to original');
    await this.reload();
  }
}

/**
 * Create the pixel editor app
 * Based on: main.go
 */
export function createPixelEditorApp(a: App): PixelEditor {
  const editor = new PixelEditor(a);

  a.window({ title: 'Pixel Editor', width: 520, height: 320 }, (win: Window) => {
    win.setContent(() => {
      editor.buildUI(win);
    });
    win.show();
  });

  return editor;
}

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Pixel Editor' }, (a: App) => {
    createPixelEditorApp(a);
  });
}
