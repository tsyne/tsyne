/**
 * Trails Demo
 *
 * Demonstrates the trail system for creating animated trails
 * with fade effects, color trails, and multi-trail management.
 *
 * Run: npx tsx cosyne/demos/trails-demo.ts
 */

import { app, resolveTransport , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import {
  cosyne,
  CosyneContext,
  enableEventHandling,
  refreshAllCosyneContexts,
  Trail,
  ColorTrail,
  MultiTrail,
  trailColors,
  TrailPoint,
} from 'cosyne';

const WIDTH = 500;
const HEIGHT = 500;

interface DemoState {
  mode: 'single' | 'color' | 'multi';
  colorMode: keyof typeof trailColors;
  isDrawing: boolean;
}

function createTrailsDemo(a: App): void {
  const state: DemoState = {
    mode: 'color',
    colorMode: 'rainbow',
    isDrawing: false,
  };

  // Single trail
  const singleTrail = new Trail({ maxLength: 100, fadeSpeed: 0.02 });

  // Color trail with rainbow
  const colorTrail = new ColorTrail(trailColors.rainbow, { maxLength: 100, fadeSpeed: 0.015 });

  // Multi-trail for multiple fingers/sources
  const multiTrail = new MultiTrail<{ color: string }>({ maxLength: 50, fadeSpeed: 0.025 });

  let lastX = 0;
  let lastY = 0;

  a.window({ title: 'Trails Demo', width: WIDTH + 40, height: HEIGHT + 120 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Mode controls
        a.hbox(() => {
          a.button('Single', { onClick: () => { state.mode = 'single'; } });
          a.button('Color', { onClick: () => { state.mode = 'color'; } });
          a.button('Multi', { onClick: () => { state.mode = 'multi'; } });
        });

        // Color mode controls (for color trail)
        a.hbox(() => {
          a.button('Rainbow', { onClick: () => {
            state.colorMode = 'rainbow';
            colorTrail.setColorFunction(trailColors.rainbow);
          } });
          a.button('Fire', { onClick: () => {
            state.colorMode = 'fire';
            colorTrail.setColorFunction(trailColors.fire);
          } });
          a.button('Ice', { onClick: () => {
            state.colorMode = 'ice';
            colorTrail.setColorFunction(trailColors.ice);
          } });
          a.button('Neon', { onClick: () => {
            state.colorMode = 'neon';
            colorTrail.setColorFunction(trailColors.neon);
          } });
          a.button('Clear', { onClick: () => {
            singleTrail.clear();
            colorTrail.clear();
            multiTrail.clearAll();
          } });
        });

        // Canvas
        a.canvasStack(() => {
          const ctx = cosyne(a, (c: CosyneContext) => {
            // Background
            c.rect(0, 0, WIDTH, HEIGHT)
              .fill('#0a0a15')
              .withId('bg')
              .onDragStart((e: { x: number; y: number }) => {
                state.isDrawing = true;
                lastX = e.x;
                lastY = e.y;
              })
              .onDrag((e: { x: number; y: number }) => {
                if (state.mode === 'single') {
                  singleTrail.addPoint(e.x, e.y);
                } else if (state.mode === 'color') {
                  colorTrail.addColorPoint(e.x, e.y);
                } else if (state.mode === 'multi') {
                  // Add to 3 different trails offset from cursor
                  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
                  const offsets = [
                    { x: 0, y: 0 },
                    { x: 20, y: -20 },
                    { x: -20, y: -20 },
                  ];
                  for (let i = 0; i < 3; i++) {
                    multiTrail.addPoint(
                      `trail-${i}`,
                      e.x + offsets[i].x,
                      e.y + offsets[i].y,
                      { color: colors[i] }
                    );
                  }
                }
                lastX = e.x;
                lastY = e.y;
              })
              .onDragEnd(() => {
                state.isDrawing = false;
              });

            // Draw trails based on mode
            if (state.mode === 'single') {
              singleTrail.forEach((point: TrailPoint, i: number, alpha: number) => {
                c.circle(point.x, point.y, 4 + alpha * 4)
                  .fill('#ffffff')
                  .setAlpha(alpha)
                  .withId(`single-${i}`);
              });
            } else if (state.mode === 'color') {
              colorTrail.forEach((point: TrailPoint<{ color: string }>, i: number, alpha: number) => {
                c.circle(point.x, point.y, 4 + alpha * 6)
                  .fill(point.data?.color ?? '#ffffff')
                  .setAlpha(alpha)
                  .withId(`color-${i}`);
              });
            } else if (state.mode === 'multi') {
              multiTrail.forEach((trail, id) => {
                trail.forEach((point: TrailPoint<{ color: string }>, i: number, alpha: number) => {
                  c.circle(point.x, point.y, 3 + alpha * 5)
                    .fill(point.data?.color ?? '#ffffff')
                    .setAlpha(alpha)
                    .withId(`${id}-${i}`);
                });
              });
            }

            // Draw current position indicator when drawing
            if (state.isDrawing) {
              c.circle(lastX, lastY, 8)
                .stroke('#ffffff', 2)
                .withId('cursor');
            }
          });

          enableEventHandling(ctx, a, { width: WIDTH, height: HEIGHT });
        });

        // Instructions
        a.label(`Mode: ${state.mode} | Color: ${state.colorMode}`);
        a.label('Drag to draw trails');
      });
    });

    win.show();

    // Animation loop
    const animate = async () => {
      while (true) {
        singleTrail.step();
        colorTrail.step();
        multiTrail.step();
        refreshAllCosyneContexts();
        await new Promise((r) => setTimeout(r, 16));
      }
    };
    setTimeout(animate, 100);
  });
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Trails Demo' }, createTrailsDemo);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));}
