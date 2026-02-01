#!/usr/bin/env npx tsx
/**
 * Markers Demo
 *
 * Demonstrates custom line markers and connectors including arrow markers,
 * shape markers, SVG path markers, and connector lines between shapes.
 *
 * Run: npx tsx cosyne/demos/markers-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  markerType: 'arrows' | 'shapes' | 'connectors';
}

function createMarkersDemo(a: App): void {
  const state: DemoState = {
    markerType: 'arrows',
  };

  a.window(
    { title: 'Markers Demo', width: WIDTH + 40, height: HEIGHT + 180 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('Line Markers & Connectors');

          a.hbox(() => {
            a.label('Marker Type:');
            a.button('Arrows').onClick(() => {
              state.markerType = 'arrows';
              refreshAllCosyneContexts();
            });
            a.button('Shapes').onClick(() => {
              state.markerType = 'shapes';
              refreshAllCosyneContexts();
            });
            a.button('Connectors').onClick(() => {
              state.markerType = 'connectors';
              refreshAllCosyneContexts();
            });
          });

          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#f5f5f5');

              switch (state.markerType) {
                case 'arrows': {
                  // Lines with arrow markers
                  const lines = [
                    { start: [50, 100], end: [200, 150], label: 'Start arrow' },
                    { start: [50, 200], end: [200, 250], label: 'End arrow' },
                    { start: [50, 300], end: [200, 350], label: 'Both arrows' },
                    { start: [350, 100], end: [500, 150], label: 'Single arrow' },
                  ];

                  lines.forEach((line, idx) => {
                    ctx.line(line.start, line.end)
                      .setStroke('#333', 2)
                      .withId(`arrow-line-${idx}`);

                    // Draw arrow markers
                    if (idx < 3) {
                      const dx = line.end[0] - line.start[0];
                      const dy = line.end[1] - line.start[1];
                      const len = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx);

                      // Start marker
                      if (idx !== 1 && idx !== 2) {
                        const x = line.start[0];
                        const y = line.start[1];
                        ctx.polygon({
                          vertices: [
                            [x + Math.cos(angle) * 8, y + Math.sin(angle) * 8],
                            [x - Math.cos(angle - Math.PI / 6) * 5, y - Math.sin(angle - Math.PI / 6) * 5],
                            [x - Math.cos(angle + Math.PI / 6) * 5, y - Math.sin(angle + Math.PI / 6) * 5],
                          ],
                        })
                          .setFill('#ff6b6b');
                      }

                      // End marker
                      if (idx !== 0) {
                        const x = line.end[0];
                        const y = line.end[1];
                        ctx.polygon({
                          vertices: [
                            [x - Math.cos(angle) * 8, y - Math.sin(angle) * 8],
                            [x + Math.cos(angle - Math.PI / 6) * 5, y + Math.sin(angle - Math.PI / 6) * 5],
                            [x + Math.cos(angle + Math.PI / 6) * 5, y + Math.sin(angle + Math.PI / 6) * 5],
                          ],
                        })
                          .setFill('#4ecdc4');
                      }
                    }

                    ctx.text(line.label, {
                      x: (line.start[0] + line.end[0]) / 2 + 20,
                      y: (line.start[1] + line.end[1]) / 2,
                      fontSize: 11,
                      fill: '#666',
                    });
                  });
                  break;
                }

                case 'shapes': {
                  // Lines with shape markers
                  const shapes = [
                    { pos: [50, 80], label: 'Circle', type: 'circle' as const },
                    { pos: [150, 80], label: 'Square', type: 'square' as const },
                    { pos: [250, 80], label: 'Diamond', type: 'diamond' as const },
                    { pos: [350, 80], label: 'Triangle', type: 'triangle' as const },
                  ];

                  shapes.forEach((shape, idx) => {
                    ctx.line([shape.pos[0], shape.pos[1] + 30], [shape.pos[0], shape.pos[1] + 100])
                      .setStroke('#333', 2);

                    switch (shape.type) {
                      case 'circle':
                        ctx.circle({ center: shape.pos, radius: 8 })
                          .setFill('#ff6b6b');
                        break;
                      case 'square':
                        ctx.rectangle({
                          size: [16, 16],
                          position: [shape.pos[0] - 8, shape.pos[1] - 8],
                        })
                          .setFill('#4ecdc4');
                        break;
                      case 'diamond':
                        ctx.polygon({
                          vertices: [
                            [shape.pos[0], shape.pos[1] - 10],
                            [shape.pos[0] + 10, shape.pos[1]],
                            [shape.pos[0], shape.pos[1] + 10],
                            [shape.pos[0] - 10, shape.pos[1]],
                          ],
                        })
                          .setFill('#ffd93d');
                        break;
                      case 'triangle':
                        ctx.polygon({
                          vertices: [
                            [shape.pos[0], shape.pos[1] - 10],
                            [shape.pos[0] + 10, shape.pos[1] + 10],
                            [shape.pos[0] - 10, shape.pos[1] + 10],
                          ],
                        })
                          .setFill('#95e1d3');
                        break;
                    }

                    ctx.text(shape.label, {
                      x: shape.pos[0],
                      y: shape.pos[1] - 25,
                      textAlign: 'center',
                      fontSize: 12,
                      fill: '#333',
                    });
                  });
                  break;
                }

                case 'connectors': {
                  // Flowchart-style connector lines
                  const boxes = [
                    { pos: [50, 50], label: 'Start', color: '#4ecdc4' },
                    { pos: [200, 50], label: 'Process', color: '#45b7d1' },
                    { pos: [350, 50], label: 'Decision', color: '#ffd93d' },
                    { pos: [200, 200], label: 'Action', color: '#ff6b6b' },
                  ];

                  boxes.forEach((box) => {
                    ctx.rectangle({
                      size: [80, 50],
                      position: [box.pos[0] - 40, box.pos[1] - 25],
                    })
                      .setFill(box.color)
                      .setStroke('#333', 2);

                    ctx.text(box.label, {
                      x: box.pos[0],
                      y: box.pos[1],
                      textAlign: 'center',
                      fontSize: 12,
                      fill: '#fff',
                      fontWeight: 'bold',
                    });
                  });

                  // Connector lines
                  ctx.line([130, 75], [160, 75])
                    .setStroke('#333', 2);
                  ctx.line([280, 75], [310, 75])
                    .setStroke('#333', 2);
                  ctx.line([350, 75], [350, 150])
                    .setStroke('#333', 2);
                  ctx.line([350, 150], [240, 150])
                    .setStroke('#333', 2);
                  ctx.line([160, 150], [160, 175])
                    .setStroke('#333', 2);
                  break;
                }
              }
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
    { title: 'Markers Demo' },
    createMarkersDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
