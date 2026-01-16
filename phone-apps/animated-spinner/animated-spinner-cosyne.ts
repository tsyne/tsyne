/**
 * Animated Spinner Demo - Cosyne
 *
 * Demonstrates continuous rotation animation using Cosyne
 * - Spinning circles around a central point
 * - Position bindings for orbital motion
 * - Fill color bindings for pulsing effect
 */

import { App } from '../../core/src';
import type { Window } from '../../core/src/window';
import { CosyneContext, cosyne, refreshAllCosyneContexts, enableEventHandling } from '../../cosyne/src';

/**
 * Observable state for spinner animation
 */
export class SpinnerState {
  private baseTime = Date.now();

  getElapsed(): number {
    return (Date.now() - this.baseTime) / 1000;
  }

  /**
   * Get position for orbiting circle at given index
   */
  getOrbitPosition(index: number, numCircles: number, centerX: number, centerY: number, radius: number): { x: number; y: number } {
    const elapsed = this.getElapsed();
    const baseAngle = (index / numCircles) * Math.PI * 2;
    const rotationSpeed = 1.5; // radians per second
    const angle = baseAngle + elapsed * rotationSpeed;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  }

  /**
   * Get pulsing color for spinner circle
   */
  getSpinnerColor(index: number, baseColor: string): string {
    const elapsed = this.getElapsed();
    const phase = (index / 6) * Math.PI * 2;
    const brightness = 0.7 + 0.3 * Math.sin(elapsed * 4 + phase);
    // Parse base color and adjust brightness
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    const adjustedR = Math.floor(r * brightness);
    const adjustedG = Math.floor(g * brightness);
    const adjustedB = Math.floor(b * brightness);
    return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
  }
}

// Layout constants
const WIDTH = 500;
const HEIGHT = 450;
const CENTER_X = 250;
const CENTER_Y = 225;
const ORBIT_RADIUS = 80;
const NUM_SPINNERS = 6;
const SPINNER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

/**
 * Create the animated spinner app
 */
export function createAnimatedSpinnerApp(a: App, win: Window): () => void {
  const state = new SpinnerState();

  win.setContent(() => {
    a.vbox(() => {
      a.label('Animated Spinner').withId('title');

      a.canvasStack(() => {
        cosyne(a, (c: CosyneContext) => {
          // Background
          c.rect(0, 0, WIDTH, HEIGHT - 50)
            .fill('#f5f5f5')
            .withId('background');

          // Outer ring (static decoration)
          c.circle(CENTER_X, CENTER_Y - 25, ORBIT_RADIUS + 30)
            .fill('transparent')
            .stroke('#e0e0e0', 2)
            .withId('outer-ring');

          // 6 orbiting circles with position and color bindings
          for (let i = 0; i < NUM_SPINNERS; i++) {
            const idx = i;
            const baseColor = SPINNER_COLORS[i];
            const initPos = state.getOrbitPosition(i, NUM_SPINNERS, CENTER_X, CENTER_Y - 25, ORBIT_RADIUS);

            c.circle(initPos.x, initPos.y, 20)
              .bindFill(() => state.getSpinnerColor(idx, baseColor))
              .bindPosition(() => state.getOrbitPosition(idx, NUM_SPINNERS, CENTER_X, CENTER_Y - 25, ORBIT_RADIUS))
              .withId(`spinner-${i}`);
          }

          // Center circle
          c.circle(CENTER_X, CENTER_Y - 25, 30)
            .fill('#FF6B6B')
            .withId('center');
        });

        enableEventHandling(
          cosyne(a, () => {}),
          a,
          { width: WIDTH, height: HEIGHT - 50 }
        );
      });
    });
  });

  // Animation loop - refresh bindings at 30fps
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
  }, 33);

  return () => clearInterval(updateInterval);
}

// Standalone execution
if (require.main === module) {
  const { app, resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Animated Spinner' }, (a: any) => {
    a.window({ title: 'Animated Spinner', width: WIDTH, height: HEIGHT }, (win: any) => {
      createAnimatedSpinnerApp(a, win);
      win.show();
    });
  });
}
