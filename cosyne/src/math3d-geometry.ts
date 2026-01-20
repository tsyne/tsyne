/**
 * 3D Geometry classes: Ray, Box3, and intersection utilities
 */

import { Vector3, Matrix4 } from './math3d-core';

/**
 * Ray for ray casting
 */
export class Ray {
  constructor(
    public origin: Vector3 = new Vector3(),
    public direction: Vector3 = new Vector3(0, 0, -1)
  ) {}

  clone(): Ray {
    return new Ray(this.origin.clone(), this.direction.clone());
  }

  at(t: number): Vector3 {
    return this.origin.add(this.direction.multiplyScalar(t));
  }

  /**
   * Get the point on the ray closest to the given point
   */
  closestPointToPoint(point: Vector3): Vector3 {
    const t = Math.max(0, point.sub(this.origin).dot(this.direction));
    return this.at(t);
  }

  /**
   * Distance from ray to point
   */
  distanceToPoint(point: Vector3): number {
    return this.closestPointToPoint(point).distanceTo(point);
  }

  /**
   * Intersect with sphere
   * Returns distance to intersection, or null if no intersection
   */
  intersectSphere(center: Vector3, radius: number): number | null {
    const oc = this.origin.sub(center);
    const a = this.direction.dot(this.direction);
    const b = 2.0 * oc.dot(this.direction);
    const c = oc.dot(oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null;
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);
    let t = (-b - sqrtDiscriminant) / (2 * a);

    if (t < 0) {
      t = (-b + sqrtDiscriminant) / (2 * a);
    }

    if (t < 0) {
      return null;
    }

    return t;
  }

  /**
   * Intersect with axis-aligned box
   * Handles division by zero for orthogonal rays
   */
  intersectBox(min: Vector3, max: Vector3): number | null {
    const EPSILON = 1e-10;
    const dirX = this.direction.x;
    const dirY = this.direction.y;
    const dirZ = this.direction.z;

    // X slab
    let tmin: number, tmax: number;
    if (Math.abs(dirX) < EPSILON) {
      if (this.origin.x < min.x || this.origin.x > max.x) return null;
      tmin = -Infinity;
      tmax = Infinity;
    } else {
      tmin = (min.x - this.origin.x) / dirX;
      tmax = (max.x - this.origin.x) / dirX;
      if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
    }

    // Y slab
    let tymin: number, tymax: number;
    if (Math.abs(dirY) < EPSILON) {
      if (this.origin.y < min.y || this.origin.y > max.y) return null;
      tymin = -Infinity;
      tymax = Infinity;
    } else {
      tymin = (min.y - this.origin.y) / dirY;
      tymax = (max.y - this.origin.y) / dirY;
      if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
    }

    if (tmin > tymax || tymin > tmax) return null;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    // Z slab
    let tzmin: number, tzmax: number;
    if (Math.abs(dirZ) < EPSILON) {
      if (this.origin.z < min.z || this.origin.z > max.z) return null;
      tzmin = -Infinity;
      tzmax = Infinity;
    } else {
      tzmin = (min.z - this.origin.z) / dirZ;
      tzmax = (max.z - this.origin.z) / dirZ;
      if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
    }

    if (tmin > tzmax || tzmin > tmax) return null;
    if (tzmin > tmin) tmin = tzmin;
    if (tmin < 0) return null;

    return tmin;
  }

  /**
   * Intersect with plane
   */
  intersectPlane(planeNormal: Vector3, planePoint: Vector3): number | null {
    const denom = planeNormal.dot(this.direction);

    if (Math.abs(denom) < 0.0001) {
      return null; // Ray is parallel to plane
    }

    const t = planePoint.sub(this.origin).dot(planeNormal) / denom;

    if (t < 0) {
      return null;
    }

    return t;
  }

  /**
   * Transform ray by matrix
   */
  applyMatrix4(m: Matrix4): Ray {
    return new Ray(
      this.origin.applyMatrix4(m),
      this.direction.applyMatrix4(m.extractRotation()).normalize()
    );
  }
}

/**
 * Bounding box
 */
export class Box3 {
  constructor(
    public min: Vector3 = new Vector3(Infinity, Infinity, Infinity),
    public max: Vector3 = new Vector3(-Infinity, -Infinity, -Infinity)
  ) {}

  static fromCenterSize(center: Vector3, size: Vector3): Box3 {
    const halfSize = size.multiplyScalar(0.5);
    return new Box3(center.sub(halfSize), center.add(halfSize));
  }

