/**
 * Wedge primitive for Cosyne - pie slice or circular sector
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';

export interface WedgeOptions extends PrimitiveOptions {
  radius?: number;
  startAngle?: number;
  endAngle?: number;
}

/**
 * Wedge primitive - pie slice from center to arc
 */
export class CosyneWedge extends Primitive<any> {
  private x: number;
  private y: number;
  private radius: number;
  private startAngle: number = 0;
  private endAngle: number = Math.PI / 2;

  constructor(x: number, y: number, radius: number, underlying: any, options?: WedgeOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.radius = radius || 10;
    if (options?.startAngle !== undefined) {
      this.startAngle = options.startAngle;
    }
    if (options?.endAngle !== undefined) {
      this.endAngle = options.endAngle;
    }
  }

  /**
   * Get current position (center)
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Get current radius
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * Set radius
   */
  setRadius(radius: number): this {
    this.radius = radius;
    this.updateUnderlying();
    return this;
  }

  /**
   * Set start angle (in radians)
   */
  setStartAngle(angle: number): this {
    this.startAngle = angle;
    this.updateUnderlying();
    return this;
  }

  /**
   * Set end angle (in radians)
   */
  setEndAngle(angle: number): this {
    this.endAngle = angle;
    this.updateUnderlying();
    return this;
  }

  protected applyFill(): void {
    if (this.underlying && this.fillColor) {
      if (this.underlying.updateFillColor) {
        this.underlying.updateFillColor(this.fillColor);
      }
    }
  }

  protected applyStroke(): void {
    if (this.underlying && this.strokeColor !== undefined) {
      if (this.underlying.updateStrokeColor) {
        this.underlying.updateStrokeColor(this.strokeColor);
      }
      if (this.underlying.updateStrokeWidth && this.strokeWidth !== undefined) {
        this.underlying.updateStrokeWidth(this.strokeWidth);
      }
    }
  }

  updatePosition(pos: PositionBinding): void {
    this.x = pos.x;
    this.y = pos.y;
    this.updateUnderlying();
  }

  updateVisibility(visible: boolean): void {
    // Visibility updates would be handled by the canvas stack
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
    // Canvas alpha updates would be implemented here
  }

  updateRotation(): void {
    // Rotation updates would apply to projection context
  }

  /**
   * Update the underlying Tsyne widget with current properties
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update({
        x: this.x,
        y: this.y,
        radius: this.radius,
        startAngle: this.startAngle,
        endAngle: this.endAngle,
      });
    }
  }

  /**
   * Get hit tester for this wedge (full radial sector)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      return DefaultHitTesters.arc(
        x, y,
        this.x, this.y,
        0, this.radius,
        this.startAngle, this.endAngle
      );
    };
  }
}
