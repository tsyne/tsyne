/**
 * Rectangle primitive for Cosyne
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding } from '../binding';
import { RotationAngles } from '../projections';
import { HitTester, DefaultHitTesters } from '../events';

export interface RectOptions extends PrimitiveOptions {
  width?: number;
  height?: number;
}

/**
 * Rectangle primitive - wraps Tsyne canvasRectangle
 */
export class CosyneRect extends Primitive<any> {
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(x: number, y: number, width: number, height: number, underlying: any, options?: RectOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /**
   * Get current position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Get current dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Set dimensions
   */
  setDimensions(width: number, height: number): this {
    this.width = width;
    this.height = height;
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
  }

  /**
   * Update the underlying Tsyne widget with current properties
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update({
        x: this.x,
        y: this.y,
        x2: this.x + this.width,
        y2: this.y + this.height,
      });
    }
  }

  /**
   * Get hit tester for this rectangle (point in bounding box)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      return DefaultHitTesters.rect(
        x,
        y,
        this.x,
        this.y,
        this.x + this.width,
        this.y + this.height,
        this.strokeWidth || 1
      );
    };
  }
}
