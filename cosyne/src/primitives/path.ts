/**
 * Path primitive for Cosyne
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding, BindingFunction, Binding } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';
import { MarkerAnchor, MarkerType, MarkerConfig } from '../markers';

export interface PathOptions extends PrimitiveOptions {}

/**
 * Path primitive - renders SVG path from path string
 */
export class CosynePath extends Primitive<any> {
  private pathString: string;
  private x: number = 0;
  private y: number = 0;
  private markers: MarkerAnchor = new MarkerAnchor();
  private startMarkerBinding: Binding<MarkerConfig | null> | undefined;
  private endMarkerBinding: Binding<MarkerConfig | null> | undefined;

  constructor(pathString: string, underlying: any, options?: PathOptions) {
    super(underlying, options);
    this.pathString = pathString;
  }

  /**
   * Get current path string
   */
  getPathString(): string {
    return this.pathString;
  }

  /**
   * Set path string
   */
  setPathString(pathString: string): this {
    this.pathString = pathString;
    this.updateUnderlying();
    return this;
  }

  /**
   * Set start marker (at path start point)
   */
  startMarker(type: MarkerType, size: number = 10, color?: string, alpha?: number): this {
    this.markers.setStartMarker(type, size, color ?? this.strokeColor ?? '#000000', alpha ?? 1);
    return this;
  }

  /**
   * Set end marker (at path end point)
   */
  endMarker(type: MarkerType, size: number = 10, color?: string, alpha?: number): this {
    this.markers.setEndMarker(type, size, color ?? this.strokeColor ?? '#000000', alpha ?? 1);
    return this;
  }

  /**
   * Bind start marker to a function
   */
  bindStartMarker(fn: BindingFunction<MarkerConfig | null>): this {
    this.startMarkerBinding = new Binding(fn);
    return this;
  }

  /**
   * Bind end marker to a function
   */
  bindEndMarker(fn: BindingFunction<MarkerConfig | null>): this {
    this.endMarkerBinding = new Binding(fn);
    return this;
  }

  /**
   * Get marker anchor
   */
  getMarkers(): MarkerAnchor {
    return this.markers;
  }

  /**
   * Get start marker binding if set
   */
  getStartMarkerBinding(): Binding<MarkerConfig | null> | undefined {
    return this.startMarkerBinding;
  }

  /**
   * Get end marker binding if set
   */
  getEndMarkerBinding(): Binding<MarkerConfig | null> | undefined {
    return this.endMarkerBinding;
  }

  /**
   * Get current position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
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
        d: this.pathString,
        x: this.x,
        y: this.y,
      });
    }
  }

  /**
   * Get hit tester for this path (bounding box approximation)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      const size = 100;
      return DefaultHitTesters.rect(
        x, y,
        this.x, this.y,
        this.x + size, this.y + size,
        this.strokeWidth || 1
      );
    };
  }
}
