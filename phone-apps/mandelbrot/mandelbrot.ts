/**
 * Mandelbrot Set Explorer
 *
 * Interactive fractal viewer using CanvasRaster for pixel-level rendering.
 * Features zoom, pan, and color palette cycling.
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * @tsyne-app:name Mandelbrot
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="14" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="14" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
 * @tsyne-app:category graphics
 * @tsyne-app:builder createMandelbrotApp
 * @tsyne-app:args app
 * @tsyne-app:count many
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { TappableCanvasRaster } from '../../core/src/widgets/canvas';
import type { Label } from '../../core/src/widgets/display';
import type { Center } from '../../core/src/widgets/containers';

// Initial canvas dimensions - will resize with window
const INITIAL_CANVAS_WIDTH = 200;
const INITIAL_CANVAS_HEIGHT = 200;

// Mandelbrot parameters
const MAX_ITERATIONS = 256;

// Color palettes
type ColorPalette = (iteration: number, maxIter: number) => [number, number, number, number];

const palettes: Record<string, ColorPalette> = {
  classic: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255]; // Black for points in set
    const t = iter / maxIter;
    const r = Math.floor(9 * (1 - t) * t * t * t * 255);
    const g = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
    const b = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
    return [r, g, b, 255];
  },
  fire: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const t = iter / maxIter;
    const r = Math.min(255, Math.floor(t * 3 * 255));
    const g = Math.min(255, Math.floor(Math.max(0, t * 3 - 1) * 255));
    const b = Math.min(255, Math.floor(Math.max(0, t * 3 - 2) * 255));
    return [r, g, b, 255];
  },
  ocean: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const t = iter / maxIter;
    const r = Math.floor(t * 100);
    const g = Math.floor(t * 150 + 50);
    const b = Math.floor(t * 200 + 55);
    return [r, g, b, 255];
  },
  rainbow: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const h = (iter / maxIter) * 360;
    // HSV to RGB (s=1, v=1)
    const c = 1;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255), 255];
  },
  grayscale: (iter, maxIter) => {
    if (iter === maxIter) return [0, 0, 0, 255];
    const v = Math.floor((iter / maxIter) * 255);
    return [v, v, v, 255];
  },
};

const paletteNames = Object.keys(palettes);

/**
 * Calculate Mandelbrot iterations for a point
 */
function mandelbrot(cx: number, cy: number, maxIter: number): number {
  let x = 0;
  let y = 0;
  let iter = 0;

  while (x * x + y * y <= 4 && iter < maxIter) {
    const xTemp = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = xTemp;
    iter++;
  }

  return iter;
}

/**
 * Mandelbrot Explorer UI
 */
export class MandelbrotUI {
  private canvas: TappableCanvasRaster | null = null;
  private statusLabel: Label | null = null;
  private window: Window | null = null;
  private app: App | null = null;
  private canvasContainer: Center | null = null;

  // Canvas dimensions - dynamically updated
  private canvasWidth = INITIAL_CANVAS_WIDTH;
  private canvasHeight = INITIAL_CANVAS_HEIGHT;

  // View parameters
  private centerX = -0.5;
  private centerY = 0;
  private zoom = 1; // Higher = more zoomed in
  private currentPalette = 0;

  // Pixel buffer for rendering
  private pixelBuffer: Uint8Array;

  // Debounce timer for resize
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  // Flag to prevent resize until initial render is complete
  private initialRenderComplete = false;

  constructor() {
    this.pixelBuffer = new Uint8Array(INITIAL_CANVAS_WIDTH * INITIAL_CANVAS_HEIGHT * 4);
  }

  /**
   * Render the Mandelbrot set to the pixel buffer
   */
  private render(): void {
    const palette = palettes[paletteNames[this.currentPalette]];
    // Use smaller dimension to maintain aspect ratio
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);

