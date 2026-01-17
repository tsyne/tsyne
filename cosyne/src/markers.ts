/**
 * Line Markers: Arrows, dots, and custom decorations for line endpoints
 * Inspired by SVG's marker element and PostScript pen styles
 */

export type BuiltInMarkerType = 'arrow' | 'circle' | 'square' | 'triangle' | 'diamond' | 'bar';

export interface CustomMarker {
  /**
   * SVG path data (M0,0 L10,0 ... etc)
   * Will be auto-scaled based on size
   */
  path: string;
  width: number;
  height: number;
  /**
   * Where the line connects (as offset from top-left of bounding box)
   */
  refX: number;
  refY: number;
}

export type MarkerType = BuiltInMarkerType | CustomMarker;

/**
 * Check if marker is custom
 */
export function isCustomMarker(marker: MarkerType): marker is CustomMarker {
  return typeof marker === 'object' && 'path' in marker;
}

/**
 * Marker renderer - handles all marker drawing
 */
export class MarkerRenderer {
  /**
   * Render a marker at the given point and angle
   *
   * @param ctx Canvas context
   * @param x Position X
   * @param y Position Y
   * @param angle Rotation angle in radians
   * @param marker Marker type or custom marker
   * @param size Marker size in pixels
   * @param color Marker color
   * @param alpha Marker opacity
   */
  static render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    marker: MarkerType,
    size: number = 10,
    color: string = '#000000',
    alpha: number = 1
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    // Translate to marker position and rotate
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (isCustomMarker(marker)) {
      MarkerRenderer.renderCustom(ctx, marker, size);
    } else {
      MarkerRenderer.renderBuiltIn(ctx, marker, size);
    }

    ctx.restore();
  }

  private static renderBuiltIn(
    ctx: CanvasRenderingContext2D,
    type: BuiltInMarkerType,
    size: number
  ): void {
    const s = size;

    switch (type) {
      case 'arrow':
        // Solid triangle arrow
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-s, -s / 2);
        ctx.lineTo(-s, s / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'circle':
        ctx.beginPath();
        ctx.arc(-s / 2, 0, s / 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'square':
        ctx.fillRect(-s, -s / 2, s, s);
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-s, s / 2);
        ctx.lineTo(-s / 2, -s / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-s / 2, s / 2);
        ctx.lineTo(-s, 0);
        ctx.lineTo(-s / 2, -s / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'bar':
        // Horizontal bar (useful for flow diagrams - indicates "blocking")
        ctx.fillRect(-s / 4, -s / 2, s / 2, s);
        break;
    }
  }

  private static renderCustom(
    ctx: CanvasRenderingContext2D,
    marker: CustomMarker,
    size: number
  ): void {
    // Scale custom marker to requested size
    const scaleX = size / marker.width;
    const scaleY = size / marker.height;
    const scale = Math.min(scaleX, scaleY);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-marker.refX, -marker.refY);

    // Draw custom path
    const path = new Path2D(marker.path);
    ctx.fill(path);

    ctx.restore();
  }

  /**
   * Get marker size for positioning calculations
   */
  static getMarkerSize(marker: MarkerType, baseSize: number): number {
    if (isCustomMarker(marker)) {
      return Math.max(marker.width, marker.height);
    }
    return baseSize;
  }
}

/**
 * Preset custom markers (SVG paths)
 */
export const CUSTOM_MARKERS = {
  // Double-headed arrow
  doubleArrow: {
    path: 'M 0,0 L -8,-3 L -8,3 Z M -4,0 L -12,-3 L -12,3 Z',
    width: 12,
    height: 6,
    refX: 12,
    refY: 3,
  } as CustomMarker,

  // Open arrow (outline only)
  openArrow: {
    path: 'M 0,0 L -8,-3 L -8,3 Z',
    width: 8,
    height: 6,
    refX: 8,
    refY: 3,
  } as CustomMarker,

  // Curved arrow (for arc paths)
  curvedArrow: {
    path: 'M 0,0 Q -4,-2 -8,0 Q -6,2 -2,3 L 0,0 Z',
    width: 8,
    height: 6,
    refX: 8,
    refY: 3,
  } as CustomMarker,

  // Reverse arrow (points backward)
  reverseArrow: {
    path: 'M 0,-3 L 0,3 L -8,0 Z',
    width: 8,
    height: 6,
    refX: 0,
    refY: 3,
  } as CustomMarker,

  // Cross mark (for prohibition/negation)
  cross: {
    path: 'M -4,-4 L 4,4 M 4,-4 L -4,4',
    width: 8,
    height: 8,
    refX: 4,
    refY: 4,
  } as CustomMarker,

  // Tee/T-junction marker
  tee: {
    path: 'M -4,-4 L -4,4 M -8,0 L 0,0',
    width: 8,
    height: 8,
    refX: 0,
    refY: 4,
  } as CustomMarker,

  // Open circle (outline)
  openCircle: {
    path: 'M 0,-3 A 3,3 0 1,1 0,3 A 3,3 0 1,1 0,-3',
    width: 6,
    height: 6,
    refX: 3,
    refY: 3,
  } as CustomMarker,

  // Filled square
  filledSquare: {
    path: 'M 0,0 L 5,0 L 5,5 L 0,5 Z',
    width: 5,
    height: 5,
    refX: 5,
    refY: 2.5,
  } as CustomMarker,
};

/**
 * Marker configuration
 */
export interface MarkerConfig {
  type: MarkerType;
  size?: number;
  color?: string;
  alpha?: number;
}

/**
 * Marker holder for primitives
 */
export class MarkerAnchor {
  startMarker: MarkerConfig | null = null;
  endMarker: MarkerConfig | null = null;

  setStartMarker(type: MarkerType, size: number = 10, color: string = '#000000', alpha: number = 1): this {
    this.startMarker = { type, size, color, alpha };
    return this;
  }

  setEndMarker(type: MarkerType, size: number = 10, color: string = '#000000', alpha: number = 1): this {
    this.endMarker = { type, size, color, alpha };
    return this;
  }

  clearStartMarker(): this {
    this.startMarker = null;
    return this;
  }

  clearEndMarker(): this {
    this.endMarker = null;
    return this;
  }

  getStartMarker(): MarkerConfig | null {
    return this.startMarker;
  }

  getEndMarker(): MarkerConfig | null {
    return this.endMarker;
  }

  /**
   * Render markers at the given endpoints
   * Useful for debug/testing
   */
  renderMarkers(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): void {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      // Start marker
      if (this.startMarker) {
        const angle = Math.atan2(dy, dx);
        MarkerRenderer.render(
          ctx,
          startX,
          startY,
          angle,
          this.startMarker.type,
          this.startMarker.size,
          this.startMarker.color,
          this.startMarker.alpha
        );
      }

      // End marker
      if (this.endMarker) {
        const angle = Math.atan2(dy, dx);
        MarkerRenderer.render(
          ctx,
          endX,
          endY,
          angle,
          this.endMarker.type,
          this.endMarker.size,
          this.endMarker.color,
          this.endMarker.alpha
        );
      }
    }
  }
}
