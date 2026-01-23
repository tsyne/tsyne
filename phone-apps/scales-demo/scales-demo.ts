#!/usr/bin/env tsyne

/**
 * Scales & Axes Demo
 *
 * @tsyne-app:name Scales Demo
 * @tsyne-app:icon chartIcon
 * @tsyne-app:category Visualization
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app } from 'tsyne';
import { cosyne, clearAllCosyneContexts } from '../../cosyne/src/index';
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
        // Sine wave - beautiful smooth curve
        for (let i = 0; i <= 20; i++) {
          const x = i * 0.5;
          const y = 50 + 40 * Math.sin(x * 0.8);
          this.dataPoints.push({ x, y });
        }
        break;
      case 'log':
        // Exponential decay with oscillation - shows log compression
        for (let i = 1; i <= 100; i += 5) {
          const y = 200 * Math.exp(-i / 30) * (1 + 0.5 * Math.sin(i * 0.3));
          this.dataPoints.push({ x: i, y });
        }
        break;
      case 'sqrt':
        // Bell curve / Gaussian - symmetric peak
        for (let i = 0; i <= 100; i += 5) {
          const center = 50;
          const spread = 20;
          const y = 180 * Math.exp(-Math.pow(i - center, 2) / (2 * spread * spread));
          this.dataPoints.push({ x: i, y });
        }
        break;
      case 'power':
        // Damped sine wave - shows power scale effect
        for (let i = 0; i <= 10; i += 0.5) {
          const y = 250 + 200 * Math.sin(i * 1.2) * Math.exp(-i * 0.15);
          this.dataPoints.push({ x: i, y });
        }
        break;
      case 'ordinal':
        // Interesting categorical data - market trend
        const values = [12, 28, 45, 38, 52, 35, 18];
        for (let i = 0; i < values.length; i++) {
          this.dataPoints.push({ x: i, y: values[i] });
        }
        break;
    }
  }
}

export function buildScalesDemoApp(a: any) {
  const store = new ScalesDemoStore();
  const scaleTypes: ScaleType[] = ['linear', 'log', 'sqrt', 'power', 'ordinal'];

  // Build the content - extracted so we can rebuild on state change
  const buildContent = () => {
    a.vbox(() => {
      // Title
      a.label('D3-Style Scales Visualization', undefined, undefined, undefined, { bold: true });

      // Controls
      a.hbox(() => {
        a.label('Select Scale:').withId('scaleLabel');
        scaleTypes.forEach((scale) => {
          a.button(scale.charAt(0).toUpperCase() + scale.slice(1))
            .onClick(async () => {
              store.selectScale(scale);
            })
            .withId(`scale-${scale}`)
            .when(() => store.selectedScale !== scale);
        });
        a.label(`Selected: ${store.selectedScale}`).withId('selectedScaleLabel');
      });

      // Canvas
      a.canvasStack(() => {
        cosyne(a, (c) => {
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
                .setDomain(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
                .range(0, width);
              yScale = new LinearScale().domain(0, 60).range(height, 0);
              break;
          }

          // Draw grid
          const gridH = new GridLines(xScale, { x: padding, y: padding }, height);
          gridH.setOrientation('horizontal').setStrokeColor('#f0f0f0');
          gridH.render(c);

          // Draw axes
          const xAxis = new Axis(xScale, { x: padding, y: padding + height }, width);
          xAxis.setOrientation('bottom').setStrokeColor('#333333');
          xAxis.render(c);

          const yAxis = new Axis(yScale, { x: padding, y: padding }, height);
          yAxis.setOrientation('left').setStrokeColor('#333333');
          yAxis.render(c);

          // Draw data points and lines
          const categories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          for (let i = 0; i < store.dataPoints.length; i++) {
            const point = store.dataPoints[i];
            const xVal = store.selectedScale === 'ordinal' ? categories[i] : point.x;
            const x = padding + xScale.scale(xVal);
            const y = padding + yScale.scale(point.y);

            // Draw line from prev point
            if (i > 0) {
              const prevPoint = store.dataPoints[i - 1];
              const prevXVal = store.selectedScale === 'ordinal' ? categories[i - 1] : prevPoint.x;
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
      a.label(`Points: ${store.dataPoints.length}`).withId('statusLabel');
    });
  };

  a.window({ title: 'Scales & Axes Demo', width: 900, height: 700 }, (win: any) => {
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
  app(resolveTransport(), { title: 'Scales Demo' }, buildScalesDemoApp);
}
