/**
 * Fractal Explorer - Multi-Fractal Visualization
 *
 * Ported from https://script-schmiede.de/labs/fractals/r3/
 * Original author: Jochen Renner (web@jochen-renner.de)
 *
 * A comprehensive fractal renderer supporting multiple fractal types
 * with interactive zoom, pan, and customizable color palettes.
 *
 * Features:
 * - Multiple fractal types: Mandelbrot, Julia, Tricorn, Burning Ship, Newton, Mandelbrot^3, Phoenix
 * - Click-to-center navigation
 * - Mouse wheel zooming
 * - Keyboard navigation
 * - 8 color palettes
 * - Julia set constant adjustment
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * @tsyne-app:name Fractals
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
 * @tsyne-app:category graphics
 * @tsyne-app:builder createFractalsApp
 * @tsyne-app:args app
 */

import { app, resolveTransport } from 'tsyne';
import type { App, TappableCanvasRaster, Label, Select } from 'tsyne';
import {
  palettes,
  paletteNames,
  mandelbrot,
  julia,
  tricorn,
  burningShip,
  newton,
  mandelbrot3,
  phoenix,
  type FractalFunction,
  type RGBA,
} from '../../phone-apps/fractal-utils';

const CANVAS_SIZE = 300;
const MAX_ITERATIONS = 256;

/** Fractal type definitions with their iteration functions and default parameters */
export interface FractalType {
  name: string;
  fn: FractalFunction;
  defaultCenter: { x: number; y: number };
  defaultZoom: number;
  needsJuliaParams?: boolean;
  needsPhoenixParams?: boolean;
}

export const fractalTypes: Record<string, FractalType> = {
  mandelbrot: {
    name: 'Mandelbrot',
    fn: mandelbrot,
    defaultCenter: { x: -0.5, y: 0 },
    defaultZoom: 1,
  },
  julia: {
    name: 'Julia',
    fn: julia,
    defaultCenter: { x: 0, y: 0 },
    defaultZoom: 1,
    needsJuliaParams: true,
  },
  tricorn: {
    name: 'Tricorn',
    fn: tricorn,
    defaultCenter: { x: -0.3, y: 0 },
    defaultZoom: 1,
  },
  burningShip: {
    name: 'Burning Ship',
    fn: burningShip,
    defaultCenter: { x: -0.4, y: -0.6 },
    defaultZoom: 0.8,
  },
  newton: {
    name: 'Newton',
    fn: newton,
    defaultCenter: { x: 0, y: 0 },
    defaultZoom: 0.5,
  },
  mandelbrot3: {
    name: 'Mandelbrot^3',
    fn: mandelbrot3,
    defaultCenter: { x: 0, y: 0 },
    defaultZoom: 1,
  },
  phoenix: {
    name: 'Phoenix',
    fn: phoenix,
    defaultCenter: { x: 0, y: 0 },
    defaultZoom: 1,
    needsPhoenixParams: true,
  },
};

export const fractalTypeNames = Object.keys(fractalTypes);

/**
 * Fractal Explorer State
 * Manages all state for the fractal visualization
 */
export class FractalState {
  // View state
  centerX: number;
  centerY: number;
  zoom: number;

  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;

  // Fractal parameters
  currentFractal: string = 'mandelbrot';
  currentPalette: number = 0;
  maxIterations: number = MAX_ITERATIONS;

  // Julia set parameters (c = juliaR + juliaI*i)
  juliaR: number = -0.7;
  juliaI: number = 0.27015;

  // Phoenix fractal parameters
  phoenixP: number = 0.5667;
  phoenixQ: number = -0.5;

  // Pixel buffer
  pixelBuffer: Uint8Array;

  constructor(width: number = CANVAS_SIZE, height: number = CANVAS_SIZE) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.pixelBuffer = new Uint8Array(width * height * 4);

