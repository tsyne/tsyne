/**
 * Effects: Drop shadows, blur, glow, and visual enhancements
 * Inspired by CSS filters and SVG effects
 */

export interface DropShadowOptions {
  /**
   * Horizontal offset in pixels
   */
  dx?: number;
  /**
   * Vertical offset in pixels
   */
  dy?: number;
  /**
   * Blur radius in pixels
   */
  blur?: number;
  /**
   * Shadow color (hex or rgb)
   */
  color?: string;
  /**
   * Shadow opacity (0-1)
   */
  alpha?: number;
}

export interface GlowOptions {
  /**
   * Glow color
   */
  color?: string;
  /**
   * Blur radius for glow
   */
  blur?: number;
  /**
   * Glow opacity (0-1)
   */
  alpha?: number;
  /**
   * 'inner' or 'outer' glow
   */
  mode?: 'inner' | 'outer';
}

export interface TextShadowOptions {
  /**
   * Horizontal offset
   */
  dx?: number;
  /**
   * Vertical offset
   */
  dy?: number;
  /**
   * Blur radius
   */
  blur?: number;
  /**
   * Shadow color
   */
  color?: string;
  /**
   * Shadow opacity (0-1)
   */
  alpha?: number;
}

export interface TextStrokeOptions {
  /**
   * Stroke color
   */
  color?: string;
  /**
   * Stroke width
   */
  width?: number;
}

export interface TextGlowOptions {
  /**
   * Glow color
   */
  color?: string;
  /**
   * Blur radius
   */
  blur?: number;
  /**
   * Glow opacity (0-1)
   */
  alpha?: number;
}

/**
 * Effect renderer - applies visual effects to canvas
 */
export class EffectRenderer {
  /**
   * Apply drop shadow effect
   */
  static applyDropShadow(
    ctx: CanvasRenderingContext2D,
    options: DropShadowOptions
  ): void {
    ctx.shadowOffsetX = options.dx ?? 0;
    ctx.shadowOffsetY = options.dy ?? 0;
    ctx.shadowBlur = options.blur ?? 4;
    ctx.shadowColor = options.color ?? '#000000';

    // Set alpha for shadow
    const savedAlpha = ctx.globalAlpha;
    ctx.globalAlpha = (options.alpha ?? 0.3) * savedAlpha;
  }

  /**
   * Clear drop shadow
   */
  static clearDropShadow(ctx: CanvasRenderingContext2D): void {
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
  }

  /**
   * Apply glow effect (requires rendering shape twice)
   */
  static applyGlow(
    ctx: CanvasRenderingContext2D,
    options: GlowOptions,
    drawShape: () => void
  ): void {
    const color = options.color ?? '#FFFFFF';
    const blur = options.blur ?? 8;
    const alpha = options.alpha ?? 0.5;

    if (options.mode === 'inner') {
      // Inner glow: draw filled shape with glow
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = blur;
      ctx.shadowColor = color;
      ctx.globalAlpha = alpha;
      drawShape();
    } else {
      // Outer glow (default): draw shape with shadow
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = blur;
      ctx.shadowColor = color;
      ctx.globalAlpha = alpha;
      drawShape();
    }
  }

  /**
   * Apply text shadow
   */
  static applyTextShadow(
    ctx: CanvasRenderingContext2D,
    options: TextShadowOptions
  ): void {
    ctx.shadowOffsetX = options.dx ?? 2;
    ctx.shadowOffsetY = options.dy ?? 2;
    ctx.shadowBlur = options.blur ?? 4;
    ctx.shadowColor = options.color ?? '#000000';
    ctx.globalAlpha = (options.alpha ?? 0.5) * ctx.globalAlpha;
  }

  /**
   * Apply text stroke (outline)
   */
  static renderTextStroke(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: TextStrokeOptions
  ): void {
    ctx.strokeStyle = options.color ?? '#000000';
    ctx.lineWidth = options.width ?? 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeText(text, x, y);
  }

  /**
   * Render text with glow
   */
  static renderTextGlow(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: TextGlowOptions
  ): void {
    const color = options.color ?? '#FFFFFF';
    const blur = options.blur ?? 8;
    const alpha = options.alpha ?? 0.5;

    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = blur;
    ctx.shadowColor = color;

    const savedAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha * savedAlpha;

    ctx.fillText(text, x, y);

    ctx.globalAlpha = savedAlpha;
    EffectRenderer.clearDropShadow(ctx);
  }
}

/**
 * Effects holder for primitives
 */
export class EffectsAnchor {
  dropShadow: DropShadowOptions | null = null;
  glow: GlowOptions | null = null;
  textShadow: TextShadowOptions | null = null;
  textStroke: TextStrokeOptions | null = null;
  textGlow: TextGlowOptions | null = null;
  blendMode: string | null = null;
  strokeDash: number[] | null = null;
  strokeDashOffset: number = 0;

  setDropShadow(options: DropShadowOptions): this {
    this.dropShadow = { ...options };
    return this;
  }

  clearDropShadow(): this {
    this.dropShadow = null;
    return this;
  }

  setGlow(options: GlowOptions): this {
    this.glow = { ...options };
    return this;
  }

  clearGlow(): this {
    this.glow = null;
    return this;
  }

  setTextShadow(options: TextShadowOptions): this {
    this.textShadow = { ...options };
    return this;
  }

  setTextStroke(options: TextStrokeOptions): this {
    this.textStroke = { ...options };
    return this;
  }

  setTextGlow(options: TextGlowOptions): this {
    this.textGlow = { ...options };
    return this;
  }

  setBlendMode(mode: string): this {
    this.blendMode = mode;
    return this;
  }

  setStrokeDash(pattern: number[], offset: number = 0): this {
    this.strokeDash = pattern;
    this.strokeDashOffset = offset;
    return this;
  }

  getDropShadow(): DropShadowOptions | null {
    return this.dropShadow;
  }

  getGlow(): GlowOptions | null {
    return this.glow;
  }

  getTextShadow(): TextShadowOptions | null {
    return this.textShadow;
  }

  getTextStroke(): TextStrokeOptions | null {
    return this.textStroke;
  }

  getTextGlow(): TextGlowOptions | null {
    return this.textGlow;
  }

  getBlendMode(): string | null {
    return this.blendMode;
  }

  getStrokeDash(): number[] | null {
    return this.strokeDash;
  }

  getStrokeDashOffset(): number {
    return this.strokeDashOffset;
  }

  /**
   * Apply all effects to canvas context
   */
  applyToContext(ctx: CanvasRenderingContext2D): void {
    // Apply drop shadow
    if (this.dropShadow) {
      EffectRenderer.applyDropShadow(ctx, this.dropShadow);
    }

    // Apply blend mode
    if (this.blendMode) {
      ctx.globalCompositeOperation = this.blendMode as GlobalCompositeOperation;
    }

    // Apply stroke dash
    if (this.strokeDash) {
      ctx.setLineDash(this.strokeDash);
      ctx.lineDashOffset = this.strokeDashOffset;
    }
  }

  /**
   * Clear all effects from canvas context
   */
  clearFromContext(ctx: CanvasRenderingContext2D): void {
    EffectRenderer.clearDropShadow(ctx);

    if (this.blendMode) {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (this.strokeDash) {
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
  }
}
