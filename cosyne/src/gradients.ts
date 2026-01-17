/**
 * Gradients: Linear and radial color gradients
 * Inspired by SVG linearGradient and radialGradient elements
 */

export type ColorStop = [offset: number, color: string, alpha?: number];

/**
 * Linear gradient from point A to point B
 */
export class LinearGradient {
  private stops: ColorStop[] = [];
  private x1: number = 0;
  private y1: number = 0;
  private x2: number = 100;
  private y2: number = 0;

  constructor(x1?: number, y1?: number, x2?: number, y2?: number) {
    if (x1 !== undefined) this.x1 = x1;
    if (y1 !== undefined) this.y1 = y1;
    if (x2 !== undefined) this.x2 = x2;
    if (y2 !== undefined) this.y2 = y2;
  }

  /**
   * Add color stop
   * @param offset Gradient offset (0-1)
   * @param color CSS color string
   * @param alpha Optional alpha (0-1)
   */
  addStop(offset: number, color: string, alpha: number = 1): this {
    this.stops.push([offset, color, alpha]);
    // Keep stops sorted by offset
    this.stops.sort((a, b) => a[0] - b[0]);
    return this;
  }

  /**
   * Set gradient direction
   */
  setDirection(x1: number, y1: number, x2: number, y2: number): this {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    return this;
  }

  /**
   * Set direction as angle (0 = right, 90 = down)
   */
  setAngle(angle: number, length: number = 100): this {
    const radians = (angle * Math.PI) / 180;
    this.x1 = 0;
    this.y1 = 0;
    this.x2 = length * Math.cos(radians);
    this.y2 = length * Math.sin(radians);
    return this;
  }

  /**
   * Get color stops
   */
  getStops(): ColorStop[] {
    return [...this.stops];
  }

  /**
   * Create Canvas gradient object
   */
  createCanvasGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
    const grad = ctx.createLinearGradient(this.x1, this.y1, this.x2, this.y2);
    this.stops.forEach(([offset, color, alpha]) => {
      if (alpha !== undefined && alpha < 1) {
        // Parse color and add alpha
        const rgbaColor = this.colorToRGBA(color, alpha);
        grad.addColorStop(offset, rgbaColor);
      } else {
        grad.addColorStop(offset, color);
      }
    });
    return grad;
  }

  private colorToRGBA(color: string, alpha: number): string {
    // Simple conversion - doesn't handle all formats
    if (color.startsWith('rgba')) return color;
    if (color.startsWith('rgb')) {
      return color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    }
    // Hex to RGBA (simplified)
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Clone gradient
   */
  clone(): LinearGradient {
    const clone = new LinearGradient(this.x1, this.y1, this.x2, this.y2);
    this.stops.forEach(([offset, color, alpha]) => {
      clone.addStop(offset, color, alpha);
    });
    return clone;
  }
}

/**
 * Radial gradient from center point with radius
 */
export class RadialGradient {
  private stops: ColorStop[] = [];
  private cx: number = 50;
  private cy: number = 50;
  private r: number = 50;
  private focalX: number = 50;  // Optional focal point
  private focalY: number = 50;

  constructor(cx?: number, cy?: number, r?: number, focalX?: number, focalY?: number) {
    if (cx !== undefined) this.cx = cx;
    if (cy !== undefined) this.cy = cy;
    if (r !== undefined) this.r = r;
    if (focalX !== undefined) this.focalX = focalX;
    if (focalY !== undefined) this.focalY = focalY;
  }

  /**
   * Add color stop
   */
  addStop(offset: number, color: string, alpha: number = 1): this {
    this.stops.push([offset, color, alpha]);
    this.stops.sort((a, b) => a[0] - b[0]);
    return this;
  }

  /**
   * Set center point
   */
  setCenter(cx: number, cy: number): this {
    this.cx = cx;
    this.cy = cy;
    return this;
  }

  /**
   * Set radius
   */
  setRadius(r: number): this {
    this.r = r;
    return this;
  }

