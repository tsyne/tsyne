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

    // Generate interpolated line segments based on interpolation type
    const lineSegments = this.getLineSegments(scaledPoints);

    lineSegments.forEach((seg, i) => {
      ctx.line(x + seg.x1, y + seg.y1, x + seg.x2, y + seg.y2)
        .stroke(this.strokeColor, this.strokeWidth)
        .withId(`line-chart-segment-${i}`);
    });

    // Draw points if radius > 0
    if (this.pointRadius > 0) {
      scaledPoints.forEach((p, i) => {
        ctx.circle(x + p.x, y + p.y, this.pointRadius)
          .fill(this.pointColor)
          .withId(`line-point-${i}`);
      });
    }
  }

  private getLineSegments(points: Array<{ x: number; y: number }>): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    if (points.length < 2) return [];

    switch (this.interpolation) {
      case 'step':
        return this.stepSegments(points);
      case 'catmull-rom':
        return this.catmullRomSegments(points);
      case 'monotone':
        return this.monotoneSegments(points);
      case 'linear':
      default:
        return this.linearSegments(points);
    }
  }

  private linearSegments(points: Array<{ x: number; y: number }>): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        x1: points[i].x,
        y1: points[i].y,
        x2: points[i + 1].x,
        y2: points[i + 1].y,
      });
    }
    return segments;
  }

  private stepSegments(points: Array<{ x: number; y: number }>): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < points.length - 1; i++) {
      const prev = points[i];
      const curr = points[i + 1];
      // Horizontal segment first, then vertical
      segments.push({ x1: prev.x, y1: prev.y, x2: curr.x, y2: prev.y });
      segments.push({ x1: curr.x, y1: prev.y, x2: curr.x, y2: curr.y });
    }
    return segments;
  }

  private catmullRomSegments(points: Array<{ x: number; y: number }>): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const resolution = 10; // Number of segments per curve section

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      for (let t = 0; t < resolution; t++) {
        const t1 = t / resolution;
        const t2 = (t + 1) / resolution;

        const pt1 = this.catmullRomPoint(p0, p1, p2, p3, t1);
        const pt2 = this.catmullRomPoint(p0, p1, p2, p3, t2);

        segments.push({ x1: pt1.x, y1: pt1.y, x2: pt2.x, y2: pt2.y });
      }
    }
    return segments;
  }

  private catmullRomPoint(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ): { x: number; y: number } {
    const t2 = t * t;
    const t3 = t2 * t;

    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );

    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );

    return { x, y };
  }

  private monotoneSegments(points: Array<{ x: number; y: number }>): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    if (points.length < 2) return [];

    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const resolution = 10;

    // Calculate slopes
    const slopes: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const slope = dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx;
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

    // Generate cubic bezier segments
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;

      const cp1x = p1.x + dx / 3;
      const cp1y = p1.y + tangents[i] * (dx / 3);
      const cp2x = p2.x - dx / 3;
      const cp2y = p2.y - tangents[i + 1] * (dx / 3);

      for (let t = 0; t < resolution; t++) {
        const t1 = t / resolution;
        const t2 = (t + 1) / resolution;

        const pt1 = this.cubicBezierPoint(p1, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, p2, t1);
        const pt2 = this.cubicBezierPoint(p1, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, p2, t2);

        segments.push({ x1: pt1.x, y1: pt1.y, x2: pt2.x, y2: pt2.y });
      }
    }

    return segments;
  }

  private cubicBezierPoint(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ): { x: number; y: number } {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
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
