// @tsyne-app:name Image Viewer
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
// @tsyne-app:category graphics
// @tsyne-app:builder createImageViewerApp
// @tsyne-app:args app,filePath,windowWidth,windowHeight

/**
 * Image Viewer for Tsyne with REAL Image Editing
 *
 * Ported from https://github.com/Palexer/image-viewer
 * Original author: Palexer
 * License: MIT (see original repository)
 *
 * This version uses Jimp (JavaScript Image Processing) to provide
 * REAL image editing capabilities, replacing the original's GIFT library.
 *
 * Features:
 * - Real image loading from files
 * - Live brightness, contrast, saturation, and hue adjustments
 * - Zoom functionality with real image resizing
 * - Base64 image transfer to Fyne for display
 *
 * The original used GIFT (Go Image Filtering Toolkit), which is unmaintained.
 * We've replaced it with Jimp, a well-maintained pure JavaScript library.
 */

import { app, resolveTransport  } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Image as ImageWidget, Slider } from '../../core/src/widgets';
import { Jimp, type JimpInstance } from 'jimp';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Image metadata
 */
interface ImageInfo {
  path: string;
  width: number;
  height: number;
  size: number;
  lastModified: string;
}

/**
 * Image editing parameters
 */
interface EditParams {
  brightness: number;  // -100 to 100
  contrast: number;    // -100 to 100
  saturation: number;  // -100 to 100
  hue: number;        // -180 to 180
}

/**
 * Image viewer/editor with REAL Jimp processing
 * Based on: img.go and ui.go from Palexer/image-viewer
 */
