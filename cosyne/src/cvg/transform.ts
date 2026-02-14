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

import type { TransformSpec, CosynePerspective } from './types';

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

  /** Build a matrix from a typed TransformSpec object.
   *  Application order: translate → rotate → scale → skewX → skewY. */
  static fromSpec(spec: TransformSpec): AffineMatrix {
    let m = AffineMatrix.identity();
    if (spec.translate) m = m.multiply(AffineMatrix.translate(spec.translate[0], spec.translate[1]));
    if (spec.rotate !== undefined) {
      if (Array.isArray(spec.rotate)) m = m.multiply(AffineMatrix.rotate(spec.rotate[0], spec.rotate[1], spec.rotate[2]));
      else m = m.multiply(AffineMatrix.rotate(spec.rotate));
    }
    if (spec.scale !== undefined) {
      if (typeof spec.scale === 'number') m = m.multiply(AffineMatrix.scale(spec.scale));
      else m = m.multiply(AffineMatrix.scale(spec.scale[0], spec.scale[1]));
    }
    if (spec.skewX !== undefined) m = m.multiply(AffineMatrix.skewX(spec.skewX));
    if (spec.skewY !== undefined) m = m.multiply(AffineMatrix.skewY(spec.skewY));
    return m;
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

// ─── Projective (perspective) transform ─────────────────────────────

/**
 * 2D projective transformation matrix (homography).
 *
 * Stored as [a, b, c, d, e, f, g, h] representing:
 *   | a c e |
 *   | b d f |
 *   | g h 1 |
 *
 * Point transform: x' = (ax + cy + e) / (gx + hy + 1)
 *                  y' = (bx + dy + f) / (gx + hy + 1)
 *
 * When g = h = 0 this degenerates to an affine transform.
 */
export class ProjectiveMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
  readonly g: number;
  readonly h: number;

  constructor(a: number, b: number, c: number, d: number,
              e: number, f: number, g: number, h: number) {
    this.a = a; this.b = b; this.c = c; this.d = d;
    this.e = e; this.f = f; this.g = g; this.h = h;
  }

  // ─── Static factories ─────────────────────────────────────────

  static identity(): ProjectiveMatrix {
    return new ProjectiveMatrix(1, 0, 0, 1, 0, 0, 0, 0);
  }

  static fromAffine(m: AffineMatrix): ProjectiveMatrix {
    return new ProjectiveMatrix(m.a, m.b, m.c, m.d, m.e, m.f, 0, 0);
  }

  /**
   * Perspective rotation around the Y axis (vertical — left/right wall effect).
   * Positive degrees rotate the right edge away from the viewer.
   */
  static rotateY(degrees: number, distance: number, ox = 0, oy = 0): ProjectiveMatrix {
    const rad = degrees * DEG_TO_RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // Core: x' = x·cos / (1 + x·sin/d),  y' = y / (1 + x·sin/d)
    const core = new ProjectiveMatrix(cos, 0, 0, 1, 0, 0, sin / distance, 0);
    if (ox === 0 && oy === 0) return core;
    // translate(ox,oy) × core × translate(-ox,-oy)
    // Application order on point: translate(-ox,-oy) first, then core, then translate(ox,oy)
    return ProjectiveMatrix.fromAffine(AffineMatrix.translate(ox, oy))
      .multiply(core)
      .multiply(ProjectiveMatrix.fromAffine(AffineMatrix.translate(-ox, -oy)));
  }

  /**
   * Perspective rotation around the X axis (horizontal — top/bottom tilt).
   * Positive degrees tilt the top edge away from the viewer.
   */
  static rotateX(degrees: number, distance: number, ox = 0, oy = 0): ProjectiveMatrix {
    const rad = degrees * DEG_TO_RAD;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // Core: x' = x / (1 + y·sin/d),  y' = y·cos / (1 + y·sin/d)
    const core = new ProjectiveMatrix(1, 0, 0, cos, 0, 0, 0, sin / distance);
    if (ox === 0 && oy === 0) return core;
    return ProjectiveMatrix.fromAffine(AffineMatrix.translate(ox, oy))
      .multiply(core)
      .multiply(ProjectiveMatrix.fromAffine(AffineMatrix.translate(-ox, -oy)));
  }

  // ─── Instance methods ─────────────────────────────────────────

  /** Full 3×3 matrix multiply (bottom-right element normalized to 1). */
  multiply(other: ProjectiveMatrix): ProjectiveMatrix {
    const i = this.g * other.e + this.h * other.f + 1;  // [2,2]
    return new ProjectiveMatrix(
      (this.a * other.a + this.c * other.b + this.e * other.g) / i,
      (this.b * other.a + this.d * other.b + this.f * other.g) / i,
      (this.a * other.c + this.c * other.d + this.e * other.h) / i,
      (this.b * other.c + this.d * other.d + this.f * other.h) / i,
      (this.a * other.e + this.c * other.f + this.e) / i,
      (this.b * other.e + this.d * other.f + this.f) / i,
      (this.g * other.a + this.h * other.b + other.g) / i,
      (this.g * other.c + this.h * other.d + other.h) / i,
    );
  }

  /** Transform a point (x, y) through this matrix with perspective division. */
  apply(x: number, y: number): [number, number] {
    const w = this.g * x + this.h * y + 1;
    return [
      (this.a * x + this.c * y + this.e) / w,
      (this.b * x + this.d * y + this.f) / w,
    ];
  }

  /** Average scale factor of the linear part. */
  averageScale(): number {
    const sx = Math.sqrt(this.a * this.a + this.b * this.b);
    const sy = Math.sqrt(this.c * this.c + this.d * this.d);
    return (sx + sy) / 2;
  }

  /** True if this is an affine transform (no perspective). */
  isAffine(): boolean {
    const eps = 1e-10;
    return Math.abs(this.g) < eps && Math.abs(this.h) < eps;
  }
}

// ─── Transform2D: union of affine and projective ────────────────────

/** A 2D transform — either affine or projective. */
export type Transform2D = AffineMatrix | ProjectiveMatrix;

/** Compose two transforms, promoting to ProjectiveMatrix if either is projective. */
export function composeTransforms(a: Transform2D, b: Transform2D): Transform2D {
  if (a instanceof ProjectiveMatrix || b instanceof ProjectiveMatrix) {
    const pa = a instanceof ProjectiveMatrix ? a : ProjectiveMatrix.fromAffine(a);
    const pb = b instanceof ProjectiveMatrix ? b : ProjectiveMatrix.fromAffine(b);
    return pa.multiply(pb);
  }
  return (a as AffineMatrix).multiply(b as AffineMatrix);
}

/** Build a transform from a typed TransformSpec, returning ProjectiveMatrix if perspective is used. */
export function transformFromSpec(spec: TransformSpec): Transform2D {
  const affine = AffineMatrix.fromSpec(spec);
  if (!spec.cosynePerspective) return affine;

  const p = spec.cosynePerspective;
  const ox = p.origin?.[0] ?? 0;
  const oy = p.origin?.[1] ?? 0;
  let proj = ProjectiveMatrix.fromAffine(affine);
  if (p.rotateY !== undefined) {
    proj = proj.multiply(ProjectiveMatrix.rotateY(p.rotateY, p.distance, ox, oy));
  }
  if (p.rotateX !== undefined) {
    proj = proj.multiply(ProjectiveMatrix.rotateX(p.rotateX, p.distance, ox, oy));
  }
  return proj;
}
