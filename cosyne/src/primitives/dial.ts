/**
 * Dial primitive for Cosyne
 * Renders an interactive rotary control / radio knob for value selection
 * Inspired by Fyne rotary control with extensive customization options
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding, Binding, BindingFunction } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';

/**
 * Dial/knob visual style presets
 */
export type DialStyle = 'classic' | 'minimal' | 'vintage' | 'modern';

/**
 * Configuration options for dial primitive
 */
export interface DialOptions extends PrimitiveOptions {
  minValue?: number;        // Minimum value (default: 0)
  maxValue?: number;        // Maximum value (default: 100)
  value?: number;           // Current value (default: 0)
  step?: number;            // Increment step for keyboard/scroll (default: 1)
  radius?: number;          // Dial radius (default: 40)
  startAngle?: number;      // Start angle in degrees (default: -135, bottom-left)
  endAngle?: number;        // End angle in degrees (default: 135, bottom-right)

  // Visual options
  trackColor?: string;      // Background track color (default: #e0e0e0)
  accentColor?: string;     // Value arc and indicator color (default: #3498db)
  knobColor?: string;       // Center knob fill color (default: #ffffff)
  indicatorColor?: string;  // Indicator line color (if different from accent)

  // Tick marks
  showTicks?: boolean;      // Show tick marks (default: true)
  tickCount?: number;       // Number of tick marks (default: 11)
  tickColor?: string;       // Tick mark color (default: #999999)
  majorTickInterval?: number; // Interval for major (longer) ticks (default: 5)

  // Value display
  showValue?: boolean;      // Show value text (default: true)
  valueSuffix?: string;     // Value suffix (e.g., '%', '°')
  valuePrefix?: string;     // Value prefix
  valueDecimals?: number;   // Decimal places for value (default: 0)
  textColor?: string;       // Value text color (default: #333333)

  // Style preset
  style?: DialStyle;        // Visual style preset (default: 'classic')

  // Knob appearance
  knobRadius?: number;      // Center knob radius (default: radius * 0.3)
  trackWidth?: number;      // Width of track arc (default: 8)

  // Interaction
  wrapping?: boolean;       // Allow value wrapping from max to min (default: false)

  // Callbacks (for event handling after creation)
  onValueChange?: (value: number) => void;
  onChangeEnded?: (value: number) => void;
}

/**
 * Internal state for drag interaction
 */
interface DragState {
  startAngle: number;
  startValue: number;
}

/**
 * Dial primitive - interactive rotary knob control
 */
export class CosyneDial extends Primitive<any> {
  private x: number;
  private y: number;
  private minValue: number;
  private maxValue: number;
  private value: number;
  private step: number;
  private radius: number;
  private startAngle: number;  // In radians
  private endAngle: number;    // In radians

  // Visual properties
  private trackColor: string;
  private accentColor: string;
  private knobColor: string;
  private indicatorColor: string;
  private tickColor: string;
  private textColor: string;

  // Tick options
  private showTicks: boolean;
  private tickCount: number;
  private majorTickInterval: number;

  // Value display
  private showValue: boolean;
  private valueSuffix: string;
  private valuePrefix: string;
  private valueDecimals: number;

  // Knob appearance
  private knobRadius: number;
  private trackWidth: number;

  // Style
  private dialStyle: DialStyle;

  // Interaction
  private wrapping: boolean;
  private dragState: DragState | null = null;

  // Bindings
  private valueBinding: Binding<number> | undefined;

  // Callbacks
  private onValueChangeCallback?: (value: number) => void;
  private onChangeEndedCallback?: (value: number) => void;

