/**
 * Newton Fractal Explorer
 *
 * Visualization of Newton's method convergence basins for z³-1=0.
 * Shows the three roots and their attraction basins.
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * @tsyne-app:name Newton Fractal
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.07 4.93l-1.41 1.41A8.014 8.014 0 0 1 20 12c0 4.42-3.58 8-8 8s-8-3.58-8-8c0-4.08 3.05-7.44 7-7.93v2.02C8.16 6.57 6 9.03 6 12c0 3.31 2.69 6 6 6s6-2.69 6-6c0-1.66-.67-3.16-1.76-4.24l-1.41 1.41C15.55 9.9 16 10.9 16 12c0 2.21-1.79 4-4 4s-4-1.79-4-4c0-1.86 1.28-3.41 3-3.86v2.14c-.6.35-1 .98-1 1.72 0 1.1.9 2 2 2s2-.9 2-2c0-.74-.4-1.38-1-1.72V2h-1C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-2.76-1.12-5.26-2.93-7.07z"/></svg>
 * @tsyne-app:category graphics
 * @tsyne-app:builder createNewtonFractalApp
 * @tsyne-app:args app
 */

import { app, resolveTransport  } from 'tsyne';
import type { App, Window, TappableCanvasRaster, Label } from 'tsyne';
import { palettes, paletteNames, newton } from '../fractal-utils';

const CANVAS_SIZE = 200;
const MAX_ITERATIONS = 64;

export class NewtonFractalUI {
  private canvas: TappableCanvasRaster | null = null;
  private statusLabel: Label | null = null;
  private canvasWidth = CANVAS_SIZE;
  private canvasHeight = CANVAS_SIZE;
  private centerX = 0;
  private centerY = 0;
  private zoom = 2;
  private currentPalette = 3; // Rainbow shows roots nicely
  private pixelBuffer: Uint8Array;

  // Debounce timer for resize
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  // Flag to prevent resize until initial render is complete
  private initialRenderComplete = false;