    // Initialize to Mandelbrot defaults
    const fractal = fractalTypes[this.currentFractal];
    this.centerX = fractal.defaultCenter.x;
    this.centerY = fractal.defaultCenter.y;
    this.zoom = fractal.defaultZoom;
  }

  /**
   * Switch to a different fractal type
   */
  setFractal(fractalKey: string): void {
    if (!fractalTypes[fractalKey]) return;

    this.currentFractal = fractalKey;
    const fractal = fractalTypes[fractalKey];
    this.centerX = fractal.defaultCenter.x;
    this.centerY = fractal.defaultCenter.y;
    this.zoom = fractal.defaultZoom;
  }

  /**
   * Compute iteration count for a point
   */
  computeIteration(cx: number, cy: number): number {
    const fractal = fractalTypes[this.currentFractal];

    if (fractal.needsJuliaParams) {
      return fractal.fn(cx, cy, this.maxIterations, this.juliaR, this.juliaI);
    } else if (fractal.needsPhoenixParams) {
      return fractal.fn(cx, cy, this.maxIterations, this.phoenixP, this.phoenixQ);
    } else {
      return fractal.fn(cx, cy, this.maxIterations);
    }
  }

  /**
   * Render the fractal to the pixel buffer
   */
  render(): void {
    const palette = palettes[paletteNames[this.currentPalette]];
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);

    for (let py = 0; py < this.canvasHeight; py++) {
      for (let px = 0; px < this.canvasWidth; px++) {
        const cx = this.centerX + (px - this.canvasWidth / 2) * scale;
        const cy = this.centerY + (py - this.canvasHeight / 2) * scale;
        const iter = this.computeIteration(cx, cy);
        const [r, g, b, a] = palette(iter, this.maxIterations);
        const idx = (py * this.canvasWidth + px) * 4;
        this.pixelBuffer[idx] = r;
        this.pixelBuffer[idx + 1] = g;
        this.pixelBuffer[idx + 2] = b;
        this.pixelBuffer[idx + 3] = a;
      }
    }
  }

  /**
   * Zoom in by factor
   */
  zoomIn(factor: number = 2): void {
    this.zoom *= factor;
  }

  /**
   * Zoom out by factor
   */
  zoomOut(factor: number = 2): void {
    this.zoom = Math.max(0.1, this.zoom / factor);
  }

  /**
   * Pan the view
   */
  pan(dx: number, dy: number): void {
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);
    this.centerX += dx * scale * 50;
    this.centerY += dy * scale * 50;
  }

  /**
   * Handle click - center on clicked point and zoom in
   */
  handleClick(x: number, y: number): void {
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);
    this.centerX += (x - this.canvasWidth / 2) * scale;
    this.centerY += (y - this.canvasHeight / 2) * scale;
    this.zoom *= 2;
  }

  /**
   * Handle scroll - zoom at cursor position
   */
  handleScroll(deltaY: number, x: number, y: number): void {
    const minDim = Math.min(this.canvasWidth, this.canvasHeight);
    const scale = 3 / (minDim * this.zoom);

    // Calculate cursor position in fractal coordinates
    const cursorCx = this.centerX + (x - this.canvasWidth / 2) * scale;
    const cursorCy = this.centerY + (y - this.canvasHeight / 2) * scale;

    // Apply zoom
    const zoomFactor = deltaY > 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.1, Math.min(this.zoom * zoomFactor, 1000000));

    // Recalculate center to keep cursor position fixed
    const newScale = 3 / (minDim * newZoom);
    this.centerX = cursorCx - (x - this.canvasWidth / 2) * newScale;
    this.centerY = cursorCy - (y - this.canvasHeight / 2) * newScale;
    this.zoom = newZoom;
  }

  /**
   * Reset to defaults for current fractal
   */
  reset(): void {
    const fractal = fractalTypes[this.currentFractal];
    this.centerX = fractal.defaultCenter.x;
    this.centerY = fractal.defaultCenter.y;
    this.zoom = fractal.defaultZoom;
  }

  /**
   * Cycle to next palette
   */
  nextPalette(): void {
    this.currentPalette = (this.currentPalette + 1) % paletteNames.length;
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    const fractal = fractalTypes[this.currentFractal];
    return `${fractal.name} | Zoom: ${this.zoom.toFixed(1)}x | ${paletteNames[this.currentPalette]}`;
  }

  /**
   * Resize the canvas
   */
  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.pixelBuffer = new Uint8Array(width * height * 4);
  }
}

/**
 * Fractal Explorer UI
 */
export class FractalsUI {
  private state: FractalState;
  private a: App;
  private canvas: TappableCanvasRaster | null = null;
  private statusLabel: Label | null = null;
  private fractalSelect: Select | null = null;
  private juliaRLabel: Label | null = null;
  private juliaILabel: Label | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private initialRenderComplete = false;

  constructor(a: App) {
    this.a = a;
    this.state = new FractalState(CANVAS_SIZE, CANVAS_SIZE);
  }

