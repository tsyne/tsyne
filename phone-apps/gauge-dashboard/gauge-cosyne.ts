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

import { app, resolveTransport, screenshotIfRequested } from '../../core/src';
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

  // Store label refs for updating
  let cpuValueLabel: any;
  let memValueLabel: any;
  let diskValueLabel: any;
  let netValueLabel: any;

  win.setContent(() => {
    a.padded(() => {
      a.vbox(() => {
        a.label('System Dashboard').withId('title');

        // 2x2 gauge grid using Tsyne labels + Cosyne gauges
        a.hbox(() => {
        // CPU gauge - blue
        a.vbox(() => {
          a.label('CPU').withId('cpu-label');
          a.canvasStack(() => {
            cosyne(a, (c) => {
              c.gauge(50, 50, { maxValue: 100, radius: 40, valueColor: '#3498db', showValue: false })
                .bindValue(() => state.getCpuUsage())
                .withId('cpu-gauge');
            });
          });
          cpuValueLabel = a.label('0%').withId('cpu-value');
        });

        // Memory gauge - green
        a.vbox(() => {
          a.label('Memory').withId('memory-label');
          a.canvasStack(() => {
            cosyne(a, (c) => {
              c.gauge(50, 50, { maxValue: 100, radius: 40, valueColor: '#2ecc71', showValue: false })
                .bindValue(() => state.getMemoryUsage())
                .withId('memory-gauge');
            });
          });
          memValueLabel = a.label('0%').withId('memory-value');
        });
      });

      a.hbox(() => {
        // Disk gauge - orange
        a.vbox(() => {
          a.label('Disk').withId('disk-label');
          a.canvasStack(() => {
            cosyne(a, (c) => {
              c.gauge(50, 50, { maxValue: 100, radius: 40, valueColor: '#e67e22', showValue: false })
                .bindValue(() => state.getDiskUsage())
                .withId('disk-gauge');
            });
          });
          diskValueLabel = a.label('0%').withId('disk-value');
        });

        // Network gauge - purple
        a.vbox(() => {
          a.label('Network').withId('network-label');
          a.canvasStack(() => {
            cosyne(a, (c) => {
              c.gauge(50, 50, { maxValue: 100, radius: 40, valueColor: '#9b59b6', showValue: false })
                .bindValue(() => state.getNetworkUsage())
                .withId('network-gauge');
            });
          });
          netValueLabel = a.label('0%').withId('network-value');
        });
      });

        a.label('Real-time system metrics').withId('subtitle');
      });
    });
  });

  // Update loop - 30fps updates
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
    // Update value labels
    cpuValueLabel?.setText(`${state.getCpuUsage().toFixed(0)}%`);
    memValueLabel?.setText(`${state.getMemoryUsage().toFixed(0)}%`);
    diskValueLabel?.setText(`${state.getDiskUsage().toFixed(0)}%`);
    netValueLabel?.setText(`${state.getNetworkUsage().toFixed(0)}%`);
  }, 33);

  return () => clearInterval(updateInterval);
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Gauge Dashboard' }, (a) => {
    a.window({ title: 'Gauge Dashboard', width: 350, height: 400 }, (win) => {
      createGaugeDashboardApp(a, win);
      win.show();
      screenshotIfRequested(win, 1000);
    });
  });
}
