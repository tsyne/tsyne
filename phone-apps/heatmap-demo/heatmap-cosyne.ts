/**
 * Heatmap Demo - Data Visualization (Cosyne Version)
 *
 * Demonstrates heatmap primitive for visualizing 2D data.
 * Color-mapped grid showing temperature/values over time.
 *
 * Features:
 * - 8x8 heatmap with animated data values
 * - Viridis color scheme: purple → green → yellow
 * - Values oscillate based on position (sine wave patterns)
 * - Real-time updates every 50ms
 */

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import { cosyne, refreshAllCosyneContexts } from '../../cosyne/src';

/**
 * Heatmap demo state - generates animated data
 */
class HeatmapState {
  private rows: number = 8;
  private cols: number = 8;
  private baseTime: number = Date.now();
  private minValue: number = 0;
  private maxValue: number = 100;

  /**
   * Generate heatmap data with sine wave patterns
   */
  generateData() {
    const elapsed = (Date.now() - this.baseTime) / 1000; // seconds
    const data: number[] = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        // Create sine wave patterns that oscillate differently per position
        const frequency = 0.5 + (row + col) * 0.1;
        const phase = (row * this.cols + col) * 0.1;
        const amplitude = 40;
        const baseValue = 50;

        const value = baseValue + Math.sin(elapsed * frequency + phase) * amplitude;
        data.push(Math.max(this.minValue, Math.min(this.maxValue, value)));
      }
    }

    return {
      rows: this.rows,
      cols: this.cols,
      data,
    };
  }

  /**
   * Get min/max values for normalization
   */
  getValueRange() {
    return { min: this.minValue, max: this.maxValue };
  }
}

/**
 * Create the heatmap demo app
 */
export function createHeatmapApp(a: App, win: Window) {
  const state = new HeatmapState();

  win.setContent(() => {
    a.vbox(() => {
      a.label('Heatmap Visualization').withId('title');

      a.label('Temperature/value distribution over time').withId('subtitle');

      // Heatmap canvas
      a.canvasStack(() => {
          cosyne(a, (c) => {
            // Background (350 wide, 360 tall to fit legend below grid)
            c.rect(0, 0, 350, 360)
              .fill('#ffffff')
              .stroke('#cccccc', 1)
              .withId('background');

            // Generate heatmap data
            const data = state.generateData();
            const range = state.getValueRange();

            // Draw heatmap cells with bound fill colors for animation
            const cellSize = 40;
            for (let row = 0; row < data.rows; row++) {
              for (let col = 0; col < data.cols; col++) {
                // Capture row/col for the closure
                const r = row;
                const cl = col;

                c.rect(10 + cl * cellSize, 10 + r * cellSize, cellSize - 1, cellSize - 1)
                  .bindFill(() => {
                    // Re-generate data each time binding is evaluated
                    const currentData = state.generateData();
                    const idx = r * currentData.cols + cl;
                    const value = currentData.data[idx];
                    const normalized = (value - range.min) / (range.max - range.min);

                    // Color mapping: viridis
                    if (normalized < 0.33) {
                      const t = normalized / 0.33;
                      const red = Math.floor(68 + 31 * t);
                      const green = Math.floor(1 + 110 * t);
                      const blue = Math.floor(84 - 84 * t);
                      return `rgb(${red}, ${green}, ${blue})`;
                    } else if (normalized < 0.67) {
                      const t = (normalized - 0.33) / 0.34;
                      const red = Math.floor(99 + 87 * t);
                      const green = Math.floor(111 + 105 * t);
                      return `rgb(${red}, ${green}, 0)`;
                    } else {
                      const t = (normalized - 0.67) / 0.33;
                      const red = Math.floor(186 + 69 * t);
                      const green = Math.floor(216 - 94 * t);
                      const blue = Math.floor(46 * t);
                      return `rgb(${red}, ${green}, ${blue})`;
                    }
                  })
                  .stroke('#ffffff', 0.5)
                  .withId(`cell-${r}-${cl}`);
              }
            }

            // Color scale legend (below the heatmap grid)
            // Grid is 8 cols * 40px = 320px wide, starting at x=10
            c.text(10, 338, '0 (low)').fill('#666666').withId('min-label');
            c.text(220, 338, '100 (high)').fill('#666666').withId('max-label');
          });
        });
    });
  });

  // Update loop - refresh every 50ms
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
  }, 50);

  return () => clearInterval(updateInterval);
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Heatmap Demo' }, (a) => {
    a.window({ title: 'Heatmap Demo', width: 400, height: 450 }, (win) => {
      createHeatmapApp(a, win);
      win.show();
    });
  });
}
