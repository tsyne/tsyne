/**
 * 3D Math utilities: angles, rotations, random, region testing
 */

import { Vector3 } from './math3d-core';

// ============================================================================
// Basic Utilities
// ============================================================================

/**
 * Utility to convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Utility to convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ============================================================================
// Random Utilities
// ============================================================================

/**
 * Random number in [-1, 1] range
 * Common for jittering, noise effects
 */
export function urandom(): number {
  return Math.random() * 2 - 1;
}

/**
 * Random Vector3 with components in [-1, 1]
 * Useful for particle systems, AI variation, etc.
 */
export function urandomVector(): Vector3 {
  return new Vector3(urandom(), urandom(), urandom());
}

/**
 * Random unit vector (normalized, on unit sphere)
 * Uses rejection sampling for uniform distribution
 */
export function randomUnitVector(): Vector3 {
  let v: Vector3;
  let lenSq: number;

  // Rejection sampling to get uniform distribution
  do {
    v = urandomVector();
    lenSq = v.lengthSquared();
  } while (lenSq > 1 || lenSq < 0.0001);

  return v.normalize();
}

// ============================================================================
// Angle Utilities
// ============================================================================

/**
 * Angle from point a to point b (in radians)
 * Returns angle in [-PI, PI] range where:
 * - 0 points along +X
 * - PI/2 points along +Y
 * - PI points along -X
 * - -PI/2 points along -Y
 *
 * Useful for AI facing, projectile direction, etc.
 */
export function angleBetween(a: Vector3, b: Vector3): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Angle from point a to point b (2D version using x,y coordinates)
 */
export function angleBetween2D(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(by - ay, bx - ax);
}

/**
 * Normalize an angle to [-PI, PI] range
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * Shortest angular difference between two angles
 * Returns value in [-PI, PI]
 */
export function angleDiff(from: number, to: number): number {
  return normalizeAngle(to - from);
}

/**
 * Linear interpolation for angles (handles wrapping)
 */
export function lerpAngle(from: number, to: number, t: number): number {
  const diff = angleDiff(from, to);
  return normalizeAngle(from + diff * t);
}

/**
 * Angle from point a to point b using game/compass convention
 * Returns angle in [-PI, PI] range where:
 * - 0 points along +Y (forward/north)
 * - PI/2 points along +X (right/east)
 * - PI or -PI points along -Y (backward/south)
 * - -PI/2 points along -X (left/west)
 *
 * This convention is common in top-down games where +Y is "forward".
 * Contrast with angleBetween() which uses standard math convention (0 = +X).
 */
export function angleBetweenYForward(a: Vector3, b: Vector3): number {
  return Math.atan2(b.x - a.x, b.y - a.y);
}

/**
 * 2D version of angleBetweenYForward using raw coordinates
 */
export function angleBetweenYForward2D(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(bx - ax, by - ay);
}

// ============================================================================
// Rotation Functions
// ============================================================================

/**
 * Rotate vector around Z axis (in XY plane)
 * @param v - Vector to rotate
 * @param angle - Rotation angle in radians (counter-clockwise when looking down Z)
 */
export function rotateAroundZ(v: Vector3, angle: number): Vector3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Vector3(
    v.x * cos - v.y * sin,
    v.x * sin + v.y * cos,
    v.z
  );
}

/**
 * Rotate vector around Y axis (in XZ plane)
 * @param v - Vector to rotate
 * @param angle - Rotation angle in radians (counter-clockwise when looking down Y)
 */
export function rotateAroundY(v: Vector3, angle: number): Vector3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Vector3(
    v.x * cos + v.z * sin,
    v.y,
    -v.x * sin + v.z * cos
  );
}

/**
 * Rotate vector around X axis (in YZ plane)
 * @param v - Vector to rotate
 * @param angle - Rotation angle in radians (counter-clockwise when looking down X)
 */
export function rotateAroundX(v: Vector3, angle: number): Vector3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Vector3(
    v.x,
    v.y * cos - v.z * sin,
    v.y * sin + v.z * cos
  );
}

// Aliases for plane-based naming convention
export const rotateXY = rotateAroundZ;
export const rotateXZ = rotateAroundY;
export const rotateYZ = rotateAroundX;

// ============================================================================
// Map/Region Utilities
// ============================================================================

/**
 * A polygon defined by an array of Vector3 vertices.
 * For 2D map regions, only x and y components are used.
 */
export type MapPolygon = Vector3[];

/**
 * Check if a position is inside a polygon region using ray casting algorithm.
 * Uses x,y components only (2D point-in-polygon test).
 *
 * The algorithm casts a ray from the test point to infinity (in +X direction)
 * and counts how many polygon edges it crosses. An odd count means inside.
 *
 * @param region - Array of Vector3 vertices defining the polygon (must have at least 3 vertices)
 * @param position - The point to test
 * @returns true if position is inside the polygon region
 */
export function isInRegion(region: MapPolygon, position: Vector3): boolean {
  const n = region.length;
  if (n < 3) return false;

  const x = position.x;
  const y = position.y;

  let inside = false;

  // Ray casting algorithm - count edge crossings
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = region[i].x;
    const yi = region[i].y;
    const xj = region[j].x;
    const yj = region[j].y;

    // Check if edge crosses the horizontal ray from (x, y) to (+infinity, y)
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a point (x, y) is inside a polygon using raw coordinates.
 * 2D version of isInRegion.
 *
 * @param vertices - Array of {x, y} points defining the polygon
 * @param x - X coordinate of point to test
 * @param y - Y coordinate of point to test
 * @returns true if point is inside the polygon
 */
export function isInPolygon2D(
  vertices: Array<{ x: number; y: number }>,
  x: number,
  y: number
): boolean {
  const n = vertices.length;
  if (n < 3) return false;

  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersects = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}
