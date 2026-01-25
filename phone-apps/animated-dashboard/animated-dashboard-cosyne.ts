/**
 * Animated Dashboard Demo - Cosyne Phase 9
 *
 * Demonstrates real-time animated data visualization
 * - Animated bar chart with data binding
 * - Animated progress indicators
 * - Multi-property animations
 * - Data-driven animations
 */

import { App } from 'tsyne';
import { CosyneContext, cosyne, refreshAllCosyneContexts, enableEventHandling, easeOutCubic, easeInOutSine } from 'cosyne';

interface MetricState {
  value: number;
  target: number;
  color: string;
  label: string;
}

export function buildAnimatedDashboardApp(a: App): void {
  a.canvasStack(() => {
    const cosyneCtx = cosyne(a, (c: CosyneContext) => {
      // Dashboard state
      const metrics: Map<string, MetricState> = new Map();
      metrics.set('cpu', { value: 0, target: 75, color: '#FF6B6B', label: 'CPU' });
      metrics.set('memory', { value: 0, target: 60, color: '#4ECDC4', label: 'Memory' });
      metrics.set('disk', { value: 0, target: 45, color: '#45B7D1', label: 'Disk' });

      // Simulate live updates
      let updateIndex = 0;
      const simulateUpdate = () => {
        updateIndex++;
        metrics.get('cpu')!.target = 30 + Math.random() * 70;
        metrics.get('memory')!.target = 20 + Math.random() * 80;
        metrics.get('disk')!.target = 10 + Math.random() * 70;
        refreshAllCosyneContexts();
      };

      // Set up periodic updates
      setInterval(simulateUpdate, 3000);

      // Title
      c
        .rect(0, 0, 500, 60)
        .fill('#2C3E50');

      c
        .text(250, 30, 'Animated Dashboard - Phase 9')
        .fill('#FFFFFF');

      // Create animated bar charts
      const renderBar = (index: number, metric: MetricState, y: number) => {
        const metric_key = Array.from(metrics.keys())[index];

        // Bar background
        c
          .rect(50, y, 400, 40)
          .stroke('#CCCCCC', 1)
          .withId(`bar-bg-${index}`);

        // Animated bar fill
        c
          .rect(50, y, 400 * (metric.value / 100), 40)
          .fill(metric.color)
          .bindPosition(() => {
            const m = metrics.get(metric_key)!;
            return { x: 50, y: y };
          })
          .bindFill(() => metrics.get(metric_key)!.color)
          .withId(`bar-${index}`);

        // Value text (animated)
        c
          .text(270, y + 20, `${Math.round(metric.value)}%`)
          .fill('#FFFFFF')
          .bindPosition(() => ({ x: 270, y: y + 20 }))
          .withId(`text-${index}`);

        // Label
        c
          .text(20, y + 20, metric.label)
          .fill('#2C3E50');

        // Start animation to target value
        const animateToTarget = () => {
          const m = metrics.get(metric_key)!;
          const control = c
            .circle(0, 0, 1) // Dummy element for animation
            .animateFluent('_animValue', m.value, m.target)
            .duration(1000)
            .easing(easeOutCubic)
            .start();
        };

        animateToTarget();
      };

      let yPos = 100;
      metrics.forEach((metric, key) => {
        renderBar(Array.from(metrics.keys()).indexOf(key), metric, yPos);
        yPos += 80;
      });

      // Stats summary box
      c
        .rect(20, 350, 460, 80)
        .stroke('#CCCCCC', 1)
        .fill('#F9F9F9');

      c
        .text(40, 370, 'Real-time Metrics')
        .fill('#2C3E50');

      let statY = 395;
      metrics.forEach((metric, key) => {
        const m = metrics.get(key)!;
        c
          .text(40, statY, `${m.label}: ${Math.round(m.value)}% → ${Math.round(m.target)}%`)
          .fill('#2C3E50')
          .bindPosition(() => ({
            x: 40,
            y: statY
          }));
        statY += 20;
      });
    });

    // Enable event handling
    enableEventHandling(cosyneCtx, a, {
      width: 500,
      height: 450,
    });
  });
}

// Standalone execution
if (require.main === module) {
  const { app } = require('../../core/src');
  app(
    {
      title: 'Animated Dashboard - Cosyne Phase 9',
      width: 600,
      height: 550,
    },
    (a: any) => {
      a.window(
        { title: 'Animated Dashboard Demo', width: 500, height: 450 },
        (win: any) => {
          win.setContent(() => {
            buildAnimatedDashboardApp(a);
          });
          win.show();
        }
      );
    }
  );
}
