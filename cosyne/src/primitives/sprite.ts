/**
 * Sprite primitive for Cosyne
 *
 * Declarative animated image sequences following pseudo-declarative patterns.
 * Supports frame-based animation with reactive bindings.
 */

import { Primitive, PrimitiveOptions } from './base';
import { Binding, PositionBinding } from '../binding';

export interface SpriteOptions extends PrimitiveOptions {
  /** Initial frame index (default 0) */
  frame?: number;
}

/**
 * Sprite primitive - displays one frame from an image sequence
 *
 * Usage:
 * ```typescript
 * const frames = generateBallFrames(); // array of data URIs
 * c.sprite(x, y, frames)
 *   .bindPosition(() => ({ x, y }))
 *   .bindFrame(() => rotation % frames.length);
 * ```
 */
export class CosyneSprite extends Primitive<any> {
  private x: number;
  private y: number;
  private frames: string[];
  private currentFrame: number = 0;
  private frameBinding?: Binding<number>;

  constructor(
    x: number,
    y: number,
    frames: string[],
    underlying: any,
    options?: SpriteOptions
  ) {
    super(underlying, options);
    this.x = x;
    this.y = y;
    this.frames = frames;
    this.currentFrame = options?.frame ?? 0;
  }

  /**
   * Set current frame index
   */
  setFrame(index: number): this {
    this.currentFrame = Math.floor(index) % this.frames.length;
    if (this.currentFrame < 0) this.currentFrame += this.frames.length;
    this.updateUnderlying();
    return this;
  }

  /**
   * Get current frame index
   */
  getFrame(): number {
    return this.currentFrame;
  }

  /**
   * Bind frame to a reactive function
   */
  bindFrame(fn: () => number): this {
    this.frameBinding = new Binding(fn);
    return this;
  }

  /**
   * Get frame binding (for refresh)
   */
  getFrameBinding(): Binding<number> | undefined {
    return this.frameBinding;
  }

  /**
   * Get current position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  updatePosition(pos: PositionBinding): void {
    this.x = pos.x;
    this.y = pos.y;
    this.updateUnderlying();
  }

  updateFrame(frame: number): void {
    this.setFrame(frame);
  }

  updateVisibility(visible: boolean): void {
    if (this.underlying?.setVisible) {
      this.underlying.setVisible(visible);
    }
  }

  updateFill(color: string): void {
    // Sprites don't have fill color
  }

  updateStroke(color: string): void {
    // Sprites don't have stroke
  }

  updateAlpha(alpha: number): void {
    this.alpha = alpha;
    if (this.underlying?.setAlpha) {
      this.underlying.setAlpha(alpha);
    }
  }

  updateRotation(): void {
    // Could support rotation transform in future
  }

  protected applyFill(): void {}
  protected applyStroke(): void {}

  private updateUnderlying(): void {
    if (this.underlying?.update) {
      this.underlying.update({
        x: this.x,
        y: this.y,
        frame: this.currentFrame,
        source: this.frames[this.currentFrame],
      });
    }
  }

  /**
   * Hit tester - rectangular bounds
   */
  getHitTester() {
    return (px: number, py: number): boolean => {
      // Approximate hit test based on first frame size
      // In practice, sprites are often rectangular
      const halfSize = 48; // Could be made dynamic
      return px >= this.x - halfSize && px <= this.x + halfSize &&
             py >= this.y - halfSize && py <= this.y + halfSize;
    };
  }
}
