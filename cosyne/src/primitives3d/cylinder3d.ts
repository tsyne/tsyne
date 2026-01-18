/**
 * Cylinder primitive for Cosyne 3D
 */

import { Primitive3D, Primitive3DOptions, Hit3D } from './base3d';
import { Vector3, Box3, Ray } from '../math3d';
import { Binding, BindingFunction } from '../binding';

/**
 * Cylinder-specific options
 */
export interface CylinderOptions extends Primitive3DOptions {
  /** Radius at the top (default: 1) */
  radiusTop?: number;
  /** Radius at the bottom (default: 1) */
  radiusBottom?: number;
  /** Shorthand for both radii */
  radius?: number;
  /** Height along the Y axis (default: 2) */
  height?: number;
  /** Number of radial segments (default: 32) */
  radialSegments?: number;
  /** Number of height segments (default: 1) */
  heightSegments?: number;
  /** Whether to render top cap (default: true) */
  openEnded?: boolean;
}

/**
 * 3D Cylinder primitive
 *
 * The cylinder is centered at origin with its axis along the Y axis.
 */
export class Cylinder3D extends Primitive3D {
  private _radiusTop: number = 1;
  private _radiusBottom: number = 1;
  private _height: number = 2;
  private _radialSegments: number = 32;
  private _heightSegments: number = 1;
  private _openEnded: boolean = false;

  // Bindings
  private _radiusBinding: Binding<number> | null = null;
  private _heightBinding: Binding<number> | null = null;

  constructor(options?: CylinderOptions) {
    super(options);
    if (options) {
      if (options.radius !== undefined) {
        this._radiusTop = this._radiusBottom = options.radius;
      }
      if (options.radiusTop !== undefined) this._radiusTop = options.radiusTop;
      if (options.radiusBottom !== undefined) this._radiusBottom = options.radiusBottom;
      if (options.height !== undefined) this._height = options.height;
      if (options.radialSegments !== undefined) this._radialSegments = options.radialSegments;
      if (options.heightSegments !== undefined) this._heightSegments = options.heightSegments;
      if (options.openEnded !== undefined) this._openEnded = options.openEnded;
    }
  }

  get type(): string {
    return 'cylinder';
  }

  // ==================== Dimensions ====================

  get radiusTop(): number {
    return this._radiusTop;
  }

  set radiusTop(value: number) {
    this._radiusTop = Math.max(0, value);
  }

  get radiusBottom(): number {
    return this._radiusBottom;
  }

  set radiusBottom(value: number) {
    this._radiusBottom = Math.max(0, value);
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = Math.max(0.001, value);
  }

  setRadius(radius: number): this {
    this._radiusTop = this._radiusBottom = Math.max(0, radius);
    return this;
  }

  setHeight(height: number): this {
    this._height = Math.max(0.001, height);
    return this;
  }

  bindRadius(fn: BindingFunction<number>): this {
    this._radiusBinding = new Binding(fn);
    return this;
  }

  bindHeight(fn: BindingFunction<number>): this {
    this._heightBinding = new Binding(fn);
    return this;
  }

  getRadiusBinding(): Binding<number> | null {
    return this._radiusBinding;
  }

  getHeightBinding(): Binding<number> | null {
    return this._heightBinding;
  }

  // ==================== Segments ====================

  get radialSegments(): number {
    return this._radialSegments;
  }

  set radialSegments(value: number) {
    this._radialSegments = Math.max(3, Math.floor(value));
  }

  get heightSegments(): number {
    return this._heightSegments;
  }

  set heightSegments(value: number) {
    this._heightSegments = Math.max(1, Math.floor(value));
  }

  get openEnded(): boolean {
    return this._openEnded;
  }

  set openEnded(value: boolean) {
    this._openEnded = value;
  }

  // ==================== Ray Intersection ====================