export class ImageViewer {
  private currentImage: ImageInfo | null = null;
  private sourceImage: Awaited<ReturnType<typeof Jimp.read>> | null = null;  // Original unedited image
  private editParams: EditParams = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0
  };
  private zoomLevel: number = 1.0;  // 0.1 to 4.0 (10% to 400%)
  private editGen: number = 0;  // Generation counter for edit tracking

  // Widget references
  private imageDisplay: ImageWidget | null = null;
  private imageAreaLabel: any = null;
  private imageInfoLabels: any = {
    width: null,
    height: null,
    size: null,
    lastModified: null
  };
  private editSliders: {
    brightness: Slider | null;
    contrast: Slider | null;
    saturation: Slider | null;
    hue: Slider | null;
  } = {
    brightness: null,
    contrast: null,
    saturation: null,
    hue: null
  };
  private zoomStatus: any = null;

  /**
   * Load an image from file
   */
  async loadImage(imagePath: string): Promise<void> {
    try {
      // Load image with Jimp
      this.sourceImage = await Jimp.read(imagePath);

      // Get real metadata
      const stats = await fs.stat(imagePath);
      this.currentImage = {
        path: imagePath,
        width: this.sourceImage.bitmap.width,
        height: this.sourceImage.bitmap.height,
        size: stats.size,
        lastModified: stats.mtime.toLocaleString()
      };

      // Reset edit parameters
      this.editParams = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0
      };
      this.zoomLevel = 1.0;
      this.editGen++;

      // Update UI and apply edits
      await this.updateDisplay();
      await this.applyEditsAndDisplay();
    } catch (error) {
      // Ignore "bridge shutting down" errors - these are expected during test cleanup
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('Bridge') && errorMessage.includes('shutting down')) {
        return;
      }
      console.error('Failed to load image:', error);
      if (this.imageAreaLabel) {
        try {
          await this.imageAreaLabel.setText('Error loading image: ' + errorMessage);
        } catch (e) {
          // Ignore errors when setting error text (bridge may be shutting down)
        }
      }
    }
  }

  /**
   * Apply all edits and send to display
   * This is where the REAL image processing happens with Jimp!
   */
  private async applyEditsAndDisplay(): Promise<void> {
    try {
      // Always update zoom status (even without an image)
      if (this.zoomStatus) {
        await this.zoomStatus.setText(`Zoom: ${Math.round(this.zoomLevel * 100)}%`);
      }

      if (!this.sourceImage || !this.imageDisplay) return;
      // Clone the source image (don't modify original)
      let processedImage = this.sourceImage.clone();

      // Apply brightness adjustment
      if (this.editParams.brightness !== 0) {
        // Jimp brightness: -1 to +1
        processedImage.brightness(this.editParams.brightness / 100);
      }

      // Apply contrast adjustment
      if (this.editParams.contrast !== 0) {
        // Jimp contrast: -1 to +1
        processedImage.contrast(this.editParams.contrast / 100);
      }

      // Apply saturation adjustment
      if (this.editParams.saturation !== 0) {
        // Jimp requires separate saturate/desaturate for positive/negative values
        if (this.editParams.saturation > 0) {
          processedImage.color([{
            apply: 'saturate',
            params: [this.editParams.saturation]
          }]);
        } else {
          processedImage.color([{
            apply: 'desaturate',
            params: [-this.editParams.saturation]
          }]);
        }
      }

      // Apply hue rotation
      if (this.editParams.hue !== 0) {
        // Jimp hue modifier (degrees)
        processedImage.color([{
          apply: 'hue',
          params: [this.editParams.hue]
        }]);
      }

      // Apply zoom (resize)
      if (this.zoomLevel !== 1.0) {
        const newWidth = Math.floor(this.sourceImage.bitmap.width * this.zoomLevel);
        const newHeight = Math.floor(this.sourceImage.bitmap.height * this.zoomLevel);
        processedImage.resize({ w: newWidth, h: newHeight });
      }

      // Convert to base64 PNG for sending to Go bridge
      const base64 = await processedImage.getBase64('image/png');

      // Send to Fyne for display!
      await this.imageDisplay.updateImage(base64);
    } catch (error) {
      // Ignore "bridge shutting down" errors - these are expected during test cleanup
      const errorMessage = (error as Error).message || '';
      if (!errorMessage.includes('Bridge') || !errorMessage.includes('shutting down')) {
        console.error('Failed to process image:', error);
      }
    }
  }

  /**
   * Update information display
   */
  private async updateDisplay(): Promise<void> {
    try {
      // Update image info if available
      if (this.currentImage) {
        // Update image area label
        if (this.imageAreaLabel) {
          await this.imageAreaLabel.setText(`Viewing: ${path.basename(this.currentImage.path)}`);
        }

        // Update info labels
        if (this.imageInfoLabels.width) {
          await this.imageInfoLabels.width.setText(`Width: ${this.currentImage.width}px`);
        }
        if (this.imageInfoLabels.height) {
          await this.imageInfoLabels.height.setText(`Height: ${this.currentImage.height}px`);
        }
        if (this.imageInfoLabels.size) {
          const sizeKB = Math.round(this.currentImage.size / 1024);
          await this.imageInfoLabels.size.setText(`Size: ${sizeKB} KB`);
        }
        if (this.imageInfoLabels.lastModified) {
          await this.imageInfoLabels.lastModified.setText(`Last modified: ${this.currentImage.lastModified}`);
        }
      }

      // Always update edit sliders (even without an image loaded)
      if (this.editSliders.brightness) {
        await this.editSliders.brightness.setValue(this.editParams.brightness);
      }
      if (this.editSliders.contrast) {
        await this.editSliders.contrast.setValue(this.editParams.contrast);
      }
      if (this.editSliders.saturation) {
        await this.editSliders.saturation.setValue(this.editParams.saturation);
      }
      if (this.editSliders.hue) {
        await this.editSliders.hue.setValue(this.editParams.hue);
      }
    } catch (error) {
      // Ignore "bridge shutting down" errors - these are expected during test cleanup
      const errorMessage = (error as Error).message || '';
      if (!errorMessage.includes('Bridge') || !errorMessage.includes('shutting down')) {
        console.error('Failed to update display:', error);
      }
    }
  }

  /**
   * Adjust brightness and reprocess
   */
  setBrightness(value: number): void {
    this.editParams.brightness = Math.max(-100, Math.min(100, value));
    this.editGen++;
    this.applyEditsAndDisplay();
    this.updateDisplay();
  }

  /**
   * Adjust contrast and reprocess
   */
  setContrast(value: number): void {
    this.editParams.contrast = Math.max(-100, Math.min(100, value));
    this.editGen++;
    this.applyEditsAndDisplay();
    this.updateDisplay();
  }

  /**
   * Adjust saturation and reprocess
   */
  setSaturation(value: number): void {
    this.editParams.saturation = Math.max(-100, Math.min(100, value));
    this.editGen++;
    this.applyEditsAndDisplay();
    this.updateDisplay();
  }

  /**
   * Adjust hue and reprocess
   */
  setHue(value: number): void {
    this.editParams.hue = Math.max(-180, Math.min(180, value));
    this.editGen++;
    this.applyEditsAndDisplay();
    this.updateDisplay();
  }

  /**
   * Reset all edit parameters
   */
  resetEdits(): void {
    this.editParams = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0
    };
    this.editGen++;
    this.applyEditsAndDisplay();
    this.updateDisplay();
  }

  /**
   * Zoom in by 10%
   */
  zoomIn(): void {
    this.zoomLevel = Math.min(4.0, this.zoomLevel + 0.1);
    this.applyEditsAndDisplay();
  }

  /**
   * Zoom out by 10%
   */
  zoomOut(): void {
    this.zoomLevel = Math.max(0.1, this.zoomLevel - 0.1);
    this.applyEditsAndDisplay();
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom(): void {
    this.zoomLevel = 1.0;
    this.applyEditsAndDisplay();
  }

  /**
   * Register widget references
   */
  registerImageDisplay(widget: ImageWidget): void {
    this.imageDisplay = widget;
  }

  registerImageAreaLabel(widget: any): void {
    this.imageAreaLabel = widget;
  }

  registerImageInfoLabel(type: keyof typeof this.imageInfoLabels, widget: any): void {
    this.imageInfoLabels[type] = widget;
  }

  registerEditSlider(type: keyof typeof this.editSliders, slider: Slider): void {
    this.editSliders[type] = slider;
  }

  registerZoomStatus(widget: any): void {
    this.zoomStatus = widget;
  }
}

