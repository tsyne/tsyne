/**
 * Radial Symmetry Demo
 *
 * Demonstrates the symmetry utilities for creating kaleidoscope effects,
 * regular polygons, and star shapes.
 *
 * Run: npx tsx cosyne/demos/symmetry-demo.ts
 */

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import {
  cosyne,
  CosyneContext,
  enableEventHandling,
  refreshAllCosyneContexts,
  generateRadialSymmetry,
  generateRegularPolygon,
  generateStar,
  Point2D,
} from 'cosyne';

const WIDTH = 500;
const HEIGHT = 500;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

interface DemoState {
  segments: number;
  mouseX: number;
  mouseY: number;
  mode: 'kaleidoscope' | 'polygon' | 'star';
  time: number;
}

function createSymmetryDemo(a: App): void {
  const state: DemoState = {
    segments: 8,
    mouseX: CENTER_X,
    mouseY: CENTER_Y,
    mode: 'kaleidoscope',
    time: 0,
  };

  a.window({ title: 'Radial Symmetry Demo', width: WIDTH + 40, height: HEIGHT + 100 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Controls
        a.hbox(() => {
          a.button('- Segments').onClick(() => {
            state.segments = Math.max(2, state.segments - 1);
          });
          a.label(`Segments: ${state.segments}`);
          a.button('+ Segments').onClick(() => {
            state.segments = Math.min(24, state.segments + 1);
          });
        });

        a.hbox(() => {
          a.button('Kaleidoscope').onClick(() => { state.mode = 'kaleidoscope'; });
          a.button('Polygon').onClick(() => { state.mode = 'polygon'; });
          a.button('Star').onClick(() => { state.mode = 'star'; });
        });

        // Canvas
        a.canvasStack(() => {
          const ctx = cosyne(a, (c: CosyneContext) => {
            // Background
            c.rect(0, 0, WIDTH, HEIGHT)
              .fill('#1a1a2e')
              .withId('bg')
              .onMouseMove((e: { x: number; y: number }) => {
                state.mouseX = e.x;
                state.mouseY = e.y;
              });

            // Draw center reference
            c.circle(CENTER_X, CENTER_Y, 5)
              .fill('#333')
              .stroke('#555', 1)
              .withId('center');

            if (state.mode === 'kaleidoscope') {
              // Generate symmetric points for mouse position
              const symPoints = generateRadialSymmetry(
                { x: state.mouseX, y: state.mouseY },
                { segments: state.segments, centerX: CENTER_X, centerY: CENTER_Y, mirror: true }
              );

              // Draw lines from center to each symmetric point
              symPoints.forEach((p: Point2D, i: number) => {
                const hue = (i / symPoints.length) * 360;
                c.line(CENTER_X, CENTER_Y, p.x, p.y)
                  .stroke(`hsl(${hue}, 70%, 60%)`, 2)
                  .withId(`line-${i}`);
                c.circle(p.x, p.y, 4)
                  .fill(`hsl(${hue}, 70%, 60%)`)
                  .withId(`point-${i}`);
              });

              // Draw segment dividers
              for (let i = 0; i < state.segments; i++) {
                const angle = (i / state.segments) * Math.PI * 2;
                const endX = CENTER_X + Math.cos(angle) * 200;
                const endY = CENTER_Y + Math.sin(angle) * 200;
                c.line(CENTER_X, CENTER_Y, endX, endY)
                  .stroke('#333', 1)
                  .withId(`div-${i}`);
              }
            } else if (state.mode === 'polygon') {
              // Draw animated regular polygon
              const radius = 100 + Math.sin(state.time * 2) * 30;
              const rotation = state.time * 0.5;
              const vertices = generateRegularPolygon(state.segments, CENTER_X, CENTER_Y, radius, rotation);

              // Draw polygon edges
              for (let i = 0; i < vertices.length; i++) {
                const p1 = vertices[i];
                const p2 = vertices[(i + 1) % vertices.length];
                c.line(p1.x, p1.y, p2.x, p2.y)
                  .stroke('#4fc3f7', 3)
                  .withId(`edge-${i}`);
              }

              // Draw vertices
              vertices.forEach((v: Point2D, i: number) => {
                c.circle(v.x, v.y, 6)
                  .fill('#81d4fa')
                  .withId(`vertex-${i}`);
              });
            } else if (state.mode === 'star') {
              // Draw animated star
              const outerRadius = 120;
              const innerRadius = 50 + Math.sin(state.time * 3) * 20;
              const rotation = state.time * 0.3;
              const vertices = generateStar(state.segments, CENTER_X, CENTER_Y, outerRadius, innerRadius, rotation);

              // Draw star as filled polygon
              if (vertices.length > 2) {
                // Create path string
                let pathD = `M ${vertices[0].x} ${vertices[0].y}`;
                for (let i = 1; i < vertices.length; i++) {
                  pathD += ` L ${vertices[i].x} ${vertices[i].y}`;
                }
                pathD += ' Z';
                c.path(pathD)
                  .fill('#ffb74d')
                  .stroke('#ff9800', 2)
                  .withId('star');
              }
            }
          });

          enableEventHandling(ctx, a, { width: WIDTH, height: HEIGHT });
        });

        a.label('Move mouse to see kaleidoscope effect');
      });
    });

    win.show();

    // Animation loop
    const animate = async () => {
      while (true) {
        state.time += 0.02;
        refreshAllCosyneContexts();
        await new Promise((r) => setTimeout(r, 16));
      }
    };
    setTimeout(animate, 100);
  });
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Symmetry Demo' }, createSymmetryDemo);
}
