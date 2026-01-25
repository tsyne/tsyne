/**
 * Gauge Dashboard - Cosyne Declarative Canvas Demo
 *
 * Demonstrates the gauge primitive with:
 * - System metrics (CPU, Memory, Disk, Network) - standard bottom-facing
 * - Different arc orientations (Top, Left, Right, 3/4 Circle, Full Circle)
 * - Real-time updates at 30fps
 * - Data-driven UI generation from config arrays
 *
 * Follows pseudo-declarative patterns:
 * - Observable state class
 * - Declarative bindings (.bindValue)
 * - Fluent method chaining
 * - Programmatic UI generation
 */

import { app, resolveTransport, screenshotIfRequested } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import { cosyne, refreshAllCosyneContexts } from 'cosyne';

/**
 * Gauge configuration type
 */
interface GaugeConfig {
  label: string;
  startAngle?: number;  // degrees, default 225
  endAngle?: number;    // degrees, default 315
  valueColor: string;
  radius?: number;      // gauge size, default 35
  getValue: () => number;
}

/**
 * Observable state for gauge values
 */
class GaugeDashboardState {
  private baseTime = Date.now();

  // System metrics - realistic patterns
  getCpuUsage(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    const base = 30 + Math.sin(t * 0.3) * 20;
    const spike = Math.sin(t * 2.3) > 0.8 ? 40 : 0;
    return Math.min(100, base + spike);
  }

  getMemoryUsage(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    const sawtooth = (t % 6) / 6;
    const variance = Math.sin(t * 1.2) * 10;
    return 40 + sawtooth * 50 + variance;
  }

  getDiskUsage(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    return 65 + Math.sin(t * 0.2) * 5;
  }

  getNetworkUsage(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    const bursts = Math.abs(Math.sin(t * 3)) > 0.6 ? 80 : 20;
    return Math.min(100, bursts + Math.random() * 10);
  }

  // Orientation demo values - varied animations
  getTopValue(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    return 50 + Math.cos(t * 0.7) * 45;
  }

  getLeftValue(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    return 30 + Math.abs(Math.sin(t * 0.3)) * 60;
  }

  getRightValue(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    return (t * 20) % 100;  // Linear sweep
  }

  getThreeQuarterValue(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    return 50 + Math.sin(t * 1.2) * 30 + Math.sin(t * 0.4) * 15;
  }

  getFullCircleValue(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    return 75 + Math.sin(t * 0.8) * 20;
  }

  // Size/style variation values
  getSpeedValue(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    // Simulate acceleration/deceleration
    return 20 + Math.abs(Math.sin(t * 0.5)) * 70;
  }

  getTempValue(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    // Temperature slowly fluctuates
    return 45 + Math.sin(t * 0.15) * 25;
  }

  getBatteryValue(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    // Battery slowly drains then charges
    return 50 + Math.sin(t * 0.1) * 45;
  }

  getProgressValue(): number {
    const t = (Date.now() - this.baseTime) / 1000;
    // Progress increases then resets
    return (t * 8) % 100;
  }
}

