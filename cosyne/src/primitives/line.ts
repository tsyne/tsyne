/**
 * Line primitive for Cosyne
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding, Binding, BindingFunction } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';

export interface LineEndpoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LineOptions extends PrimitiveOptions {}

/**
 * Line primitive - wraps Tsyne canvasLine
 */
export class CosyneLine extends Primitive<any> {
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;
  private endpointBinding: Binding<LineEndpoints> | undefined;

  constructor(x1: number, y1: number, x2: number, y2: number, underlying: any, options?: LineOptions) {
    super(underlying, options);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  /**
   * Get current endpoints
   */
  getEndpoints(): LineEndpoints {
    return { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
  }

  /**
   * Bind endpoints to a function
   */
  bindEndpoint(fn: BindingFunction<LineEndpoints>): this {
    this.endpointBinding = new Binding(fn);
    return this;
  }

  /**
   * Get endpoint binding if set
   */
  getEndpointBinding(): Binding<LineEndpoints> | undefined {
    return this.endpointBinding;
  }

  protected applyFill(): void {
    // Lines don't have fill, only stroke
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
    // Lines don't have a single position, they have two endpoints
    // This is handled by updateEndpoints instead
  }

  /**
   * Update line endpoints
   */
  updateEndpoints(endpoints: LineEndpoints): void {
    this.x1 = endpoints.x1;
    this.y1 = endpoints.y1;
    this.x2 = endpoints.x2;
    this.y2 = endpoints.y2;
    this.updateUnderlying();
  }

  updateVisibility(visible: boolean): void {
    // Visibility updates would be handled by the canvas stack
  }

  updateFill(color: string): void {
    // Lines don't have fill, ignore
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
        x1: this.x1,
        y1: this.y1,
        x2: this.x2,
        y2: this.y2,
      });
    }
  }

  /**
   * Get hit tester for this line (distance to line segment)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      return DefaultHitTesters.line(
        x, y,
        this.x1, this.y1, this.x2, this.y2,
        this.strokeWidth || 1
      );
    };
  }
}
