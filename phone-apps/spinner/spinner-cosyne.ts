/**
 * Spinner - Loading Animation (Cosyne Version)
 *
 * Demonstrates bindRotation on wedges for rotating animations.
 * Classic loading spinner with 8 rotating segments.
 * Each segment has different opacity/alpha to create sweep effect.
 *
 * Features:
 * - 8 animated wedges rotating together
 * - Alpha fading based on rotation angle
 * - Smooth 2-second full rotation
 * - Clean, declarative animation syntax
 */

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import { cosyne, refreshAllCosyneContexts } from '../../cosyne/src';

/**
 * Spinner state - tracks rotation angle
 */
class SpinnerState {
  baseTime: number = Date.now();

  getRotation(): number {
    const elapsed = (Date.now() - this.baseTime) / 1000; // seconds
    return elapsed * Math.PI * 2; // Full rotation per 1 second
  }

  /**
   * Get alpha for a wedge segment based on rotation
   * Creates a sweep effect as rotation changes
   */
  getSegmentAlpha(segmentIndex: number): number {
    const rotation = this.getRotation();
    const segmentAngle = (segmentIndex / 8) * Math.PI * 2;
    const angleDiff = Math.abs(((rotation - segmentAngle) % (Math.PI * 2)) - Math.PI);
    return Math.max(0.2, 1 - angleDiff / Math.PI);
  }
}

/**
 * Create the spinner app
 */
export function createSpinnerApp(a: App, win: Window) {
  const state = new SpinnerState();

  win.setContent(() => {
    a.vbox(() => {
      a.label('Loading...').withId('title');

      // Spinner canvas
      a.center(() => {
        a.canvasStack(() => {
          cosyne(a, (c) => {
            // Background
            c.rect(0, 0, 300, 300)
              .fill('#ffffff')
              .stroke('#eeeeee', 1)
              .withId('background');

            // Outer ring (static)
            c.circle(150, 150, 80)
              .fill('transparent')
              .stroke('#e0e0e0', 2)
              .withId('outer-ring');

            // 8 rotating wedges
            const colors = [
              '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
              '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
            ];

            for (let i = 0; i < 8; i++) {
              const startAngle = (i / 8) * Math.PI * 2;
              const endAngle = ((i + 1) / 8) * Math.PI * 2;

              c.wedge(150, 150, 60)
                .fill(colors[i])
                .bindAlpha(() => state.getSegmentAlpha(i))
                .withId(`wedge-${i}`);
            }

            // Inner circle (center hub)
            c.circle(150, 150, 20)
              .fill('#ffffff')
              .stroke('#cccccc', 1)
              .withId('center-hub');
          });
        });
      });

      a.label('Processing...').withId('status');
    });
  });

  // Update loop - refresh every 30ms for smooth animation
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
  }, 30);

  return () => clearInterval(updateInterval);
}

export async function createSpinnerAppWithTransport() {
  const transport = await resolveTransport();
  const a = app(transport);
  const win = a.window({ title: 'Spinner' });
  createSpinnerApp(a, win);
}

if (require.main === module) {
  createSpinnerAppWithTransport().catch(console.error);
}
