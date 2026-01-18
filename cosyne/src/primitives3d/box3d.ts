/**
 * Box primitive for Cosyne 3D
 */

import { Primitive3D, Primitive3DOptions, Hit3D } from './base3d';
import { Vector3, Box3, Ray } from '../math3d';
import { Binding, BindingFunction } from '../binding';

/**
 * Box-specific options
 */
export interface BoxOptions extends Primitive3DOptions {
  /** Box width (x dimension, default: 1) */
  width?: number;
  /** Box height (y dimension, default: 1) */
  height?: number;
  /** Box depth (z dimension, default: 1) */
  depth?: number;
  /** Shorthand for width, height, depth */
  size?: number | [number, number, number];
}

/**
 * 3D Box/Cube primitive
 */
export class Box3D extends Primitive3D {
  private _width: number = 1;
  private _height: number = 1;
  private _depth: number = 1;

  // Bindings
  private _sizeBinding: Binding<number | [number, number, number]> | null = null;

  constructor(options?: BoxOptions) {
    super(options);
    if (options) {
      if (options.size !== undefined) {
        if (typeof options.size === 'number') {
          this._width = this._height = this._depth = options.size;
        } else {
          this._width = options.size[0];
          this._height = options.size[1];
          this._depth = options.size[2];
        }
      }
      if (options.width !== undefined) this._width = options.width;
      if (options.height !== undefined) this._height = options.height;
      if (options.depth !== undefined) this._depth = options.depth;
    }
  }