/**
 * Image Viewer UI
 * Based on: ui.go from Palexer/image-viewer
 */
class ImageViewerUI {
  private a: App;
  private viewer: ImageViewer;
  private win: Window;

  constructor(a: App, viewer: ImageViewer, win: Window) {
    this.a = a;
    this.viewer = viewer;
    this.win = win;
  }

  /**
   * Build the complete UI (called from createImageViewerApp)
   */
  buildUI(): void {
    // Set up the main menu (like the original Go version)
    this.buildMainMenu(this.win);

    this.a.border({
      center: () => {
        // HSplit: image area (70%) | side panel (30%)
        this.a.hsplit(
          () => this.buildImageArea(),
          () => this.buildSidePanel(),
          0.7
        );
      },
      bottom: () => {
        // Status bar with icon buttons (like the original Go version)
        this.buildStatusBar();
      }
    });
  }

  /**
   * Build main menu bar (File, Edit, View, Help)
   * Based on the original Go version's menu structure
   */
  private buildMainMenu(win: Window): void {
    win.setMainMenu([
      {
        label: 'File',
        items: [
          {
            label: 'Open',
            onSelected: () => this.openImage()
          },
          {
            label: 'Save As...',
            onSelected: () => this.saveImage(win)
          },
          { label: '', isSeparator: true },
          {
            label: 'Quit',
            onSelected: () => process.exit(0)
          }
        ]
      },
      {
        label: 'Edit',
        items: [
          {
            label: 'Reset Edits',
            onSelected: () => this.viewer.resetEdits()
          }
        ]
      },
      {
        label: 'View',
        items: [
          {
            label: 'Fullscreen',
            onSelected: () => win.setFullScreen(true)
          },
          {
            label: 'Exit Fullscreen',
            onSelected: () => win.setFullScreen(false)
          },
          { label: '', isSeparator: true },
          {
            label: 'Zoom In',
            onSelected: () => this.viewer.zoomIn()
          },
          {
            label: 'Zoom Out',
            onSelected: () => this.viewer.zoomOut()
          },
          {
            label: 'Reset Zoom',
            onSelected: () => this.viewer.resetZoom()
          }
        ]
      },
      {
        label: 'Help',
        items: [
          {
            label: 'About',
            onSelected: async () => {
              await win.showInfo(
                'About Image Viewer',
                'Image Viewer with Real Editing\n\nPorted from github.com/Palexer/image-viewer\nUsing Jimp for image processing'
              );
            }
          }
        ]
      }
    ]);
  }

  /**
   * Build status bar with icon buttons
   * Based on the original Go version's status bar
   */
  private buildStatusBar(): void {
    this.a.hbox(() => {
      // Open button for quick access
      this.a.button('Open').onClick(() => this.openImage()).withId('open-btn');

      // Spacer to push zoom controls to the right
      this.a.label('');

      // Zoom controls with unicode icons in buttons
      this.a.button('−').onClick(() => this.viewer.zoomOut()).withId('zoom-out-btn');

      const zoomLabel = this.a.label('Zoom: 100%').withId('zoom-status');
      this.viewer.registerZoomStatus(zoomLabel);

      this.a.button('+').onClick(() => this.viewer.zoomIn()).withId('zoom-in-btn');
      this.a.button('⟲').onClick(() => this.viewer.resetZoom()).withId('reset-zoom-btn');

      // Reset edits button
      this.a.button('Reset').onClick(() => this.viewer.resetEdits()).withId('reset-edits-btn');
    });
  }

