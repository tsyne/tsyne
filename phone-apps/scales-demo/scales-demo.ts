#!/usr/bin/env tsyne

/**
 * Scales & Axes Demo
 *
 * @tsyne-app:name Scales Demo
 * @tsyne-app:icon chartIcon
 * @tsyne-app:category Visualization
 * @tsyne-app:args (a: any) => void
 */

import { app } from '../../core/src/index';
import { cosyne, refreshAllCosyneContexts } from '../../cosyne/src/index';
import {
  LinearScale,
  LogScale,
  SqrtScale,
  PowerScale,
  OrdinalScale,
} from '../../cosyne/src/scales';
import { Axis, GridLines } from '../../cosyne/src/axes';

type ScaleType = 'linear' | 'log' | 'sqrt' | 'power' | 'ordinal';

class ScalesDemoStore {
  private changeListeners: Array<() => void> = [];
  public selectedScale: ScaleType = 'linear';
  public dataPoints: Array<{ x: number; y: number }> = [];

  constructor() {
    this.generateData('linear');
  }

  subscribe(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((l) => l());
  }

  selectScale(scaleType: ScaleType) {
    this.selectedScale = scaleType;
    this.generateData(scaleType);
    this.notifyChange();
  }

  private generateData(scaleType: ScaleType) {
    this.dataPoints = [];
    switch (scaleType) {
      case 'linear':
        for (let i = 0; i <= 10; i++) {
          this.dataPoints.push({ x: i, y: i * 10 });
        }
        break;
      case 'log':
        for (let i = 1; i <= 100; i += 10) {
          this.dataPoints.push({ x: i, y: Math.log(i) * 50 });
        }
        break;
      case 'sqrt':
        for (let i = 0; i <= 100; i += 10) {
          this.dataPoints.push({ x: i, y: Math.sqrt(i) * 20 });
        }
        break;
      case 'power':
        for (let i = 0; i <= 10; i++) {
          this.dataPoints.push({ x: i, y: Math.pow(i, 2) * 5 });
        }
        break;
      case 'ordinal':
        const categories = ['A', 'B', 'C', 'D', 'E'];
        const values = [10, 24, 36, 18, 7];
        for (let i = 0; i < categories.length; i++) {
          this.dataPoints.push({ x: i, y: values[i] });
        }
        break;
    }
  }
}

export function buildScalesDemoApp(a: any) {
  const store = new ScalesDemoStore();

  let canvas: any;
  let statusLabel: any;

  const scaleTypes: ScaleType[] = ['linear', 'log', 'sqrt', 'power', 'ordinal'];

  a.window({ title: 'Scales & Axes Demo', width: 900, height: 700 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Title
        a.label('D3-Style Scales Visualization', undefined, undefined, undefined, { bold: true });

        // Controls
        a.hbox(() => {
          a.label('Select Scale:').withId('scaleLabel');
          scaleTypes.forEach((scale) => {
            a.button(
              scale.charAt(0).toUpperCase() + scale.slice(1),
              async () => {
                store.selectScale(scale);
              }
            )
              .withId(`scale-${scale}`)
              .when(() => store.selectedScale !== scale);
          });
          a.label(`Selected: ${store.selectedScale}`).withId('selectedScaleLabel');
        });

        // Canvas
        a.canvasStack(() => {
          canvas = a.canvasStack();

          const ctx = cosyne(a, (c) => {
            const padding = 60;
            const width = 700;
            const height = 400;

            // Get appropriate scale
            let xScale: any;
            let yScale: any;

            switch (store.selectedScale) {
              case 'linear':
                xScale = new LinearScale().domain(0, 10).range(0, width);
                yScale = new LinearScale().domain(0, 100).range(height, 0);
                break;
              case 'log':
                xScale = new LogScale().domain(1, 100).range(0, width);
                yScale = new LinearScale().domain(0, 250).range(height, 0);
                break;
              case 'sqrt':
                xScale = new SqrtScale().domain(0, 100).range(0, width);
                yScale = new LinearScale().domain(0, 200).range(height, 0);
                break;
              case 'power':
                xScale = new PowerScale().domain(0, 10).range(0, width).setExponent(2);
                yScale = new LinearScale().domain(0, 500).range(height, 0);
                break;
              case 'ordinal':
                xScale = new OrdinalScale()
                  .setDomain(['A', 'B', 'C', 'D', 'E'])
                  .range(0, width);
                yScale = new LinearScale().domain(0, 40).range(height, 0);
                break;
            }

            // Draw grid
            const gridH = new GridLines(xScale, { x: padding, y: padding }, height);
            gridH.setOrientation('horizontal').setStrokeColor('#f0f0f0');
            gridH.render(ctx);

            // Draw axes
            const xAxis = new Axis(xScale, { x: padding, y: padding + height }, width);
            xAxis.setOrientation('bottom').setStrokeColor('#333333');
            xAxis.render(ctx);

            const yAxis = new Axis(yScale, { x: padding, y: padding }, height);
            yAxis.setOrientation('left').setStrokeColor('#333333');
            yAxis.render(ctx);

            // Draw data points and lines
            for (let i = 0; i < store.dataPoints.length; i++) {
              const point = store.dataPoints[i];
              const xVal = store.selectedScale === 'ordinal' ? i : point.x;
              const x = padding + xScale.scale(xVal);
              const y = padding + yScale.scale(point.y);

              // Draw line from prev point
              if (i > 0) {
                const prevPoint = store.dataPoints[i - 1];
                const prevXVal = store.selectedScale === 'ordinal' ? i - 1 : prevPoint.x;
                const prevX = padding + xScale.scale(prevXVal);
                const prevY = padding + yScale.scale(prevPoint.y);

                c.line(prevX, prevY, x, y)
                  .stroke('#4ECDC4', 2)
                  .withId(`line-${i}`);
              }

              // Draw point
              c.circle(x, y, 4)
                .fill('#FF6B6B')
                .withId(`point-${i}`);
            }

            // Title
            c.text(padding + width / 2, 20, `${store.selectedScale.toUpperCase()} Scale`)
              .fill('#333333')
              .withId('chartTitle');
          });
        });

        // Status
        statusLabel = a.label(`Points: ${store.dataPoints.length}`).withId('statusLabel');
      });
    });
    win.show();
  });

  // Subscribe to store changes
  store.subscribe(async () => {
    statusLabel?.setText?.(`Points: ${store.dataPoints.length}`);
    await refreshAllCosyneContexts();
  });
}

// Auto-run when executed directly
if (require.main === module) {
  const { resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Scales Demo' }, buildScalesDemoApp);
}
