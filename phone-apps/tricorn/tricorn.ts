/**
 * Tricorn (Mandelbar) Fractal Explorer
 *
 * The conjugate of the Mandelbrot set, creating distinctive
 * horn-like shapes and different symmetry.
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * @tsyne-app:name Tricorn
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
 * @tsyne-app:category graphics
 * @tsyne-app:builder createTricornApp
 * @tsyne-app:args app
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { TappableCanvasRaster } from '../../core/src/widgets/canvas';
import type { Label } from '../../core/src/widgets/display';
import { palettes, paletteNames, tricorn } from '../fractal-utils';

const CANVAS_SIZE = 200;
const MAX_ITERATIONS = 256;

export class TricornUI {
  private canvas: TappableCanvasRaster | null = null;
  private statusLabel: Label | null = null;
  private canvasWidth = CANVAS_SIZE;
  private canvasHeight = CANVAS_SIZE;
  private centerX = -0.3;
  private centerY = 0;
  private zoom = 1;
  private currentPalette = 2; // Ice palette
  private pixelBuffer: Uint8Array;

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
        const iter = tricorn(cx, cy, MAX_ITERATIONS);
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
        `Tricorn | Zoom: ${this.zoom.toFixed(1)}x | ${paletteNames[this.currentPalette]}`
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
    this.centerX = -0.3;
    this.centerY = 0;
    this.zoom = 1;
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

  build(a: App): void {
    a.window({ title: 'Tricorn Fractal', width: 400, height: 450 }, (win) => {
      win.setContent(() => {
        a.vbox(() => {
          a.center(() => {
            this.canvas = a.tappableCanvasRaster(CANVAS_SIZE, CANVAS_SIZE, {
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
            a.button('Palette').withId('next-palette').onClick(() => this.nextPalette());
          });
        });
      });
      win.show();
      setTimeout(() => { this.render(); this.updateCanvas(); }, 100);
    });
  }
}

export function createTricornApp(a: App): void {
  new TricornUI().build(a);
}

if (require.main === module) {
  app({ title: 'Tricorn Fractal' }, createTricornApp);
}
