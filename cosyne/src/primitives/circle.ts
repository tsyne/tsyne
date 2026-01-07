/**
 * Circle primitive for Cosyne
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding } from '../binding';
import { RotationAngles } from '../projections';
import { HitTester, DefaultHitTesters } from '../events';

export interface CircleOptions extends PrimitiveOptions {
  radius?: number;
}

/**
 * Circle primitive - wraps Tsyne canvasCircle
 */
export class CosyneCircle extends Primitive<any> {
  private x: number;
  private y: number;
  private radius: number;

  constructor(x: number, y: number, radius: number, underlying: any, options?: CircleOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.radius = radius || 10;
  }

  /**
   * Get current position
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
   * Bind radius to a function
   */
  bindRadius(fn: () => number): this {
    // Store the radius binding and apply it during refresh
    (this as any)._radiusBinding = fn;
    return this;
  }

  protected applyFill(): void {
    if (this.underlying && this.fillColor) {
      // Update fill color on underlying widget
      if (this.underlying.updateFillColor) {
        this.underlying.updateFillColor(this.fillColor);
      }
    }
  }

  protected applyStroke(): void {
    if (this.underlying && this.strokeColor !== undefined) {
      // Update stroke on underlying widget
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
    // For now, this is a no-op but the infrastructure is in place
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

  updateRotation(rotation: RotationAngles): void {
    // Rotation updates would apply to projection context
    // For primitives, this is handled by the projection system
  }

  /**
   * Update the underlying Tsyne widget with current properties
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update({
        x: this.x,
        y: this.y,
        x2: this.x + this.radius * 2,
        y2: this.y + this.radius * 2,
      });
    }
  }

  /**
   * Get hit tester for this circle (point in circle)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      return DefaultHitTesters.circle(x, y, this.x, this.y, this.radius);
    };
  }
}