export function createGaugeDashboardApp(a: App, win: Window) {
  const state = new GaugeDashboardState();

  // System metrics gauges - standard bottom-facing orientation
  const systemGauges: GaugeConfig[] = [
    { label: 'CPU', valueColor: '#3498db', getValue: () => state.getCpuUsage() },
    { label: 'Memory', valueColor: '#2ecc71', getValue: () => state.getMemoryUsage() },
    { label: 'Disk', valueColor: '#e67e22', getValue: () => state.getDiskUsage() },
    { label: 'Network', valueColor: '#9b59b6', getValue: () => state.getNetworkUsage() },
  ];

  // Orientation demo gauges - different arc configurations
  const orientationGauges: GaugeConfig[] = [
    { label: 'Top', startAngle: 45, endAngle: 135, valueColor: '#16a085', getValue: () => state.getTopValue() },
    { label: 'Left', startAngle: 135, endAngle: 225, valueColor: '#c0392b', getValue: () => state.getLeftValue() },
    { label: 'Right', startAngle: -45, endAngle: 45, valueColor: '#8e44ad', getValue: () => state.getRightValue() },
    { label: '3/4', startAngle: 135, endAngle: 45, valueColor: '#d35400', getValue: () => state.getThreeQuarterValue() },
    { label: 'Full', startAngle: 90, endAngle: 450, valueColor: '#27ae60', getValue: () => state.getFullCircleValue() },
  ];

  // Size and style variations
  const sizeGauges: GaugeConfig[] = [
    // Large speedometer-style half circle (180°)
    { label: 'Speed', startAngle: 180, endAngle: 0, valueColor: '#e74c3c', radius: 50, getValue: () => state.getSpeedValue() },
    // Medium standard gauge
    { label: 'Temp', startAngle: 225, endAngle: 315, valueColor: '#f39c12', radius: 35, getValue: () => state.getTempValue() },
    // Small compact gauge
    { label: 'Batt', startAngle: 225, endAngle: 315, valueColor: '#2ecc71', radius: 20, getValue: () => state.getBatteryValue() },
    // Wide sweep (240°)
    { label: 'Progress', startAngle: 150, endAngle: 30, valueColor: '#3498db', radius: 30, getValue: () => state.getProgressValue() },
  ];

  // Store label refs for imperative updates
  const valueLabels: any[] = [];

  win.setContent(() => {
    a.padded(() => {
      a.vbox(() => {
        // Section 1: System Metrics
        a.label('System Metrics').withId('title');

        a.hbox(() => {
          systemGauges.forEach((config, i) => {
            a.vbox(() => {
              a.label(config.label).withId(`sys-label-${i}`);
              a.canvasStack(() => {
                cosyne(a, (c) => {
                  c.gauge(50, 50, {
                    maxValue: 100,
                    radius: 35,
                    valueColor: config.valueColor,
                    showValue: false,
                  }).bindValue(config.getValue)
                    .withId(`sys-gauge-${i}`);
                });
              });
              valueLabels[i] = a.label('0%').withId(`sys-value-${i}`);
            });
          });
        });

        a.separator();

        // Section 2: Arc Orientations
        a.label('Arc Orientations').withId('orientations-title');

        a.hbox(() => {
          orientationGauges.forEach((config, i) => {
            const idx = i + systemGauges.length;
            a.vbox(() => {
              a.label(config.label).withId(`orient-label-${i}`);
              a.canvasStack(() => {
                cosyne(a, (c) => {
                  c.gauge(50, 50, {
                    maxValue: 100,
                    radius: 30,
                    valueColor: config.valueColor,
                    startAngle: config.startAngle,
                    endAngle: config.endAngle,
                    showValue: false,
                  }).bindValue(config.getValue)
                    .withId(`orient-gauge-${i}`);
                });
              });
              valueLabels[idx] = a.label('0%').withId(`orient-value-${i}`);
            });
          });
        });

        a.separator();

        // Section 3: Size and Style Variations
        a.label('Size & Style Variations').withId('size-title');

        a.hbox(() => {
          sizeGauges.forEach((config, i) => {
            const idx = i + systemGauges.length + orientationGauges.length;
            a.vbox(() => {
              a.label(config.label).withId(`size-label-${i}`);
              a.canvasStack(() => {
                cosyne(a, (c) => {
                  c.gauge(50, 50, {
                    maxValue: 100,
                    radius: config.radius || 35,
                    valueColor: config.valueColor,
                    startAngle: config.startAngle,
                    endAngle: config.endAngle,
                    showValue: false,
                  }).bindValue(config.getValue)
                    .withId(`size-gauge-${i}`);
                });
              });
              valueLabels[idx] = a.label('0%').withId(`size-value-${i}`);
            });
          });
        });
      });
    });
  });

  // Animation loop - refresh bindings and update labels
  const allGauges = [...systemGauges, ...orientationGauges, ...sizeGauges];
  const updateInterval = setInterval(() => {
    refreshAllCosyneContexts();
    allGauges.forEach((config, i) => {
      valueLabels[i]?.setText(`${Math.round(config.getValue())}%`);
    });
  }, 33);

  return () => clearInterval(updateInterval);
}

if (require.main === module) {
  app(resolveTransport(), { title: 'Gauge Dashboard' }, (a) => {
    a.window({ title: 'Gauge Dashboard', width: 500, height: 520 }, (win) => {
      createGaugeDashboardApp(a, win);
      win.show();
      screenshotIfRequested(win, 1000);
    });
  });
}
