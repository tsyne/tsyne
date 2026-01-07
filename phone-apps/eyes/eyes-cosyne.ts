/**
 * Eyes - Animated Eyes Following Mouse (Cosyne Version)
 *
 * Ported from imperative canvas rendering to declarative Cosyne grammar.
 * Demonstrates layered circles with dynamic bindPosition.
 *
 * Original: ~320 lines of pixel-buffer manipulation
 * Cosyne: ~80 lines of declarative rendering
 */

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import { cosyne, refreshAllCosyneContexts } from '../../cosyne/src';

// Configuration
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 200;
const EYE_RADIUS_SCALE = 0.8;
const IRIS_SCALE = 0.4;
const PUPIL_SCALE = 0.5;
const HIGHLIGHT_SCALE = 0.2;

/**
 * Eyes state - tracks mouse position and computes iris offsets
 */
class EyesState {
  mouseX: number = 0;
  mouseY: number = 0;
  width: number;
  height: number;

  leftEye = { x: 0, y: 0, radius: 0 };
  rightEye = { x: 0, y: 0, radius: 0 };

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.computeEyePositions();
    this.mouseX = width / 2;
    this.mouseY = height / 2;
  }

  private computeEyePositions() {
    const eyeRadius = Math.min(this.width / 4, this.height / 2) * EYE_RADIUS_SCALE;
    const centerY = this.height / 2;

    this.leftEye = {
      x: this.width / 4,
      y: centerY,
      radius: eyeRadius,
    };

    this.rightEye = {
      x: (this.width * 3) / 4,
      y: centerY,
      radius: eyeRadius,
    };
  }

  /**
   * Compute iris offset for an eye following mouse
   */
  getIrisOffset(eyeX: number, eyeY: number, eyeRadius: number) {
    const dx = this.mouseX - eyeX;
    const dy = this.mouseY - eyeY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return { x: 0, y: 0 };

    const maxOffset = eyeRadius * (1 - IRIS_SCALE);
    const scale = Math.min(maxOffset / dist, 1);

    return {
      x: (dx * scale) / 2,
      y: (dy * scale) / 2,
    };
  }

  setMousePosition(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }
}

/**
 * Create the eyes app
 */
export function createEyesApp(a: App, win: Window) {
  const width = DEFAULT_WIDTH;
  const height = DEFAULT_HEIGHT;
  const state = new EyesState(width, height);

  win.setContent(() => {
    a.canvasStack(() => {
      cosyne(a, (c) => {
        // Background
        c.rect(0, 0, width, height).fill('#87ceeb');

        // Left eye
        const leftEye = state.leftEye;
        const leftRadius = leftEye.radius;
        const irisRadiusLeft = leftRadius * IRIS_SCALE;
        const pupilRadiusLeft = irisRadiusLeft * PUPIL_SCALE;
        const highlightRadiusLeft = pupilRadiusLeft * HIGHLIGHT_SCALE;

        // Left sclera (white)
        c.circle(leftEye.x, leftEye.y, leftRadius)
          .fill('#ffffff')
          .stroke('#333333', 2)
          .withId('left-sclera');

        // Left iris (green)
        c.circle(0, 0, irisRadiusLeft)
          .bindPosition(() => {
            const offset = state.getIrisOffset(leftEye.x, leftEye.y, leftRadius);
            return {
              x: leftEye.x + offset.x,
              y: leftEye.y + offset.y,
            };
          })
          .fill('#4caf50')
          .stroke('#2e7d32', 1)
          .withId('left-iris');

        // Left pupil (black)
        c.circle(0, 0, pupilRadiusLeft)
          .bindPosition(() => {
            const offset = state.getIrisOffset(leftEye.x, leftEye.y, leftRadius);
            return {
              x: leftEye.x + offset.x,
              y: leftEye.y + offset.y,
            };
          })
          .fill('#000000')
          .withId('left-pupil');

        // Left highlight (white)
        c.circle(0, 0, highlightRadiusLeft)
          .bindPosition(() => {
            const offset = state.getIrisOffset(leftEye.x, leftEye.y, leftRadius);
            return {
              x: leftEye.x + offset.x - pupilRadiusLeft * 0.3,
              y: leftEye.y + offset.y - pupilRadiusLeft * 0.3,
            };
          })
          .fill('#ffffff')
          .withId('left-highlight');

        // Right eye
        const rightEye = state.rightEye;
        const rightRadius = rightEye.radius;
        const irisRadiusRight = rightRadius * IRIS_SCALE;
        const pupilRadiusRight = irisRadiusRight * PUPIL_SCALE;
        const highlightRadiusRight = pupilRadiusRight * HIGHLIGHT_SCALE;

        // Right sclera (white)
        c.circle(rightEye.x, rightEye.y, rightRadius)
          .fill('#ffffff')
          .stroke('#333333', 2)
          .withId('right-sclera');

        // Right iris (green)
        c.circle(0, 0, irisRadiusRight)
          .bindPosition(() => {
            const offset = state.getIrisOffset(rightEye.x, rightEye.y, rightRadius);
            return {
              x: rightEye.x + offset.x,
              y: rightEye.y + offset.y,
            };
          })
          .fill('#4caf50')
          .stroke('#2e7d32', 1)
          .withId('right-iris');

        // Right pupil (black)
        c.circle(0, 0, pupilRadiusRight)
          .bindPosition(() => {
            const offset = state.getIrisOffset(rightEye.x, rightEye.y, rightRadius);
            return {
              x: rightEye.x + offset.x,
              y: rightEye.y + offset.y,
            };
          })
          .fill('#000000')
          .withId('right-pupil');

        // Right highlight (white)
        c.circle(0, 0, highlightRadiusRight)
          .bindPosition(() => {
            const offset = state.getIrisOffset(rightEye.x, rightEye.y, rightRadius);
            return {
              x: rightEye.x + offset.x - pupilRadiusRight * 0.3,
              y: rightEye.y + offset.y - pupilRadiusRight * 0.3,
            };
          })
          .fill('#ffffff')
          .withId('right-highlight');
      });
    });
  });

  // Mouse tracking
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', (e) => {
      state.setMousePosition(e.clientX, e.clientY);
      // Trigger refresh to propagate position changes through bindings
      refreshAllCosyneContexts();
    });
  }
}

export async function createEyesAppWithTransport() {
  const transport = await resolveTransport();
  const a = app(transport);
  const win = a.window({ title: 'Eyes' });
  createEyesApp(a, win);
}

// Auto-run if this is the main module
if (require.main === module) {
  createEyesAppWithTransport().catch(console.error);
}
