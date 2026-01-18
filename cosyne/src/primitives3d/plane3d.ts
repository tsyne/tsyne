/**
 * Plane primitive for Cosyne 3D
 *
 * A flat rectangular surface, typically used for ground, walls, etc.
 */

import { Primitive3D, Primitive3DOptions, Hit3D } from './base3d';
import { Vector3, Box3, Ray } from '../math3d';
import { Binding, BindingFunction } from '../binding';

/**
 * Plane-specific options
 */
export interface PlaneOptions extends Primitive3DOptions {
  /** Plane width (x dimension, default: 10) */
  width?: number;
  /** Plane height (z dimension, default: 10) */
  height?: number;
  /** Shorthand for width and height */
  size?: number | [number, number];
  /** Number of width segments for rendering (default: 1) */
  widthSegments?: number;
  /** Number of height segments for rendering (default: 1) */
  heightSegments?: number;
}

/**
 * 3D Plane primitive
 *
 * By default, the plane lies in the XZ plane with normal pointing up (+Y).
 */
export class Plane3D extends Primitive3D {
  private _width: number = 10;
  private _height: number = 10;
  private _widthSegments: number = 1;
  private _heightSegments: number = 1;

  // Bindings
  private _sizeBinding: Binding<number | [number, number]> | null = null;

  constructor(options?: PlaneOptions) {
    super(options);
    if (options) {
      if (options.size !== undefined) {
        if (typeof options.size === 'number') {
          this._width = this._height = options.size;
        } else {
          this._width = options.size[0];
          this._height = options.size[1];
        }
      }
      if (options.width !== undefined) this._width = options.width;
      if (options.height !== undefined) this._height = options.height;
      if (options.widthSegments !== undefined) this._widthSegments = options.widthSegments;
      if (options.heightSegments !== undefined) this._heightSegments = options.heightSegments;
    }
  }

  get type(): string {
    return 'plane';
  }

  // ==================== Dimensions ====================

  get width(): number {
    return this._width;
  }

  set width(value: number) {
    this._width = Math.max(0.001, value);
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = Math.max(0.001, value);
  }

  setSize(size: number | [number, number]): this {
    if (typeof size === 'number') {
      this._width = this._height = Math.max(0.001, size);
    } else {
      this._width = Math.max(0.001, size[0]);
      this._height = Math.max(0.001, size[1]);
    }
    return this;
  }

  bindSize(fn: BindingFunction<number | [number, number]>): this {
    this._sizeBinding = new Binding(fn);
    return this;
  }

  getSizeBinding(): Binding<number | [number, number]> | null {
    return this._sizeBinding;
  }

  // ==================== Segments ====================

  get widthSegments(): number {
    return this._widthSegments;
  }

  set widthSegments(value: number) {
    this._widthSegments = Math.max(1, Math.floor(value));
  }

  get heightSegments(): number {
    return this._heightSegments;
  }

  set heightSegments(value: number) {
    this._heightSegments = Math.max(1, Math.floor(value));
  }

  // ==================== Ray Intersection ====================

  intersectRay(ray: Ray): Hit3D | null {
    // Transform ray to local space
    const worldMatrix = this.getWorldMatrix();
    const inverseWorld = worldMatrix.invert();
    const localRay = ray.applyMatrix4(inverseWorld);

    // Plane normal in local space (pointing up)
    const planeNormal = new Vector3(0, 1, 0);
    const planePoint = new Vector3(0, 0, 0);

    // Ray-plane intersection
    const denom = planeNormal.dot(localRay.direction);

    // Check if ray is parallel to plane
    if (Math.abs(denom) < 0.0001) {
      return null;
    }

    const t = planePoint.sub(localRay.origin).dot(planeNormal) / denom;

    // Check if intersection is behind ray origin
    if (t < 0) {
      return null;
    }

    // Calculate hit point in local space
    const localHitPoint = localRay.at(t);

    // Check if hit point is within plane bounds
    const halfW = this._width / 2;
    const halfH = this._height / 2;

    if (localHitPoint.x < -halfW || localHitPoint.x > halfW ||
        localHitPoint.z < -halfH || localHitPoint.z > halfH) {
      return null;
    }

    // Transform back to world space
    const worldHitPoint = localHitPoint.applyMatrix4(worldMatrix);
    const worldNormal = planeNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();

    // Calculate world distance
    const worldDistance = ray.origin.distanceTo(worldHitPoint);

    // Calculate UV coordinates
    const u = (localHitPoint.x + halfW) / this._width;
    const v = (localHitPoint.z + halfH) / this._height;

    return {
      distance: worldDistance,
      point: worldHitPoint,
      normal: worldNormal,
      primitive: this,
      uv: { u, v },
    };
  }

  // ==================== Bounding Box ====================

  getLocalBoundingBox(): Box3 {
    const halfW = this._width / 2;
    const halfH = this._height / 2;
    // Very thin box for the plane
    const thickness = 0.001;
    return new Box3(
      new Vector3(-halfW, -thickness, -halfH),
      new Vector3(halfW, thickness, halfH)
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
      width: this._width,
      height: this._height,
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

    if (this._sizeBinding) {
      this.setSize(this._sizeBinding.evaluate());
    }
  }

  // ==================== Clone ====================

  clone(): Plane3D {
    const plane = new Plane3D({
      id: this.customId,
      position: this._position.toArray(),
      rotation: this._rotation.toEuler(),
      scale: this._scale.toArray(),
      width: this._width,
      height: this._height,
      widthSegments: this._widthSegments,
      heightSegments: this._heightSegments,
      material: this._material.toProperties(),
      visible: this._visible,
      castShadow: this._castShadow,
      receiveShadow: this._receiveShadow,
    });
    return plane;
  }

  // ==================== Corners ====================

  /**
   * Get the four corners of the plane in world space
   */
  getCorners(): Vector3[] {
    const halfW = this._width / 2;
    const halfH = this._height / 2;
    const worldMatrix = this.getWorldMatrix();

    return [
      new Vector3(-halfW, 0, -halfH).applyMatrix4(worldMatrix),
      new Vector3(halfW, 0, -halfH).applyMatrix4(worldMatrix),
      new Vector3(halfW, 0, halfH).applyMatrix4(worldMatrix),
      new Vector3(-halfW, 0, halfH).applyMatrix4(worldMatrix),
    ];
  }

  /**
   * Get the world-space normal of the plane
   */
  getWorldNormal(): Vector3 {
    const localNormal = new Vector3(0, 1, 0);
    return localNormal.applyMatrix4(this.getWorldMatrix().extractRotation()).normalize();
  }
}

/**
 * Factory function to create a plane
 */
export function plane(options?: PlaneOptions): Plane3D {
  return new Plane3D(options);
}

/**
 * Factory function to create a ground plane (large plane at y=0)
 */
export function ground(size: number = 100, options?: Omit<PlaneOptions, 'size'>): Plane3D {
  return new Plane3D({
    ...options,
    size,
    position: options?.position || [0, 0, 0],
  });
}
