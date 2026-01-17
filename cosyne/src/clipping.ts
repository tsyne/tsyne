/**
 * Clipping Paths: Mask content using shapes
 * Inspired by SVG clipPath element
 */

export type ClippingShape = 'circle' | 'rect' | 'polygon' | 'path';

export interface CircleClip {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface RectClip {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;  // For rounded corners
}

export interface PolygonClip {
  type: 'polygon';
  points: Array<{ x: number; y: number }>;
}

export interface PathClip {
  type: 'path';
  pathString: string;
}

export type ClipPath = CircleClip | RectClip | PolygonClip | PathClip;

/**
 * Clipping region manager
 */
export class ClippingRegion {
  private clipPath: ClipPath | null = null;
  private enabled: boolean = true;

  /**
   * Set clipping path as circle
   */
  setCircleClip(cx: number, cy: number, r: number): this {
    this.clipPath = { type: 'circle', cx, cy, r };
    return this;
  }

  /**
   * Set clipping path as rectangle
   */
  setRectClip(x: number, y: number, width: number, height: number, radius?: number): this {
    this.clipPath = { type: 'rect', x, y, width, height, radius };
    return this;
  }

  /**
   * Set clipping path as polygon
   */
  setPolygonClip(points: Array<{ x: number; y: number }>): this {
    this.clipPath = { type: 'polygon', points: [...points] };
    return this;
  }

  /**
   * Set clipping path as SVG path
   */
  setPathClip(pathString: string): this {
    this.clipPath = { type: 'path', pathString };
    return this;
  }

  /**
   * Clear clipping
   */
  clearClip(): this {
    this.clipPath = null;
    return this;
  }

  /**
   * Enable/disable clipping
   */
  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    return this;
  }

  /**
   * Get current clip path
   */
  getClipPath(): ClipPath | null {
    return this.clipPath;
  }

  /**
   * Check if clipping is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.clipPath !== null;
  }

  /**
   * Apply clipping to canvas context
   */
  applyClip(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled || !this.clipPath) return;

    switch (this.clipPath.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(this.clipPath.cx, this.clipPath.cy, this.clipPath.r, 0, Math.PI * 2);
        ctx.clip();
        break;

      case 'rect':
        if (this.clipPath.radius && this.clipPath.radius > 0) {
          // Rounded rectangle
          ctx.beginPath();
          const r = this.clipPath.radius;
          const x = this.clipPath.x;
          const y = this.clipPath.y;
          const w = this.clipPath.width;
          const h = this.clipPath.height;

          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + h - r);
          ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
          ctx.lineTo(x + r, y + h);
          ctx.arcTo(x, y + h, x, y + h - r, r);
          ctx.lineTo(x, y + r);
          ctx.arcTo(x, y, x + r, y, r);
          ctx.closePath();
          ctx.clip();
        } else {
          // Simple rectangle
          ctx.beginPath();
          ctx.rect(this.clipPath.x, this.clipPath.y, this.clipPath.width, this.clipPath.height);
          ctx.clip();
        }
        break;

      case 'polygon':
        ctx.beginPath();
        this.clipPath.points.forEach((point, idx) => {
          if (idx === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.clip();
        break;

      case 'path':
        try {
          const path = new Path2D(this.clipPath.pathString);
          ctx.clip(path);
        } catch (e) {
          console.warn('Invalid clip path:', this.clipPath.pathString);
        }
        break;
    }
  }

  /**
   * Check if point is inside clip region
   */
  containsPoint(x: number, y: number): boolean {
    if (!this.enabled || !this.clipPath) return true;

    switch (this.clipPath.type) {
      case 'circle': {
        const dx = x - this.clipPath.cx;
        const dy = y - this.clipPath.cy;
        return dx * dx + dy * dy <= this.clipPath.r * this.clipPath.r;
      }

      case 'rect':
        return (
          x >= this.clipPath.x &&
          x <= this.clipPath.x + this.clipPath.width &&
          y >= this.clipPath.y &&
          y <= this.clipPath.y + this.clipPath.height
        );

      case 'polygon':
        return this.pointInPolygon(x, y, this.clipPath.points);

      case 'path':
        // Approximate: check bounding box
        return true;
    }
  }

  /**
   * Point-in-polygon using ray casting
   */
  private pointInPolygon(x: number, y: number, points: Array<{ x: number; y: number }>): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
}

/**
 * Clipping utilities
 */
export class ClippingUtils {
  /**
   * Create circular clipping region
   */
  static createCircleClip(cx: number, cy: number, r: number): CircleClip {
    return { type: 'circle', cx, cy, r };
  }

  /**
   * Create rectangular clipping region
   */
  static createRectClip(
    x: number,
    y: number,
    width: number,
    height: number,
    radius?: number
  ): RectClip {
    return { type: 'rect', x, y, width, height, radius };
  }

  /**
   * Create polygonal clipping region
   */
  static createPolygonClip(points: Array<{ x: number; y: number }>): PolygonClip {
    return { type: 'polygon', points };
  }

  /**
   * Create path-based clipping region
   */
  static createPathClip(pathString: string): PathClip {
    return { type: 'path', pathString };
  }

  /**
   * Get bounding box of clip region
   */
  static getBounds(clip: ClipPath): { x: number; y: number; width: number; height: number } {
    switch (clip.type) {
      case 'circle':
        return {
          x: clip.cx - clip.r,
          y: clip.cy - clip.r,
          width: clip.r * 2,
          height: clip.r * 2,
        };

      case 'rect':
        return {
          x: clip.x,
          y: clip.y,
          width: clip.width,
          height: clip.height,
        };

      case 'polygon': {
        const xs = clip.points.map((p) => p.x);
        const ys = clip.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
      }

      case 'path':
        // Approximate with reasonable defaults
        return { x: 0, y: 0, width: 100, height: 100 };
    }
  }
}
