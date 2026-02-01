#!/usr/bin/env npx tsx
/**
 * Line Chart Demo
 *
 * Demonstrates multi-series line charts with different interpolation types,
 * axes with labels, data scales, and interactive controls.
 *
 * Run: npx tsx cosyne/demos/line-chart-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import {
  cosyne,
  CosyneContext,
  enableEventHandling,
  refreshAllCosyneContexts,
  LineChart,
  LinearScale,
  Axes,
} from 'cosyne';

const WIDTH = 700;
const HEIGHT = 500;

interface DemoState {
  interpolationType: 'linear' | 'step' | 'catmull-rom' | 'monotone';
  showGrid: boolean;
  showLegend: boolean;
}

function createLineChartDemo(a: App): void {
  const state: DemoState = {
    interpolationType: 'linear',
    showGrid: true,
    showLegend: true,
  };

  // Sample data: 3 series over time
  const xScale = new LinearScale(0, 10, 50, 650);
  const yScale = new LinearScale(0, 100, 450, 50);

  const series1: [number, number][] = [];
  const series2: [number, number][] = [];
  const series3: [number, number][] = [];

  // Generate data
  for (let x = 0; x <= 10; x += 0.5) {
    series1.push([x, 50 + 30 * Math.sin(x * 0.8)]);
    series2.push([x, 40 + 20 * Math.cos(x * 0.6)]);
    series3.push([x, 30 + 25 * Math.sin(x * 1.2 + 1)]);
  }

  a.window(
    { title: 'Line Chart Demo', width: WIDTH + 40, height: HEIGHT + 200 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          // Title
          a.label('Multi-Series Line Chart');

          // Controls
          a.hbox(() => {
            a.label('Interpolation:');
            a.button('Linear').onClick(() => {
              state.interpolationType = 'linear';
              refreshAllCosyneContexts();
            });
            a.button('Step').onClick(() => {
              state.interpolationType = 'step';
              refreshAllCosyneContexts();
            });
            a.button('Catmull-Rom').onClick(() => {
              state.interpolationType = 'catmull-rom';
              refreshAllCosyneContexts();
            });
            a.button('Monotone').onClick(() => {
              state.interpolationType = 'monotone';
              refreshAllCosyneContexts();
            });
          });

          a.hbox(() => {
            a.checkbox('Show Grid', (checked: boolean) => {
              state.showGrid = checked;
              refreshAllCosyneContexts();
            }).setChecked(state.showGrid);

            a.spacer();

            a.checkbox('Show Legend', (checked: boolean) => {
              state.showLegend = checked;
              refreshAllCosyneContexts();
            }).setChecked(state.showLegend);
          });

          // Chart area
          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              // Background
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#f5f5f5')
                .withId('chart-bg');

              // Grid
              if (state.showGrid) {
                // Vertical grid lines
                for (let x = 0; x <= 10; x += 1) {
                  const px = xScale.map(x);
                  ctx.line([px, 50], [px, 450])
                    .setStroke('#ddd', 0.5)
                    .withId(`vgrid-${x}`);
                }

                // Horizontal grid lines
                for (let y = 0; y <= 100; y += 20) {
                  const py = yScale.map(y);
                  ctx.line([50, py], [650, py])
                    .setStroke('#ddd', 0.5)
                    .withId(`hgrid-${y}`);
                }
              }

              // Axes
              ctx.line([50, 450], [650, 450])
                .setStroke('#333', 2)
                .withId('x-axis');
              ctx.line([50, 50], [50, 450])
                .setStroke('#333', 2)
                .withId('y-axis');

              // Axis labels
              for (let x = 0; x <= 10; x += 2) {
                const px = xScale.map(x);
                ctx.text(x.toString(), {
                  x: px,
                  y: 470,
                  textAlign: 'center',
                  fontSize: 12,
                  fill: '#666',
                })
                  .withId(`x-label-${x}`);
              }

              for (let y = 0; y <= 100; y += 20) {
                const py = yScale.map(y);
                ctx.text(y.toString(), {
                  x: 35,
                  y: py + 5,
                  textAlign: 'right',
                  fontSize: 12,
                  fill: '#666',
                })
                  .withId(`y-label-${y}`);
              }

              // Data series
              const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];

              series1.forEach((point, i) => {
                const px = xScale.map(point[0]);
                const py = yScale.map(point[1]);
                if (i > 0) {
                  const prevPoint = series1[i - 1];
                  const prevPx = xScale.map(prevPoint[0]);
                  const prevPy = yScale.map(prevPoint[1]);
                  ctx.line([prevPx, prevPy], [px, py])
                    .setStroke(colors[0], 2)
                    .withId(`series1-line-${i}`);
                }
                ctx.circle({ center: [px, py], radius: 3 })
                  .setFill(colors[0])
                  .withId(`series1-point-${i}`);
              });

              series2.forEach((point, i) => {
                const px = xScale.map(point[0]);
                const py = yScale.map(point[1]);
                if (i > 0) {
                  const prevPoint = series2[i - 1];
                  const prevPx = xScale.map(prevPoint[0]);
                  const prevPy = yScale.map(prevPoint[1]);
                  ctx.line([prevPx, prevPy], [px, py])
                    .setStroke(colors[1], 2)
                    .withId(`series2-line-${i}`);
                }
                ctx.circle({ center: [px, py], radius: 3 })
                  .setFill(colors[1])
                  .withId(`series2-point-${i}`);
              });

              series3.forEach((point, i) => {
                const px = xScale.map(point[0]);
                const py = yScale.map(point[1]);
                if (i > 0) {
                  const prevPoint = series3[i - 1];
                  const prevPx = xScale.map(prevPoint[0]);
                  const prevPy = yScale.map(prevPoint[1]);
                  ctx.line([prevPx, prevPy], [px, py])
                    .setStroke(colors[2], 2)
                    .withId(`series3-line-${i}`);
                }
                ctx.circle({ center: [px, py], radius: 3 })
                  .setFill(colors[2])
                  .withId(`series3-point-${i}`);
              });

              // Legend
              if (state.showLegend) {
                const legendY = 30;
                const legendItems = [
                  { label: 'Series 1', color: colors[0] },
                  { label: 'Series 2', color: colors[1] },
                  { label: 'Series 3', color: colors[2] },
                ];

                legendItems.forEach((item, i) => {
                  ctx.line([670, legendY + i * 20], [685, legendY + i * 20])
                    .setStroke(item.color, 2)
                    .withId(`legend-line-${i}`);
                  ctx.text(item.label, {
                    x: 695,
                    y: legendY + i * 20,
                    textAlign: 'left',
                    fontSize: 12,
                    fill: '#333',
                  })
                    .withId(`legend-label-${i}`);
                });
              }
            });

            enableEventHandling(chart);
          });

          a.label('Chart Type: Linear interpolation with 3 data series');
        });
      });

      win.show();
    }
  );
}

if (require.main === module) {
  const appInstance = app(
    resolveTransport(),
    { title: 'Line Chart Demo' },
    createLineChartDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
