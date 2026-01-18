/**
 * Sphere primitive for Cosyne 3D
 */

import { Primitive3D, Primitive3DOptions, Hit3D } from './base3d';
import { Vector3, Box3, Ray } from '../math3d';
import { Binding, BindingFunction } from '../binding';

/**
 * Sphere-specific options
 */
export interface SphereOptions extends Primitive3DOptions {
  /** Sphere radius (default: 1) */
  radius?: number;
  /** Number of horizontal segments for rendering (default: 32) */
  widthSegments?: number;
  /** Number of vertical segments for rendering (default: 16) */
  heightSegments?: number;
}

/**
 * 3D Sphere primitive
 */
export class Sphere3D extends Primitive3D {
  private _radius: number = 1;
  private _widthSegments: number = 32;
  private _heightSegments: number = 16;

  // Bindings
  private _radiusBinding: Binding<number> | null = null;

  constructor(options?: SphereOptions) {
    super(options);
    if (options) {
      if (options.radius !== undefined) this._radius = options.radius;
      if (options.widthSegments !== undefined) this._widthSegments = options.widthSegments;
      if (options.heightSegments !== undefined) this._heightSegments = options.heightSegments;
    }
  }

  get type(): string {
    return 'sphere';
  }

  // ==================== Radius ====================

  get radius(): number {
    return this._radius;
  }

  set radius(value: number) {
    this._radius = Math.max(0.001, value);
  }

  setRadius(radius: number): this {
    this._radius = Math.max(0.001, radius);
    return this;
  }

  bindRadius(fn: BindingFunction<number>): this {
    this._radiusBinding = new Binding(fn);
    return this;
  }

  getRadiusBinding(): Binding<number> | null {
    return this._radiusBinding;
  }

  // ==================== Segments ====================

  get widthSegments(): number {
    return this._widthSegments;
  }

  set widthSegments(value: number) {
    this._widthSegments = Math.max(3, Math.floor(value));
  }

  get heightSegments(): number {
    return this._heightSegments;
  }

  set heightSegments(value: number) {
    this._heightSegments = Math.max(2, Math.floor(value));
  }

  // ==================== Ray Intersection ====================

  intersectRay(ray: Ray): Hit3D | null {
    // Transform ray to local space
    const worldMatrix = this.getWorldMatrix();
    const inverseWorld = worldMatrix.invert();
    const localRay = ray.applyMatrix4(inverseWorld);

    // Scale radius by average scale
    const scale = this._scale;
    const avgScale = (Math.abs(scale.x) + Math.abs(scale.y) + Math.abs(scale.z)) / 3;
    const scaledRadius = this._radius * avgScale;

    // Ray-sphere intersection in local space (at origin)
    const oc = localRay.origin;
    const a = localRay.direction.dot(localRay.direction);
    const b = 2.0 * oc.dot(localRay.direction);
    const c = oc.dot(oc) - this._radius * this._radius;
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

    // Calculate hit point in local space
    const localHitPoint = localRay.at(t);

    // Normal in local space (for a sphere centered at origin, normal = normalized hit point)
    const localNormal = localHitPoint.normalize();

    // Transform back to world space
    const worldHitPoint = localHitPoint.applyMatrix4(worldMatrix);
    const worldNormal = localNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();

    // Calculate world distance
    const worldDistance = ray.origin.distanceTo(worldHitPoint);

    // Calculate latitude/longitude (spherical coordinates)
    const phi = Math.atan2(localNormal.z, localNormal.x); // longitude
    const theta = Math.acos(Math.max(-1, Math.min(1, localNormal.y))); // latitude from top

    // UV coordinates
    const u = (phi + Math.PI) / (2 * Math.PI);
    const v = theta / Math.PI;

    // Latitude/longitude in degrees
    const lon = phi * (180 / Math.PI);
    const lat = 90 - theta * (180 / Math.PI);

    return {
      distance: worldDistance,
      point: worldHitPoint,
      normal: worldNormal,
      primitive: this,
      uv: { u, v },
      data: { lat, lon },
    };
  }

  // ==================== Bounding Box ====================

  getLocalBoundingBox(): Box3 {
    const r = this._radius;
    return new Box3(
      new Vector3(-r, -r, -r),
      new Vector3(r, r, r)
    );
  }

  // ==================== Properties ====================

  getProperties(): Record<string, any> {
    return {
      type: this.type,
      id: this.customId,
      position: this._position.toArray(),
      rotation: this._rotation.toEuler(),
      scale: this._scale.toArray(),
      radius: this._radius,
      widthSegments: this._widthSegments,
      heightSegments: this._heightSegments,
      material: this._material.toProperties(),
      visible: this._visible,
      castShadow: this._castShadow,
      receiveShadow: this._receiveShadow,
    };
  }

  // ==================== Bindings Override ====================

  refreshBindings(): void {
    super.refreshBindings();

    if (this._radiusBinding) {
      this._radius = Math.max(0.001, this._radiusBinding.evaluate());
    }
  }

  // ==================== Clone ====================

  clone(): Sphere3D {
    const sphere = new Sphere3D({
      id: this.customId,
      position: this._position.toArray(),
      rotation: this._rotation.toEuler(),
      scale: this._scale.toArray(),
      radius: this._radius,
      widthSegments: this._widthSegments,
      heightSegments: this._heightSegments,
      material: this._material.toProperties(),
      visible: this._visible,
      castShadow: this._castShadow,
      receiveShadow: this._receiveShadow,
    });
    return sphere;
  }

  // ==================== Surface Calculations ====================

  /**
   * Get a point on the sphere surface given spherical coordinates
   * @param lat Latitude in degrees (-90 to 90)
   * @param lon Longitude in degrees (-180 to 180)
   */
  getPointOnSurface(lat: number, lon: number): Vector3 {
    const phi = lon * (Math.PI / 180);
    const theta = (90 - lat) * (Math.PI / 180);

    const x = this._radius * Math.sin(theta) * Math.cos(phi);
    const y = this._radius * Math.cos(theta);
    const z = this._radius * Math.sin(theta) * Math.sin(phi);

    const localPoint = new Vector3(x, y, z);
    return localPoint.applyMatrix4(this.getWorldMatrix());
  }

  /**
   * Get the normal at a point on the sphere surface
   * @param lat Latitude in degrees
   * @param lon Longitude in degrees
   */
  getNormalAtSurface(lat: number, lon: number): Vector3 {
    const phi = lon * (Math.PI / 180);
    const theta = (90 - lat) * (Math.PI / 180);

    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.cos(theta);
    const z = Math.sin(theta) * Math.sin(phi);

    const localNormal = new Vector3(x, y, z);
    return localNormal.applyMatrix4(this.getWorldMatrix().extractRotation()).normalize();
  }
}

/**
 * Factory function to create a sphere
 */
export function sphere(options?: SphereOptions): Sphere3D {
  return new Sphere3D(options);
}
