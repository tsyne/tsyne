#!/usr/bin/env tsyne

/**
 * Line Chart & Zoom/Pan Demo
 *
 * @tsyne-app:name Line Chart Demo
 * @tsyne-app:icon chartIcon
 * @tsyne-app:category Visualization
 * @tsyne-app:args (a: any) => void
 */

import { app } from '../../core/src/index';
import { cosyne, refreshAllCosyneContexts, enableEventHandling } from '../../cosyne/src/index';
import { LinearScale } from '../../cosyne/src/scales';
import { Axis, GridLines } from '../../cosyne/src/axes';
import { LineChart, MultiLineChart } from '../../cosyne/src/line-chart';
import { ZoomPan } from '../../cosyne/src/zoom-pan';

type InterpolationType = 'linear' | 'step' | 'catmull-rom' | 'monotone';

class LineChartDemoStore {
  private changeListeners: Array<() => void> = [];
  public interpolation: InterpolationType = 'linear';
  public showMultiple: boolean = false;
  public zoomPan: ZoomPan = new ZoomPan({
    minScale: 0.5,
    maxScale: 5,
    scaleSpeed: 0.15,
  });

  subscribe(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((l) => l());
  }

  setInterpolation(type: InterpolationType) {
    this.interpolation = type;
    this.notifyChange();
  }

  setShowMultiple(show: boolean) {
    this.showMultiple = show;
    this.notifyChange();
  }

  resetZoom() {
    this.zoomPan.reset();
    this.notifyChange();
  }
}

export function buildLineChartDemoApp(a: any) {
  const store = new LineChartDemoStore();

  let statusLabel: any;
  let interpolationLabel: any;

  // Generate sample data
  const generateData = () => {
    const data = [];
    for (let x = 0; x <= 100; x += 10) {
      data.push({
        x,
        y: 50 + 30 * Math.sin(x * Math.PI / 50) + Math.random() * 10,
      });
    }
    return data;
  };

  const data1 = generateData();
  const data2 = generateData().map((p) => ({ ...p, y: p.y + 20 }));
  const data3 = generateData().map((p) => ({ ...p, y: p.y - 20 }));

  a.window({ title: 'Line Chart & Zoom/Pan Demo', width: 1000, height: 750 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Title
        a.label('Interactive Line Charts with Zoom/Pan', undefined, undefined, undefined, { bold: true });

        // Controls
        a.hbox(() => {
          a.label('Interpolation:');
          (['linear', 'step', 'catmull-rom', 'monotone'] as InterpolationType[]).forEach((type) => {
            a.button(
              type.charAt(0).toUpperCase() + type.slice(1),
              async () => store.setInterpolation(type)
            )
              .withId(`interp-${type}`)
              .when(() => store.interpolation !== type);
          });
          interpolationLabel = a.label(`(${store.interpolation})`).withId('interpolationLabel');
        });

        // Series toggle
        a.hbox(() => {
          const multipleCheckbox = a.checkbox('Show multiple series', async (checked) => {
            store.setShowMultiple(checked);
          })
            .withId('multipleCheckbox');
          if (store.showMultiple) multipleCheckbox.setChecked(true);

          a.button('Reset Zoom', async () => {
            store.resetZoom();
            await refreshAllCosyneContexts();
          })
            .withId('resetZoomBtn');
        });

        // Canvas
        a.canvasStack(() => {
          const ctx = cosyne(a, (c) => {
            const padding = 60;
            const width = 700;
            const height = 400;

            // Create scales
            const xScale = new LinearScale().domain(0, 100).range(0, width);
            const yScale = new LinearScale().domain(0, 100).range(height, 0);

            // Draw grid
            const gridH = new GridLines(xScale, { x: padding, y: padding }, height);
            gridH.setOrientation('horizontal').setStrokeColor('#f0f0f0');
            gridH.render(ctx);

            // Draw axes
            const xAxis = new Axis(xScale, { x: padding, y: padding + height }, width);
            xAxis.setOrientation('bottom').render(ctx);

            const yAxis = new Axis(yScale, { x: padding, y: padding }, height);
            yAxis.setOrientation('left').render(ctx);

            // Draw line charts
            if (store.showMultiple) {
              const multiChart = new MultiLineChart(xScale, yScale)
                .setInterpolation(store.interpolation)
                .setStrokeWidth(2);

              multiChart.addSeries('Series 1', data1, '#FF6B6B');
              multiChart.addSeries('Series 2', data2, '#4ECDC4');
              multiChart.addSeries('Series 3', data3, '#45B7D1');

              multiChart.render(ctx, padding, padding);
            } else {
              const chart = new LineChart(xScale, yScale)
                .setPoints(data1)
                .setStrokeColor('#4ECDC4')
                .setStrokeWidth(3)
                .setPointRadius(4)
                .setPointColor('#FF6B6B')
                .setInterpolation(store.interpolation);

              chart.render(ctx, padding, padding);
            }

            // Title
            c.text(padding + width / 2, 20, 'Time Series Data')
              .fill('#333333')
              .withId('chartTitle');

            // Instructions
            c.text(padding, padding + height + 30, 'Use mouse wheel to zoom, drag to pan')
              .fill('#999999')
              .withId('instructions');
          });

          // Enable event handling with zoom/pan
          enableEventHandling(ctx, a, { width: 800, height: 500 });
        });

        // Status
        statusLabel = a.label(`Interpolation: ${store.interpolation}`).withId('statusLabel');
      });
    });
    win.show();
  });

  // Subscribe to store changes
  store.subscribe(async () => {
    interpolationLabel?.setText?.(`(${store.interpolation})`);
    statusLabel?.setText?.(`Interpolation: ${store.interpolation}`);
    await refreshAllCosyneContexts();
  });
}

// Auto-run when executed directly
if (require.main === module) {
  const { resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Line Chart Demo' }, buildLineChartDemoApp);
}
