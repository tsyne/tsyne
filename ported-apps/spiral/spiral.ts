/**
 * Spiral Canvas Demo - Cosyne
 *
 * Port of hakimel's spiral CodePen (https://codepen.io/hakimel/pen/QdWpRv)
 * Pseudo-declarative canvas animation with drag-to-rotate interaction.
 *
 * @tsyne-app:name Spiral
 * @tsyne-app:icon mediaVideo
 * @tsyne-app:category fun
 * @tsyne-app:args (a: App, win?: ITsyneWindow) => void
 */

import { App, asRenderTarget } from 'tsyne';
import type { Window, ITsyneWindow, IRenderTarget } from 'tsyne';
import { CosyneContext, cosyne, refreshAllCosyneContexts, enableEventHandling } from 'cosyne';

// Spiral configuration (matching original)
const MAX_OFFSET = 400;
const SPACING = 4;
const POINTS = Math.floor(MAX_OFFSET / SPACING);
const PEAK = MAX_OFFSET * 0.25;
const POINTS_PER_LAP = 6;

// Canvas dimensions
const WIDTH = 600;
const HEIGHT = 600;

/**
 * Observable state for spiral animation
 */
export class SpiralState {
  time = 0;
  velocity = 0.1;
  velocityTarget = 0.1;

  // Drag tracking
  dragging = false;
  lastX = 0;
  lastY = 0;

  /**
   * Update time and velocity with easing
   */
  step(): void {
    this.time += this.velocity;
    this.velocity += (this.velocityTarget - this.velocity) * 0.3;
  }

  /**
   * Start drag at position
   */
  startDrag(x: number, y: number): void {
    this.dragging = true;
    this.lastX = x;
    this.lastY = y;
  }

  /**
   * Update velocity based on drag movement
   */
  updateDrag(x: number, y: number): void {
    if (!this.dragging) return;

    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    let vx = (x - this.lastX) / 100;
    let vy = (y - this.lastY) / 100;

    // Flip velocity based on quadrant (creates intuitive rotation)
    if (y < cy) vx *= -1;
    if (x > cx) vy *= -1;

    this.velocityTarget = vx + vy;

    this.lastX = x;
    this.lastY = y;
  }

  /**
   * End drag
   */
  endDrag(): void {
    this.dragging = false;
  }

  /**
   * Get spiral point at index (0 to POINTS)
   * Returns {x, y, alpha} for the point
   */
  getPoint(i: number): { x: number; y: number; alpha: number } {
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    const value = i * SPACING + (this.time % SPACING);

    // Spiral calculation
    const ax = Math.sin(value / POINTS_PER_LAP) * Math.PI;
    const ay = Math.cos(value / POINTS_PER_LAP) * Math.PI;

    let x = ax * value;
    let y = ay * value * 0.35;

    // Vertical displacement for 3D-like effect
    const o = 1 - Math.min(value, PEAK) / PEAK;
    y -= Math.pow(o, 2) * 200;
    y += (200 * value) / MAX_OFFSET;
    y += (x / cx) * WIDTH * 0.1;

    // Alpha fades with distance from center
    const alpha = 1 - value / MAX_OFFSET;

    return { x: cx + x, y: cy + y, alpha: Math.max(0, Math.min(1, alpha)) };
  }

  /**
   * Get line segment endpoints for index i
   * Connects point i to point i-1
   */
  getLineSegment(i: number): { x1: number; y1: number; x2: number; y2: number; alpha: number } {
    const p1 = this.getPoint(i);
    const p2 = this.getPoint(i - 1);
    // Use average alpha for the segment
    const alpha = (p1.alpha + p2.alpha) / 2;
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, alpha };
  }
}

/**
 * Build the spiral demo app
 */
export function buildSpiralApp(a: App, target: IRenderTarget): () => void {
  const state = new SpiralState();
  let keepRunning = true;

  target.setContent(() => {
    a.vbox(() => {
      a.label('Drag to rotate').withId('instructions');

      a.canvasStack(() => {
        const ctx = cosyne(a, (c: CosyneContext) => {
          // Dark background
          c.rect(0, 0, WIDTH, HEIGHT)
            .fill('#111111')
            .withId('background')
            .onDragStart((e) => {
              state.startDrag(e.x, e.y);
            })
            .onDrag((e) => {
              state.updateDrag(e.x, e.y);
            })
            .onDragEnd(() => {
              state.endDrag();
            });

          // Create spiral line segments with bindings
          // We draw from outer (POINTS) to inner (1) to match original
          for (let i = POINTS; i >= 1; i--) {
            const idx = i;
            const initial = state.getLineSegment(idx);

            c.line(initial.x1, initial.y1, initial.x2, initial.y2, {
              strokeColor: '#ffffff',
              strokeWidth: 2,
            })
              .bindEndpoint(() => {
                const seg = state.getLineSegment(idx);
                return { x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 };
              })
              .bindAlpha(() => state.getLineSegment(idx).alpha)
              .passthrough()
              .withId(`line-${idx}`);
          }

          // Final line to center and top (decorative)
          const centerY = HEIGHT / 2 - 200;
          c.line(WIDTH / 2, centerY, WIDTH / 2, 0, {
            strokeColor: '#ffffff',
            strokeWidth: 2,
          })
            .bindAlpha(() => 0.3)
            .passthrough()
            .withId('center-line');
        });

        enableEventHandling(ctx, a, { width: WIDTH, height: HEIGHT });
      });
    });
  });

  // Animation loop - 60fps
  const animate = async () => {
    while (keepRunning) {
      state.step();
      refreshAllCosyneContexts();
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  };
  animate();

  return () => { keepRunning = false; };
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport, getAppMetadata, screenshotIfRequested } = require('tsyne');

  const meta = getAppMetadata();
  app(resolveTransport(), { title: meta?.name ?? 'Spiral' }, (a: App) => {
    a.window({ title: 'Spiral', width: WIDTH + 40, height: HEIGHT + 80 }, (win: Window) => {
      const target = asRenderTarget(win as ITsyneWindow);
      const cleanup = buildSpiralApp(a, target);
      win.setCloseIntercept(() => {
        cleanup();
        return true;
      });
      win.show();
      screenshotIfRequested(win, 500);
    });
  });
}

// PhoneTop embedded entry point
export default function(a: App, win?: ITsyneWindow): void {
  const target = asRenderTarget(win);
  const cleanup = buildSpiralApp(a, target);
  target.onClose?.(() => cleanup());
}
