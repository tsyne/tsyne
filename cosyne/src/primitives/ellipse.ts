/**
 * Ellipse primitive for Cosyne
 *
 * Use ellipse() when you need non-uniform scaling (different x and y radii).
 * For circles (uniform radius), use circle() instead.
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding } from '../binding';
import { RotationAngles } from '../projections';
import { HitTester } from '../events';

export interface EllipseOptions extends PrimitiveOptions {
  radiusX?: number;
  radiusY?: number;
}

/**
 * Ellipse primitive - wraps Tsyne canvasEllipse
 * Supports true ellipse rendering with independent x and y radii
 */
export class CosyneEllipse extends Primitive<any> {
  private x: number;
  private y: number;
  private radiusX: number;
  private radiusY: number;

  constructor(x: number, y: number, radiusX: number, radiusY: number, underlying: any, options?: EllipseOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.radiusX = radiusX || 10;
    this.radiusY = radiusY || 10;
  }

  /**
   * Get current position (center)
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Get current radii
   */
  getRadii(): { radiusX: number; radiusY: number } {
    return { radiusX: this.radiusX, radiusY: this.radiusY };
  }

  /**
   * Set radii
   */
  setRadii(radiusX: number, radiusY: number): this {
    this.radiusX = radiusX;
    this.radiusY = radiusY;
    this.updateUnderlying();
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
  }

  updateRotation(rotation: RotationAngles): void {
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
        radiusX: this.radiusX,
        radiusY: this.radiusY,
      });
    }
  }

  /**
   * Get hit tester for this ellipse (point in ellipse)
   * Uses the standard ellipse equation: (x-cx)²/rx² + (y-cy)²/ry² <= 1
   */
  getHitTester(): HitTester {
    return (px: number, py: number): boolean => {
      const dx = px - this.x;
      const dy = py - this.y;
      // Ellipse equation: (dx/rx)² + (dy/ry)² <= 1
      const normalized = (dx * dx) / (this.radiusX * this.radiusX) +
                         (dy * dy) / (this.radiusY * this.radiusY);
      return normalized <= 1;
    };
  }
}
