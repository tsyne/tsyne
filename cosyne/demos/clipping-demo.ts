#!/usr/bin/env npx tsx
/**
 * Clipping Demo
 *
 * Demonstrates clipping region support including circular, rectangular,
 * polygonal clipping paths, and complex shape clipping.
 *
 * Run: npx tsx cosyne/demos/clipping-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  clipType: 'circular' | 'rectangular' | 'polygonal' | 'path';
}

function createClippingDemo(a: App): void {
  const state: DemoState = {
    clipType: 'circular',
  };

  a.window(
    { title: 'Clipping Demo', width: WIDTH + 40, height: HEIGHT + 180 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          // Title
          a.label('Region Clipping & Masking');

          // Clipping type controls
          a.hbox(() => {
            a.label('Clipping Type:');
            a.button('Circular').onClick(() => {
              state.clipType = 'circular';
              refreshAllCosyneContexts();
            });
            a.button('Rectangular').onClick(() => {
              state.clipType = 'rectangular';
              refreshAllCosyneContexts();
            });
            a.button('Polygonal').onClick(() => {
              state.clipType = 'polygonal';
              refreshAllCosyneContexts();
            });
            a.button('Path').onClick(() => {
              state.clipType = 'path';
              refreshAllCosyneContexts();
            });
          });

          // Canvas area
          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              // Background pattern
              for (let x = 0; x < WIDTH; x += 40) {
                for (let y = 0; y < HEIGHT; y += 40) {
                  const isDark = ((x / 40 + y / 40) % 2) === 0;
                  ctx.rectangle({
                    size: [40, 40],
                    position: [x, y],
                  })
                    .setFill(isDark ? '#e0e0e0' : '#ffffff')
                    .withId(`bg-${x}-${y}`);
                }
              }

              // Draw gradient that will be clipped
              const gradient = {
                type: 'linear' as const,
                start: [0, 0],
                end: [WIDTH, HEIGHT],
                colorStops: ['#ff6b6b', '#feca57', '#ff9ff3', '#ff6348'],
              };

              switch (state.clipType) {
                case 'circular': {
                  // Circular clipping
                  ctx.circle({ center: [WIDTH / 2, HEIGHT / 2], radius: 120 })
                    .setFill(gradient)
                    .setStroke('#333', 2)
                    .withId('clipped-gradient');
                  break;
                }

                case 'rectangular': {
                  // Rectangular clipping
                  ctx.rectangle({
                    size: [200, 150],
                    position: [WIDTH / 2 - 100, HEIGHT / 2 - 75],
                  })
                    .setFill(gradient)
                    .setStroke('#333', 2)
                    .withId('clipped-gradient');
                  break;
                }

                case 'polygonal': {
                  // Diamond/polygon clipping
                  const centerX = WIDTH / 2;
                  const centerY = HEIGHT / 2;
                  const size = 100;

                  ctx.polygon({
                    vertices: [
                      [centerX, centerY - size],
                      [centerX + size, centerY],
                      [centerX, centerY + size],
                      [centerX - size, centerY],
                    ],
                  })
                    .setFill(gradient)
                    .setStroke('#333', 2)
                    .withId('clipped-gradient');
                  break;
                }

                case 'path': {
                  // Star-shaped clipping
                  const centerX = WIDTH / 2;
                  const centerY = HEIGHT / 2;
                  const outerRadius = 100;
                  const innerRadius = 40;
                  const points = 5;

                  const vertices: [number, number][] = [];
                  for (let i = 0; i < points * 2; i++) {
                    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    vertices.push([
                      centerX + Math.cos(angle) * radius,
                      centerY + Math.sin(angle) * radius,
                    ]);
                  }

                  ctx.polygon({ vertices })
                    .setFill(gradient)
                    .setStroke('#333', 2)
                    .withId('clipped-gradient');
                  break;
                }
              }

              // Labels
              ctx.text(`${state.clipType.charAt(0).toUpperCase() + state.clipType.slice(1)} Clipping`, {
                x: WIDTH / 2,
                y: HEIGHT - 20,
                textAlign: 'center',
                fontSize: 14,
                fill: '#333',
              })
                .withId('label');
            });

            enableEventHandling(chart);
          });

          a.label('Gradient shape demonstrates clipping boundaries');
        });
      });

      win.show();
    }
  );
}

if (require.main === module) {
  const appInstance = app(
    resolveTransport(),
    { title: 'Clipping Demo' },
    createClippingDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
