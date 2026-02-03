#!/usr/bin/env npx tsx
/**
 * Data Visualization Demo
 *
 * Demonstrates heatmaps, color-mapped data grids, multiple visualization types,
 * real-time updates, legends, and annotations.
 *
 * Run: npx tsx cosyne/demos/data-visualization-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  vizType: 'heatmap' | 'gradient-map' | 'distribution';
  time: number;
}

function getHeatColor(value: number): string {
  if (value < 0.2) return '#2c3e50';
  if (value < 0.4) return '#3498db';
  if (value < 0.6) return '#2ecc71';
  if (value < 0.8) return '#f39c12';
  return '#e74c3c';
}

function createDataVisualizationDemo(a: App): void {
  const state: DemoState = {
    vizType: 'heatmap',
    time: 0,
  };

  let animationFrame: any = null;

  a.window(
    { title: 'Data Visualization Demo', width: WIDTH + 40, height: HEIGHT + 180 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('Data Visualization: Heatmaps & Color Maps');

          a.hbox(() => {
            a.label('Visualization:');
            ['Heatmap', 'Gradient Map', 'Distribution'].forEach((label, idx) => {
              a.button(label, { onClick: () => {
                state.vizType = [
                  'heatmap',
                  'gradient-map',
                  'distribution',
                ][idx] as typeof state.vizType;
                refreshAllCosyneContexts();
              } });
            });
          });

          a.checkbox('Animate', (checked: boolean) => {
            if (checked) {
              const animate = () => {
                state.time += 0.05;
                refreshAllCosyneContexts();
                animationFrame = setTimeout(animate, 50);
              };
              animate();
            } else {
              if (animationFrame) clearTimeout(animationFrame);
            }
          });

          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#f0f0f0');

              switch (state.vizType) {
                case 'heatmap': {
                  // Heat map grid
                  const gridSize = 8;
                  const cellWidth = 400 / gridSize;
                  const cellHeight = 300 / gridSize;

                  for (let row = 0; row < gridSize; row++) {
                    for (let col = 0; col < gridSize; col++) {
                      const value =
                        (Math.sin((col / gridSize) * Math.PI + state.time) +
                          Math.cos((row / gridSize) * Math.PI + state.time)) /
                        2 +
                        0.5;

                      ctx.rectangle({
                        size: [cellWidth - 1, cellHeight - 1],
                        position: [50 + col * cellWidth, 50 + row * cellHeight],
                      })
                        .setFill(getHeatColor(value));
                    }
                  }

                  // Legend
                  const legendY = 380;
                  const legendColors = [
                    { color: '#2c3e50', label: 'Low' },
                    { color: '#3498db', label: '25%' },
                    { color: '#2ecc71', label: '50%' },
                    { color: '#f39c12', label: '75%' },
                    { color: '#e74c3c', label: 'High' },
                  ];

                  legendColors.forEach((item, idx) => {
                    ctx.rectangle({
                      size: [15, 15],
                      position: [50 + idx * 80, legendY],
                    })
                      .setFill(item.color);

                    ctx.text(item.label, {
                      x: 70 + idx * 80,
                      y: legendY + 12,
                      fontSize: 10,
                      fill: '#666',
                    });
                  });
                  break;
                }

                case 'gradient-map': {
                  // Smooth gradient data visualization
                  for (let x = 0; x < 300; x += 10) {
                    for (let y = 0; y < 300; y += 10) {
                      const normalizedX = x / 300;
                      const normalizedY = y / 300;
                      const value = Math.sin(normalizedX * Math.PI + state.time) * Math.cos(normalizedY * Math.PI + state.time) * 0.5 + 0.5;

                      ctx.rectangle({
                        size: [10, 10],
                        position: [50 + x, 50 + y],
                      })
                        .setFill(getHeatColor(value));
                    }
                  }
                  break;
                }

                case 'distribution': {
                  // Histogram-like distribution
                  const bins = 10;
                  const binWidth = 300 / bins;

                  for (let i = 0; i < bins; i++) {
                    const height = 200 * (Math.sin((i / bins) * Math.PI * 2 + state.time) * 0.4 + 0.6);

                    ctx.rectangle({
                      size: [binWidth - 2, height],
                      position: [50 + i * binWidth, 250 - height],
                    })
                      .setFill(`hsl(${(i / bins) * 360}, 80%, 50%)`);
                  }

                  ctx.line([50, 250], [350, 250])
                    .setStroke('#333', 2);
                  break;
                }
              }
            });

            enableEventHandling(chart);
          });
        });
      });

      win.setCloseIntercept(async () => {
        if (animationFrame) clearTimeout(animationFrame);
        return true;
      });

      win.show();
    }
  );
}

if (require.main === module) {
  const appInstance = app(
    resolveTransport(),
    { title: 'Data Visualization Demo' },
    createDataVisualizationDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
