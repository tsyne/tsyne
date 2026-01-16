/**
 * Spherical Patch primitive for Cosyne
 *
 * Renders a curved quadrilateral on a sphere surface, bounded by lat/lon lines.
 * Used for Amiga Boing Ball style checkered spheres.
 */

import { Primitive, PrimitiveOptions } from './base';
import { Binding, PositionBinding } from '../binding';
import { HitTester } from '../events';

export interface SphericalPatchOptions extends PrimitiveOptions {
  /** Starting latitude in radians (-π/2 to π/2) */
  latStart: number;
  /** Ending latitude in radians */
  latEnd: number;
  /** Starting longitude in radians (0 to 2π) */
  lonStart: number;
  /** Ending longitude in radians */
  lonEnd: number;
  /** Y-axis rotation in radians (for spinning animation) */
  rotation?: number;
}

/**
 * Spherical patch primitive - renders a curved quadrilateral on a sphere
 */
export class CosyneSphericalPatch extends Primitive<any> {
  private cx: number;
  private cy: number;
  private radius: number;
  private latStart: number;
  private latEnd: number;
  private lonStart: number;
  private lonEnd: number;
  private rotation: number;
  private yAxisRotationBinding?: Binding<number>;

  constructor(
    cx: number,
    cy: number,
    radius: number,
    underlying: any,
    options: SphericalPatchOptions
  ) {
    super(underlying, options);
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;
    this.latStart = options.latStart;
    this.latEnd = options.latEnd;
    this.lonStart = options.lonStart;
    this.lonEnd = options.lonEnd;
    this.rotation = options.rotation ?? 0;
  }

  /**
   * Get current sphere center
   */
  getPosition(): { x: number; y: number } {
    return { x: this.cx, y: this.cy };
  }

  /**
   * Get current rotation
   */
  getRotation(): number {
    return this.rotation;
  }

  /**
   * Set rotation angle
   */
  setRotation(rotation: number): this {
    this.rotation = rotation;
    this.updateUnderlying();
    return this;
  }

  /**
   * Bind Y-axis rotation to a reactive function
   */
  bindYAxisRotation(fn: () => number): this {
    this.yAxisRotationBinding = new Binding(fn);
    return this;
  }

  /**
   * Get Y-axis rotation binding (for refresh)
   */
  getYAxisRotationBinding(): Binding<number> | undefined {
    return this.yAxisRotationBinding;
  }

  updatePosition(pos: PositionBinding): void {
    this.cx = pos.x;
    this.cy = pos.y;
    this.updateUnderlying();
  }

  updateRotationValue(rotation: number): void {
    this.rotation = rotation;
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
  }

  updateAlpha(alpha: number): void {
    this.alpha = alpha;
  }

  updateRotation(): void {
    // Handled via bindRotation
  }

  protected applyFill(): void {
    if (this.underlying && this.underlying.update && this.fillColor) {
      this.underlying.update({ fillColor: this.fillColor });
    }
  }

  protected applyStroke(): void {
    // Spherical patches don't have strokes
  }

  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update({
        cx: this.cx,
        cy: this.cy,
        radius: this.radius,
        rotation: this.rotation,
      });
    }
  }

  /**
   * Hit tester for spherical patch
   * Uses simplified circular hit test based on sphere bounds
   */
  getHitTester(): HitTester {
    return (px: number, py: number): boolean => {
      const dx = px - this.cx;
      const dy = py - this.cy;
      return dx * dx + dy * dy <= this.radius * this.radius;
    };
  }
}
