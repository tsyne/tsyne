/**
 * Axes: D3-style visual axes with ticks and labels
 */

import { LinearScale, LogScale, SqrtScale, PowerScale, OrdinalScale } from './scales';
import { CosyneContext } from './context';

export type AxisOrientation = 'top' | 'bottom' | 'left' | 'right';

export interface AxisOptions {
  orientation?: AxisOrientation;
  tickSize?: number;
  tickPadding?: number;
  labelFormat?: (value: number | string) => string;
  labelAngle?: number;  // Rotation in degrees for labels
  showLabel?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
}

export type AnyScale = LinearScale | LogScale | SqrtScale | PowerScale | OrdinalScale;

/**
 * Axis component that renders a D3-style axis
 */
export class Axis {
  private scale: AnyScale;
  private position: { x: number; y: number };
  private length: number;
  private orientation: AxisOrientation = 'bottom';
  private tickSize: number = 6;
  private tickPadding: number = 3;
  private labelFormat: (value: number | string) => string = (v) => String(v);
  private labelAngle: number = 0;
  private showLabel: boolean = true;
  private strokeColor: string = '#000000';
  private strokeWidth: number = 1;

  constructor(scale: AnyScale, position: { x: number; y: number }, length: number) {
    this.scale = scale;
    this.position = position;
    this.length = length;
  }

  setOrientation(orientation: AxisOrientation): this {
    this.orientation = orientation;
    return this;
  }

  setTickSize(size: number): this {
    this.tickSize = size;
    return this;
  }

  setTickPadding(padding: number): this {
    this.tickPadding = padding;
    return this;
  }

  setLabelFormat(format: (value: number | string) => string): this {
    this.labelFormat = format;
    return this;
  }

  setLabelAngle(angle: number): this {
    this.labelAngle = angle;
    return this;
  }

  setShowLabel(show: boolean): this {
    this.showLabel = show;
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

  render(ctx: CosyneContext): void {
    const isHorizontal = this.orientation === 'top' || this.orientation === 'bottom';
    const isVertical = this.orientation === 'left' || this.orientation === 'right';

    // Get ticks
    let ticks: number[] = [];
    let tickLabels: string[] = [];

    if (this.scale instanceof OrdinalScale) {
      const ordinalTicks = this.scale.ticks();
      ticks = ordinalTicks.map((t, i) => this.scale.scale(t));
      tickLabels = ordinalTicks.map((t) => this.labelFormat(t));
    } else {
      const numericScale = this.scale as LinearScale | LogScale | SqrtScale | PowerScale;
      const tickValues = numericScale.ticks(5);
      ticks = tickValues.map((t) => numericScale.scale(t));
      tickLabels = tickValues.map((t) => this.labelFormat(t));
    }

    // Draw axis line
    if (isHorizontal) {
      ctx.line(
        this.position.x,
        this.position.y,
        this.position.x + this.length,
        this.position.y
      )
        .stroke(this.strokeColor, this.strokeWidth)
        .withId(`axis-${this.orientation}`);

      // Draw ticks and labels
      ticks.forEach((tick, i) => {
        const x = this.position.x + tick;
        const y = this.position.y;

        // Tick line
        const tickEnd = this.orientation === 'bottom' ? y + this.tickSize : y - this.tickSize;
        ctx.line(x, y, x, tickEnd)
          .stroke(this.strokeColor, this.strokeWidth)
          .withId(`tick-${i}`);

        // Tick label
        if (this.showLabel) {
          const labelY = this.orientation === 'bottom'
            ? y + this.tickSize + this.tickPadding + 8
            : y - this.tickSize - this.tickPadding - 8;

          ctx.text(x, labelY, tickLabels[i])
            .fill(this.strokeColor)
            .withId(`label-${i}`);
        }
      });
    } else if (isVertical) {
      ctx.line(
        this.position.x,
        this.position.y,
        this.position.x,
        this.position.y + this.length
      )
        .stroke(this.strokeColor, this.strokeWidth)
        .withId(`axis-${this.orientation}`);

      // Draw ticks and labels
      ticks.forEach((tick, i) => {
        const x = this.position.x;
        const y = this.position.y + tick;

        // Tick line
        const tickEnd = this.orientation === 'right' ? x + this.tickSize : x - this.tickSize;
        ctx.line(x, y, tickEnd, y)
          .stroke(this.strokeColor, this.strokeWidth)
          .withId(`tick-${i}`);

        // Tick label
        if (this.showLabel) {
          const labelX = this.orientation === 'right'
            ? x + this.tickSize + this.tickPadding
            : x - this.tickSize - this.tickPadding;

          ctx.text(labelX, y, tickLabels[i])
            .fill(this.strokeColor)
            .withId(`label-${i}`);
        }
      });
    }
  }
}

/**
 * Grid lines helper for axes
 */
export class GridLines {
  private scale: AnyScale;
  private position: { x: number; y: number };
  private length: number;
  private orientation: 'horizontal' | 'vertical' = 'horizontal';
  private strokeColor: string = '#e0e0e0';
  private strokeWidth: number = 1;

  constructor(scale: AnyScale, position: { x: number; y: number }, length: number) {
    this.scale = scale;
    this.position = position;
    this.length = length;
  }

  setOrientation(orientation: 'horizontal' | 'vertical'): this {
    this.orientation = orientation;
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

  render(ctx: CosyneContext): void {
    let ticks: number[] = [];

    if (this.scale instanceof OrdinalScale) {
      const ordinalTicks = this.scale.ticks();
      ticks = ordinalTicks.map((t) => this.scale.scale(t));
    } else {
      const numericScale = this.scale as LinearScale | LogScale | SqrtScale | PowerScale;
      const tickValues = numericScale.ticks(5);
      ticks = tickValues.map((t) => numericScale.scale(t));
    }

    ticks.forEach((tick, i) => {
      if (this.orientation === 'horizontal') {
        ctx.line(
          this.position.x + tick,
          this.position.y,
          this.position.x + tick,
          this.position.y + this.length
        )
          .stroke(this.strokeColor, this.strokeWidth)
          .withId(`grid-h-${i}`);
      } else {
        ctx.line(
          this.position.x,
          this.position.y + tick,
          this.position.x + this.length,
          this.position.y + tick
        )
          .stroke(this.strokeColor, this.strokeWidth)
          .withId(`grid-v-${i}`);
      }
    });
  }
}
