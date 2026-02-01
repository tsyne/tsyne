#!/usr/bin/env npx tsx
/**
 * Axes & Grid Demo
 *
 * Demonstrates coordinate systems, grid lines, tick marks, labels,
 * and multi-scale axes for data visualization.
 *
 * Run: npx tsx cosyne/demos/axes-grid-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  gridDensity: 'coarse' | 'medium' | 'fine';
  showMinorTicks: boolean;
}

function createAxesGridDemo(a: App): void {
  const state: DemoState = {
    gridDensity: 'medium',
    showMinorTicks: true,
  };

  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = WIDTH - margin.left - margin.right;
  const chartHeight = HEIGHT - margin.top - margin.bottom;

  a.window(
    { title: 'Axes & Grid Demo', width: WIDTH + 40, height: HEIGHT + 200 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('Coordinate Systems & Grid Lines');

          a.hbox(() => {
            a.label('Grid Density:');
            ['Coarse', 'Medium', 'Fine'].forEach((label, idx) => {
              a.button(label).onClick(() => {
                state.gridDensity = [
                  'coarse',
                  'medium',
                  'fine',
                ][idx] as typeof state.gridDensity;
                refreshAllCosyneContexts();
              });
            });
          });

          a.checkbox('Show Minor Ticks', (checked: boolean) => {
            state.showMinorTicks = checked;
            refreshAllCosyneContexts();
          }).setChecked(state.showMinorTicks);

          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              // Background
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#ffffff');

              const chartLeft = margin.left;
              const chartTop = margin.top;
              const chartRight = WIDTH - margin.right;
              const chartBottom = HEIGHT - margin.bottom;

              // Grid density settings
              const gridIntervals = {
                coarse: 5,
                medium: 2,
                fine: 1,
              };
              const majorInterval = gridIntervals[state.gridDensity];

              // Draw grid lines
              for (let i = 0; i <= 10; i += majorInterval) {
                // Vertical grid
                const x = chartLeft + (i / 10) * chartWidth;
                ctx.line([x, chartTop], [x, chartBottom])
                  .setStroke('#e0e0e0', 1)
                  .withId(`vgrid-${i}`);

                // Horizontal grid
                const y = chartTop + (i / 10) * chartHeight;
                ctx.line([chartLeft, y], [chartRight, y])
                  .setStroke('#e0e0e0', 1)
                  .withId(`hgrid-${i}`);
              }

              // Draw axes
              ctx.line([chartLeft, chartBottom], [chartRight, chartBottom])
                .setStroke('#333', 2)
                .withId('x-axis');

              ctx.line([chartLeft, chartTop], [chartLeft, chartBottom])
                .setStroke('#333', 2)
                .withId('y-axis');

              // X-axis ticks and labels
              for (let i = 0; i <= 10; i += majorInterval) {
                const x = chartLeft + (i / 10) * chartWidth;

                // Major tick
                ctx.line([x, chartBottom], [x, chartBottom + 5])
                  .setStroke('#333', 1)
                  .withId(`xtick-major-${i}`);

                // Label
                ctx.text((i * 10).toString(), {
                  x,
                  y: chartBottom + 20,
                  textAlign: 'center',
                  fontSize: 12,
                  fill: '#666',
                })
                  .withId(`xlabel-${i}`);

                // Minor ticks
                if (state.showMinorTicks && majorInterval > 1) {
                  for (let j = 1; j < majorInterval; j++) {
                    const minorX = chartLeft + ((i + j / majorInterval) / 10) * chartWidth;
                    ctx.line([minorX, chartBottom], [minorX, chartBottom + 2])
                      .setStroke('#999', 0.5);
                  }
                }
              }

              // Y-axis ticks and labels
              for (let i = 0; i <= 10; i += majorInterval) {
                const y = chartBottom - (i / 10) * chartHeight;

                // Major tick
                ctx.line([chartLeft - 5, y], [chartLeft, y])
                  .setStroke('#333', 1)
                  .withId(`ytick-major-${i}`);

                // Label
                ctx.text((i * 10).toString(), {
                  x: chartLeft - 15,
                  y: y + 4,
                  textAlign: 'right',
                  fontSize: 12,
                  fill: '#666',
                })
                  .withId(`ylabel-${i}`);
              }

              // Axis labels
              ctx.text('X Axis', {
                x: WIDTH / 2,
                y: HEIGHT - 10,
                textAlign: 'center',
                fontSize: 14,
                fill: '#333',
                fontWeight: 'bold',
              })
                .withId('x-label');

              ctx.text('Y Axis', {
                x: 15,
                y: HEIGHT / 2,
                textAlign: 'center',
                fontSize: 14,
                fill: '#333',
                fontWeight: 'bold',
              })
                .withId('y-label');
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
    { title: 'Axes & Grid Demo' },
    createAxesGridDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
