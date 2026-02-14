/**
 * Polygon primitive for Cosyne
 * Renders an arbitrary polygon from vertices
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding, Binding, BindingFunction } from '../binding';
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
  private vertexBinding: Binding<Point[]> | undefined;

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
   * Set position
   */
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    this.updateUnderlying();
    return this;
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
   * Bind vertices to a function
   */
  bindVertices(fn: BindingFunction<Point[]>): this {
    this.vertexBinding = new Binding(fn);
    return this;
  }

  /**
   * Get vertex binding if set
   */
  getVertexBinding(): Binding<Point[]> | undefined {
    return this.vertexBinding;
  }

  /**
   * Update vertices from binding
   */
  updateVertices(vertices: Point[]): void {
    this.vertices = vertices;
    this.updateUnderlying();
  }

  /**
   * Override to include vertex binding
   */
  hasAnyBinding(): boolean {
    return super.hasAnyBinding() || !!this.vertexBinding;
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

  updateStrokeWidth(width: number): void {
    this.strokeWidth = width;
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
      if (this.underlying.update) {
        this.underlying.update({ fillColor: this.fillColor });
      }
    }
  }

  protected applyStroke(): void {
    if (this.underlying && this.strokeColor !== undefined) {
      if (this.underlying.update) {
        const updateData: any = { strokeColor: this.strokeColor };
        if (this.strokeWidth !== undefined) {
          updateData.strokeWidth = this.strokeWidth;
        }
        this.underlying.update(updateData);
      }
    }
  }

  /**
   * Update the underlying widget
   */
  private updateUnderlying(): void {
    if (this.underlying && this.underlying.update) {
      const points = this.vertices.map(v => ({ x: this.x + v.x, y: this.y + v.y }));
      this.underlying.update({ points });
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
