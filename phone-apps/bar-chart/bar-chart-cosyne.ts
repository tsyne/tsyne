/**
 * Bar Chart - Data Visualization (Cosyne Version)
 *
 * Demonstrates collection binding with dynamic data updates.
 * Renders bars with heights bound to data values.
 * Shows efficient re-rendering when data changes.
 *
 * Features:
 * - 6 data series with animated values
 * - Heights bind to data values in real-time
 * - Colors based on series index
 * - Smooth value transitions
 */

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import { cosyne, refreshAllCosyneContexts } from 'cosyne';

interface BarData {
  id: number;
  label: string;
  value: number;
  color: string;
}

/**
 * Bar chart state - manages data and animations
 */
class BarChartState {
  bars: BarData[] = [];
  baseTime: number = Date.now();

  constructor() {
    // Initialize 6 bars with labels
    const labels = ['Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F'];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

    for (let i = 0; i < 6; i++) {
      this.bars.push({
        id: i,
        label: labels[i],
        value: 50 + Math.random() * 100,
        color: colors[i],
      });
    }
  }

  /**
   * Animate bar values smoothly over time
   */
  updateValues() {
    const elapsed = (Date.now() - this.baseTime) / 1000;

    this.bars.forEach((bar, idx) => {
      // Each bar oscillates with different frequency and phase
      const frequency = 0.5 + idx * 0.1;
      const phase = (idx / 6) * Math.PI * 2;
      const baseValue = 50 + idx * 20;
      const amplitude = 40;

      bar.value = baseValue + Math.sin(elapsed * frequency + phase) * amplitude;
    });
  }

  /**
   * Reset to random values
   */
  randomize() {
    this.bars.forEach((bar) => {
      bar.value = 30 + Math.random() * 120;
    });
  }

  /**
   * Get max value for scaling
   */
  getMaxValue(): number {
    return Math.max(...this.bars.map((b) => b.value), 100);
  }
}

/**
 * Create the bar chart app
 */
export function createBarChartApp(a: App, win: Window) {
  const state = new BarChartState();

  win.setContent(() => {
    a.vbox(() => {
      a.label('Data Visualization').withId('title');

      // Control buttons
      a.hbox(() => {
        a.button('Randomize').onTap(() => {
          state.randomize();
          refreshAllCosyneContexts();
        });

        a.label('Animated bars').withId('info');
      });

      // Chart canvas
      a.center(() => {
        a.canvasStack(() => {
          cosyne(a, (c) => {
            const padding = 40;
            const chartWidth = 400 - padding * 2;
            const chartHeight = 250 - padding * 2;
            const barWidth = chartWidth / state.bars.length - 10;
            const maxValue = state.getMaxValue();

            // Background
            c.rect(0, 0, 400, 250)
              .fill('#ffffff')
              .stroke('#cccccc', 1)
              .withId('background');

            // Y-axis
            c.line(padding, padding, padding, 250 - padding)
              .stroke('#333333', 2)
              .withId('y-axis');

            // X-axis
            c.line(padding, 250 - padding, 400 - padding, 250 - padding)
              .stroke('#333333', 2)
              .withId('x-axis');

            // Grid lines
            for (let i = 1; i < 5; i++) {
              const y = padding + (chartHeight / 5) * i;
              c.line(padding, y, 400 - padding, y)
                .stroke('#f0f0f0', 1)
                .withId(`gridline-${i}`);
            }

            // Animated bars collection
            c.rects()
              .bindTo({
                items: () => state.bars,
                render: (barData: BarData) => {
                  const index = state.bars.indexOf(barData);
                  const x = padding + index * (barWidth + 10);
                  const barHeight = (barData.value / maxValue) * chartHeight;
                  const y = 250 - padding - barHeight;

                  return c
                    .rect(x, y, barWidth, barHeight)
                    .fill(barData.color)
                    .stroke('#333333', 1)
                    .withId(`bar-${barData.id}`);
                },
                trackBy: (barData: BarData) => barData.id,
              });

            // Value labels above bars
            for (let i = 0; i < state.bars.length; i++) {
              const barData = state.bars[i];
              const x = padding + i * (barWidth + 10) + barWidth / 2;
              const y = padding + (chartHeight * (1 - barData.value / maxValue)) - 10;

              c.text(x, y, barData.value.toFixed(0))
                .fill('#333333')
                .withId(`label-${i}`);
            }
          });
        });
      });

      a.label('Bars animate smoothly as data changes').withId('subtitle');
    });
  });

  // Update loop - refresh every 50ms, update values every iteration
  const updateInterval = setInterval(() => {
    state.updateValues();
    refreshAllCosyneContexts();
  }, 50);

  return () => clearInterval(updateInterval);
}

export async function createBarChartAppWithTransport() {
  const transport = await resolveTransport();
  const a = app(transport);
  const win = a.window({ title: 'Bar Chart' });
  createBarChartApp(a, win);
}

if (require.main === module) {
  createBarChartAppWithTransport().catch(console.error);
}
