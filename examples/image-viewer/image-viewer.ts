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

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
import type { Image as ImageWidget } from '../../src/widgets';
import { Jimp } from 'jimp';
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
class ImageViewer {
  private currentImage: ImageInfo | null = null;
  private sourceImage: Jimp | null = null;  // Original unedited image
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
  private editSliders: any = {
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
      console.error('Failed to load image:', error);
      if (this.imageAreaLabel) {
        await this.imageAreaLabel.setText('Error loading image: ' + (error as Error).message);
      }
    }
  }

  /**
   * Apply all edits and send to display
   * This is where the REAL image processing happens with Jimp!
   */
  private async applyEditsAndDisplay(): Promise<void> {
    if (!this.sourceImage || !this.imageDisplay) return;

    try {
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
        // Jimp saturation modifier
        processedImage.color([{
          apply: 'saturate',
          params: [this.editParams.saturation]
        }]);
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

      // Update zoom status
      if (this.zoomStatus) {
        await this.zoomStatus.setText(`Zoom: ${Math.round(this.zoomLevel * 100)}%`);
      }
    } catch (error) {
      console.error('Failed to process image:', error);
    }
  }

  /**
   * Update information display
   */
  private async updateDisplay(): Promise<void> {
    if (!this.currentImage) return;

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

    // Update edit sliders
    if (this.editSliders.brightness) {
      await this.editSliders.brightness.setText(`Brightness: ${this.editParams.brightness}`);
    }
    if (this.editSliders.contrast) {
      await this.editSliders.contrast.setText(`Contrast: ${this.editParams.contrast}`);
    }
    if (this.editSliders.saturation) {
      await this.editSliders.saturation.setText(`Saturation: ${this.editParams.saturation}`);
    }
    if (this.editSliders.hue) {
      await this.editSliders.hue.setText(`Hue: ${this.editParams.hue}`);
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

  registerEditSlider(type: keyof typeof this.editSliders, widget: any): void {
    this.editSliders[type] = widget;
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

  constructor(a: App, viewer: ImageViewer) {
    this.a = a;
    this.viewer = viewer;
  }

  /**
   * Build the complete UI
   */
  build(): void {
    // HSplit: image area (70%) | side panel (30%)
    this.a.hsplit(
      () => this.buildImageArea(),
      () => this.buildSidePanel(),
      0.7
    );
  }

  /**
   * Build toolbar
   */
  private buildToolbar(): void {
    this.a.toolbar([
      { label: 'Open', action: () => this.openImage() },
      { label: 'Reset Edits', action: () => this.viewer.resetEdits() },
      { type: 'separator' },
      { label: 'Zoom In', action: () => this.viewer.zoomIn() },
      { label: 'Zoom Out', action: () => this.viewer.zoomOut() },
      { label: 'Reset Zoom', action: () => this.viewer.resetZoom() }
    ]);
  }

  /**
   * Build image display area
   */
  private buildImageArea(): void {
    this.a.vbox(() => {
      // Scrollable image container
      this.a.scroll(() => {
        this.a.center(() => {
          // Create image widget with empty placeholder
          // We'll update it with real base64 data when an image is loaded
          const imageWidget = this.a.image('./examples/image-viewer/sample-image.png', 'contain');
          this.viewer.registerImageDisplay(imageWidget);
        });
      });

      // Label showing current image filename or status
      const label = this.a.label('No image loaded');
      this.viewer.registerImageAreaLabel(label);
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

      const widthLabel = this.a.label('Width: -');
      this.viewer.registerImageInfoLabel('width', widthLabel);

      const heightLabel = this.a.label('Height: -');
      this.viewer.registerImageInfoLabel('height', heightLabel);

      const sizeLabel = this.a.label('Size: -');
      this.viewer.registerImageInfoLabel('size', sizeLabel);

      const modifiedLabel = this.a.label('Last modified: -');
      this.viewer.registerImageInfoLabel('lastModified', modifiedLabel);
    });
  }

  /**
   * Build editor tab
   */
  private buildEditorTab(): void {
    this.a.vbox(() => {
      this.a.label('Edit Controls:');
      this.a.separator();

      // Brightness control
      this.buildEditControl('brightness', 'Brightness', () => this.viewer.setBrightness);

      // Contrast control
      this.buildEditControl('contrast', 'Contrast', () => this.viewer.setContrast);

      // Saturation control
      this.buildEditControl('saturation', 'Saturation', () => this.viewer.setSaturation);

      // Hue control
      this.buildEditControl('hue', 'Hue', () => this.viewer.setHue);
    });
  }

  /**
   * Build an edit control with +/- buttons
   */
  private buildEditControl(
    type: 'brightness' | 'contrast' | 'saturation' | 'hue',
    labelText: string,
    getSetter: () => (value: number) => void
  ): void {
    this.a.hbox(() => {
      const label = this.a.label(`${labelText}: 0`);
      this.viewer.registerEditSlider(type, label);

      this.a.button('-', () => {
        const setter = getSetter.call(this.viewer);
        const currentValue = this.getCurrentValue(type);
        setter.call(this.viewer, currentValue - 10);
      });

      this.a.button('+', () => {
        const setter = getSetter.call(this.viewer);
        const currentValue = this.getCurrentValue(type);
        setter.call(this.viewer, currentValue + 10);
      });
    });
  }

  /**
   * Get current value of an edit parameter
   */
  private getCurrentValue(type: 'brightness' | 'contrast' | 'saturation' | 'hue'): number {
    return (this.viewer as any).editParams[type];
  }

  /**
   * Open image (hardcoded to sample image for demo)
   */
  private async openImage(): Promise<void> {
    // For demo purposes, load the sample image
    // In a real app, you would use a file dialog
    const samplePath = './examples/image-viewer/sample-image.png';
    await this.viewer.loadImage(samplePath);
  }
}

/**
 * Create and run the image viewer application
 * @param appInstance - Optional app instance (for testing)
 */
export async function createImageViewerApp(appInstance?: App): Promise<void> {
  const a = appInstance || app('Image Viewer', 1200, 800);

  const viewer = new ImageViewer();
  const ui = new ImageViewerUI(a, viewer);

  const win = a.window('Image Viewer with Real Editing (Jimp)', 1200, 800);
  win.setContent(() => {
    a.border({
      top: () => ui['buildToolbar'](),
      center: () => ui.build(),
      bottom: () => {
        // Status bar with zoom level
        const zoomLabel = a.label('Zoom: 100%');
        viewer.registerZoomStatus(zoomLabel);
      }
    });
  });

  // Only run if not provided (standalone mode)
  if (!appInstance) {
    await a.run();
  }
}

// Run the application
if (require.main === module) {
  createImageViewerApp().catch(console.error);
}
