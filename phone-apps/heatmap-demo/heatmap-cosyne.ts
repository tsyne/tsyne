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

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
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
      a.center(() => {
        a.canvasStack(() => {
          cosyne(a, (c) => {
            // Background
            c.rect(0, 0, 350, 350)
              .fill('#ffffff')
              .stroke('#cccccc', 1)
              .withId('background');

            // Heatmap with dynamically updated data
            const data = state.generateData();
            const range = state.getValueRange();

            c.heatmap(10, 10, { colorScheme: 'viridis' })
              .fill('transparent')
              .withId('main-heatmap');

            // Draw individual cells as colored rectangles (manual rendering for demo)
            const cellSize = 40;
            for (let row = 0; row < data.rows; row++) {
              for (let col = 0; col < data.cols; col++) {
                const idx = row * data.cols + col;
                const value = data.data[idx];
                const normalized = (value - range.min) / (range.max - range.min);

                // Color mapping: viridis
                let color: string;
                if (normalized < 0.33) {
                  const t = normalized / 0.33;
                  const r = Math.floor(68 + 31 * t);
                  const g = Math.floor(1 + 110 * t);
                  const b = Math.floor(84 - 84 * t);
                  color = `rgb(${r}, ${g}, ${b})`;
                } else if (normalized < 0.67) {
                  const t = (normalized - 0.33) / 0.34;
                  const r = Math.floor(99 + 87 * t);
                  const g = Math.floor(111 + 105 * t);
                  const b = 0;
                  color = `rgb(${r}, ${g}, ${b})`;
                } else {
                  const t = (normalized - 0.67) / 0.33;
                  const r = Math.floor(186 + 69 * t);
                  const g = Math.floor(216 - 94 * t);
                  const b = Math.floor(46 * t);
                  color = `rgb(${r}, ${g}, ${b})`;
                }

                c.rect(10 + col * cellSize, 10 + row * cellSize, cellSize - 1, cellSize - 1)
                  .fill(color)
                  .stroke('#ffffff', 0.5)
                  .withId(`cell-${row}-${col}`);
              }
            }

            // Color scale legend
            c.text(10, 330, '0').fill('#666666').withId('min-label');
            c.text(310, 330, '100').fill('#666666').withId('max-label');
          });
        });
      });

      a.label('Updates every 50ms with sine wave oscillations').withId('info');
    });
  });

  // Update loop - refresh every 50ms
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
  }, 50);

  return () => clearInterval(updateInterval);
}

export async function createHeatmapAppWithTransport() {
  const transport = await resolveTransport();
  const a = app(transport);
  const win = a.window({ title: 'Heatmap Demo' });
  createHeatmapApp(a, win);
}

if (require.main === module) {
  createHeatmapAppWithTransport().catch(console.error);
}
