#!/usr/bin/env tsyne

/**
 * Line Chart & Zoom/Pan Demo
 *
 * @tsyne-app:name Line Chart Demo
 * @tsyne-app:icon chartIcon
 * @tsyne-app:category Visualization
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app } from '../../core/src/index';
import { cosyne, clearAllCosyneContexts } from '../../cosyne/src/index';
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

  // Generate sample data (fixed seed for consistent display)
  const data1 = [
    { x: 0, y: 50 },
    { x: 10, y: 68 },
    { x: 20, y: 79 },
    { x: 30, y: 75 },
    { x: 40, y: 58 },
    { x: 50, y: 42 },
    { x: 60, y: 35 },
    { x: 70, y: 45 },
    { x: 80, y: 62 },
    { x: 90, y: 78 },
    { x: 100, y: 80 },
  ];
  const data2 = data1.map((p) => ({ ...p, y: p.y + 15 }));
  const data3 = data1.map((p) => ({ ...p, y: p.y - 15 }));

  // Helper to rebuild content
  const rebuildContent = () => {
    clearAllCosyneContexts();
    if ((buildContent as any)._win) {
      (buildContent as any)._win.setContent(buildContent);
    }
  };

  // Subscribe to zoom/pan changes (don't go through store.notifyChange to avoid double-rebuild)
  store.zoomPan.subscribe(rebuildContent);

  const buildContent = () => {
    a.vbox(() => {
      // Title
      a.label('Interactive Line Charts with Zoom/Pan', undefined, undefined, undefined, { bold: true });

      // Controls
      a.hbox(() => {
        a.label('Interpolation:');
        (['linear', 'step', 'catmull-rom', 'monotone'] as InterpolationType[]).forEach((type) => {
          a.button(type.charAt(0).toUpperCase() + type.slice(1))
            .onClick(async () => store.setInterpolation(type))
            .withId(`interp-${type}`)
            .when(() => store.interpolation !== type);
        });
        a.label(`(${store.interpolation})`).withId('interpolationLabel');
      });

      // Series toggle
      a.hbox(() => {
        const multipleCheckbox = a.checkbox('Show multiple series', (checked: boolean) => {
          store.setShowMultiple(checked);
        })
          .withId('multipleCheckbox');
        if (store.showMultiple) multipleCheckbox.setChecked(true);

        a.button('Reset Zoom')
          .onClick(async () => store.resetZoom())
          .withId('resetZoomBtn');

        // Show zoom level
        const zoomState = store.zoomPan.getState();
        a.label(`Zoom: ${(zoomState.scale * 100).toFixed(0)}%`).withId('zoomLabel');
      });

      // Canvas
      a.canvasStack(() => {
        const padding = 60;
        const chartWidth = 700;
        const chartHeight = 400;
        const canvasWidth = 800;
        const canvasHeight = 500;

        // Get zoom/pan state
        const zpState = store.zoomPan.getState();

        cosyne(a, (c) => {
          // Apply zoom/pan transform to chart area
          const offsetX = padding + zpState.translateX;
          const offsetY = padding + zpState.translateY;
          const scale = zpState.scale;

          // Create scales with zoom applied
          const xScale = new LinearScale().domain(0, 100).range(0, chartWidth * scale);
          const yScale = new LinearScale().domain(0, 100).range(chartHeight * scale, 0);

          // Draw grid (transformed)
          const gridH = new GridLines(xScale, { x: offsetX, y: offsetY }, chartHeight * scale);
          gridH.setOrientation('horizontal').setStrokeColor('#f0f0f0');
          gridH.render(c);

          // Draw axes (transformed)
          const xAxis = new Axis(xScale, { x: offsetX, y: offsetY + chartHeight * scale }, chartWidth * scale);
          xAxis.setOrientation('bottom').render(c);

          const yAxis = new Axis(yScale, { x: offsetX, y: offsetY }, chartHeight * scale);
          yAxis.setOrientation('left').render(c);

          // Draw line charts (transformed)
          if (store.showMultiple) {
            const multiChart = new MultiLineChart(xScale, yScale)
              .setInterpolation(store.interpolation)
              .setStrokeWidth(2);

            multiChart.addSeries('Series 1', data1, '#FF6B6B');
            multiChart.addSeries('Series 2', data2, '#4ECDC4');
            multiChart.addSeries('Series 3', data3, '#45B7D1');

            multiChart.render(c, offsetX, offsetY);
          } else {
            const chart = new LineChart(xScale, yScale)
              .setPoints(data1)
              .setStrokeColor('#4ECDC4')
              .setStrokeWidth(3)
              .setPointRadius(4)
              .setPointColor('#FF6B6B')
              .setInterpolation(store.interpolation);

            chart.render(c, offsetX, offsetY);
          }

          // Title (fixed position)
          c.text(padding + chartWidth / 2, 20, 'Time Series Data')
            .fill('#333333')
            .withId('chartTitle');

          // Instructions (fixed position)
          c.text(padding, padding + chartHeight + 50, 'Use mouse wheel to zoom, drag to pan')
            .fill('#999999')
            .withId('instructions');
        });

        // Create event capture layer for zoom/pan
        // onScroll signature: (deltaX, deltaY, x, y)
        // Fyne: positive deltaY = scroll up, negative = scroll down
        a.tappableCanvasRaster(canvasWidth, canvasHeight, {
          onDrag: (x: number, y: number, deltaX: number, deltaY: number) => {
            store.zoomPan.translate(deltaX, deltaY);
          },
          onScroll: (deltaX: number, deltaY: number, x: number, y: number) => {
            // Invert deltaY: scroll up (positive) should zoom in
            store.zoomPan.handleWheel(-deltaY, x, y);
          },
        });
      });

      // Status
      a.label(`Interpolation: ${store.interpolation}`).withId('statusLabel');
    });
  };

  a.window({ title: 'Line Chart & Zoom/Pan Demo', width: 1000, height: 750 }, (win: any) => {
    // Store window reference for zoom/pan updates
    (buildContent as any)._win = win;

    win.setContent(buildContent);
    win.show();

    // Subscribe to store changes - rebuild the entire window content
    store.subscribe(() => {
      clearAllCosyneContexts();
      win.setContent(buildContent);
    });
  });
}

// Auto-run when executed directly
if (require.main === module) {
  const { resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Line Chart Demo' }, buildLineChartDemoApp);
}