  get type(): string {
    return 'box';
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

  get depth(): number {
    return this._depth;
  }

  set depth(value: number) {
    this._depth = Math.max(0.001, value);
  }

  setSize(size: number | [number, number, number]): this {
    if (typeof size === 'number') {
      this._width = this._height = this._depth = Math.max(0.001, size);
    } else {
      this._width = Math.max(0.001, size[0]);
      this._height = Math.max(0.001, size[1]);
      this._depth = Math.max(0.001, size[2]);
    }
    return this;
  }

  bindSize(fn: BindingFunction<number | [number, number, number]>): this {
    this._sizeBinding = new Binding(fn);
    return this;
  }

  getSizeBinding(): Binding<number | [number, number, number]> | null {
    return this._sizeBinding;
  }

  // ==================== Ray Intersection ====================

  intersectRay(ray: Ray): Hit3D | null {
    // Transform ray to local space
    const worldMatrix = this.getWorldMatrix();
    const inverseWorld = worldMatrix.invert();
    const localRay = ray.applyMatrix4(inverseWorld);

    // Box half-extents
    const halfW = this._width / 2;
    const halfH = this._height / 2;
    const halfD = this._depth / 2;

    const min = new Vector3(-halfW, -halfH, -halfD);
    const max = new Vector3(halfW, halfH, halfD);

    // Ray-AABB intersection using slab method
    let tmin = (min.x - localRay.origin.x) / localRay.direction.x;
    let tmax = (max.x - localRay.origin.x) / localRay.direction.x;

    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

    let tymin = (min.y - localRay.origin.y) / localRay.direction.y;
    let tymax = (max.y - localRay.origin.y) / localRay.direction.y;

    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

    if (tmin > tymax || tymin > tmax) return null;

    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (min.z - localRay.origin.z) / localRay.direction.z;
    let tzmax = (max.z - localRay.origin.z) / localRay.direction.z;

    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

    if (tmin > tzmax || tzmin > tmax) return null;

    if (tzmin > tmin) tmin = tzmin;

    if (tmin < 0) return null;

    // Calculate hit point in local space
    const localHitPoint = localRay.at(tmin);

    // Determine which face was hit and calculate normal
    const epsilon = 0.0001;
    let localNormal: Vector3;

    if (Math.abs(localHitPoint.x - max.x) < epsilon) {
      localNormal = new Vector3(1, 0, 0);
    } else if (Math.abs(localHitPoint.x - min.x) < epsilon) {
      localNormal = new Vector3(-1, 0, 0);
    } else if (Math.abs(localHitPoint.y - max.y) < epsilon) {
      localNormal = new Vector3(0, 1, 0);
    } else if (Math.abs(localHitPoint.y - min.y) < epsilon) {
      localNormal = new Vector3(0, -1, 0);
    } else if (Math.abs(localHitPoint.z - max.z) < epsilon) {
      localNormal = new Vector3(0, 0, 1);
    } else {
      localNormal = new Vector3(0, 0, -1);
    }

    // Transform back to world space
    const worldHitPoint = localHitPoint.applyMatrix4(worldMatrix);
    const worldNormal = localNormal.applyMatrix4(worldMatrix.extractRotation()).normalize();

    // Calculate world distance
    const worldDistance = ray.origin.distanceTo(worldHitPoint);

    // Calculate UV coordinates based on face
    let u = 0, v = 0;
    if (Math.abs(localNormal.x) > 0.5) {
      u = (localHitPoint.z + halfD) / this._depth;
      v = (localHitPoint.y + halfH) / this._height;
    } else if (Math.abs(localNormal.y) > 0.5) {
      u = (localHitPoint.x + halfW) / this._width;
      v = (localHitPoint.z + halfD) / this._depth;
    } else {
      u = (localHitPoint.x + halfW) / this._width;
      v = (localHitPoint.y + halfH) / this._height;
    }

    return {
      distance: worldDistance,
      point: worldHitPoint,
      normal: worldNormal,
      primitive: this,
      uv: { u, v },
      data: {
        face: localNormal.x > 0.5 ? 'right' :
              localNormal.x < -0.5 ? 'left' :
              localNormal.y > 0.5 ? 'top' :
              localNormal.y < -0.5 ? 'bottom' :
              localNormal.z > 0.5 ? 'front' : 'back'
      },
    };
  }

  // ==================== Bounding Box ====================

  getLocalBoundingBox(): Box3 {
    const halfW = this._width / 2;
    const halfH = this._height / 2;
    const halfD = this._depth / 2;
    return new Box3(
      new Vector3(-halfW, -halfH, -halfD),
      new Vector3(halfW, halfH, halfD)
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
      depth: this._depth,
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

  clone(): Box3D {
    const box = new Box3D({
      id: this.customId,
      position: this._position.toArray(),
      rotation: this._rotation.toEuler(),
      scale: this._scale.toArray(),
      width: this._width,
      height: this._height,
      depth: this._depth,
      material: this._material.toProperties(),
      visible: this._visible,
      castShadow: this._castShadow,
      receiveShadow: this._receiveShadow,
    });
    return box;
  }

  // ==================== Face Access ====================

  /**
   * Get the vertices of a specific face
   */
  getFaceVertices(face: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'): Vector3[] {
    const halfW = this._width / 2;
    const halfH = this._height / 2;
    const halfD = this._depth / 2;
    const worldMatrix = this.getWorldMatrix();

    const localVertices: Vector3[] = [];

    switch (face) {
      case 'front':
        localVertices.push(
          new Vector3(-halfW, -halfH, halfD),
          new Vector3(halfW, -halfH, halfD),
          new Vector3(halfW, halfH, halfD),
          new Vector3(-halfW, halfH, halfD)
        );
        break;
      case 'back':
        localVertices.push(
          new Vector3(halfW, -halfH, -halfD),
          new Vector3(-halfW, -halfH, -halfD),
          new Vector3(-halfW, halfH, -halfD),
          new Vector3(halfW, halfH, -halfD)
        );
        break;
      case 'left':
        localVertices.push(
          new Vector3(-halfW, -halfH, -halfD),
          new Vector3(-halfW, -halfH, halfD),
          new Vector3(-halfW, halfH, halfD),
          new Vector3(-halfW, halfH, -halfD)
        );
        break;
      case 'right':
        localVertices.push(
          new Vector3(halfW, -halfH, halfD),
          new Vector3(halfW, -halfH, -halfD),
          new Vector3(halfW, halfH, -halfD),
          new Vector3(halfW, halfH, halfD)
        );
        break;
      case 'top':
        localVertices.push(
          new Vector3(-halfW, halfH, halfD),
          new Vector3(halfW, halfH, halfD),
          new Vector3(halfW, halfH, -halfD),
          new Vector3(-halfW, halfH, -halfD)
        );
        break;
      case 'bottom':
        localVertices.push(
          new Vector3(-halfW, -halfH, -halfD),
          new Vector3(halfW, -halfH, -halfD),
          new Vector3(halfW, -halfH, halfD),
          new Vector3(-halfW, -halfH, halfD)
        );
        break;
    }

    return localVertices.map(v => v.applyMatrix4(worldMatrix));
  }

  /**
   * Get the center of a specific face
   */
  getFaceCenter(face: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'): Vector3 {
    const halfW = this._width / 2;
    const halfH = this._height / 2;
    const halfD = this._depth / 2;
    const worldMatrix = this.getWorldMatrix();

    let localCenter: Vector3;

    switch (face) {
      case 'front':
        localCenter = new Vector3(0, 0, halfD);
        break;
      case 'back':
        localCenter = new Vector3(0, 0, -halfD);
        break;
      case 'left':
        localCenter = new Vector3(-halfW, 0, 0);
        break;
      case 'right':
        localCenter = new Vector3(halfW, 0, 0);
        break;
      case 'top':
        localCenter = new Vector3(0, halfH, 0);
        break;
      case 'bottom':
        localCenter = new Vector3(0, -halfH, 0);
        break;
    }

    return localCenter.applyMatrix4(worldMatrix);
  }
}

/**
 * Factory function to create a box
 */
export function box(options?: BoxOptions): Box3D {
  return new Box3D(options);
}

/**
 * Factory function to create a cube (equal sides)
 */
export function cube(size: number = 1, options?: Omit<BoxOptions, 'size' | 'width' | 'height' | 'depth'>): Box3D {
  return new Box3D({ ...options, size });
}
