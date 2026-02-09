/**
 * SVG Transform Support
 *
 * Parses SVG `transform` attributes and represents them as 2D affine matrices.
 * Supports: translate, scale, rotate, skewX, skewY, matrix.
 *
 * Matrix layout: [a, b, c, d, e, f]
 *   new_x = a*x + c*y + e
 *   new_y = b*x + d*y + f
 */

const DEG_TO_RAD = Math.PI / 180;

/**
 * 2D affine transformation matrix.
 *
 * Stored as [a, b, c, d, e, f] where:
 *   | a c e |
 *   | b d f |
 *   | 0 0 1 |
 */
export class AffineMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;

  constructor(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }

  // ─── Static factories ─────────────────────────────────────────

  static identity(): AffineMatrix {
    return new AffineMatrix(1, 0, 0, 1, 0, 0);
  }

  static translate(tx: number, ty: number = 0): AffineMatrix {
    return new AffineMatrix(1, 0, 0, 1, tx, ty);
  }

  static scale(sx: number, sy?: number): AffineMatrix {
    if (sy === undefined) sy = sx;
    return new AffineMatrix(sx, 0, 0, sy, 0, 0);
  }

  static rotate(degrees: number, cx?: number, cy?: number): AffineMatrix {
    const rad = degrees * DEG_TO_RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    if (cx !== undefined && cy !== undefined) {
      // rotate(a, cx, cy) = translate(cx,cy) * rotate(a) * translate(-cx,-cy)
      return AffineMatrix.translate(cx, cy)
        .multiply(new AffineMatrix(cos, sin, -sin, cos, 0, 0))
        .multiply(AffineMatrix.translate(-cx, -cy));
    }
    return new AffineMatrix(cos, sin, -sin, cos, 0, 0);
  }

  static skewX(degrees: number): AffineMatrix {
    return new AffineMatrix(1, 0, Math.tan(degrees * DEG_TO_RAD), 1, 0, 0);
  }

  static skewY(degrees: number): AffineMatrix {
    return new AffineMatrix(1, Math.tan(degrees * DEG_TO_RAD), 0, 1, 0, 0);
  }

  static fromMatrix(a: number, b: number, c: number, d: number, e: number, f: number): AffineMatrix {
    return new AffineMatrix(a, b, c, d, e, f);
  }

  // ─── Instance methods ─────────────────────────────────────────

  /** Multiply this matrix by another: this * other */
  multiply(other: AffineMatrix): AffineMatrix {
    return new AffineMatrix(
      this.a * other.a + this.c * other.b,
      this.b * other.a + this.d * other.b,
      this.a * other.c + this.c * other.d,
      this.b * other.c + this.d * other.d,
      this.a * other.e + this.c * other.f + this.e,
      this.b * other.e + this.d * other.f + this.f,
    );
  }

  /** Transform a point (x, y) through this matrix. */
  apply(x: number, y: number): [number, number] {
    return [
      this.a * x + this.c * y + this.e,
      this.b * x + this.d * y + this.f,
    ];
  }

  /** Average scale factor — geometric mean of X and Y scale. */
  averageScale(): number {
    const sx = Math.sqrt(this.a * this.a + this.b * this.b);
    const sy = Math.sqrt(this.c * this.c + this.d * this.d);
    return (sx + sy) / 2;
  }

  /** Check if this is (approximately) the identity matrix. */
  isIdentity(): boolean {
    const eps = 1e-10;
    return (
      Math.abs(this.a - 1) < eps &&
      Math.abs(this.b) < eps &&
      Math.abs(this.c) < eps &&
      Math.abs(this.d - 1) < eps &&
      Math.abs(this.e) < eps &&
      Math.abs(this.f) < eps
    );
  }
}

/**
 * Parse an SVG `transform` attribute string into an AffineMatrix.
 *
 * Handles: translate, scale, rotate, matrix, skewX, skewY.
 * Multiple transforms are composed left-to-right per SVG spec.
 */
export function parseTransform(str: string): AffineMatrix {
  if (!str) return AffineMatrix.identity();

  let result = AffineMatrix.identity();

  // Match each transform function: name(args)
  const funcRe = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/gi;
  let match: RegExpExecArray | null;

  while ((match = funcRe.exec(str)) !== null) {
    const name = match[1].toLowerCase();
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(s => s.length > 0)
      .map(Number);

    let m: AffineMatrix;

    switch (name) {
      case 'translate':
        m = AffineMatrix.translate(args[0] ?? 0, args[1] ?? 0);
        break;
      case 'scale':
        m = AffineMatrix.scale(args[0] ?? 1, args.length > 1 ? args[1] : undefined);
        break;
      case 'rotate':
        m = AffineMatrix.rotate(args[0] ?? 0, args[1], args[2]);
        break;
      case 'skewx':
        m = AffineMatrix.skewX(args[0] ?? 0);
        break;
      case 'skewy':
        m = AffineMatrix.skewY(args[0] ?? 0);
        break;
      case 'matrix':
        m = AffineMatrix.fromMatrix(
          args[0] ?? 1, args[1] ?? 0,
          args[2] ?? 0, args[3] ?? 1,
          args[4] ?? 0, args[5] ?? 0,
        );
        break;
      default:
        continue;
    }

    result = result.multiply(m);
  }

  return result;
}
