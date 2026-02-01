/**
 * Symmetry Shapes Demo
 *
 * Demonstrates generating regular polygons and star shapes
 * with adjustable number of sides/points.
 *
 * Run: npx tsx cosyne/demos/symmetry-demo.ts
 */

import { app, resolveTransport , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import {
  cosyne,
  CosyneContext,
  rebuildAllCosyneContexts,
  generateRegularPolygon,
  generateStar,
  Point2D,
} from 'cosyne';

const WIDTH = 500;
const HEIGHT = 500;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

interface DemoState {
  sides: number;
  mode: 'polygon' | 'star';
}

function createSymmetryDemo(a: App): void {
  const state: DemoState = {
    sides: 6,
    mode: 'polygon',
  };

  a.window({ title: 'Symmetry Shapes', width: WIDTH + 40, height: HEIGHT + 80 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Controls
        a.hbox(() => {
          a.button('- Sides').onClick(() => {
            state.sides = Math.max(3, state.sides - 1);
            rebuildAllCosyneContexts();
          });
          a.label(`Sides: ${state.sides}`);
          a.button('+ Sides').onClick(() => {
            state.sides = Math.min(12, state.sides + 1);
            rebuildAllCosyneContexts();
          });
        });

        a.hbox(() => {
          a.button('Polygon').onClick(() => {
            state.mode = 'polygon';
            rebuildAllCosyneContexts();
          });
          a.button('Star').onClick(() => {
            state.mode = 'star';
            rebuildAllCosyneContexts();
          });
        });

        // Canvas
        a.canvasStack(() => {
          cosyne(a, (c: CosyneContext) => {
            // Background
            c.rect(0, 0, WIDTH, HEIGHT).fill('#1a1a2e');

            if (state.mode === 'polygon') {
              // Draw regular polygon using lines (path has positioning issues)
              const radius = 150;
              const vertices = generateRegularPolygon(state.sides, CENTER_X, CENTER_Y, radius, -Math.PI / 2);

              // Draw edges
              for (let i = 0; i < vertices.length; i++) {
                const p1 = vertices[i];
                const p2 = vertices[(i + 1) % vertices.length];
                c.line(p1.x, p1.y, p2.x, p2.y).stroke('#2196f3', 4);
              }

              // Draw vertices
              vertices.forEach((v: Point2D) => {
                c.circle(v.x, v.y, 8).fill('#64b5f6');
              });

            } else if (state.mode === 'star') {
              // Draw star
              const outerRadius = 150;
              const innerRadius = 60;
              const vertices = generateStar(state.sides, CENTER_X, CENTER_Y, outerRadius, innerRadius, -Math.PI / 2);

              // Fill
              if (vertices.length > 2) {
                let pathD = `M ${vertices[0].x} ${vertices[0].y}`;
                for (let i = 1; i < vertices.length; i++) {
                  pathD += ` L ${vertices[i].x} ${vertices[i].y}`;
                }
                pathD += ' Z';
                c.path(pathD).fill('#ff9800').stroke('#ffb74d', 3);
              }
            }
          });
        });
      });
    });

    win.show();
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Symmetry Shapes' }, createSymmetryDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}