  constructor(x: number, y: number, underlying: any, options?: DialOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;

    // Value range
    this.minValue = options?.minValue ?? 0;
    this.maxValue = options?.maxValue ?? 100;
    this.value = options?.value ?? this.minValue;
    this.step = options?.step ?? 1;

    // Size
    this.radius = options?.radius ?? 40;

    // Angles (convert degrees to radians)
    // Default: 270° sweep from -135° to 135° (bottom arc open)
    this.startAngle = ((options?.startAngle ?? -135) * Math.PI) / 180;
    this.endAngle = ((options?.endAngle ?? 135) * Math.PI) / 180;

    // Apply style preset first, then allow overrides
    this.dialStyle = options?.style ?? 'classic';
    const styleDefaults = this.getStyleDefaults(this.dialStyle);

    // Visual properties with style defaults
    this.trackColor = options?.trackColor ?? styleDefaults.trackColor;
    this.accentColor = options?.accentColor ?? styleDefaults.accentColor;
    this.knobColor = options?.knobColor ?? styleDefaults.knobColor;
    this.indicatorColor = options?.indicatorColor ?? options?.accentColor ?? styleDefaults.accentColor;
    this.tickColor = options?.tickColor ?? styleDefaults.tickColor;
    this.textColor = options?.textColor ?? styleDefaults.textColor;

    // Tick marks
    this.showTicks = options?.showTicks ?? true;
    this.tickCount = options?.tickCount ?? 11;
    this.majorTickInterval = options?.majorTickInterval ?? 5;

    // Value display
    this.showValue = options?.showValue ?? true;
    this.valueSuffix = options?.valueSuffix ?? '';
    this.valuePrefix = options?.valuePrefix ?? '';
    this.valueDecimals = options?.valueDecimals ?? 0;

    // Knob appearance
    this.knobRadius = options?.knobRadius ?? this.radius * 0.3;
    this.trackWidth = options?.trackWidth ?? 8;

    // Interaction
    this.wrapping = options?.wrapping ?? false;

    // Callbacks
    this.onValueChangeCallback = options?.onValueChange;
    this.onChangeEndedCallback = options?.onChangeEnded;

    // Set up drag handler
    this.setupDragHandler();
  }

  /**
   * Get style preset defaults
   */
  private getStyleDefaults(style: DialStyle): {
    trackColor: string;
    accentColor: string;
    knobColor: string;
    tickColor: string;
    textColor: string;
  } {
    switch (style) {
      case 'minimal':
        return {
          trackColor: '#f0f0f0',
          accentColor: '#2196F3',
          knobColor: '#ffffff',
          tickColor: '#cccccc',
          textColor: '#333333',
        };
      case 'vintage':
        return {
          trackColor: '#d4c4a8',
          accentColor: '#8b4513',
          knobColor: '#f5deb3',
          tickColor: '#8b7355',
          textColor: '#5c4033',
        };
      case 'modern':
        return {
          trackColor: '#2c2c2c',
          accentColor: '#00ff88',
          knobColor: '#1a1a1a',
          tickColor: '#555555',
          textColor: '#ffffff',
        };
      case 'classic':
      default:
        return {
          trackColor: '#e0e0e0',
          accentColor: '#3498db',
          knobColor: '#ffffff',
          tickColor: '#999999',
          textColor: '#333333',
        };
    }
  }

  /**
   * Set up internal drag handler for rotation
   */
  private setupDragHandler(): void {
    this.onDragStart((e) => {
      const angle = this.getAngleFromPoint(e.x, e.y);
      this.dragState = {
        startAngle: angle,
        startValue: this.value,
      };
    });

    this.onDrag((e) => {
      if (!this.dragState) return;

      const currentAngle = this.getAngleFromPoint(e.x, e.y);
      const angleDelta = currentAngle - this.dragState.startAngle;

      // Convert angle delta to value delta
      const angleRange = this.getAngleRange();
      const valueRange = this.maxValue - this.minValue;
      const valueDelta = (angleDelta / angleRange) * valueRange;

      let newValue = this.dragState.startValue + valueDelta;

      // Apply wrapping or clamping
      if (this.wrapping) {
        while (newValue < this.minValue) newValue += valueRange;
        while (newValue > this.maxValue) newValue -= valueRange;
      } else {
        newValue = Math.max(this.minValue, Math.min(this.maxValue, newValue));
      }

      // Apply step
      newValue = Math.round(newValue / this.step) * this.step;

      if (newValue !== this.value) {
        this.value = newValue;
        this.updateUnderlying();
        this.onValueChangeCallback?.(this.value);
      }
    });

    this.onDragEnd(() => {
      if (this.dragState) {
        this.onChangeEndedCallback?.(this.value);
        this.dragState = null;
      }
    });
  }

  /**
   * Get angle from a point relative to dial center
   */
  private getAngleFromPoint(px: number, py: number): number {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.atan2(dy, dx);
  }