    for (let py = 0; py < this.canvasHeight; py++) {
      for (let px = 0; px < this.canvasWidth; px++) {
        // Map pixel coordinates to complex plane
        const cx = this.centerX + (px - this.canvasWidth / 2) * scale;
        const cy = this.centerY + (py - this.canvasHeight / 2) * scale;

        const iter = mandelbrot(cx, cy, MAX_ITERATIONS);
        const [r, g, b, a] = palette(iter, MAX_ITERATIONS);

        const idx = (py * this.canvasWidth + px) * 4;
        this.pixelBuffer[idx] = r;
        this.pixelBuffer[idx + 1] = g;
        this.pixelBuffer[idx + 2] = b;
        this.pixelBuffer[idx + 3] = a;
      }
    }
  }

  /**
   * Update the canvas with the rendered buffer
   * Uses bulk setPixelBuffer for efficiency (base64-encoded raw pixels)
   */
  private async updateCanvas(): Promise<void> {
    if (!this.canvas) return;

    // Send entire pixel buffer at once using base64 encoding
    await this.canvas.setPixelBuffer(this.pixelBuffer);

    // Update status
    if (this.statusLabel) {
      const paletteName = paletteNames[this.currentPalette];
      await this.statusLabel.setText(
        `Zoom: ${this.zoom.toFixed(1)}x | Center: (${this.centerX.toFixed(4)}, ${this.centerY.toFixed(4)}) | Palette: ${paletteName}`
      );
    }
  }

  /**
   * Zoom in at center
   */
  async zoomIn(): Promise<void> {
    this.zoom *= 2;
    this.render();
    await this.updateCanvas();
  }

  /**
   * Zoom out from center
   */
  async zoomOut(): Promise<void> {
    this.zoom = Math.max(0.5, this.zoom / 2);
    this.render();
    await this.updateCanvas();
  }

  /**
   * Pan the view
   */
  async pan(dx: number, dy: number): Promise<void> {
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);
    this.centerX += dx * scale * 50;
    this.centerY += dy * scale * 50;
    this.render();
    await this.updateCanvas();
  }

  /**
   * Cycle to next color palette
   */
  async nextPalette(): Promise<void> {
    this.currentPalette = (this.currentPalette + 1) % paletteNames.length;
    this.render();
    await this.updateCanvas();
  }

  /**
   * Reset to default view
   */
  async reset(): Promise<void> {
    this.centerX = -0.5;
    this.centerY = 0;
    this.zoom = 1;
    this.render();
    await this.updateCanvas();
  }

  /**
   * Handle tap/click on canvas - zoom in centered on click point
   */
  async handleTap(x: number, y: number): Promise<void> {
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);
    // Convert pixel coordinates to complex plane
    this.centerX = this.centerX + (x - this.canvasWidth / 2) * scale;
    this.centerY = this.centerY + (y - this.canvasHeight / 2) * scale;
    // Zoom in
    this.zoom *= 2;
    this.render();
    await this.updateCanvas();
  }

  /**
   * Handle scroll/pinch zoom - zoom centered on cursor position
   * deltaY > 0 = scroll up = zoom in, deltaY < 0 = scroll down = zoom out
   */
  async handleScroll(deltaX: number, deltaY: number, x: number, y: number): Promise<void> {
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);

    // Convert cursor position to complex plane coordinates
    const cursorCx = this.centerX + (x - this.canvasWidth / 2) * scale;
    const cursorCy = this.centerY + (y - this.canvasHeight / 2) * scale;

    // Zoom factor based on scroll amount (accumulated for smoother zoom)
    const zoomFactor = deltaY > 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.5, Math.min(this.zoom * zoomFactor, 100000));

    // Adjust center to keep cursor position fixed on screen
    const newScale = 3 / (minDim * newZoom);
    this.centerX = cursorCx - (x - this.canvasWidth / 2) * newScale;
    this.centerY = cursorCy - (y - this.canvasHeight / 2) * newScale;
    this.zoom = newZoom;

    this.render();
    await this.updateCanvas();
  }

  /**
   * Handle canvas resize - debounced to avoid too many re-renders
   */
  private handleResize(width: number, height: number): void {
    // Don't resize until initial render is complete
    if (!this.initialRenderComplete) {
      return;
    }

    // Validate dimensions - ignore invalid/garbage values
    if (!Number.isFinite(width) || !Number.isFinite(height) ||
        width <= 0 || height <= 0 || width > 4000 || height > 4000) {
      return;
    }

    // Debounce resize events - wait for user to stop dragging
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }

    // Store pending dimensions
    const pendingWidth = width;
    const pendingHeight = height;

    this.resizeTimer = setTimeout(async () => {
      // Calculate new canvas size (leave room for controls)
      const padding = 120; // Space for buttons and status
      const availableWidth = Math.max(100, Math.min(pendingWidth - 20, 1000));
      const availableHeight = Math.max(100, Math.min(pendingHeight - padding, 800));

      // Use the smaller dimension to keep it square-ish
      const newSize = Math.min(availableWidth, availableHeight);
      const newWidth = Math.floor(newSize);
      const newHeight = Math.floor(newSize);

      // Only resize if dimensions actually changed significantly
      if (Math.abs(newWidth - this.canvasWidth) > 50 ||
          Math.abs(newHeight - this.canvasHeight) > 50) {
        this.canvasWidth = newWidth;
        this.canvasHeight = newHeight;

        // Resize pixel buffer
        this.pixelBuffer = new Uint8Array(this.canvasWidth * this.canvasHeight * 4);

        // Resize canvas widget
        if (this.canvas) {
          await this.canvas.resize(this.canvasWidth, this.canvasHeight);
        }

        // Re-render at new size
        this.render();
        await this.updateCanvas();
      }
    }, 500); // 500ms debounce - wait for mouse release
  }

  /**
   * Handle keyboard input
   */
  handleKey(key: string): void {
    switch (key) {
      case '+':
      case '=':
      case 'KP_Add':
        this.zoomIn();
        break;
      case '-':
      case 'KP_Subtract':
        this.zoomOut();
        break;
      case 'Left':
        this.pan(-1, 0);
        break;
      case 'Right':
        this.pan(1, 0);
        break;
      case 'Up':
        this.pan(0, -1);
        break;
      case 'Down':
        this.pan(0, 1);
        break;
      case 'r':
      case 'R':
        this.reset();
        break;
      case 'p':
      case 'P':
      case ' ':
        this.nextPalette();
        break;
    }
  }

  /**
   * Build the UI
   */
  build(a: App): void {
    this.app = a;
    a.window({ title: 'Mandelbrot Explorer', width: 450, height: 550 }, (win) => {
      this.window = win;

      win.setContent(() => {
        a.vbox(() => {
          // Canvas for fractal display - using TappableCanvasRaster for keyboard, tap, and scroll support
          this.canvasContainer = a.center(() => {
            this.canvas = a.tappableCanvasRaster(INITIAL_CANVAS_WIDTH, INITIAL_CANVAS_HEIGHT, {
              onKeyDown: (key) => this.handleKey(key),
              onTap: (x, y) => this.handleTap(x, y),
              onScroll: (deltaX, deltaY, x, y) => this.handleScroll(deltaX, deltaY, x, y)
            });
          });

          // Status bar
          a.hbox(() => {
            this.statusLabel = a.label('Loading...').withId('status');
          });

          // Control buttons - zoom
          a.hbox(() => {
            a.button('Zoom In (+)').withId('zoom-in').onClick(() => this.zoomIn());
            a.button('Zoom Out (-)').withId('zoom-out').onClick(() => this.zoomOut());
            a.button('Reset').withId('reset').onClick(() => this.reset());
          });

          // Control buttons - pan
          a.hbox(() => {
            a.button('← Left').withId('pan-left').onClick(() => this.pan(-1, 0));
            a.button('↑ Up').withId('pan-up').onClick(() => this.pan(0, -1));
            a.button('↓ Down').withId('pan-down').onClick(() => this.pan(0, 1));
            a.button('→ Right').withId('pan-right').onClick(() => this.pan(1, 0));
          });

          // Palette button
          a.hbox(() => {
            a.button('Next Palette').withId('next-palette').onClick(() => this.nextPalette());
          });
        });
      });

      // Initial render after window is shown
      win.show();

      // Render initial view and set up resize handler after content is ready
      setTimeout(async () => {
        this.render();
        await this.updateCanvas();

        // Set up window resize handler after content is fully rendered
        win.onResize((width, height) => this.handleResize(width, height));

        // Enable resize handling after initial render
        this.initialRenderComplete = true;
      }, 100);
    });
  }
}

/**
 * Create and run the Mandelbrot app
 */
export function createMandelbrotApp(a: App): void {
  const ui = new MandelbrotUI();
  ui.build(a);
}

// Standalone entry point
if (require.main === module) {
  app({ title: 'Mandelbrot Explorer' }, (a) => {
    createMandelbrotApp(a);
  });
}
