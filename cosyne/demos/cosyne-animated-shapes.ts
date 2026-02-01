/**
 * Animated Shapes Demo - Pure Cosyne (TypeScript)
 *
 * Demonstrates Cosyne drawing capabilities without shaders:
 * - Animated polygons
 * - Rotating patterns
 * - Parametric curves
 * - Interactive updates
 * - Blend modes
 *
 * Run: npx tsx cosyne/demos/cosyne-animated-shapes.ts
 */

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import {
  cosyne,
  CosyneContext,
  enableEventHandling,
  refreshAllCosyneContexts,
} from 'cosyne';

const WIDTH = 500;
const HEIGHT = 500;

function createAnimatedShapesDemo(a: App): void {
  let animationSpeed = 1.0;
  let shapeType = 0;  // 0=polygon, 1=star, 2=spiral, 3=wave
  let time = 0;

  const shapeNames = ['Polygon', 'Star', 'Spiral', 'Wave'];

  a.window({ title: 'Animated Shapes (Cosyne)', width: WIDTH + 40, height: HEIGHT + 120 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Shape type buttons
        a.hbox(() => {
          a.label('Shape: ');
          for (const name of shapeNames) {
            a.button(name).onClick(() => {
              shapeType = shapeNames.indexOf(name);
            });
          }
        });

        // Speed controls
        a.hbox(() => {
          a.button('Speed: Slow').onClick(() => { animationSpeed = 0.5; });
          a.button('Speed: Normal').onClick(() => { animationSpeed = 1.0; });
          a.button('Speed: Fast').onClick(() => { animationSpeed = 2.0; });
        });

        // Canvas
        a.canvasStack(() => {
          cosyne(a, (c: CosyneContext) => {
            // Background
            c.rect(0, 0, WIDTH, HEIGHT)
              .fill('#0a0a15')
              .withId('bg');

            const centerX = WIDTH / 2;
            const centerY = HEIGHT / 2;

            if (shapeType === 0) {
              // Rotating polygon
              const sides = Math.floor(3 + (time * 0.5) % 6);
              const radius = 80 + Math.sin(time * 0.03) * 20;
              const angle = (time * 0.02) * animationSpeed;

              for (let i = 0; i < sides; i++) {
                const a1 = (i / sides) * Math.PI * 2 + angle;
                const a2 = ((i + 1) / sides) * Math.PI * 2 + angle;
                const x1 = centerX + Math.cos(a1) * radius;
                const y1 = centerY + Math.sin(a1) * radius;
                const x2 = centerX + Math.cos(a2) * radius;
                const y2 = centerY + Math.sin(a2) * radius;

                const hue = (i / sides + time * 0.002) * 360;
                const color = `hsl(${hue}, 100%, 50%)`;

                c.line(x1, y1, x2, y2)
                  .stroke(color, 3)
                  .withId(`edge-${i}`);
              }

              // Draw connecting lines to center
              for (let i = 0; i < sides; i++) {
                const a = (i / sides) * Math.PI * 2 + angle;
                const x = centerX + Math.cos(a) * radius;
                const y = centerY + Math.sin(a) * radius;
                c.line(centerX, centerY, x, y)
                  .stroke('#ffffff', 1)
                  .setAlpha(0.3)
                  .withId(`spoke-${i}`);
              }
            } else if (shapeType === 1) {
              // Rotating star
              const points = 5;
              const outerR = 100;
              const innerR = 40;
              const angle = (time * 0.02) * animationSpeed;

              for (let i = 0; i < points; i++) {
                const a1 = (i / points) * Math.PI * 2 + angle;
                const a2 = ((i + 0.5) / points) * Math.PI * 2 + angle;
                const a3 = ((i + 1) / points) * Math.PI * 2 + angle;

                const x1 = centerX + Math.cos(a1) * outerR;
                const y1 = centerY + Math.sin(a1) * outerR;
                const x2 = centerX + Math.cos(a2) * innerR;
                const y2 = centerY + Math.sin(a2) * innerR;
                const x3 = centerX + Math.cos(a3) * outerR;
                const y3 = centerY + Math.sin(a3) * outerR;

                const hue = (i / points) * 360;
                const color = `hsl(${hue}, 100%, 50%)`;

                c.line(x1, y1, x2, y2)
                  .stroke(color, 3)
                  .withId(`star-${i}-a`);
                c.line(x2, y2, x3, y3)
                  .stroke(color, 3)
                  .withId(`star-${i}-b`);
              }
            } else if (shapeType === 2) {
              // Spiral
              const turns = 5;
              const points = 200;
              let prevX = centerX;
              let prevY = centerY;

              for (let i = 1; i < points; i++) {
                const t = (i / points) * turns * Math.PI * 2 + time * 0.05 * animationSpeed;
                const r = (i / points) * 150;
                const x = centerX + Math.cos(t) * r;
                const y = centerY + Math.sin(t) * r;

                const hue = (t * 180 / Math.PI) % 360;
                const color = `hsl(${hue}, 100%, 50%)`;

                c.line(prevX, prevY, x, y)
                  .stroke(color, 2)
                  .withId(`spiral-${i}`);

                prevX = x;
                prevY = y;
              }
            } else if (shapeType === 3) {
              // Wave pattern
              const amplitude = 40;
              const frequency = 0.05;
              const points = 100;
              const offset = (time * 0.05) * animationSpeed;

              for (let i = 0; i < points; i++) {
                const x1 = (i / points) * WIDTH;
                const y1 = centerY + Math.sin(x1 * frequency + offset) * amplitude;
                const x2 = ((i + 1) / points) * WIDTH;
                const y2 = centerY + Math.sin(x2 * frequency + offset) * amplitude;

                const hue = (i / points) * 360;
                const color = `hsl(${hue}, 100%, 50%)`;

                c.line(x1, y1, x2, y2)
                  .stroke(color, 2)
                  .withId(`wave-${i}`);
              }

              // Add circles along the wave
              for (let i = 0; i < points; i += 5) {
                const x = (i / points) * WIDTH;
                const y = centerY + Math.sin(x * frequency + offset) * amplitude;
                const hue = (i / points) * 360;
                const color = `hsl(${hue}, 100%, 50%)`;

                c.circle(x, y, 4)
                  .fill(color)
                  .withId(`wave-circle-${i}`);
              }
            }

            // Center dot
            c.circle(centerX, centerY, 5)
              .fill('#ffffff')
              .withId('center');
          });

          enableEventHandling(undefined, a, { width: WIDTH, height: HEIGHT });
        });

        a.label(`Shape: ${shapeNames[shapeType]} | Speed: ${animationSpeed.toFixed(1)}x`);
      });
    });

    win.show();

    // Animation loop
    const animate = async () => {
      while (true) {
        time++;
        refreshAllCosyneContexts();
        await new Promise((r) => setTimeout(r, 16));
      }
    };
    setTimeout(animate, 100);
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Animated Shapes' }, createAnimatedShapesDemo);
}

export { createAnimatedShapesDemo };
