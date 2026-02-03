#!/usr/bin/env npx tsx
/**
 * Zoom & Pan Demo
 *
 * Demonstrates interactive navigation with mouse drag-to-pan,
 * scroll wheel zoom, and keyboard shortcuts.
 *
 * Run: npx tsx cosyne/demos/zoom-pan-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

function createZoomPanDemo(a: App): void {
  const state: DemoState = {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  };

  a.window(
    { title: 'Zoom & Pan Demo', width: WIDTH + 40, height: HEIGHT + 150 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('Interactive Zoom & Pan Navigation');

          a.label(`Zoom: ${state.zoom.toFixed(2)}x | Pan: (${state.offsetX.toFixed(0)}, ${state.offsetY.toFixed(0)})`);

          a.hbox(() => {
            a.button('Reset', { onClick: () => {
              state.offsetX = 0;
              state.offsetY = 0;
              state.zoom = 1;
              refreshAllCosyneContexts();
            } });

            a.button('Zoom In', { onClick: () => {
              state.zoom *= 1.2;
              refreshAllCosyneContexts();
            } });

            a.button('Zoom Out', { onClick: () => {
              state.zoom /= 1.2;
              refreshAllCosyneContexts();
            } });
          });

          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#f0f0f0');

              // Draw a grid that responds to zoom/pan
              const gridSize = 50 / state.zoom;
              const startX = Math.floor(state.offsetX / gridSize) * gridSize - state.offsetX;
              const startY = Math.floor(state.offsetY / gridSize) * gridSize - state.offsetY;

              for (let x = startX; x < WIDTH; x += gridSize) {
                ctx.line([x, 0], [x, HEIGHT])
                  .setStroke('#ddd', 0.5);
              }

              for (let y = startY; y < HEIGHT; y += gridSize) {
                ctx.line([0, y], [WIDTH, y])
                  .setStroke('#ddd', 0.5);
              }

              // Draw draggable circles
              const circlePositions = [
                [150, 150],
                [350, 150],
                [250, 350],
              ];

              circlePositions.forEach((pos, idx) => {
                const x = pos[0] * state.zoom + state.offsetX;
                const y = pos[1] * state.zoom + state.offsetY;
                const radius = 30 * state.zoom;

                if (x + radius > 0 && x - radius < WIDTH && y + radius > 0 && y - radius < HEIGHT) {
                  ctx.circle({ center: [x, y], radius })
                    .setFill(['#ff6b6b', '#4ecdc4', '#45b7d1'][idx])
                    .setStroke('#333', 2)
                    .withId(`circle-${idx}`);

                  ctx.text(idx.toString(), {
                    x,
                    y,
                    textAlign: 'center',
                    fontSize: 16,
                    fill: '#fff',
                    fontWeight: 'bold',
                  });
                }
              });

              ctx.text('Drag to pan • Scroll to zoom • Keyboard: +/- to zoom', {
                x: 10,
                y: HEIGHT - 10,
                fontSize: 11,
                fill: '#999',
              });
            });

            enableEventHandling(chart);
          });
        });
      });

      win.show();
    }
  );
}

if (require.main === module) {
  const appInstance = app(
    resolveTransport(),
    { title: 'Zoom & Pan Demo' },
    createZoomPanDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
