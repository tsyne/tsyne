/**
 * Parametric Curves Demo - Pure Cosyne
 *
 * Mathematical curves drawn with Cosyne:
 * - Lissajous figures
 * - Rose curves (rhodonea)
 * - Butterfly curve
 * - Epitrochoid
 * - Spiral of Theodorus
 *
 * Run: npx tsx cosyne/demos/cosyne-parametric-curves.ts
 */

import { app, resolveTransport , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import {
  cosyne,
  CosyneContext,
  enableEventHandling,
  refreshAllCosyneContexts,
} from 'cosyne';

const WIDTH = 500;
const HEIGHT = 500;

function createParametricDemo(a: App): void {
  let curveType = 0;
  let parameter = 1.0;
  let time = 0;

  const curves = [
    { name: 'Lissajous', param: 'Frequency' },
    { name: 'Rose', param: 'Petals' },
    { name: 'Butterfly', param: 'Scale' },
    { name: 'Epitrochoid', param: 'Ratio' },
  ];

  function drawLissajous(c: CosyneContext, centerX: number, centerY: number, scale: number, freq: number) {
    const points = 1000;
    let prevX = centerX;
    let prevY = centerY;

    for (let i = 0; i < points; i++) {
      const t = (i / points) * Math.PI * 2;
      const x = centerX + Math.sin(t * freq) * scale;
      const y = centerY + Math.sin(t * (freq + 1)) * scale;

      const hue = (i / points) * 360;
      const color = `hsl(${hue}, 80%, 50%)`;

      if (i > 0) {
        c.line(prevX, prevY, x, y)
          .stroke(color, 1)
          .withId(`lissajous-${i}`);
      }
      prevX = x;
      prevY = y;
    }
  }

  function drawRose(c: CosyneContext, centerX: number, centerY: number, scale: number, petals: number) {
    const points = 1000;
    let prevX = centerX;
    let prevY = centerY;

    for (let i = 0; i < points; i++) {
      const t = (i / points) * Math.PI * 2;
      const r = scale * Math.cos(petals * t);
      const x = centerX + Math.cos(t) * r;
      const y = centerY + Math.sin(t) * r;

      const hue = (i / points) * 360;
      const color = `hsl(${hue}, 80%, 50%)`;

      if (i > 0) {
        c.line(prevX, prevY, x, y)
          .stroke(color, 1)
          .withId(`rose-${i}`);
      }
      prevX = x;
      prevY = y;
    }
  }

  function drawButterfly(c: CosyneContext, centerX: number, centerY: number, scale: number) {
    const points = 2000;
    let prevX = centerX;
    let prevY = centerY;

    for (let i = 0; i < points; i++) {
      const t = (i / points) * Math.PI * 12;
      const r = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t);
      const x = centerX + Math.cos(t) * r * scale;
      const y = centerY + Math.sin(t) * r * scale * 0.5;

      const hue = (i / points) * 360;
      const color = `hsl(${hue}, 80%, 50%)`;

      if (i > 0) {
        c.line(prevX, prevY, x, y)
          .stroke(color, 0.8)
          .withId(`butterfly-${i}`);
      }
      prevX = x;
      prevY = y;
    }
  }

  function drawEpitrochoid(c: CosyneContext, centerX: number, centerY: number, scale: number, ratio: number) {
    const points = 1000;
    let prevX = centerX;
    let prevY = centerY;

    for (let i = 0; i < points; i++) {
      const t = (i / points) * Math.PI * 2 * (ratio + 1);
      const R = scale;
      const r = scale * 0.3;
      const d = r * 1.5;

      const x = centerX + (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t);
      const y = centerY + (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t);

      const hue = (i / points) * 360;
      const color = `hsl(${hue}, 80%, 50%)`;

      if (i > 0) {
        c.line(prevX, prevY, x, y)
          .stroke(color, 1)
          .withId(`epi-${i}`);
      }
      prevX = x;
      prevY = y;
    }
  }

  a.window({ title: 'Parametric Curves (Cosyne)', width: WIDTH + 40, height: HEIGHT + 120 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Curve type buttons
        a.hbox(() => {
          a.label('Curve: ');
          for (const curve of curves) {
            a.button(curve.name, { onClick: () => {
              curveType = curves.indexOf(curve);
              parameter = 1.0;
            } });
          }
        });

        // Parameter controls
        a.hbox(() => {
          a.button('Param -', { onClick: () => {
            parameter = Math.max(0.1, parameter - 0.2);
          } });
          a.label(`${curves[curveType].param}: ${parameter.toFixed(1)}`);
          a.button('Param +', { onClick: () => {
            parameter = Math.min(10, parameter + 0.2);
          } });
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
            const scale = 80;

            if (curveType === 0) {
              drawLissajous(c, centerX, centerY, scale, parameter);
            } else if (curveType === 1) {
              drawRose(c, centerX, centerY, scale, Math.floor(parameter));
            } else if (curveType === 2) {
              drawButterfly(c, centerX, centerY, parameter * 10, parameter);
            } else if (curveType === 3) {
              drawEpitrochoid(c, centerX, centerY, scale, parameter);
            }

            // Axis lines
            c.line(0, centerY, WIDTH, centerY)
              .stroke('#444444', 1)
              .setAlpha(0.3)
              .withId('h-axis');
            c.line(centerX, 0, centerX, HEIGHT)
              .stroke('#444444', 1)
              .setAlpha(0.3)
              .withId('v-axis');

            // Center
            c.circle(centerX, centerY, 3)
              .fill('#ffffff')
              .withId('center');
          });

          enableEventHandling(undefined, a, { width: WIDTH, height: HEIGHT });
        });

        a.label(`Curve: ${curves[curveType].name}`);
      });
    });

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Parametric Curves' }, createParametricDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}

export { createParametricDemo };
