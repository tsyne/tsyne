/**
 * Line Chart: Connect data points with lines
 */

import { CosyneContext } from './context';
import { AnyScale } from './axes';

export type InterpolationType = 'linear' | 'step' | 'catmull-rom' | 'monotone';

export interface LineChartPoint {
  x: number | string;
  y: number;
}

export interface LineChartOptions {
  xScale: AnyScale;
  yScale: AnyScale;
  strokeColor?: string;
  strokeWidth?: number;
  fill?: boolean;
  fillColor?: string;
  fillAlpha?: number;
  pointRadius?: number;
  pointColor?: string;
  interpolation?: InterpolationType;
}

/**
 * Line chart renderer
 */
export class LineChart {
  private points: LineChartPoint[] = [];
  private xScale: AnyScale;
  private yScale: AnyScale;
  private strokeColor: string = '#4ECDC4';
  private strokeWidth: number = 2;
  private fill: boolean = false;
  private fillColor: string = '#4ECDC4';
  private fillAlpha: number = 0.3;
  private pointRadius: number = 0;
  private pointColor: string = '#4ECDC4';
  private interpolation: InterpolationType = 'linear';

  constructor(xScale: AnyScale, yScale: AnyScale) {
    this.xScale = xScale;
    this.yScale = yScale;
  }

  setPoints(points: LineChartPoint[]): this {
    this.points = [...points];
    return this;
  }

  setStrokeColor(color: string): this {
    this.strokeColor = color;
    return this;
  }

  setStrokeWidth(width: number): this {
    this.strokeWidth = width;
    return this;
  }

  setFill(fill: boolean, color?: string, alpha?: number): this {
    this.fill = fill;
    if (color) this.fillColor = color;
    if (alpha !== undefined) this.fillAlpha = alpha;
    return this;
  }

  setPointRadius(radius: number): this {
    this.pointRadius = radius;
    return this;
  }

  setPointColor(color: string): this {
    this.pointColor = color;
    return this;
  }

  setInterpolation(type: InterpolationType): this {
    this.interpolation = type;
    return this;
  }

  private scalePoints(): Array<{ x: number; y: number }> {
    return this.points.map((p) => ({
      x: this.xScale.scale(p.x as any),
      y: this.yScale.scale(p.y),
    }));
  }

  private generatePath(points: Array<{ x: number; y: number }>): string {
    if (points.length === 0) return '';
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x} ${p.y}`;
    }

    switch (this.interpolation) {
      case 'step':
        return this.stepPath(points);
      case 'catmull-rom':
        return this.catmullRomPath(points);
      case 'monotone':
        return this.monotonePath(points);
      case 'linear':
      default:
        return this.linearPath(points);
    }
  }

  private linearPath(points: Array<{ x: number; y: number }>): string {
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }

  private stepPath(points: Array<{ x: number; y: number }>): string {
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      path += ` L ${curr.x} ${prev.y} L ${curr.x} ${curr.y}`;
    }
    return path;
  }

  private catmullRomPath(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      // Catmull-Rom control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }

    return path;
  }

  private monotonePath(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return `M ${points[0].x} ${points[0].y}`;

    // Calculate slopes
    const slopes: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const slope = (points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x);
      slopes.push(slope);
    }

    // Adjust slopes for monotonicity
    const tangents: number[] = [slopes[0]];
    for (let i = 1; i < slopes.length; i++) {
      if (slopes[i - 1] * slopes[i] <= 0) {
        tangents.push(0);
      } else {
        tangents.push((slopes[i - 1] + slopes[i]) / 2);
      }
    }
    tangents.push(slopes[slopes.length - 1]);

    // Generate path with monotone cubic spline
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      const cp1x = p1.x + dx / 3;
      const cp1y = p1.y + tangents[i] * (dx / 3);
      const cp2x = p2.x - dx / 3;
      const cp2y = p2.y - tangents[i + 1] * (dx / 3);

      path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }

    return path;
  }

  render(ctx: CosyneContext, x: number, y: number): void {
    const scaledPoints = this.scalePoints();

    if (scaledPoints.length === 0) return;

    const pathString = this.generatePath(scaledPoints);

    // Draw filled area if enabled
    if (this.fill && scaledPoints.length > 1) {
      // Create closed path for fill
      let closedPath = pathString;
      const lastPoint = scaledPoints[scaledPoints.length - 1];
      const firstPoint = scaledPoints[0];
      closedPath += ` L ${lastPoint.x} ${y + 500} L ${firstPoint.x} ${y + 500} Z`;

      ctx.path(closedPath, { x, y })
        .fill(this.fillColor)
        .setAlpha(this.fillAlpha)
        .withId('line-chart-fill');
    }

    // Draw line
    ctx.path(pathString, { x, y })
      .stroke(this.strokeColor, this.strokeWidth)
      .withId('line-chart-path');

    // Draw points if radius > 0
    if (this.pointRadius > 0) {
      scaledPoints.forEach((p, i) => {
        ctx.circle(x + p.x, y + p.y, this.pointRadius)
          .fill(this.pointColor)
          .withId(`line-point-${i}`);
      });
    }
  }
}

/**
 * Multi-line chart (multiple series)
 */
export class MultiLineChart {
  private series: Array<{ name: string; points: LineChartPoint[]; color: string }> = [];
  private xScale: AnyScale;
  private yScale: AnyScale;
  private strokeWidth: number = 2;
  private interpolation: InterpolationType = 'linear';

  constructor(xScale: AnyScale, yScale: AnyScale) {
    this.xScale = xScale;
    this.yScale = yScale;
  }

  addSeries(name: string, points: LineChartPoint[], color: string): this {
    this.series.push({ name, points: [...points], color });
    return this;
  }

  setStrokeWidth(width: number): this {
    this.strokeWidth = width;
    return this;
  }

  setInterpolation(type: InterpolationType): this {
    this.interpolation = type;
    return this;
  }

  render(ctx: CosyneContext, x: number, y: number): void {
    this.series.forEach((s, i) => {
      const chart = new LineChart(this.xScale, this.yScale)
        .setPoints(s.points)
        .setStrokeColor(s.color)
        .setStrokeWidth(this.strokeWidth)
        .setInterpolation(this.interpolation);

      chart.render(ctx, x, y);
    });
  }
}
