/**
 * Image Viewer for Tsyne
 *
 * Ported from https://github.com/Palexer/image-viewer
 * Original author: Palexer
 * License: MIT (see original repository)
 *
 * This is a simplified demonstration port showing image viewer UI patterns.
 * The original implementation includes full image editing with the GIFT library,
 * advanced filters, undo/redo, file I/O, and keyboard shortcuts.
 * This version demonstrates the UI structure and basic image display
 * adapted to work with Tsyne's architecture.
 *
 * NOTE: This is a UI demonstration showing the image viewer layout and controls.
 * For full image editing capabilities, use the original Palexer/image-viewer.
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';

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
 * Image viewer/editor
 * Based on: img.go and ui.go
 */
class ImageViewer {
  private currentImage: ImageInfo | null = null;
  private editParams: EditParams = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0
  };
  private zoomLevel: number = 100; // percentage
  private updateCallback?: () => void;

  // UI widgets
  private imageLabel: any = null;
  private infoWidgets: { [key: string]: any } = {};
  private editSliders: { [key: string]: any } = {};
  private zoomLabel: any = null;

  /**
   * Open an image file
   */
  openImage(path: string): void {
    // Simulate opening an image
    this.currentImage = {
      path,
      width: 1920,
      height: 1080,
      size: 2458624, // bytes
      lastModified: new Date().toLocaleString()
    };

    this.resetEdits();
    this.updateDisplay();
  }

  /**
   * Reset editing parameters
   */
  resetEdits(): void {
    this.editParams = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0
    };
    this.updateSliders();
  }

  /**
   * Update brightness
   */
  setBrightness(value: number): void {
    this.editParams.brightness = Math.max(-100, Math.min(100, value));
    this.updateDisplay();
  }

  /**
   * Update contrast
   */
  setContrast(value: number): void {
    this.editParams.contrast = Math.max(-100, Math.min(100, value));
    this.updateDisplay();
  }

  /**
   * Update saturation
   */
  setSaturation(value: number): void {
    this.editParams.saturation = Math.max(-100, Math.min(100, value));
    this.updateDisplay();
  }

  /**
   * Update hue
   */
  setHue(value: number): void {
    this.editParams.hue = Math.max(-180, Math.min(180, value));
    this.updateDisplay();
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    this.zoomLevel = Math.min(400, this.zoomLevel + 10);
    this.updateZoomDisplay();
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    this.zoomLevel = Math.max(10, this.zoomLevel - 10);
    this.updateZoomDisplay();
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom(): void {
    this.zoomLevel = 100;
    this.updateZoomDisplay();
  }

  /**
   * Get current image info
   */
  getImageInfo(): ImageInfo | null {
    return this.currentImage;
  }

  /**
   * Get current edit parameters
   */
  getEditParams(): EditParams {
    return { ...this.editParams };
  }

  /**
   * Get zoom level
   */
  getZoomLevel(): number {
    return this.zoomLevel;
  }

  /**
   * Set update callback
   */
  setUpdateCallback(callback: () => void): void {
    this.updateCallback = callback;
  }

  /**
   * Update display
   */
  private async updateDisplay(): Promise<void> {
    if (this.updateCallback) {
      this.updateCallback();
    }

    // Update image info
    if (this.currentImage && this.infoWidgets.width) {
      await this.infoWidgets.width.setText(`Width: ${this.currentImage.width}px`);
      await this.infoWidgets.height.setText(`Height: ${this.currentImage.height}px`);
      await this.infoWidgets.size.setText(`Size: ${(this.currentImage.size / 1024).toFixed(2)} KB`);
      await this.infoWidgets.modified.setText(`Last modified: ${this.currentImage.lastModified}`);
    }

    // Update image display
    if (this.imageLabel && this.currentImage) {
      const status = `Viewing: ${this.currentImage.path}`;
      await this.imageLabel.setText(status);
    }
  }

  /**
   * Update slider displays
   */
  private async updateSliders(): Promise<void> {
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
   * Update zoom display
   */
  private async updateZoomDisplay(): Promise<void> {
    if (this.zoomLabel) {
      await this.zoomLabel.setText(`Zoom: ${this.zoomLevel}%`);
    }
  }

  /**
   * Register UI widgets
   */
  registerWidgets(widgets: {
    imageLabel?: any;
    infoWidgets?: { [key: string]: any };
    editSliders?: { [key: string]: any };
    zoomLabel?: any;
  }): void {
    if (widgets.imageLabel) this.imageLabel = widgets.imageLabel;
    if (widgets.infoWidgets) this.infoWidgets = widgets.infoWidgets;
    if (widgets.editSliders) this.editSliders = widgets.editSliders;
    if (widgets.zoomLabel) this.zoomLabel = widgets.zoomLabel;
  }
}

/**
 * Image Viewer UI
 * Based on: ui.go
 */
class ImageViewerUI {
  private viewer: ImageViewer;

  constructor(private a: App) {
    this.viewer = new ImageViewer();
    this.viewer.setUpdateCallback(() => this.onUpdate());
  }

  buildUI(win: Window): void {
    this.a.vbox(() => {
      // Menu/Toolbar
      this.buildToolbar();

      // Main content area (split view)
      this.a.hsplit(
        () => this.buildImageArea(),
        () => this.buildSidePanel(),
        0.7 // 70% for image, 30% for side panel
      );

      // Status bar
      this.buildStatusBar();
    });
  }

  /**
   * Build toolbar
   * Based on: ui.go makeMenu()
   */
  private buildToolbar(): void {
    this.a.toolbar([
      {
        type: 'action',
        label: 'Open',
        onAction: () => this.openImage()
      },
      {
        type: 'action',
        label: 'Reset Edits',
        onAction: () => this.resetEdits()
      },
      {
        type: 'separator'
      },
      {
        type: 'action',
        label: 'Zoom In',
        onAction: () => this.zoomIn()
      },
      {
        type: 'action',
        label: 'Zoom Out',
        onAction: () => this.zoomOut()
      },
      {
        type: 'action',
        label: 'Reset Zoom',
        onAction: () => this.resetZoom()
      }
    ]);
  }

  /**
   * Build image display area
   */
  private buildImageArea(): void {
    this.a.scroll(() => {
      this.a.center(() => {
        const imageLabel = this.a.label('No image loaded');
        this.viewer.registerWidgets({ imageLabel });
      });
    });
  }

  /**
   * Build side panel with tabs
   * Based on: ui.go makeRightPanel()
   */
  private buildSidePanel(): void {
    this.a.tabs([
      {
        title: 'Information',
        builder: () => this.buildInfoTab()
      },
      {
        title: 'Editor',
        builder: () => this.buildEditorTab()
      }
    ]);
  }

  /**
   * Build information tab
   * Based on: ui.go makeInfoTab()
   */
  private buildInfoTab(): void {
    this.a.vbox(() => {
      this.a.label('Image Information:');
      this.a.separator();

      const widthLabel = this.a.label('Width: -');
      const heightLabel = this.a.label('Height: -');
      const sizeLabel = this.a.label('Size: -');
      const modifiedLabel = this.a.label('Last modified: -');

      this.viewer.registerWidgets({
        infoWidgets: {
          width: widthLabel,
          height: heightLabel,
          size: sizeLabel,
          modified: modifiedLabel
        }
      });
    });
  }

  /**
   * Build editor tab
   * Based on: ui.go makeEditorTab()
   */
  private buildEditorTab(): void {
    this.a.vbox(() => {
      this.a.label('Editing Controls:');
      this.a.separator();

      // General adjustments
      this.a.label('General:');
      const brightnessLabel = this.a.label('Brightness: 0');
      this.a.button('Increase Brightness', () => this.adjustBrightness(10));
      this.a.button('Decrease Brightness', () => this.adjustBrightness(-10));

      this.a.separator();

      const contrastLabel = this.a.label('Contrast: 0');
      this.a.button('Increase Contrast', () => this.adjustContrast(10));
      this.a.button('Decrease Contrast', () => this.adjustContrast(-10));

      this.a.separator();

      const saturationLabel = this.a.label('Saturation: 0');
      this.a.button('Increase Saturation', () => this.adjustSaturation(10));
      this.a.button('Decrease Saturation', () => this.adjustSaturation(-10));

      this.a.separator();

      const hueLabel = this.a.label('Hue: 0');
      this.a.button('Increase Hue', () => this.adjustHue(10));
      this.a.button('Decrease Hue', () => this.adjustHue(-10));

      this.viewer.registerWidgets({
        editSliders: {
          brightness: brightnessLabel,
          contrast: contrastLabel,
          saturation: saturationLabel,
          hue: hueLabel
        }
      });
    });
  }

  /**
   * Build status bar
   */
  private buildStatusBar(): void {
    this.a.hbox(() => {
      const zoomLabel = this.a.label('Zoom: 100%');
      this.viewer.registerWidgets({ zoomLabel });
    });
  }

  /**
   * File operations
   */
  private openImage(): void {
    // Simulate opening an image
    this.viewer.openImage('sample-image.jpg');
  }

  private resetEdits(): void {
    this.viewer.resetEdits();
  }

  /**
   * Zoom operations
   */
  private zoomIn(): void {
    this.viewer.zoomIn();
  }

  private zoomOut(): void {
    this.viewer.zoomOut();
  }

  private resetZoom(): void {
    this.viewer.resetZoom();
  }

  /**
   * Edit adjustments
   */
  private adjustBrightness(delta: number): void {
    const current = this.viewer.getEditParams().brightness;
    this.viewer.setBrightness(current + delta);
  }

  private adjustContrast(delta: number): void {
    const current = this.viewer.getEditParams().contrast;
    this.viewer.setContrast(current + delta);
  }

  private adjustSaturation(delta: number): void {
    const current = this.viewer.getEditParams().saturation;
    this.viewer.setSaturation(current + delta);
  }

  private adjustHue(delta: number): void {
    const current = this.viewer.getEditParams().hue;
    this.viewer.setHue(current + delta);
  }

  private onUpdate(): void {
    // Callback for when viewer state changes
  }

  getViewer(): ImageViewer {
    return this.viewer;
  }
}

/**
 * Create the image viewer app
 * Based on: main.go
 */
export function createImageViewerApp(a: App): ImageViewerUI {
  const ui = new ImageViewerUI(a);

  a.window({ title: 'Image Viewer', width: 1200, height: 750 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Image Viewer' }, (a: App) => {
    createImageViewerApp(a);
  });
}