  clone(): Box3 {
    return new Box3(this.min.clone(), this.max.clone());
  }

  isEmpty(): boolean {
    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
  }

  getCenter(): Vector3 {
    if (this.isEmpty()) return new Vector3();
    return this.min.add(this.max).multiplyScalar(0.5);
  }

  getSize(): Vector3 {
    if (this.isEmpty()) return new Vector3();
    return this.max.sub(this.min);
  }

  expandByPoint(point: Vector3): this {
    this.min = new Vector3(
      Math.min(this.min.x, point.x),
      Math.min(this.min.y, point.y),
      Math.min(this.min.z, point.z)
    );
    this.max = new Vector3(
      Math.max(this.max.x, point.x),
      Math.max(this.max.y, point.y),
      Math.max(this.max.z, point.z)
    );
    return this;
  }

  containsPoint(point: Vector3): boolean {
    return (
      point.x >= this.min.x && point.x <= this.max.x &&
      point.y >= this.min.y && point.y <= this.max.y &&
      point.z >= this.min.z && point.z <= this.max.z
    );
  }

  intersectsBox(box: Box3): boolean {
    return !(
      box.max.x < this.min.x || box.min.x > this.max.x ||
      box.max.y < this.min.y || box.min.y > this.max.y ||
      box.max.z < this.min.z || box.min.z > this.max.z
    );
  }

  applyMatrix4(m: Matrix4): Box3 {
    const points = [
      new Vector3(this.min.x, this.min.y, this.min.z),
      new Vector3(this.min.x, this.min.y, this.max.z),
      new Vector3(this.min.x, this.max.y, this.min.z),
      new Vector3(this.min.x, this.max.y, this.max.z),
      new Vector3(this.max.x, this.min.y, this.min.z),
      new Vector3(this.max.x, this.min.y, this.max.z),
      new Vector3(this.max.x, this.max.y, this.min.z),
      new Vector3(this.max.x, this.max.y, this.max.z),
    ];

    const result = new Box3();
    for (const point of points) {
      result.expandByPoint(point.applyMatrix4(m));
    }
    return result;
  }
}

/**
 * Ray-line segment intersection in 2D
 * Crucial for 2.5D raycasting (DOOM/Wolfenstein style)
 *
 * @param rayX - Ray origin X
 * @param rayY - Ray origin Y
 * @param rayDirX - Ray direction X (normalized or not)
 * @param rayDirY - Ray direction Y (normalized or not)
 * @param lineX1 - Line segment start X
 * @param lineY1 - Line segment start Y
 * @param lineX2 - Line segment end X
 * @param lineY2 - Line segment end Y
 * @returns { t: distance along ray, u: position along line segment [0,1] } or null if no intersection
 */
export function rayLineIntersect2D(
  rayX: number, rayY: number,
  rayDirX: number, rayDirY: number,
  lineX1: number, lineY1: number,
  lineX2: number, lineY2: number
): { t: number; u: number } | null {
  const dx = lineX2 - lineX1;
  const dy = lineY2 - lineY1;

  const denom = rayDirX * dy - rayDirY * dx;

  // Ray is parallel to line
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((lineX1 - rayX) * dy - (lineY1 - rayY) * dx) / denom;
  const u = ((lineX1 - rayX) * rayDirY - (lineY1 - rayY) * rayDirX) / denom;

  // Intersection is behind ray origin or outside line segment
  if (t < 0 || u < 0 || u > 1) return null;

  return { t, u };
}

/**
 * Ray-line intersection using Vector3 parameters
 * Wrapper around rayLineIntersect2D for convenience with Vector3 types.
 * Uses x,y components only (2D intersection in XY plane).
 *
 * @param origin - Ray origin point
 * @param direction - Ray direction vector (does not need to be normalized)
 * @param lineStart - Start point of line segment
 * @param lineEnd - End point of line segment
 * @returns { t, u } where t is distance along ray and u is position along line [0,1], or null if no intersection
 */
export function rayLineIntersect2DV(
  origin: Vector3,
  direction: Vector3,
  lineStart: Vector3,
  lineEnd: Vector3
): { t: number; u: number } | null {
  return rayLineIntersect2D(
    origin.x, origin.y,
    direction.x, direction.y,
    lineStart.x, lineStart.y,
    lineEnd.x, lineEnd.y
  );
}
