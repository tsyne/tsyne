/**
 * Text primitive for Cosyne
 */

import { Primitive, PrimitiveOptions } from './base';
import { PositionBinding, Binding, BindingFunction } from '../binding';
import { HitTester, DefaultHitTesters } from '../events';

export interface TextOptions extends PrimitiveOptions {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
}

/**
 * Text primitive - wraps Tsyne canvasText
 */
export class CosyneText extends Primitive<any> {
  private x: number;
  private y: number;
  private text: string;
  private fontSize: number = 12;
  private fontFamily: string = 'sans-serif';
  private fontWeight: string = 'normal';
  private textBinding: Binding<string> | undefined;

  constructor(x: number, y: number, text: string, underlying: any, options?: TextOptions) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.text = text;
    if (options?.fontSize) {
      this.fontSize = options.fontSize;
    }
    if (options?.fontFamily) {
      this.fontFamily = options.fontFamily;
    }
    if (options?.fontWeight) {
      this.fontWeight = options.fontWeight;
    }
  }

  /**
   * Get current position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Get current text content
   */
  getText(): string {
    return this.text;
  }

  /**
   * Set text content
   */
  setText(text: string): this {
    this.text = text;
    this.updateUnderlying();
    return this;
  }

  /**
   * Bind text content to a function
   */
  bindText(fn: BindingFunction<string>): this {
    this.textBinding = new Binding(fn);
    return this;
  }

  /**
   * Get text binding if set
   */
  getTextBinding(): Binding<string> | undefined {
    return this.textBinding;
  }

  /**
   * Update text from binding
   */
  updateText(text: string): void {
    this.text = text;
    this.updateUnderlying();
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
        x: this.x,
        y: this.y,
        text: this.text,
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        fontWeight: this.fontWeight,
      });
    }
  }

  /**
   * Get hit tester for this text (bounding box approximation)
   */
  getHitTester(): HitTester {
    return (x: number, y: number): boolean => {
      const approximateWidth = this.fontSize * 0.6 * this.text.length;
      const approximateHeight = this.fontSize;
      return DefaultHitTesters.rect(
        x, y,
        this.x, this.y - approximateHeight,
        this.x + approximateWidth, this.y,
        1
      );
    };
  }

  /**
   * Override to include text binding
   */
  hasAnyBinding(): boolean {
    return super.hasAnyBinding() || !!this.textBinding;
  }
}
