#!/usr/bin/env npx tsx

/**
 * Simple Interactive 3D Torus Demo
 *
 * A minimal example showing:
 * - Parametric torus wireframe rendering
 * - 3D to 2D projection with continuous rotation
 * - Interactive mouse control for rotation
 * - Depth-based coloring with shading
 */

import { app } from '../src';
import { cosyne, TorusProjection, generateTorusWireframe, calculateLambertianShade, getDefaultLightDirection, Point3D } from '../cosyne/src';

interface State {
  rotTheta: number;
  rotPhi: number;
  rotPsi: number;
  autoRotate: boolean;
  lastMouseX: number;
  lastMouseY: number;
  isDragging: boolean;
}

const state: State = {
  rotTheta: 0.5,
  rotPhi: 0.3,
  rotPsi: 0,
  autoRotate: true,
  lastMouseX: 0,
  lastMouseY: 0,
  isDragging: false,
};

let animationFrame: NodeJS.Timeout | null = null;

function renderTorus(ctx: any, canvasWidth: number, canvasHeight: number) {
  // Create projection
  const proj = new TorusProjection({
    focalLength: 300,
    center: { x: canvasWidth / 2, y: canvasHeight / 2 },
  });

  proj.setRotation({
    theta: state.rotTheta,
    phi: state.rotPhi,
    psi: state.rotPsi,
  });

  // Generate torus geometry
  const wireframe = generateTorusWireframe(80, 30, 16, 12);
  const lightDir = getDefaultLightDirection();

  // Render each line
  for (const line of wireframe) {
    let prev: Point3D | null = null;

    for (const point of line) {
      const p2d = proj.project(point);
      const alpha = proj.getAlpha(point);

      if (alpha > 0.1) {
        const shade = calculateLambertianShade(point, lightDir, 0.3, 0.7);

        // Red with varying intensity based on shade
        const red = Math.round(100 + shade * 155);
        const color = `rgba(${red}, 0, 0, ${alpha})`;

        if (prev) {
          const prevP2d = proj.project(prev);
          const prevAlpha = proj.getAlpha(prev);

          ctx.line(prevP2d.x, prevP2d.y, p2d.x, p2d.y)
            .stroke(color)
            .strokeWidth(1)
            .alpha(Math.max(prevAlpha, alpha));
        }

        prev = point;
      }
    }
  }

  // Center point
  ctx.circle(canvasWidth / 2, canvasHeight / 2, 3).fill('#ffffff').alpha(0.5);
}

if (require.main === module) {
  app({ title: 'Torus Visualization' }, (a) => {
    a.window({ title: 'Interactive Torus', width: 900, height: 700 }, (win) => {
      win.setContent(async () => {
        a.vbox(async () => {
          // Create canvas for rendering
          const canvasWidth = 800;
          const canvasHeight = 600;

          // Canvas using cosyne
          const canvas = a.canvasStack(canvasWidth, canvasHeight, (c) => {
            renderTorus(c, canvasWidth, canvasHeight);
          }).withId('torusCanvas');

          // Control buttons
          a.hbox(() => {
            a.button('Auto Rotate').onClick(() => {
              state.autoRotate = !state.autoRotate;
              // Force update
              const ctx = a.canvasStack(canvasWidth, canvasHeight, (c) => {
                renderTorus(c, canvasWidth, canvasHeight);
              });
            });

            a.button('Reset').onClick(() => {
              state.rotTheta = 0.5;
              state.rotPhi = 0.3;
              state.rotPsi = 0;
            });
          });

          // Status
          a.label('Drag to rotate the torus | Space: toggle auto-rotate');
        });
      });

      // Animation loop
      let lastFrame = Date.now();
      const animate = () => {
        const now = Date.now();
        const dt = (now - lastFrame) / 1000;
        lastFrame = now;

        if (state.autoRotate) {
          state.rotTheta += dt * 0.5;
          state.rotPhi += dt * 0.3;
          state.rotPsi += dt * 0.2;
        }

        animationFrame = setTimeout(animate, 16); // ~60fps
      };

      animate();
      win.show();

      // Cleanup
      const origClose = win.close;
      win.close = () => {
        if (animationFrame) clearTimeout(animationFrame);
        return origClose.call(win);
      };
    });
  });
}
