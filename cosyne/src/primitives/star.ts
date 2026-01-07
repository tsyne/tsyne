/**
 * Star primitive for Cosyne
 * Renders a star shape with configurable points
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';

export interface StarOptions extends PrimitiveOptions {
  points?: number;
  innerRadius?: number;
  outerRadius?: number;
}

/**
 * Star primitive - renders star shapes
 */
export class CosyneStar extends Primitive<any> {
  private x: number;
  private y: number;
  private points: number;
  private innerRadius: number;
  private outerRadius: number;

  constructor(x: number, y: number, underlying: any, options?: StarOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.points = options?.points || 5;
    this.innerRadius = options?.innerRadius || 10;
    this.outerRadius = options?.outerRadius || 20;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Set number of points
   */
  setPoints(points: number): this {
    this.points = Math.max(3, points);
    this.updateUnderlying();
    return this;
  }

  /**
   * Set inner radius
   */
  setInnerRadius(radius: number): this {
    this.innerRadius = radius;
    this.updateUnderlying();
    return this;
  }

  /**
   * Set outer radius
   */
  setOuterRadius(radius: number): this {
    this.outerRadius = radius;
    this.updateUnderlying();
    return this;
  }

  /**
   * Get star vertices as polygon points
   */
  getVertices(): Array<{ x: number; y: number }> {
    const vertices: Array<{ x: number; y: number }> = [];
    const totalPoints = this.points * 2;

    for (let i = 0; i < totalPoints; i++) {
      const angle = (i / totalPoints) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? this.outerRadius : this.innerRadius;

      vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    return vertices;
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
    // Rotation would affect vertex angles relative to center
  }

  protected applyFill(): void {
    if (this.underlying && this.fillColor !== undefined) {
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

  /**
   * Update the underlying widget
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      this.underlying.update({
        x: this.x,
        y: this.y,
        points: this.points,
        innerRadius: this.innerRadius,
        outerRadius: this.outerRadius,
      });
    }
  }

  /**
   * Get hit tester for this star (point-in-polygon using vertices)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      const relativeVertices = this.getVertices();
      const absoluteVertices = relativeVertices.map(v => ({
        x: v.x + this.x,
        y: v.y + this.y
      }));
      return DefaultHitTesters.polygon(x, y, absoluteVertices);
    };
  }
}
