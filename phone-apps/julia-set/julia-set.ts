/**
 * Julia Set Explorer
 *
 * Interactive Julia fractal with adjustable c parameter.
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * @tsyne-app:name Julia Set
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/></svg>
 * @tsyne-app:category graphics
 * @tsyne-app:builder createJuliaSetApp
 * @tsyne-app:args app
 */

import { app, resolveTransport  } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { TappableCanvasRaster } from '../../core/src/widgets/canvas';
import type { Label } from '../../core/src/widgets/display';
import { palettes, paletteNames, julia } from '../fractal-utils';

const CANVAS_SIZE = 200;
const MAX_ITERATIONS = 256;

// Famous Julia set c values
const PRESETS = [
  { name: 'Classic', cr: -0.4, ci: 0.6 },
  { name: 'Dendrite', cr: 0, ci: 1 },
  { name: 'Spiral', cr: -0.8, ci: 0.156 },
  { name: 'Rabbit', cr: -0.123, ci: 0.745 },
  { name: 'Dragon', cr: -0.7269, ci: 0.1889 },
  { name: 'Siegel', cr: -0.391, ci: -0.587 },
];

export class JuliaSetUI {
  private canvas: TappableCanvasRaster | null = null;
  private statusLabel: Label | null = null;
  private canvasWidth = CANVAS_SIZE;
  private canvasHeight = CANVAS_SIZE;
  private centerX = 0;
  private centerY = 0;
  private zoom = 1.5;
  private currentPalette = 0;
  private currentPreset = 0;
  private cr = PRESETS[0].cr;
  private ci = PRESETS[0].ci;
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
        const iter = julia(cx, cy, MAX_ITERATIONS, this.cr, this.ci);
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
      const preset = PRESETS[this.currentPreset].name;
      await this.statusLabel.setText(
        `c=(${this.cr.toFixed(3)}, ${this.ci.toFixed(3)}) | ${preset} | ${paletteNames[this.currentPalette]}`
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

  async nextPreset(): Promise<void> {
    this.currentPreset = (this.currentPreset + 1) % PRESETS.length;
    const p = PRESETS[this.currentPreset];
    this.cr = p.cr;
    this.ci = p.ci;
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
    this.zoom = 1.5;
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
        this.nextPalette();
        break;
      case 'c':
      case 'C':
      case ' ':
        this.nextPreset();
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
      const padding = 130; // Extra room for two button rows
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
    a.window({ title: 'Julia Set Explorer', width: 400, height: 550 }, (win) => {
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
            a.button('Next c').withId('next-preset').onClick(() => this.nextPreset());
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

export function createJuliaSetApp(a: App): void {
  new JuliaSetUI().build(a);
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Julia Set Explorer' }, createJuliaSetApp);
}
