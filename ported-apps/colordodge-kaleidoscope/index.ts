/**
 * Kaleidoscope - Interactive Radial Symmetry Visualization
 *
 * Ported from https://colordodge.com/Kaleidoscope/
 * Original author: Colordodge
 *
 * Creates a kaleidoscope effect with radial symmetry. Mouse movement
 * draws patterns that are reflected and rotated around the center.
 *
 * Features:
 * - Configurable number of segments (6, 8, 12, etc.)
 * - Mouse-following pattern generation
 * - Trail persistence with fade effect
 * - Multiple color modes
 * - Keyboard controls for adjustments
 *
 * Copyright (c) 2025 Paul Hammant
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * @tsyne-app:name Kaleidoscope
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 22,20 2,20"/></svg>
 * @tsyne-app:category graphics
 * @tsyne-app:builder createKaleidoscopeApp
 * @tsyne-app:args app
 */

import { App, asRenderTarget } from 'tsyne';
import type { Window, ITsyneWindow, IRenderTarget } from 'tsyne';
import { CosyneContext, cosyne, refreshAllCosyneContexts, enableEventHandling } from 'cosyne';

// Canvas dimensions
const WIDTH = 500;
const HEIGHT = 500;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

// Trail point structure
interface TrailPoint {
  x: number;
  y: number;
  age: number;
  color: string;
}

// Color palettes
const palettes = {
  rainbow: (t: number) => `hsl(${(t * 360) % 360}, 80%, 60%)`,
  fire: (t: number) => `hsl(${(t * 60) % 60}, 100%, ${50 + Math.sin(t * 10) * 20}%)`,
  ice: (t: number) => `hsl(${180 + (t * 60) % 60}, 70%, ${50 + Math.sin(t * 10) * 20}%)`,
  neon: (t: number) => `hsl(${(t * 120 + 280) % 360}, 100%, 60%)`,
  mono: () => '#ffffff',
};

const paletteNames = Object.keys(palettes) as (keyof typeof palettes)[];

/**
 * Kaleidoscope state management
 */
export class KaleidoscopeState {
  // Configuration
  segments: number = 8;
  currentPalette: keyof typeof palettes = 'rainbow';
  lineWidth: number = 2;
  trailLength: number = 50;
  fadeSpeed: number = 0.02;

  // Mouse state
  mouseX: number = CENTER_X;
  mouseY: number = CENTER_Y;
  lastMouseX: number = CENTER_X;
  lastMouseY: number = CENTER_Y;
  isDrawing: boolean = false;

  // Trail history
  trail: TrailPoint[] = [];
  time: number = 0;

  /**
   * Update mouse position
   */
  updateMouse(x: number, y: number): void {
    this.lastMouseX = this.mouseX;
    this.lastMouseY = this.mouseY;
    this.mouseX = x;
    this.mouseY = y;

    if (this.isDrawing) {
      this.addTrailPoint();
    }
  }

  /**
   * Add a point to the trail
   */
  addTrailPoint(): void {
    const palette = palettes[this.currentPalette];
    this.trail.push({
      x: this.mouseX,
      y: this.mouseY,
      age: 0,
      color: palette(this.time),
    });

    // Limit trail length
    while (this.trail.length > this.trailLength) {
      this.trail.shift();
    }
  }

  /**
   * Step the animation
   */
  step(): void {
    this.time += 0.01;

    // Age all trail points
    for (const point of this.trail) {
      point.age += this.fadeSpeed;
    }

    // Remove fully faded points
    this.trail = this.trail.filter((p) => p.age < 1);
  }

  /**
   * Convert a point from canvas coordinates to relative-to-center
   */
  toRelative(x: number, y: number): { rx: number; ry: number } {
    return {
      rx: x - CENTER_X,
      ry: y - CENTER_Y,
    };
  }

  /**
   * Rotate a point around the origin
   */
  rotatePoint(rx: number, ry: number, angle: number): { x: number; y: number } {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: CENTER_X + rx * cos - ry * sin,
      y: CENTER_Y + rx * sin + ry * cos,
    };
  }

  /**
   * Mirror a point horizontally (for kaleidoscope reflection)
   */
  mirrorPoint(rx: number, ry: number): { rx: number; ry: number } {
    return { rx: -rx, ry };
  }

  /**
   * Get all kaleidoscope points for a single input point
   * Returns an array of {x, y} positions for each segment
   */
  getKaleidoscopePoints(px: number, py: number): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    const { rx, ry } = this.toRelative(px, py);
    const angleStep = (Math.PI * 2) / this.segments;

    for (let i = 0; i < this.segments; i++) {
      const angle = i * angleStep;

      // Original point rotated
      points.push(this.rotatePoint(rx, ry, angle));

      // Mirrored point rotated (creates kaleidoscope reflection)
      const { rx: mrx, ry: mry } = this.mirrorPoint(rx, ry);
      points.push(this.rotatePoint(mrx, mry, angle));
    }

    return points;
  }

  /**
   * Change number of segments
   */
  setSegments(n: number): void {
    this.segments = Math.max(2, Math.min(24, n));
  }

  /**
   * Cycle to next palette
   */
  nextPalette(): void {
    const idx = paletteNames.indexOf(this.currentPalette);
    this.currentPalette = paletteNames[(idx + 1) % paletteNames.length];
  }

  /**
   * Clear the trail
   */
  clear(): void {
    this.trail = [];
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    return `Segments: ${this.segments} | Palette: ${this.currentPalette} | Trail: ${this.trail.length}`;
  }
}