  /**
   * Get the current state (for testing)
   */
  getState(): FractalState {
    return this.state;
  }

  /**
   * Update the canvas display
   */
  private async updateCanvas(): Promise<void> {
    if (!this.canvas) return;
    await this.canvas.setPixelBuffer(this.state.pixelBuffer);
    if (this.statusLabel) {
      await this.statusLabel.setText(this.state.getStatusText());
    }
  }

  /**
   * Re-render and update display
   */
  private async renderAndUpdate(): Promise<void> {
    this.state.render();
    await this.updateCanvas();
  }

  /**
   * Handle fractal type change
   */
  async handleFractalChange(fractalKey: string): Promise<void> {
    this.state.setFractal(fractalKey);
    await this.updateJuliaLabels();
    await this.renderAndUpdate();
  }

  /**
   * Update Julia parameter labels
   */
  private async updateJuliaLabels(): Promise<void> {
    const fractal = fractalTypes[this.state.currentFractal];
    if (this.juliaRLabel) {
      if (fractal.needsJuliaParams) {
        await this.juliaRLabel.setText(`c.real: ${this.state.juliaR.toFixed(4)}`);
      } else if (fractal.needsPhoenixParams) {
        await this.juliaRLabel.setText(`p: ${this.state.phoenixP.toFixed(4)}`);
      } else {
        await this.juliaRLabel.setText('');
      }
    }
    if (this.juliaILabel) {
      if (fractal.needsJuliaParams) {
        await this.juliaILabel.setText(`c.imag: ${this.state.juliaI.toFixed(4)}`);
      } else if (fractal.needsPhoenixParams) {
        await this.juliaILabel.setText(`q: ${this.state.phoenixQ.toFixed(4)}`);
      } else {
        await this.juliaILabel.setText('');
      }
    }
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
      // Julia parameter adjustments
      case 'q':
        this.adjustJuliaR(-0.05);
        break;
      case 'w':
        this.adjustJuliaR(0.05);
        break;
      case 'a':
        this.adjustJuliaI(-0.05);
        break;
      case 's':
        this.adjustJuliaI(0.05);
        break;
    }
  }

  async zoomIn(): Promise<void> {
    this.state.zoomIn();
    await this.renderAndUpdate();
  }

  async zoomOut(): Promise<void> {
    this.state.zoomOut();
    await this.renderAndUpdate();
  }

  async pan(dx: number, dy: number): Promise<void> {
    this.state.pan(dx, dy);
    await this.renderAndUpdate();
  }

  async reset(): Promise<void> {
    this.state.reset();
    await this.renderAndUpdate();
  }

  async nextPalette(): Promise<void> {
    this.state.nextPalette();
    await this.renderAndUpdate();
  }

  async handleTap(x: number, y: number): Promise<void> {
    this.state.handleClick(x, y);
    await this.renderAndUpdate();
  }

  async handleScroll(deltaX: number, deltaY: number, x: number, y: number): Promise<void> {
    this.state.handleScroll(deltaY, x, y);
    await this.renderAndUpdate();
  }

  async adjustJuliaR(delta: number): Promise<void> {
    const fractal = fractalTypes[this.state.currentFractal];
    if (fractal.needsJuliaParams) {
      this.state.juliaR += delta;
    } else if (fractal.needsPhoenixParams) {
      this.state.phoenixP += delta;
    }
    await this.updateJuliaLabels();
    await this.renderAndUpdate();
  }

  async adjustJuliaI(delta: number): Promise<void> {
    const fractal = fractalTypes[this.state.currentFractal];
    if (fractal.needsJuliaParams) {
      this.state.juliaI += delta;
    } else if (fractal.needsPhoenixParams) {
      this.state.phoenixQ += delta;
    }
    await this.updateJuliaLabels();
    await this.renderAndUpdate();
  }

  /**
   * Handle canvas resize
   */
  private handleResize(width: number, height: number): void {
    if (!this.initialRenderComplete) return;

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      width > 4000 ||
      height > 4000
    ) {
      return;
    }

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }

    const pendingWidth = width;
    const pendingHeight = height;

    this.resizeTimer = setTimeout(async () => {
      const padding = 200;
      const availableWidth = Math.max(100, Math.min(pendingWidth - 40, 1000));
      const availableHeight = Math.max(100, Math.min(pendingHeight - padding, 800));

      const newSize = Math.min(availableWidth, availableHeight);
      const newWidth = Math.floor(newSize);
      const newHeight = Math.floor(newSize);

      if (
        Math.abs(newWidth - this.state.canvasWidth) > 50 ||
        Math.abs(newHeight - this.state.canvasHeight) > 50
      ) {
        this.state.resize(newWidth, newHeight);

        if (this.canvas) {
          await this.canvas.resize(newWidth, newHeight);
        }

        await this.renderAndUpdate();
      }
    }, 500);
  }

  /**
   * Build the UI
   */
  build(): void {
    this.a.window({ title: 'Fractal Explorer', width: 500, height: 650 }, (win: any) => {
      win.setContent(() => {
        this.a.vbox(() => {
          // Fractal type selector
          this.a.hbox(() => {
            this.a.label('Fractal: ');
            this.fractalSelect = this.a
              .select(
                fractalTypeNames.map((k) => fractalTypes[k].name),
                async (value: string) => {
                  const idx = fractalTypeNames.findIndex((k) => fractalTypes[k].name === value);
                  if (idx >= 0) {
                    await this.handleFractalChange(fractalTypeNames[idx]);
                  }
                }
              )
              .withId('fractal-select') as Select;
          });

          // Canvas
          this.a.center(() => {
            this.canvas = this.a.tappableCanvasRaster(CANVAS_SIZE, CANVAS_SIZE, {
              onKeyDown: (key: string) => this.handleKey(key),
              onTap: (x: number, y: number) => this.handleTap(x, y),
              onScroll: (dx: number, dy: number, x: number, y: number) => this.handleScroll(dx, dy, x, y),
            });
          });

          // Status bar
          this.a.hbox(() => {
            this.statusLabel = this.a.label('Loading...').withId('status');
          });

          // Julia/Phoenix parameter display
          this.a.hbox(() => {
            this.juliaRLabel = this.a.label('').withId('julia-r');
            this.juliaILabel = this.a.label('').withId('julia-i');
          });

          // Control buttons - row 1
          this.a.hbox(() => {
            this.a
              .button('Zoom +')
              .withId('zoom-in')
              .onClick(() => this.zoomIn());
            this.a
              .button('Zoom -')
              .withId('zoom-out')
              .onClick(() => this.zoomOut());
            this.a
              .button('Reset')
              .withId('reset')
              .onClick(() => this.reset());
          });

          // Control buttons - row 2 (pan)
          this.a.hbox(() => {
            this.a
              .button('<')
              .withId('pan-left')
              .onClick(() => this.pan(-1, 0));
            this.a
              .button('^')
              .withId('pan-up')
              .onClick(() => this.pan(0, -1));
            this.a
              .button('v')
              .withId('pan-down')
              .onClick(() => this.pan(0, 1));
            this.a
              .button('>')
              .withId('pan-right')
              .onClick(() => this.pan(1, 0));
          });

          // Control buttons - row 3
          this.a.hbox(() => {
            this.a
              .button('Palette')
              .withId('next-palette')
              .onClick(() => this.nextPalette());
          });

          // Julia/Phoenix parameter controls (only shown for those fractals)
          this.a.hbox(() => {
            this.a
              .button('c.r-')
              .withId('julia-r-minus')
              .onClick(() => this.adjustJuliaR(-0.05));
            this.a
              .button('c.r+')
              .withId('julia-r-plus')
              .onClick(() => this.adjustJuliaR(0.05));
            this.a
              .button('c.i-')
              .withId('julia-i-minus')
              .onClick(() => this.adjustJuliaI(-0.05));
            this.a
              .button('c.i+')
              .withId('julia-i-plus')
              .onClick(() => this.adjustJuliaI(0.05));
          });

          // Instructions
          this.a.separator();
          this.a.label('Click to center & zoom, scroll to zoom');
          this.a.label('Keys: +/- zoom, arrows pan, P palette, R reset');
        });
      });

      win.show();

      // Initialize after window is shown
      setTimeout(async () => {
        this.state.render();
        await this.updateCanvas();
        win.onResize((width: number, height: number) => this.handleResize(width, height));
        this.initialRenderComplete = true;
      }, 100);
    });
  }
}

/**
 * Create the Fractals app
 */
export function createFractalsApp(a: App): void {
  new FractalsUI(a).build();
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Fractal Explorer' }, createFractalsApp);
}
