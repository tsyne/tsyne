/**
 * Animated Spinner Demo - Cosyne Phase 9
 *
 * Demonstrates continuous rotation animation using Cosyne
 * - Spinning circles around a central point
 * - Elastic easing for bouncy effect
 * - Looping animations
 */

import { App } from '../../core/src';
import { CosyneContext, cosyne, refreshAllCosyneContexts, enableEventHandling, easeInOutCubic, easeOutElastic } from '../../cosyne/src';

export function buildAnimatedSpinnerApp(a: App): void {
  a.canvasStack(() => {
    const cosyneCtx = cosyne(a, (c: CosyneContext) => {
      const centerX = 250;
      const centerY = 225;
      const radius = 80;

      // Create 6 spinning circles around the center
      const numSpinners = 6;
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

      for (let i = 0; i < numSpinners; i++) {
        const angle = (i / numSpinners) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        // Staggered animation start times create wave effect
        const delay = i * 100;

        const spinner = c
          .circle(x, y, 20)
          .fill(colors[i])
          .withId(`spinner-${i}`)
          .animateFluent('scale', 1, 1.5)
          .duration(800)
          .easing(easeOutElastic)
          .delay(delay)
          .loop(true)
          .yoyo(true)
          .start();
      }

      // Rotating overlay circles
      for (let i = 0; i < 3; i++) {
        const rotation = (i * 120);
        c
          .circle(centerX, centerY - 100 - i * 20, 5)
          .fill('#FFFFFF')
          .withId(`ring-${i}`)
          .animateFluent('angle', rotation, rotation + 360)
          .duration(2000 - i * 300)
          .easing('linear')
          .loop(true)
          .start();
      }

      // Center circle with pulse animation
      c
        .circle(centerX, centerY, 30)
        .fill('#FF6B6B')
        .withId('center')
        .animateFluent('alpha', 0.5, 1.0)
        .duration(1000)
        .easing(easeInOutCubic)
        .loop(true)
        .yoyo(true)
        .start();

      // Title background
      c
        .rect(0, 0, 500, 50)
        .fill('#2C3E50');

      // Title text (if supported)
      c
        .text(250, 25, 'Animated Spinner - Phase 9')
        .fill('#FFFFFF');
    });

    // Enable event handling
    enableEventHandling(cosyneCtx, a, {
      width: 500,
      height: 450,
    });
  });
}

// Standalone execution
if (require.main === module) {
  const { app } = require('../../core/src');
  app(
    {
      title: 'Animated Spinner - Cosyne Phase 9',
      width: 600,
      height: 550,
    },
    (a: any) => {
      a.window(
        { title: 'Animated Spinner Demo', width: 500, height: 450 },
        (win: any) => {
          win.setContent(() => {
            buildAnimatedSpinnerApp(a);
          });
          win.show();
        }
      );
    }
  );
}