  intersectRay(ray: Ray): Hit3D | null {
    // Transform ray to local space
    const worldMatrix = this.getWorldMatrix();
    const inverseWorld = worldMatrix.invert();
    const localRay = ray.applyMatrix4(inverseWorld);

    const halfH = this._height / 2;
    let closestT = Infinity;
    let hitNormal: Vector3 | null = null;
    let hitType: 'side' | 'top' | 'bottom' | null = null;

    // For a cone/cylinder: r(y) = radiusBottom + (radiusTop - radiusBottom) * (y + halfH) / height
    const rDiff = this._radiusTop - this._radiusBottom;
    const rB = this._radiusBottom;
    const h = this._height;

    // Simplified: treat as cylinder with average radius for intersection
    // For a true cylinder (radiusTop == radiusBottom):
    if (Math.abs(rDiff) < 0.001) {
      const r = this._radiusTop;

      // Cylinder side intersection
      // (ox + t*dx)^2 + (oz + t*dz)^2 = r^2
      const a = localRay.direction.x * localRay.direction.x + localRay.direction.z * localRay.direction.z;
      const b = 2 * (localRay.origin.x * localRay.direction.x + localRay.origin.z * localRay.direction.z);
      const c = localRay.origin.x * localRay.origin.x + localRay.origin.z * localRay.origin.z - r * r;

      const discriminant = b * b - 4 * a * c;

      if (discriminant >= 0 && a > 0.0001) {
        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);

        for (const t of [t1, t2]) {
          if (t > 0 && t < closestT) {
            const hitPoint = localRay.at(t);
            if (hitPoint.y >= -halfH && hitPoint.y <= halfH) {
              closestT = t;
              hitNormal = new Vector3(hitPoint.x, 0, hitPoint.z).normalize();
              hitType = 'side';
            }
          }
        }
      }
    } else {
      // Cone intersection (simplified - use frustum approximation)
      // This is a simplification; full cone intersection is more complex
      const r = (this._radiusTop + this._radiusBottom) / 2;

      const a = localRay.direction.x * localRay.direction.x + localRay.direction.z * localRay.direction.z;
      const b = 2 * (localRay.origin.x * localRay.direction.x + localRay.origin.z * localRay.direction.z);
      const c = localRay.origin.x * localRay.origin.x + localRay.origin.z * localRay.origin.z - r * r;

      const discriminant = b * b - 4 * a * c;

      if (discriminant >= 0 && a > 0.0001) {
        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);

        for (const t of [t1, t2]) {
          if (t > 0 && t < closestT) {
            const hitPoint = localRay.at(t);
            // Check radius at this height
            const radiusAtY = rB + rDiff * (hitPoint.y + halfH) / h;
            const distFromAxis = Math.sqrt(hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z);

            if (hitPoint.y >= -halfH && hitPoint.y <= halfH && Math.abs(distFromAxis - radiusAtY) < 0.1) {
              closestT = t;
              hitNormal = new Vector3(hitPoint.x, 0, hitPoint.z).normalize();
              hitType = 'side';
            }
          }
        }
      }
    }

    // Top cap intersection (guard against division by zero when ray is parallel to cap)
    const EPSILON = 1e-10;
    if (!this._openEnded && this._radiusTop > 0 && Math.abs(localRay.direction.y) > EPSILON) {
      const t = (halfH - localRay.origin.y) / localRay.direction.y;
      if (t > 0 && t < closestT) {
        const hitPoint = localRay.at(t);
        const dist = Math.sqrt(hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z);
        if (dist <= this._radiusTop) {
          closestT = t;
          hitNormal = new Vector3(0, 1, 0);
          hitType = 'top';
        }
      }
    }

    // Bottom cap intersection (guard against division by zero when ray is parallel to cap)
    if (!this._openEnded && this._radiusBottom > 0 && Math.abs(localRay.direction.y) > EPSILON) {
      const t = (-halfH - localRay.origin.y) / localRay.direction.y;
      if (t > 0 && t < closestT) {
        const hitPoint = localRay.at(t);
        const dist = Math.sqrt(hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z);
        if (dist <= this._radiusBottom) {
          closestT = t;
          hitNormal = new Vector3(0, -1, 0);
          hitType = 'bottom';
        }
      }
    }

    if (closestT === Infinity || !hitNormal) {
      return null;
    }

    // Calculate hit point in local space
    const localHitPoint = localRay.at(closestT);

    // Transform back to world space
    const worldHitPoint = localHitPoint.applyMatrix4(worldMatrix);
    const worldNormal = hitNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();

    // Calculate world distance
    const worldDistance = ray.origin.distanceTo(worldHitPoint);

    // Calculate UV coordinates
    let u = 0, v = 0;
    if (hitType === 'side') {
      // Angle around the cylinder
      u = (Math.atan2(localHitPoint.z, localHitPoint.x) + Math.PI) / (2 * Math.PI);
      v = (localHitPoint.y + halfH) / this._height;
    } else {
      // Cap UV
      const r = hitType === 'top' ? this._radiusTop : this._radiusBottom;
      u = (localHitPoint.x / r + 1) / 2;
      v = (localHitPoint.z / r + 1) / 2;
    }

    return {
      distance: worldDistance,
      point: worldHitPoint,
      normal: worldNormal,
      primitive: this,
      uv: { u, v },
      data: { face: hitType },
    };
  }

  // ==================== Bounding Box ====================

  getLocalBoundingBox(): Box3 {
    const maxRadius = Math.max(this._radiusTop, this._radiusBottom);
    const halfH = this._height / 2;
    return new Box3(
      new Vector3(-maxRadius, -halfH, -maxRadius),
      new Vector3(maxRadius, halfH, maxRadius)
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
      radiusTop: this._radiusTop,
      radiusBottom: this._radiusBottom,
      height: this._height,
      radialSegments: this._radialSegments,
      heightSegments: this._heightSegments,
      openEnded: this._openEnded,
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
      const r = Math.max(0, this._radiusBinding.evaluate());
      this._radiusTop = this._radiusBottom = r;
    }
    if (this._heightBinding) {
      this._height = Math.max(0.001, this._heightBinding.evaluate());
    }
  }

  // ==================== Clone ====================

  clone(): Cylinder3D {
    const cylinder = new Cylinder3D({
      id: this.customId,
      position: this._position.toArray(),
      rotation: this._rotation.toEuler(),
      scale: this._scale.toArray(),
      radiusTop: this._radiusTop,
      radiusBottom: this._radiusBottom,
      height: this._height,
      radialSegments: this._radialSegments,
      heightSegments: this._heightSegments,
      openEnded: this._openEnded,
      material: this._material.toProperties(),
      visible: this._visible,
      castShadow: this._castShadow,
      receiveShadow: this._receiveShadow,
    });
    return cylinder;
  }
}

/**
 * Factory function to create a cylinder
 */
export function cylinder(options?: CylinderOptions): Cylinder3D {
  return new Cylinder3D(options);
}

/**
 * Factory function to create a cone (cylinder with zero top radius)
 */
export function cone(radius: number = 1, height: number = 2, options?: Omit<CylinderOptions, 'radius' | 'radiusTop' | 'radiusBottom' | 'height'>): Cylinder3D {
  return new Cylinder3D({
    ...options,
    radiusTop: 0,
    radiusBottom: radius,
    height,
  });
}