  /**
   * Get the total angle range (handling wrap-around)
   */
  private getAngleRange(): number {
    let range = this.endAngle - this.startAngle;
    if (range < 0) {
      range += 2 * Math.PI;
    }
    return range;
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
   * Increment value by step
   */
  increment(): this {
    return this.setValue(this.value + this.step);
  }

  /**
   * Decrement value by step
   */
  decrement(): this {
    return this.setValue(this.value - this.step);
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
   * Set value change callback
   */
  setOnValueChange(callback: (value: number) => void): this {
    this.onValueChangeCallback = callback;
    return this;
  }

  /**
   * Set change ended callback
   */
  setOnChangeEnded(callback: (value: number) => void): this {
    this.onChangeEndedCallback = callback;
    return this;
  }

  /**
   * Get normalized value (0-1)
   */
  getNormalizedValue(): number {
    if (this.maxValue === this.minValue) return 0.5;
    return (this.value - this.minValue) / (this.maxValue - this.minValue);
  }

  /**
   * Get angle for current value (in radians)
   */
  getValueAngle(): number {
    const normalized = this.getNormalizedValue();
    const range = this.getAngleRange();
    return this.startAngle + range * normalized;
  }

  /**
   * Get indicator endpoint coordinates
   */
  getIndicatorEndpoint(): { x: number; y: number } {
    const angle = this.getValueAngle();
    const indicatorLength = this.radius - this.trackWidth / 2 - 4;
    return {
      x: this.x + Math.cos(angle) * indicatorLength,
      y: this.y + Math.sin(angle) * indicatorLength,
    };
  }

  /**
   * Get formatted value string for display
   */
  getFormattedValue(): string {
    const formatted = this.value.toFixed(this.valueDecimals);
    return `${this.valuePrefix}${formatted}${this.valueSuffix}`;
  }

  /**
   * Get tick mark positions
   */
  getTickPositions(): Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    isMajor: boolean;
  }> {
    if (!this.showTicks || this.tickCount < 2) return [];

    const ticks: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isMajor: boolean;
    }> = [];

    const range = this.getAngleRange();
    const outerRadius = this.radius;
    const majorTickLength = 8;
    const minorTickLength = 4;

    for (let i = 0; i < this.tickCount; i++) {
      const progress = i / (this.tickCount - 1);
      const angle = this.startAngle + range * progress;
      const isMajor = i % this.majorTickInterval === 0;
      const tickLength = isMajor ? majorTickLength : minorTickLength;

      const innerRadius = outerRadius - tickLength;

      ticks.push({
        x1: this.x + Math.cos(angle) * innerRadius,
        y1: this.y + Math.sin(angle) * innerRadius,
        x2: this.x + Math.cos(angle) * outerRadius,
        y2: this.y + Math.sin(angle) * outerRadius,
        isMajor,
      });
    }

    return ticks;
  }

  /**
   * Get all visual properties for rendering
   */
  getRenderData(): {
    x: number;
    y: number;
    radius: number;
    knobRadius: number;
    trackWidth: number;
    startAngle: number;
    endAngle: number;
    valueAngle: number;
    value: number;
    normalizedValue: number;
    formattedValue: string;
    indicatorEndpoint: { x: number; y: number };
    trackColor: string;
    accentColor: string;
    knobColor: string;
    indicatorColor: string;
    tickColor: string;
    textColor: string;
    showTicks: boolean;
    showValue: boolean;
    ticks: ReturnType<CosyneDial['getTickPositions']>;
  } {
    return {
      x: this.x,
      y: this.y,
      radius: this.radius,
      knobRadius: this.knobRadius,
      trackWidth: this.trackWidth,
      startAngle: this.startAngle,
      endAngle: this.endAngle,
      valueAngle: this.getValueAngle(),
      value: this.value,
      normalizedValue: this.getNormalizedValue(),
      formattedValue: this.getFormattedValue(),
      indicatorEndpoint: this.getIndicatorEndpoint(),
      trackColor: this.trackColor,
      accentColor: this.accentColor,
      knobColor: this.knobColor,
      indicatorColor: this.indicatorColor,
      tickColor: this.tickColor,
      textColor: this.textColor,
      showTicks: this.showTicks,
      showValue: this.showValue,
      ticks: this.getTickPositions(),
    };
  }

  // ==================== Abstract method implementations ====================

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
    // Dial rotation is handled via value/angle
  }

  protected applyFill(): void {
    // Fill is handled via knobColor
  }

  protected applyStroke(): void {
    // Stroke is handled via trackColor/accentColor
  }

  /**
   * Update the underlying widget
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update(this.getRenderData());
    }
  }

  /**
   * Get hit tester for this dial (circular area)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      // Simple circular hit test - dial is interactive over its entire area
      const dx = x - this.x;
      const dy = y - this.y;
      const distSq = dx * dx + dy * dy;
      return distSq <= this.radius * this.radius;
    };
  }

  /**
   * Override to include value binding
   */
  hasAnyBinding(): boolean {
    return super.hasAnyBinding() || !!this.valueBinding;
  }
}
