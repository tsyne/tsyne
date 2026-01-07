/**
 * Gauge Dashboard - System Metrics (Cosyne Version)
 *
 * Demonstrates gauge primitive for dashboard metrics.
 * Shows CPU, Memory, Disk, and Network gauges updating in real-time.
 *
 * Features:
 * - 4 gauges for different metrics
 * - Values oscillate realistically (CPU spiking, memory climbing)
 * - Color changes from green → yellow → red as values increase
 * - Real-time updates at 30fps
 */

import { app, resolveTransport } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import { cosyne, refreshAllCosyneContexts } from '../../cosyne/src';

/**
 * Gauge dashboard state - tracks metrics
 */
class GaugeDashboardState {
  private baseTime: number = Date.now();

  /**
   * Get CPU usage (0-100, spiky)
   */
  getCpuUsage(): number {
    const elapsed = (Date.now() - this.baseTime) / 1000;
    const base = 30 + Math.sin(elapsed * 0.3) * 20;
    const spike = Math.sin(elapsed * 2.3) > 0.8 ? 40 : 0;
    return Math.min(100, base + spike);
  }

  /**
   * Get memory usage (0-100, climbing then dropping)
   */
  getMemoryUsage(): number {
    const elapsed = (Date.now() - this.baseTime) / 1000;
    const sawtooth = (elapsed % 6) / 6; // 0 to 1 over 6 seconds
    const variance = Math.sin(elapsed * 1.2) * 10;
    return 40 + sawtooth * 50 + variance;
  }

  /**
   * Get disk usage (0-100, steady high)
   */
  getDiskUsage(): number {
    const elapsed = (Date.now() - this.baseTime) / 1000;
    const base = 65;
    const fluctuation = Math.sin(elapsed * 0.2) * 5;
    return base + fluctuation;
  }

  /**
   * Get network usage (0-100, bursty)
   */
  getNetworkUsage(): number {
    const elapsed = (Date.now() - this.baseTime) / 1000;
    const bursts = Math.abs(Math.sin(elapsed * 3)) > 0.6 ? 80 : 20;
    const noise = Math.random() * 10;
    return Math.min(100, bursts + noise);
  }

  /**
   * Get color category for a value
   */
  getStatus(value: number): string {
    if (value < 40) return '✓ Good';
    if (value < 70) return '⚠ Warning';
    return '✗ Critical';
  }
}

/**
 * Create the gauge dashboard app
 */
export function createGaugeDashboardApp(a: App, win: Window) {
  const state = new GaugeDashboardState();

  win.setContent(() => {
    a.vbox(() => {
      a.label('System Dashboard').withId('title');

      // 2x2 gauge grid
      a.hbox(() => {
        // Left column
        a.vbox(() => {
          a.center(() => {
            a.canvasStack(() => {
              cosyne(a, (c) => {
                c.text(100, 10, 'CPU').fill('#333333').withId('cpu-label');

                c.gauge(100, 60, { maxValue: 100, radius: 40 })
                  .bindValue(() => state.getCpuUsage())
                  .withId('cpu-gauge');

                c.text(100, 130, `${state.getCpuUsage().toFixed(0)}%`)
                  .fill('#333333')
                  .withId('cpu-value');
              });
            });
          });

          a.center(() => {
            a.canvasStack(() => {
              cosyne(a, (c) => {
                c.text(100, 10, 'Memory').fill('#333333').withId('memory-label');

                c.gauge(100, 60, { maxValue: 100, radius: 40 })
                  .bindValue(() => state.getMemoryUsage())
                  .withId('memory-gauge');

                c.text(100, 130, `${state.getMemoryUsage().toFixed(0)}%`)
                  .fill('#333333')
                  .withId('memory-value');
              });
            });
          });
        });

        // Right column
        a.vbox(() => {
          a.center(() => {
            a.canvasStack(() => {
              cosyne(a, (c) => {
                c.text(100, 10, 'Disk').fill('#333333').withId('disk-label');

                c.gauge(100, 60, { maxValue: 100, radius: 40 })
                  .bindValue(() => state.getDiskUsage())
                  .withId('disk-gauge');

                c.text(100, 130, `${state.getDiskUsage().toFixed(0)}%`)
                  .fill('#333333')
                  .withId('disk-value');
              });
            });
          });

          a.center(() => {
            a.canvasStack(() => {
              cosyne(a, (c) => {
                c.text(100, 10, 'Network').fill('#333333').withId('network-label');

                c.gauge(100, 60, { maxValue: 100, radius: 40 })
                  .bindValue(() => state.getNetworkUsage())
                  .withId('network-gauge');

                c.text(100, 130, `${state.getNetworkUsage().toFixed(0)}%`)
                  .fill('#333333')
                  .withId('network-value');
              });
            });
          });
        });
      });

      a.label('Real-time system metrics with gauge visualization').withId('subtitle');
    });
  });

  // Update loop - 30fps updates
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
  }, 33);

  return () => clearInterval(updateInterval);
}

export async function createGaugeDashboardAppWithTransport() {
  const transport = await resolveTransport();
  const a = app(transport);
  const win = a.window({ title: 'Gauge Dashboard' });
  createGaugeDashboardApp(a, win);
}

if (require.main === module) {
  createGaugeDashboardAppWithTransport().catch(console.error);
}
