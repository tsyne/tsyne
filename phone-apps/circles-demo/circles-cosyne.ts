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

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import { cosyne, refreshAllCosyneContexts, CosyneContext } from 'cosyne';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
const MAX_CIRCLES = 20;

/**
 * Create the circles demo app - demonstrates animated circles with position bindings
 */
export function createCirclesApp(a: App, win: Window) {
  const baseTime = Date.now();

  // Pre-allocate circle slots - use visibility to show/hide
  const circleVisible: boolean[] = new Array(MAX_CIRCLES).fill(false);
  for (let i = 0; i < 10; i++) circleVisible[i] = true; // Start with 10 visible

  const getCirclePosition = (id: number) => {
    const elapsed = (Date.now() - baseTime) / 1000;
    const angle = id * 0.4 + elapsed * 0.5;
    const radius = 80 + Math.sin(elapsed * 0.3 + id) * 20;
    return {
      x: 200 + Math.cos(angle) * radius,
      y: 150 + Math.sin(angle) * radius,
    };
  };

  let countLabel: any;

  win.setContent(() => {
    a.vbox(() => {
      a.label('Circles Demo - Cosyne').withId('title');

      a.hbox(() => {
        a.button('Add Circle').onClick(() => {
          const idx = circleVisible.findIndex((v) => !v);
          if (idx !== -1) {
            circleVisible[idx] = true;
            refreshAllCosyneContexts();
            updateCount();
          }
        });

        a.button('Remove Circle').onClick(() => {
          const idx = circleVisible.lastIndexOf(true);
          if (idx > 4) { // Keep at least 5
            circleVisible[idx] = false;
            refreshAllCosyneContexts();
            updateCount();
          }
        });

        countLabel = a.label('Circles: 10').withId('count-display');
      });

      a.canvasStack(() => {
        cosyne(a, (c: CosyneContext) => {
          // Background - defines canvas size
          c.rect(0, 0, 400, 300).fill('#f0f0f0').stroke('#333333', 2);

          // Center crosshair at (200, 150)
          c.line(200, 50, 200, 250).stroke('#aaaaaa', 1);
          c.line(50, 150, 350, 150).stroke('#aaaaaa', 1);

          // Create all circles upfront with position bindings
          // Hidden circles moved off-screen (canvas primitives don't support hide/show)
          for (let i = 0; i < MAX_CIRCLES; i++) {
            const color = COLORS[i % COLORS.length];
            c.circle(200, 150, 15)
              .fill(color)
              .stroke('#333333', 1)
              .withId(`circle-${i}`)
              .bindPosition(() => {
                if (!circleVisible[i]) return { x: -100, y: -100 };
                return getCirclePosition(i);
              });
          }
        });
      });

      a.label('Circles orbit the center point').withId('info');
    });
  });

  const updateCount = () => {
    const count = circleVisible.filter((v) => v).length;
    if (countLabel?.setText) countLabel.setText(`Circles: ${count}`);
  };

  // Animation loop
  const interval = setInterval(() => refreshAllCosyneContexts(), 50);

  return () => clearInterval(interval);
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Circles Demo' }, (a) => {
    a.window({ title: 'Circles Demo', width: 450, height: 400 }, (win) => {
      createCirclesApp(a, win);
      win.show();
    });
  });
}