/**
 * Build the kaleidoscope app
 */
export function buildKaleidoscopeApp(a: App, target: IRenderTarget): () => void {
  const state = new KaleidoscopeState();
  let keepRunning = true;

  target.setContent(() => {
    a.vbox(() => {
      // Control row
      a.hbox(() => {
        a.button('-').withId('seg-minus').onClick(() => {
          state.setSegments(state.segments - 2);
        });
        a.label('Segments').withId('seg-label');
        a.button('+').withId('seg-plus').onClick(() => {
          state.setSegments(state.segments + 2);
        });
        a.button('Palette').withId('palette').onClick(() => {
          state.nextPalette();
        });
        a.button('Clear').withId('clear').onClick(() => {
          state.clear();
        });
      });

      // Canvas
      a.canvasStack(() => {
        const ctx = cosyne(a, (c: CosyneContext) => {
          // Black background
          c.rect(0, 0, WIDTH, HEIGHT)
            .fill('#000000')
            .withId('background')
            .onMouseMove((e: { x: number; y: number }) => {
              state.updateMouse(e.x, e.y);
            })
            .onDragStart((e: { x: number; y: number }) => {
              state.isDrawing = true;
              state.updateMouse(e.x, e.y);
            })
            .onDrag((e: { x: number; y: number }) => {
              state.updateMouse(e.x, e.y);
            })
            .onDragEnd(() => {
              state.isDrawing = false;
            });

          // Draw center point indicator
          c.circle(CENTER_X, CENTER_Y, 3)
            .fill('#333333')
            .withId('center');

          // Draw segment divider lines (faint)
          const angleStep = (Math.PI * 2) / state.segments;
          for (let i = 0; i < state.segments; i++) {
            const angle = i * angleStep;
            const endX = CENTER_X + Math.cos(angle) * Math.max(WIDTH, HEIGHT);
            const endY = CENTER_Y + Math.sin(angle) * Math.max(WIDTH, HEIGHT);
            c.line(CENTER_X, CENTER_Y, endX, endY)
              .stroke('#222222', 1)
              .withId(`divider-${i}`);
          }

          // Draw trail points with kaleidoscope effect
          for (let i = 0; i < state.trail.length; i++) {
            const point = state.trail[i];
            const alpha = 1 - point.age;
            const kPoints = state.getKaleidoscopePoints(point.x, point.y);

            // Draw a circle at each kaleidoscope position
            for (let j = 0; j < kPoints.length; j++) {
              const kp = kPoints[j];
              c.circle(kp.x, kp.y, state.lineWidth)
                .fill(point.color)
                .setAlpha(alpha)
                .withId(`trail-${i}-${j}`);
            }
          }

          // Draw current mouse position with kaleidoscope effect
          if (state.isDrawing) {
            const palette = palettes[state.currentPalette];
            const color = palette(state.time);
            const kPoints = state.getKaleidoscopePoints(state.mouseX, state.mouseY);

            for (let j = 0; j < kPoints.length; j++) {
              const kp = kPoints[j];
              c.circle(kp.x, kp.y, state.lineWidth + 1)
                .fill(color)
                .withId(`cursor-${j}`);
            }
          }
        });

        enableEventHandling(ctx, a, { width: WIDTH, height: HEIGHT });
      });

      // Status bar
      a.hbox(() => {
        a.label('').withId('status').bindText(() => state.getStatusText());
      });

      // Instructions
      a.label('Drag to draw kaleidoscope patterns');
    });
  });

  // Animation loop
  const animate = async () => {
    while (keepRunning) {
      state.step();
      refreshAllCosyneContexts();
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };
  animate();

  return () => {
    keepRunning = false;
  };
}

/**
 * Create the Kaleidoscope app (entry point)
 */
export function createKaleidoscopeApp(a: App): void {
  a.window({ title: 'Kaleidoscope', width: WIDTH + 40, height: HEIGHT + 140 }, (win: Window) => {
    const target = asRenderTarget(win as ITsyneWindow);
    const cleanup = buildKaleidoscopeApp(a, target);
    win.setCloseIntercept(() => {
      cleanup();
      return true;
    });
    win.show();
  });
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport, getAppMetadata } = require('tsyne');
  const meta = getAppMetadata();
  app(resolveTransport(), { title: meta?.name ?? 'Kaleidoscope' }, createKaleidoscopeApp);
}

// PhoneTop embedded entry point
export default function (a: App, win?: ITsyneWindow): void {
  const target = asRenderTarget(win);
  const cleanup = buildKaleidoscopeApp(a, target);
  target.onClose?.(() => cleanup());
}
