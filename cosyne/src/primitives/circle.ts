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
    if (this.underlying && this.underlying.update && this.fillColor) {
      this.underlying.update({ fillColor: this.fillColor });
    }
  }

  protected applyStroke(): void {
    if (this.underlying && this.underlying.update) {
      const updates: any = {};
      if (this.strokeColor !== undefined) updates.strokeColor = this.strokeColor;
      if (this.strokeWidth !== undefined) updates.strokeWidth = this.strokeWidth;
      if (Object.keys(updates).length > 0) {
        this.underlying.update(updates);
      }
    }
  }

  updatePosition(pos: PositionBinding): void {
    this.x = pos.x;
    this.y = pos.y;
    this.updateUnderlying();
  }

  async updateVisibility(visible: boolean): Promise<void> {
    if (this.underlying) {
      if (visible) {
        await this.underlying.show?.();
      } else {
        await this.underlying.hide?.();
      }
    }
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
   * x, y is the CENTER of the circle, convert to bounding box for Fyne
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update({
        x: this.x - this.radius,
        y: this.y - this.radius,
        x2: this.x + this.radius,
        y2: this.y + this.radius,
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
