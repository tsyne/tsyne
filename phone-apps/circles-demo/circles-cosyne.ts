/**
 * Circles Demo - Dynamic Circle Collection (Cosyne Version)
 *
 * Demonstrates collection binding with add/remove/update.
 * Creates animated circles at random positions that move over time.
 * Shows efficient diffing: only updated circles are re-rendered.
 *
 * Features:
 * - Collection of 20 circles with unique IDs
 * - Circle positions update smoothly based on time + ID
 * - Add/remove circles with button clicks
 * - Efficient diffing tracks which circles changed
 */

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import { cosyne, refreshAllCosyneContexts, CollectionBindingOptions } from '../../cosyne/src';

interface CircleData {
  id: number;
  color: string;
}

/**
 * Circles demo state - manages circle collection
 */
class CirclesState {
  circles: CircleData[] = [];
  nextId: number = 0;
  baseTime: number = Date.now();

  constructor() {
    // Start with 10 circles
    this.addCircles(10);
  }

  private addCircles(count: number) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    for (let i = 0; i < count; i++) {
      this.circles.push({
        id: this.nextId++,
        color: colors[this.nextId % colors.length],
      });
    }
  }

  addCircle() {
    if (this.circles.length < 30) {
      this.addCircles(1);
    }
  }

  removeCircle() {
    if (this.circles.length > 5) {
      this.circles.pop();
    }
  }

  /**
   * Calculate position for a circle based on ID and time
   */
  getCirclePosition(circle: CircleData) {
    const elapsed = (Date.now() - this.baseTime) / 1000; // seconds
    const angle = (circle.id * 0.4) + elapsed * 0.5;
    const radius = 80 + Math.sin(elapsed * 0.3 + circle.id) * 20;

    return {
      x: 200 + Math.cos(angle) * radius,
      y: 150 + Math.sin(angle) * radius,
    };
  }

  getCircleRadius(circle: CircleData) {
    const elapsed = (Date.now() - this.baseTime) / 1000;
    return 15 + Math.sin(elapsed * 0.7 + circle.id * 0.5) * 5;
  }
}

/**
 * Create the circles demo app
 */
export function createCirclesApp(a: App, win: Window) {
  const state = new CirclesState();

  win.setContent(() => {
    a.vbox(() => {
      // Title
      a.label('Circles Collection Demo').withId('title');

      // Control buttons
      a.hbox(() => {
        a.button('Add Circle').onTap(() => {
          state.addCircle();
          refreshAllCosyneContexts();
        });

        a.button('Remove Circle').onTap(() => {
          state.removeCircle();
          refreshAllCosyneContexts();
        });

        a.label(`Circles: ${state.circles.length}`).withId('count-display');
      });

      // Canvas with animated circles
      a.center(() => {
        a.canvasStack(() => {
          cosyne(a, (c) => {
            // Background
            c.rect(0, 0, 400, 300)
              .fill('#f0f0f0')
              .stroke('#333333', 1)
              .withId('background');

            // Center crosshair
            c.line(200, 100, 200, 200)
              .stroke('#cccccc', 1)
              .withId('vline');
            c.line(100, 150, 300, 150)
              .stroke('#cccccc', 1)
              .withId('hline');

            // Animated circles collection
            c.circles()
              .bindTo({
                items: () => state.circles,
                render: (circleData: CircleData) => {
                  const pos = state.getCirclePosition(circleData);
                  const radius = state.getCircleRadius(circleData);

                  return c
                    .circle(pos.x, pos.y, radius)
                    .fill(circleData.color)
                    .stroke('#333333', 1)
                    .withId(`circle-${circleData.id}`);
                },
                trackBy: (circleData: CircleData) => circleData.id,
              });
          });
        });
      });

      // Info
      a.label('Circles move smoothly based on time and ID').withId('info');
    });
  });

  // Update loop - refresh collection every 50ms for smooth animation
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
    // Also update count display (would be automatic with reactive bindings)
    try {
      const countLabel = a.getElementById('count-display');
      if (countLabel && countLabel.setText) {
        countLabel.setText(`Circles: ${state.circles.length}`);
      }
    } catch {
      // Label may not be accessible
    }
  }, 50);

  return () => clearInterval(updateInterval);
}

export async function createCirclesAppWithTransport() {
  const transport = await resolveTransport();
  const a = app(transport);
  const win = a.window({ title: 'Circles Demo' });
  createCirclesApp(a, win);
}

if (require.main === module) {
  createCirclesAppWithTransport().catch(console.error);
}