  /**
   * Save image to file
   */
  private async saveImage(win: Window): Promise<void> {
    const filePath = await win.showFileSave('edited-image.png');
    if (filePath) {
      // TODO: Implement actual save functionality
      await win.showInfo('Save', `Would save to: ${filePath}`);
    }
  }

  /**
   * Build image display area
   */
  private buildImageArea(): void {
    // Use border layout so scroll gets all available space
    this.a.border({
      center: () => {
        // Scrollable container for zoomed images
        this.a.scroll(() => {
          // Image display - use original mode so zoom actually changes visible size
          const sampleImagePath = path.join(__dirname, 'sample-image.png');
          const imageWidget = this.a.image(sampleImagePath, 'original');
          this.viewer.registerImageDisplay(imageWidget);
        });
      },
      bottom: () => {
        // Label showing current image filename
        const label = this.a.label('No image loaded');
        this.viewer.registerImageAreaLabel(label);
      }
    });
  }

  /**
   * Build side panel with tabs
   */
  private buildSidePanel(): void {
    this.a.tabs([
      { title: 'Information', builder: () => this.buildInfoTab() },
      { title: 'Editor', builder: () => this.buildEditorTab() }
    ]);
  }

  /**
   * Build information tab
   */
  private buildInfoTab(): void {
    this.a.vbox(() => {
      this.a.label('Image Information:');
      this.a.separator();

      const widthLabel = this.a.label('Width: -').withId('info-width');
      this.viewer.registerImageInfoLabel('width', widthLabel);

      const heightLabel = this.a.label('Height: -').withId('info-height');
      this.viewer.registerImageInfoLabel('height', heightLabel);

      const sizeLabel = this.a.label('Size: -').withId('info-size');
      this.viewer.registerImageInfoLabel('size', sizeLabel);

      const modifiedLabel = this.a.label('Last modified: -').withId('info-modified');
      this.viewer.registerImageInfoLabel('lastModified', modifiedLabel);
    });
  }

  /**
   * Build editor tab
   */
  private buildEditorTab(): void {
    this.a.vbox(() => {
      this.a.label('Editing Controls:');
      this.a.separator();
      this.a.label('General:');
      this.a.separator();

      // Brightness control
      this.buildEditControl('brightness', 'Brightness', (v: number) => this.viewer.setBrightness(v));

      // Contrast control
      this.buildEditControl('contrast', 'Contrast', (v: number) => this.viewer.setContrast(v));

      // Saturation control
      this.buildEditControl('saturation', 'Saturation', (v: number) => this.viewer.setSaturation(v));

      // Hue control
      this.buildEditControl('hue', 'Hue', (v: number) => this.viewer.setHue(v));
    });
  }

  /**
   * Build an edit control with a slider
   */
  private buildEditControl(
    type: 'brightness' | 'contrast' | 'saturation' | 'hue',
    labelText: string,
    setter: (value: number) => void
  ): void {
    // Hue has a different range than the others
    const min = type === 'hue' ? -180 : -100;
    const max = type === 'hue' ? 180 : 100;

    this.a.vbox(() => {
      this.a.label(labelText);

      const slider = this.a.slider(min, max, 0, (value: number) => {
        setter(value);
      }).withId(`edit-${type}`);

      this.viewer.registerEditSlider(type, slider);
    });
  }

  /**
   * Open image using file picker dialog
   */
  private async openImage(): Promise<void> {
    const filePath = await this.win.showFileOpen();
    if (filePath) {
      await this.viewer.loadImage(filePath);
    }
  }
}

/**
 * Create and run the image viewer application
 * Based on: main.go
 * Returns the viewer instance for programmatic control (useful for testing)
 */
export function createImageViewerApp(a: App, filePath?: string, windowWidth?: number, windowHeight?: number): ImageViewer {
  const viewer = new ImageViewer();
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  if (isEmbedded) {
    const ui = new ImageViewerUI(a, viewer, null as any);
    ui.buildUI();

    if (filePath) {
      viewer.loadImage(filePath).catch(err => {
        console.error('Failed to load image:', err);
      });
    }
  } else {
    a.window({ title: 'Image Viewer with Real Editing (Jimp)', width: 1200 }, (win: Window) => {
      const ui = new ImageViewerUI(a, viewer, win);
      win.setContent(() => {
        ui.buildUI();
      });
      win.show();

      if (filePath) {
        viewer.loadImage(filePath).catch(err => {
          console.error('Failed to load image:', err);
        });
      }
    });
  }

  return viewer;
}

/**
 * Main application entry point
 */
if (require.main === module) {
  app(resolveTransport(), { title: 'Image Viewer' }, (a: App) => {
    createImageViewerApp(a);
  });
}
