/**
 * Fractal Tree - Recursive Tree Generation (Cosyne Version)
 *
 * Demonstrates nested transforms for creating complex, recursive structures.
 * Generates a tree by recursively branching at angles and scaling down.
 *
 * Features:
 * - Recursive tree structure with 5 levels
 * - Each level thinner and shorter than parent
 * - Branches at ~30 degree angles
 * - Animated rotation for growth effect
 * - Leaves at branch tips
 */

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import { cosyne, refreshAllCosyneContexts } from '../../cosyne/src';

/**
 * Fractal tree state - tracks animation
 */
class FractalTreeState {
  baseTime: number = Date.now();

  getGrowthPhase(): number {
    const elapsed = (Date.now() - this.baseTime) / 1000;
    return Math.min(1, elapsed / 3); // 3 second growth animation
  }

  getRotation(): number {
    const elapsed = (Date.now() - this.baseTime) / 1000;
    return elapsed * 0.3; // Slow rotation for wind effect
  }
}

/**
 * Create the fractal tree app
 */
export function createFractalTreeApp(a: App, win: Window) {
  const state = new FractalTreeState();

  win.setContent(() => {
    a.vbox(() => {
      a.label('Fractal Tree').withId('title');

      // Tree canvas
      a.center(() => {
        a.canvasStack(() => {
          cosyne(a, (c) => {
            // Background (sky)
            c.rect(0, 0, 400, 500)
              .fill('#87CEEB')
              .stroke('#6BA5D1', 1)
              .withId('background');

            // Grass
            c.rect(0, 400, 400, 100)
              .fill('#90EE90')
              .withId('grass');

            /**
             * Recursive function to draw tree branches
             */
            const drawBranch = (
              c: any,
              x: number,
              y: number,
              angle: number,
              depth: number,
              length: number,
              thickness: number,
              growth: number
            ) => {
              if (depth === 0 || length < 2) {
                // Draw leaf
                c.circle(x, y, 4)
                  .fill('#228B22')
                  .withId(`leaf-${Math.random()}`);
                return;
              }

              // Scale length by growth phase for animation
              const animatedLength = length * growth;

              // Calculate end point
              const endX = x + Math.cos(angle) * animatedLength;
              const endY = y + Math.sin(angle) * animatedLength;

              // Draw branch line
              c.line(x, y, endX, endY)
                .stroke('#8B4513', thickness)
                .withId(`branch-${depth}-${Math.random()}`);

              // Recursively draw left branch
              const leftAngle = angle + 0.4; // ~23 degrees
              drawBranch(
                c,
                endX,
                endY,
                leftAngle,
                depth - 1,
                length * 0.7,
                thickness * 0.8,
                growth
              );

              // Recursively draw right branch
              const rightAngle = angle - 0.4; // ~-23 degrees
              drawBranch(
                c,
                endX,
                endY,
                rightAngle,
                depth - 1,
                length * 0.7,
                thickness * 0.8,
                growth
              );
            };

            const growth = state.getGrowthPhase();
            const rotation = state.getRotation();

            // Apply slight rotation for wind effect
            c.transform(
              { rotate: rotation * 0.05 }, // Small wind sway
              (ctx) => {
                // Draw tree starting from base
                drawBranch(
                  ctx,
                  200, // x: center horizontally
                  400, // y: on the grass
                  -Math.PI / 2, // angle: straight up
                  5, // depth: 5 levels
                  60, // initial length
                  6, // initial thickness
                  growth // growth animation
                );
              }
            );
          });
        });
      });

      a.label('Fractal tree grows recursively').withId('subtitle');
    });
  });

  // Update loop - refresh every 50ms for smooth growth
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
  }, 50);

  return () => clearInterval(updateInterval);
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Fractal Tree' }, (a) => {
    a.window({ title: 'Fractal Tree', width: 450, height: 600 }, (win) => {
      createFractalTreeApp(a, win);
      win.show();
    });
  });
}