  constructor() {
    this.pixelBuffer = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE * 4);
  }

  private render(): void {
    const palette = palettes[paletteNames[this.currentPalette]];
    const scale = 3 / (Math.min(this.canvasWidth, this.canvasHeight) * this.zoom);

    for (let py = 0; py < this.canvasHeight; py++) {
      for (let px = 0; px < this.canvasWidth; px++) {
        const cx = this.centerX + (px - this.canvasWidth / 2) * scale;
        const cy = this.centerY + (py - this.canvasHeight / 2) * scale;
        const iter = newton(cx, cy, MAX_ITERATIONS);
        const [r, g, b, a] = palette(iter, MAX_ITERATIONS);
        const idx = (py * this.canvasWidth + px) * 4;
        this.pixelBuffer[idx] = r;
        this.pixelBuffer[idx + 1] = g;
        this.pixelBuffer[idx + 2] = b;
        this.pixelBuffer[idx + 3] = a;
      }
    }
  }

  private async updateCanvas(): Promise<void> {
    if (!this.canvas) return;
    await this.canvas.setPixelBuffer(this.pixelBuffer);
    if (this.statusLabel) {
      await this.statusLabel.setText(
        `z³-1=0 | Zoom: ${this.zoom.toFixed(1)}x | ${paletteNames[this.currentPalette]}`
      );
    }
  }

  async zoomIn(): Promise<void> {
    this.zoom *= 2;
    this.render();
    await this.updateCanvas();
  }

  async zoomOut(): Promise<void> {
    this.zoom = Math.max(0.5, this.zoom / 2);
    this.render();
    await this.updateCanvas();
  }

  async nextPalette(): Promise<void> {
    this.currentPalette = (this.currentPalette + 1) % paletteNames.length;
    this.render();
    await this.updateCanvas();
  }

  async reset(): Promise<void> {
    this.centerX = 0;
    this.centerY = 0;
    this.zoom = 2;
    this.render();
    await this.updateCanvas();
  }

  async pan(dx: number, dy: number): Promise<void> {
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);
    this.centerX += dx * scale * 50;
    this.centerY += dy * scale * 50;
    this.render();
    await this.updateCanvas();
  }

  async handleTap(x: number, y: number): Promise<void> {
    const scale = 3 / (Math.min(this.canvasWidth, this.canvasHeight) * this.zoom);
    this.centerX += (x - this.canvasWidth / 2) * scale;
    this.centerY += (y - this.canvasHeight / 2) * scale;
    this.zoom *= 2;
    this.render();
    await this.updateCanvas();
  }

  async handleScroll(deltaX: number, deltaY: number, x: number, y: number): Promise<void> {
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);
    const cursorCx = this.centerX + (x - this.canvasWidth / 2) * scale;
    const cursorCy = this.centerY + (y - this.canvasHeight / 2) * scale;
    const zoomFactor = deltaY > 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.5, Math.min(this.zoom * zoomFactor, 100000));
    const newScale = 3 / (minDim * newZoom);
    this.centerX = cursorCx - (x - this.canvasWidth / 2) * newScale;
    this.centerY = cursorCy - (y - this.canvasHeight / 2) * newScale;
    this.zoom = newZoom;
    this.render();
    await this.updateCanvas();
  }

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
   * Handle canvas resize - debounced to avoid too many re-renders
   */
  private handleResize(width: number, height: number): void {
    if (!this.initialRenderComplete) {
      return;
    }

    if (!Number.isFinite(width) || !Number.isFinite(height) ||
        width <= 0 || height <= 0 || width > 4000 || height > 4000) {
      return;
    }

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }

    const pendingWidth = width;
    const pendingHeight = height;

    this.resizeTimer = setTimeout(async () => {
      const padding = 100;
      const availableWidth = Math.max(100, Math.min(pendingWidth - 20, 1000));
      const availableHeight = Math.max(100, Math.min(pendingHeight - padding, 800));

      const newSize = Math.min(availableWidth, availableHeight);
      const newWidth = Math.floor(newSize);
      const newHeight = Math.floor(newSize);

      if (Math.abs(newWidth - this.canvasWidth) > 50 ||
          Math.abs(newHeight - this.canvasHeight) > 50) {
        this.canvasWidth = newWidth;
        this.canvasHeight = newHeight;

        this.pixelBuffer = new Uint8Array(this.canvasWidth * this.canvasHeight * 4);

        if (this.canvas) {
          await this.canvas.resize(this.canvasWidth, this.canvasHeight);
        }

        this.render();
        await this.updateCanvas();
      }
    }, 500);
  }

  build(a: App): void {
    a.window({ title: 'Newton Fractal', width: 400, height: 520 }, (win) => {
      win.setContent(() => {
        a.vbox(() => {
          a.center(() => {
            this.canvas = a.tappableCanvasRaster(CANVAS_SIZE, CANVAS_SIZE, {
              onKeyDown: (key) => this.handleKey(key),
              onTap: (x, y) => this.handleTap(x, y),
              onScroll: (dx, dy, x, y) => this.handleScroll(dx, dy, x, y)
            });
          });
          a.hbox(() => {
            this.statusLabel = a.label('Loading...').withId('status');
          });
          a.hbox(() => {
            a.button('Zoom +').withId('zoom-in').onClick(() => this.zoomIn());
            a.button('Zoom -').withId('zoom-out').onClick(() => this.zoomOut());
            a.button('Reset').withId('reset').onClick(() => this.reset());
          });
          a.hbox(() => {
            a.button('← Left').withId('pan-left').onClick(() => this.pan(-1, 0));
            a.button('↑ Up').withId('pan-up').onClick(() => this.pan(0, -1));
            a.button('↓ Down').withId('pan-down').onClick(() => this.pan(0, 1));
            a.button('→ Right').withId('pan-right').onClick(() => this.pan(1, 0));
          });
          a.hbox(() => {
            a.button('Palette').withId('next-palette').onClick(() => this.nextPalette());
          });
        });
      });
      win.show();
      setTimeout(async () => {
        this.render();
        await this.updateCanvas();
        win.onResize((width, height) => this.handleResize(width, height));
        this.initialRenderComplete = true;
      }, 100);
    });
  }
}

export function createNewtonFractalApp(a: App): void {
  new NewtonFractalUI().build(a);
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Newton Fractal' }, createNewtonFractalApp);
}
