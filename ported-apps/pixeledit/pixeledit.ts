/**
 * Pixel Editor for Tsyne
 *
 * Ported from https://github.com/fyne-io/pixeledit
 * Original authors: Fyne.io contributors
 * License: See original repository
 *
 * This port demonstrates pixel editing capabilities in Tsyne, including:
 * - Main menu with File operations
 * - File dialogs for Open/Save
 * - Recent files history (stored in preferences)
 * - Color picker for foreground color selection
 * - Power-of-2 zoom (100%, 200%, 400%, etc.)
 * - FG color preview rectangle
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
import type { CanvasRectangle } from '../../src/widgets/canvas';

// Constants
const MAX_RECENT_FILES = 5;
const RECENT_COUNT_KEY = 'pixeledit_recentCount';
const RECENT_FORMAT_KEY = 'pixeledit_recent_';

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
  private zoom: number = 1; // Power of 2: 1, 2, 4, 8, 16
  private imageWidth: number = 32;
  private imageHeight: number = 32;
  private pixels: Uint8ClampedArray | null = null; // RGBA pixel data
  private currentFile: string | null = null;
  private statusLabel: any = null;
  private zoomLabel: any = null;
  private colorLabel: any = null;
  private fgPreview: CanvasRectangle | null = null;
  private win: Window | null = null;
  private recentFiles: string[] = [];

  constructor(private a: App) {
    // Initialize tools
    this.tools = [
      new PencilTool(this),
      new PickerTool(this)
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
   * Set active tool
   * Based on: editor.go setTool()
   */
  setTool(tool: Tool): void {
    this.currentTool = tool;
    console.log(`Switched to ${tool.name} tool`);
  }

  /**
   * Set zoom level (power of 2: 1, 2, 4, 8, 16)
   * Based on: editor.go setZoom() - uses power of 2 zoom like original
   */
  async setZoom(level: number): Promise<void> {
    this.zoom = Math.max(1, Math.min(16, level));
    console.log(`Zoom set to ${this.zoom * 100}%`);
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
    console.log(`Loading file: ${filepath}`);
    this.currentFile = filepath;
    await this.addToRecentFiles(filepath);
    // TODO: Implement actual image loading via bridge
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
      await this.saveAs();
      return;
    }
    console.log(`Saving to ${this.currentFile}`);
    // TODO: Implement actual file saving via bridge
    if (this.win) {
      await this.win.showInfo('Save', `Image saved to ${this.currentFile}`);
    }
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
    if (!this.currentFile) {
      this.createBlankImage(32, 32);
      this.updateStatus();
      return;
    }
    await this.loadFile(this.currentFile);
  }

  /**
   * Update status bar
   */
  private async updateStatus(): Promise<void> {
    if (this.statusLabel && this.pixels) {
      const filename = this.currentFile ? this.currentFile.split('/').pop() : 'New Image';
      const msg = `File: ${filename} | Width: ${this.imageWidth} | Height: ${this.imageHeight}`;
      await this.statusLabel.setText(msg);
    }
  }

  /**
   * Build main menu
   * Based on: ui/main.go buildMainMenu()
   * Note: Tsyne's menu API uses onSelected (not onClick) and doesn't support nested submenus
   */
  private updateMainMenu(): void {
    if (!this.win) return;

    // Build menu items - flatten recent files into main menu since nested menus not supported
    const menuItems: Array<{label: string; onSelected?: () => void; isSeparator?: boolean}> = [
      { label: 'Open ...', onSelected: () => this.fileOpen() },
      { label: 'isSeparator', isSeparator: true },
    ];

    // Add recent files directly to menu
    if (this.recentFiles.length > 0) {
      for (const filepath of this.recentFiles.slice(0, 3)) { // Show up to 3 recent
        const filename = filepath.split('/').pop() || filepath;
        menuItems.push({ label: `Recent: ${filename}`, onSelected: () => this.loadFile(filepath) });
      }
      menuItems.push({ label: 'isSeparator', isSeparator: true });
    }

    menuItems.push({ label: 'Reset ...', onSelected: () => this.fileReset() });
    menuItems.push({ label: 'Save', onSelected: () => this.save() });
    menuItems.push({ label: 'Save As ...', onSelected: () => this.saveAs() });

    this.win.setMainMenu([
      {
        label: 'File',
        items: menuItems
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

      for (const tool of this.tools) {
        this.a.button(tool.name, () => {
          this.setTool(tool);
        });
      }

      this.a.separator();

      // Zoom controls (power of 2, shown as percentage)
      this.a.hbox(() => {
        this.a.button('-', () => this.zoomOut());
        this.zoomLabel = this.a.label(`${this.zoom * 100}%`);
        this.a.button('+', () => this.zoomIn());
      });

      this.a.separator();

      // Color preview with clickable color picker
      // Based on: editor.go fgPreview = canvas.NewRectangle(fgCol)
      this.fgPreview = this.a.canvasRectangle({
        width: 32,
        height: 32,
        fillColor: this.fgColor.toHex(),
        strokeColor: '#000000',
        strokeWidth: 1
      });

      this.colorLabel = this.a.label(this.fgColor.toHex());

      this.a.button('Pick Color', () => this.pickFGColor());
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
          this.a.label('(Interactive raster widget needed for full functionality)');
          // TODO: Implement interactive raster with click-to-pixel conversion
        });
      });
    });
  }

  /**
   * Build status bar
   * Based on: ui/status.go
   */
  private buildStatusBar(): void {
    this.statusLabel = this.a.label('Open a file');
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

  a.window({ title: 'Pixel Editor', width: 520, height: 320 }, async (win: Window) => {
    win.setContent(async () => {
      await editor.buildUI(win);
    });
    win.show();
  });

  return editor;
}

// Export PixelEditor class for testing
export { PixelEditor };

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Pixel Editor' }, (a: App) => {
    createPixelEditorApp(a);
  });
}
