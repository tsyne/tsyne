/**
 * Gauge primitive for Cosyne
 * Renders a dashboard gauge/meter for displaying values
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding, Binding, BindingFunction } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';

export interface GaugeOptions extends PrimitiveOptions {
  minValue?: number;
  maxValue?: number;
  value?: number;
  radius?: number;
  startAngle?: number;  // In degrees, default 225 (bottom-left)
  endAngle?: number;    // In degrees, default 315 (bottom-right)
  valueColor?: string;  // Custom color for value arc (overrides auto-color)
  showValue?: boolean;  // Whether to show value text in center
}

/**
 * Gauge primitive - renders circular meter/gauge
 */
export class CosyneGauge extends Primitive<any> {
  private x: number;
  private y: number;
  private minValue: number;
  private maxValue: number;
  private value: number;
  private radius: number;
  private startAngle: number;  // In radians
  private endAngle: number;    // In radians
  private valueBinding: Binding<number> | undefined;
  private customValueColor: string | undefined;
  private showValue: boolean;

  constructor(x: number, y: number, underlying: any, options?: GaugeOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.minValue = options?.minValue || 0;
    this.maxValue = options?.maxValue || 100;
    this.value = options?.value || 50;
    this.radius = options?.radius || 50;
    // Convert degrees to radians, default to bottom-facing arc (225° to 315°)
    this.startAngle = ((options?.startAngle ?? 225) * Math.PI) / 180;
    this.endAngle = ((options?.endAngle ?? 315) * Math.PI) / 180;
    this.customValueColor = options?.valueColor;
    this.showValue = options?.showValue ?? true;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Get current value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Set value
   */
  setValue(value: number): this {
    this.value = Math.max(this.minValue, Math.min(this.maxValue, value));
    this.updateUnderlying();
    return this;
  }

  /**
   * Bind value to a function
   */
  bindValue(fn: BindingFunction<number>): this {
    this.valueBinding = new Binding(fn);
    return this;
  }

  /**
   * Get value binding if set
   */
  getValueBinding(): Binding<number> | undefined {
    return this.valueBinding;
  }

  /**
   * Get normalized value (0-1)
   */
  getNormalizedValue(): number {
    if (this.maxValue === this.minValue) return 0.5;
    return (this.value - this.minValue) / (this.maxValue - this.minValue);
  }

  /**
   * Get angle for gauge needle based on configured start/end angles
   * Handles wrap-around for arcs where endAngle < startAngle (e.g., 3/4 circle)
   */
  getNeedleAngle(): number {
    const normalized = this.getNormalizedValue();
    let range = this.endAngle - this.startAngle;
    // If end < start, we're going the "long way around" - add 2π to get positive range
    if (range < 0) {
      range += 2 * Math.PI;
    }
    return this.startAngle + range * normalized;
  }

  /**
   * Get color based on value (custom color or green -> yellow -> red gradient)
   */
  getValueColor(): string {
    // Use custom color if provided
    if (this.customValueColor) {
      return this.customValueColor;
    }

    // Default: gradient from green to yellow to red
    const normalized = this.getNormalizedValue();

    if (normalized < 0.5) {
      const t = normalized * 2; // 0 to 1
      return `rgb(0, ${Math.floor(255 * t)}, 0)`; // Green to yellow
    } else {
      const t = (normalized - 0.5) * 2; // 0 to 1
      return `rgb(${Math.floor(255 * t)}, ${Math.floor(255 * (1 - t))}, 0)`; // Yellow to red
    }
  }

  /**
   * Get whether to show value text
   */
  getShowValue(): boolean {
    return this.showValue;
  }

  updatePosition(pos: PositionBinding): void {
    this.x = pos.x;
    this.y = pos.y;
    this.updateUnderlying();
  }

  updateVisibility(visible: boolean): void {
    // Visibility would be handled by canvas stack
  }

  updateFill(color: string): void {
    this.fillColor = color;
    this.applyFill();
  }

  updateStroke(color: string): void {
    this.strokeColor = color;
    this.applyStroke();
  }

  updateAlpha(alpha: number): void {
    this.alpha = alpha;
  }

  updateRotation(): void {
    // Gauge can rotate
  }

  protected applyFill(): void {
    // Gauge background is filled
  }

  protected applyStroke(): void {
    // Gauge outline is stroked
  }

  /**
   * Update the underlying widget
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update({
        x: this.x,
        y: this.y,
        value: this.value,
        minValue: this.minValue,
        maxValue: this.maxValue,
        radius: this.radius,
        normalizedValue: this.getNormalizedValue(),
        needleAngle: this.getNeedleAngle(),
        valueColor: this.getValueColor(),
      });
    }
  }

  /**
   * Get hit tester for this gauge (full circle)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      return DefaultHitTesters.arc(
        x, y,
        this.x, this.y,
        0, this.radius,
        0, Math.PI * 2
      );
    };
  }
}
