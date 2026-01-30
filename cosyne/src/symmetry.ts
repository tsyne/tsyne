/**
 * Radial Symmetry Utilities
 *
 * Functions for generating radially symmetric points and patterns.
 * Useful for kaleidoscopes, mandalas, snowflakes, and radial designs.
 */

import type { Point2D } from './projections';

// Re-export for convenience
export type { Point2D };

/**
 * Options for radial symmetry generation
 */
export interface RadialSymmetryOptions {
  /** Number of segments (default: 6) */
  segments?: number;
  /** Center X coordinate (default: 0) */
  centerX?: number;
  /** Center Y coordinate (default: 0) */
  centerY?: number;
  /** Include mirrored copies for true kaleidoscope effect (default: true) */
  mirror?: boolean;
}

/**
 * Convert a point from absolute to relative-to-center coordinates
 */
export function toRelative(
  x: number,
  y: number,
  centerX: number,
  centerY: number
): Point2D {
  return {
    x: x - centerX,
    y: y - centerY,
  };
}

/**
 * Convert a point from relative-to-center to absolute coordinates
 */
export function toAbsolute(
  rx: number,
  ry: number,
  centerX: number,
  centerY: number
): Point2D {
  return {
    x: rx + centerX,
    y: ry + centerY,
  };
}

/**
 * Rotate a point around the origin by given angle
 */
export function rotatePoint(x: number, y: number, angle: number): Point2D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

/**
 * Mirror a point horizontally (flip X)
 */
export function mirrorPointX(x: number, y: number): Point2D {
  return { x: -x, y };
}

/**
 * Mirror a point vertically (flip Y)
 */
export function mirrorPointY(x: number, y: number): Point2D {
  return { x, y: -y };
}

/**
 * Generate radially symmetric points for a single input point.
 *
 * Creates N copies of the point rotated around the center.
 * If mirror is true (default), also creates mirrored copies for
 * a true kaleidoscope effect (2N points total).
 *
 * @param point - The input point
 * @param options - Symmetry options
 * @returns Array of symmetric points
 *
 * @example
 * // Generate 6-fold kaleidoscope symmetry
 * const points = generateRadialSymmetry({ x: 100, y: 50 }, {
 *   segments: 6,
 *   centerX: 200,
 *   centerY: 200,
 *   mirror: true
 * });
 * // Returns 12 points (6 segments × 2 for mirror)
 */
export function generateRadialSymmetry(
  point: Point2D,
  options: RadialSymmetryOptions = {}
): Point2D[] {
  const {
    segments = 6,
    centerX = 0,
    centerY = 0,
    mirror = true,
  } = options;

  const points: Point2D[] = [];
  const angleStep = (Math.PI * 2) / segments;

  // Convert to relative coordinates
  const rx = point.x - centerX;
  const ry = point.y - centerY;

  for (let i = 0; i < segments; i++) {
    const angle = i * angleStep;

    // Original point rotated
    const rotated = rotatePoint(rx, ry, angle);
    points.push({
      x: rotated.x + centerX,
      y: rotated.y + centerY,
    });

    // Mirrored point rotated (creates kaleidoscope reflection)
    if (mirror) {
      const mirrored = mirrorPointX(rx, ry);
      const mirroredRotated = rotatePoint(mirrored.x, mirrored.y, angle);
      points.push({
        x: mirroredRotated.x + centerX,
        y: mirroredRotated.y + centerY,
      });
    }
  }

  return points;
}

/**
 * Generate radially symmetric line segments.
 *
 * Takes a line from p1 to p2 and creates N symmetric copies.
 *
 * @param p1 - Start point of line
 * @param p2 - End point of line
 * @param options - Symmetry options
 * @returns Array of line segments, each as [start, end]
 */
export function generateRadialLines(
  p1: Point2D,
  p2: Point2D,
  options: RadialSymmetryOptions = {}
): Array<[Point2D, Point2D]> {
  const starts = generateRadialSymmetry(p1, options);
  const ends = generateRadialSymmetry(p2, options);

  const lines: Array<[Point2D, Point2D]> = [];
  for (let i = 0; i < starts.length; i++) {
    lines.push([starts[i], ends[i]]);
  }
  return lines;
}

/**
 * Generate a regular polygon with N sides.
 *
 * @param n - Number of sides
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @param radius - Distance from center to vertices
 * @param rotation - Starting rotation angle (default: 0)
 * @returns Array of vertex points
 */
export function generateRegularPolygon(
  n: number,
  centerX: number,
  centerY: number,
  radius: number,
  rotation: number = 0
): Point2D[] {
  const points: Point2D[] = [];
  const angleStep = (Math.PI * 2) / n;

  for (let i = 0; i < n; i++) {
    const angle = rotation + i * angleStep;
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }

  return points;
}

/**
 * Generate a star shape with N points.
 *
 * @param n - Number of points
 * @param centerX - Center X coordinate
 * @param centerY - Center Y coordinate
 * @param outerRadius - Distance from center to outer points
 * @param innerRadius - Distance from center to inner points
 * @param rotation - Starting rotation angle (default: 0)
 * @returns Array of vertex points (alternating outer/inner)
 */
export function generateStar(
  n: number,
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  rotation: number = 0
): Point2D[] {
  const points: Point2D[] = [];
  const angleStep = Math.PI / n; // Half step for alternating outer/inner

  for (let i = 0; i < n * 2; i++) {
    const angle = rotation + i * angleStep;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }

  return points;
}

/**
 * Calculate the angle from center to a point
 */
export function angleToPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number
): number {
  return Math.atan2(y - centerY, x - centerX);
}

/**
 * Calculate the distance from center to a point
 */
export function distanceToPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number
): number {
  const dx = x - centerX;
  const dy = y - centerY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Convert polar coordinates to Cartesian
 */
export function polarToCartesian(
  angle: number,
  radius: number,
  centerX: number = 0,
  centerY: number = 0
): Point2D {
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

/**
 * Convert Cartesian coordinates to polar
 */
export function cartesianToPolar(
  x: number,
  y: number,
  centerX: number = 0,
  centerY: number = 0
): { angle: number; radius: number } {
  return {
    angle: angleToPoint(x, y, centerX, centerY),
    radius: distanceToPoint(x, y, centerX, centerY),
  };
}