  /**
   * Set focal point (for focal radial gradients)
   */
  setFocalPoint(fx: number, fy: number): this {
    this.focalX = fx;
    this.focalY = fy;
    return this;
  }

  /**
   * Get color stops
   */
  getStops(): ColorStop[] {
    return [...this.stops];
  }

  /**
   * Create Canvas gradient object
   */
  createCanvasGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
    // Canvas doesn't support focal points directly, use simplest form
    const grad = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.r);
    this.stops.forEach(([offset, color, alpha]) => {
      if (alpha !== undefined && alpha < 1) {
        const rgbaColor = this.colorToRGBA(color, alpha);
        grad.addColorStop(offset, rgbaColor);
      } else {
        grad.addColorStop(offset, color);
      }
    });
    return grad;
  }

  private colorToRGBA(color: string, alpha: number): string {
    if (color.startsWith('rgba')) return color;
    if (color.startsWith('rgb')) {
      return color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    }
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Clone gradient
   */
  clone(): RadialGradient {
    const clone = new RadialGradient(this.cx, this.cy, this.r, this.focalX, this.focalY);
    this.stops.forEach(([offset, color, alpha]) => {
      clone.addStop(offset, color, alpha);
    });
    return clone;
  }
}

/**
 * Preset gradients
 */
export const PRESET_GRADIENTS = {
  // Sunset: red → yellow → orange
  sunset: (): LinearGradient => {
    return new LinearGradient(0, 0, 100, 0)
      .addStop(0, '#FF6B6B')
      .addStop(0.5, '#FFD93D')
      .addStop(1, '#FF8C42');
  },

  // Ocean: dark blue → light blue
  ocean: (): LinearGradient => {
    return new LinearGradient(0, 0, 0, 100)
      .addStop(0, '#1A3A52')
      .addStop(0.5, '#4ECDC4')
      .addStop(1, '#B4E7F5');
  },

  // Forest: dark green → light green
  forest: (): LinearGradient => {
    return new LinearGradient(0, 0, 100, 100)
      .addStop(0, '#1B4332')
      .addStop(0.5, '#40916C')
      .addStop(1, '#95D5B2');
  },

  // Sunset radial (for circles)
  sunsetRadial: (): RadialGradient => {
    return new RadialGradient(50, 50, 50)
      .addStop(0, '#FFD93D')
      .addStop(0.5, '#FF8C42')
      .addStop(1, '#FF6B6B');
  },

  // Sky: light blue → white
  sky: (): LinearGradient => {
    return new LinearGradient(0, 0, 0, 100)
      .addStop(0, '#87CEEB')
      .addStop(1, '#FFFFFF');
  },

  // Flame: yellow → red → dark red
  flame: (): LinearGradient => {
    return new LinearGradient(0, 100, 0, 0)
      .addStop(0, '#FFD700')
      .addStop(0.5, '#FF6B6B')
      .addStop(1, '#8B0000');
  },

  // Cool: cyan → purple
  cool: (): LinearGradient => {
    return new LinearGradient(0, 0, 100, 0)
      .addStop(0, '#4ECDC4')
      .addStop(0.5, '#6C5CE7')
      .addStop(1, '#A29BFE');
  },

  // Grayscale: white → black
  grayscale: (): LinearGradient => {
    return new LinearGradient(0, 0, 100, 0)
      .addStop(0, '#FFFFFF')
      .addStop(1, '#000000');
  },
};

/**
 * Helper to create common gradients
 */
export function createGradient(
  type: 'linear' | 'radial',
  direction?: string
): LinearGradient | RadialGradient {
  if (type === 'radial') {
    return new RadialGradient();
  }

  // Linear gradient with optional direction
  const grad = new LinearGradient();
  if (direction) {
    const angles: { [key: string]: number } = {
      'top': 270,
      'bottom': 90,
      'left': 180,
      'right': 0,
      'top-right': 315,
      'top-left': 225,
      'bottom-right': 45,
      'bottom-left': 135,
    };
    const angle = angles[direction] ?? 0;
    grad.setAngle(angle);
  }

  return grad;
}
