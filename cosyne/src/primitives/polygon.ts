/**
 * Polygon primitive for Cosyne
 * Renders an arbitrary polygon from vertices
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';

export interface Point {
  x: number;
  y: number;
}

export interface PolygonOptions extends PrimitiveOptions {
  vertices?: Point[];
}

/**
 * Polygon primitive - renders arbitrary polygon shape
 */
export class CosynePolygon extends Primitive<any> {
  private x: number;
  private y: number;
  private vertices: Point[] = [];

  constructor(x: number, y: number, vertices: Point[], underlying: any, options?: PolygonOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.vertices = vertices;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Get vertices
   */
  getVertices(): Point[] {
    return this.vertices;
  }

  /**
   * Set vertices
   */
  setVertices(vertices: Point[]): this {
    this.vertices = vertices;
    this.updateUnderlying();
    return this;
  }

  /**
   * Create a regular polygon (e.g., triangle, square, pentagon)
   */
  static createRegularPolygon(sides: number, radius: number): Point[] {
    const vertices: Point[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
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
        vertices: this.vertices,
      });
    }
  }

  /**
   * Get hit tester for this polygon (point-in-polygon)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      const absoluteVertices = this.vertices.map(v => ({
        x: v.x + this.x,
        y: v.y + this.y
      }));
      return DefaultHitTesters.polygon(x, y, absoluteVertices);
    };
  }
}
