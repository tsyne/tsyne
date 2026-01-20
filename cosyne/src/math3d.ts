/**
 * 3D Math utilities for Cosyne 3D
 *
 * This module re-exports from split files:
 * - math3d-core.ts: Vector3, Matrix4, Quaternion
 * - math3d-geometry.ts: Ray, Box3, ray intersections
 * - math3d-utils.ts: angles, rotations, random, region testing
 */

// Core classes
export {
  Vector3,
  Matrix4,
  Quaternion,
} from './math3d-core';

// Geometry classes and intersection utilities
export {
  Ray,
  Box3,
  rayLineIntersect2D,
  rayLineIntersect2DV,
} from './math3d-geometry';

// Utility functions
export {
  // Basic utilities
  degToRad,
  radToDeg,
  clamp,
  lerp,

  // Random utilities
  urandom,
  urandomVector,
  randomUnitVector,

  // Angle utilities
  angleBetween,
  angleBetween2D,
  normalizeAngle,
  angleDiff,
  lerpAngle,
  angleBetweenYForward,
  angleBetweenYForward2D,

  // Rotation functions
  rotateAroundX,
  rotateAroundY,
  rotateAroundZ,
  rotateXY,
  rotateXZ,
  rotateYZ,

  // Map/Region utilities
  MapPolygon,
  isInRegion,
  isInPolygon2D,
} from './math3d-utils';
