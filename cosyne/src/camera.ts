/**
 * Camera system for Cosyne 3D
 *
 * Provides perspective and orthographic cameras for 3D scenes.
 */

import { Vector3, Matrix4, Quaternion, Ray } from './math3d';
import { Binding, BindingFunction } from './binding';

/**
 * Camera projection type
 */
export type CameraProjection = 'perspective' | 'orthographic';

/**
 * Camera options
 */
export interface CameraOptions {
  /** Field of view in degrees (for perspective) */
  fov?: number;
  /** Near clipping plane */
  near?: number;
  /** Far clipping plane */
  far?: number;
  /** Aspect ratio (width / height) */
  aspect?: number;
  /** Projection type */
  projection?: CameraProjection;
  /** Initial position */
  position?: [number, number, number];
  /** Initial look-at target */
  lookAt?: [number, number, number];
  /** Up vector */
  up?: [number, number, number];
  /** Orthographic left boundary */
  left?: number;
  /** Orthographic right boundary */
  right?: number;
  /** Orthographic top boundary */
  top?: number;
  /** Orthographic bottom boundary */
  bottom?: number;
}

/**
 * Camera class for 3D scene rendering
 */
export class Camera {
  // Projection properties
  private _fov: number = 60;
  private _near: number = 0.1;
  private _far: number = 1000;
  private _aspect: number = 1;
  private _projection: CameraProjection = 'perspective';

  // Orthographic properties
  private _left: number = -10;
  private _right: number = 10;
  private _top: number = 10;
  private _bottom: number = -10;

  // Transform properties
  private _position: Vector3 = new Vector3(0, 0, 10);
  private _target: Vector3 = new Vector3(0, 0, 0);
  private _up: Vector3 = new Vector3(0, 1, 0);

  // Cached matrices
  private _projectionMatrix: Matrix4 | null = null;
  private _viewMatrix: Matrix4 | null = null;
  private _viewProjectionMatrix: Matrix4 | null = null;
  private _inverseViewMatrix: Matrix4 | null = null;

  // Bindings
  private _positionBinding: Binding<Vector3 | [number, number, number]> | null = null;
  private _lookAtBinding: Binding<Vector3 | [number, number, number]> | null = null;
  private _upBinding: Binding<Vector3 | [number, number, number]> | null = null;
  private _fovBinding: Binding<number> | null = null;

  constructor(options?: CameraOptions) {
    if (options) {
      if (options.fov !== undefined) this._fov = options.fov;
      if (options.near !== undefined) this._near = options.near;
      if (options.far !== undefined) this._far = options.far;
      if (options.aspect !== undefined) this._aspect = options.aspect;
      if (options.projection !== undefined) this._projection = options.projection;
      if (options.position) this._position = Vector3.fromArray(options.position);
      if (options.lookAt) this._target = Vector3.fromArray(options.lookAt);
      if (options.up) this._up = Vector3.fromArray(options.up).normalize();
      if (options.left !== undefined) this._left = options.left;
      if (options.right !== undefined) this._right = options.right;
      if (options.top !== undefined) this._top = options.top;
      if (options.bottom !== undefined) this._bottom = options.bottom;
    }
  }

  // ==================== Projection Properties ====================

  get fov(): number {
    return this._fov;
  }

  set fov(value: number) {
    this._fov = Math.max(1, Math.min(179, value));
    this.invalidateProjection();
  }

  get near(): number {
    return this._near;
  }

  set near(value: number) {
    this._near = Math.max(0.001, value);
    this.invalidateProjection();
  }

  get far(): number {
    return this._far;
  }

  set far(value: number) {
    this._far = Math.max(this._near + 0.001, value);
    this.invalidateProjection();
  }

  get aspect(): number {
    return this._aspect;
  }

  set aspect(value: number) {
    this._aspect = Math.max(0.001, value);
    this.invalidateProjection();
  }

  get projection(): CameraProjection {
    return this._projection;
  }

  set projection(value: CameraProjection) {
    this._projection = value;
    this.invalidateProjection();
  }

  // ==================== Orthographic Properties ====================

  get left(): number {
    return this._left;
  }

  set left(value: number) {
    this._left = value;
    this.invalidateProjection();
  }

  get right(): number {
    return this._right;
  }

  set right(value: number) {
    this._right = value;
    this.invalidateProjection();
  }

  get top(): number {
    return this._top;
  }

  set top(value: number) {
    this._top = value;
    this.invalidateProjection();
  }

  get bottom(): number {
    return this._bottom;
  }

  set bottom(value: number) {
    this._bottom = value;
    this.invalidateProjection();
  }

  // ==================== Transform Properties ====================

  get position(): Vector3 {
    return this._position;
  }

  set position(value: Vector3) {
    this._position = value;
    this.invalidateView();
  }

  get target(): Vector3 {
    return this._target;
  }

  set target(value: Vector3) {
    this._target = value;
    this.invalidateView();
  }

  get up(): Vector3 {
    return this._up;
  }

  set up(value: Vector3) {
    this._up = value.normalize();
    this.invalidateView();
  }

  // ==================== Fluent API ====================

  setFov(fov: number): this {
    this.fov = fov;
    return this;
  }

  setNear(near: number): this {
    this.near = near;
    return this;
  }

  setFar(far: number): this {
    this.far = far;
    return this;
  }

  setAspect(aspect: number): this {
    this.aspect = aspect;
    return this;
  }

  setProjection(projection: CameraProjection): this {
    this.projection = projection;
    return this;
  }

  setPosition(position: Vector3 | [number, number, number]): this {
    if (Array.isArray(position)) {
      this._position = Vector3.fromArray(position);
    } else {
      this._position = position;
    }
    this.invalidateView();
    return this;
  }

  setLookAt(target: Vector3 | [number, number, number]): this {
    if (Array.isArray(target)) {
      this._target = Vector3.fromArray(target);
    } else {
      this._target = target;
    }
    this.invalidateView();
    return this;
  }

  setUp(up: Vector3 | [number, number, number]): this {
    if (Array.isArray(up)) {
      this._up = Vector3.fromArray(up).normalize();
    } else {
      this._up = up.normalize();
    }
    this.invalidateView();
    return this;
  }

  setOrthoBounds(left: number, right: number, bottom: number, top: number): this {
    this._left = left;
    this._right = right;
    this._bottom = bottom;
    this._top = top;
    this.invalidateProjection();
    return this;
  }

  // ==================== Bindings ====================

  bindPosition(fn: BindingFunction<Vector3 | [number, number, number]>): this {
    this._positionBinding = new Binding(fn);
    return this;
  }

  bindLookAt(fn: BindingFunction<Vector3 | [number, number, number]>): this {
    this._lookAtBinding = new Binding(fn);
    return this;
  }

  bindUp(fn: BindingFunction<Vector3 | [number, number, number]>): this {
    this._upBinding = new Binding(fn);
    return this;
  }

  bindFov(fn: BindingFunction<number>): this {
    this._fovBinding = new Binding(fn);
    return this;
  }

  getPositionBinding(): Binding<Vector3 | [number, number, number]> | null {
    return this._positionBinding;
  }

  getLookAtBinding(): Binding<Vector3 | [number, number, number]> | null {
    return this._lookAtBinding;
  }

  getUpBinding(): Binding<Vector3 | [number, number, number]> | null {
    return this._upBinding;
  }

  getFovBinding(): Binding<number> | null {
    return this._fovBinding;
  }

  /**
   * Evaluate and apply bindings
   */
  refreshBindings(): void {
    if (this._positionBinding) {
      const pos = this._positionBinding.evaluate();
      if (Array.isArray(pos)) {
        this._position = Vector3.fromArray(pos);
      } else {
        this._position = pos;
      }
      this.invalidateView();
    }

    if (this._lookAtBinding) {
      const target = this._lookAtBinding.evaluate();
      if (Array.isArray(target)) {
        this._target = Vector3.fromArray(target);
      } else {
        this._target = target;
      }
      this.invalidateView();
    }

    if (this._upBinding) {
      const up = this._upBinding.evaluate();
      if (Array.isArray(up)) {
        this._up = Vector3.fromArray(up).normalize();
      } else {
        this._up = up.normalize();
      }
      this.invalidateView();
    }

    if (this._fovBinding) {
      this.fov = this._fovBinding.evaluate();
      // fov setter invalidates projection
    }
  }

  // ==================== Matrices ====================

  /**
   * Get the projection matrix
   */
  getProjectionMatrix(): Matrix4 {
    if (!this._projectionMatrix) {
      if (this._projection === 'perspective') {
        const fovRad = (this._fov * Math.PI) / 180;
        this._projectionMatrix = Matrix4.perspective(fovRad, this._aspect, this._near, this._far);
      } else {
        this._projectionMatrix = Matrix4.orthographic(
          this._left,
          this._right,
          this._bottom,
          this._top,
          this._near,
          this._far
        );
      }
    }
    return this._projectionMatrix;
  }

  /**
   * Get the view matrix (camera transform inverse)
   */
  getViewMatrix(): Matrix4 {
    if (!this._viewMatrix) {
      this._viewMatrix = Matrix4.lookAt(this._position, this._target, this._up);
    }
    return this._viewMatrix;
  }

  /**
   * Get the combined view-projection matrix
   */
  getViewProjectionMatrix(): Matrix4 {
    if (!this._viewProjectionMatrix) {
      this._viewProjectionMatrix = this.getProjectionMatrix().multiply(this.getViewMatrix());
    }
    return this._viewProjectionMatrix;
  }

  /**
   * Get the inverse view matrix (for transforming to world space)
   * Cached for performance - called frequently during raycasting
   */
  getInverseViewMatrix(): Matrix4 {
    if (!this._inverseViewMatrix) {
      this._inverseViewMatrix = this.getViewMatrix().invert();
    }
    return this._inverseViewMatrix;
  }

  // ==================== Derived Properties ====================

  /**
   * Get the forward direction (towards target)
   */
  getForward(): Vector3 {
    return this._target.sub(this._position).normalize();
  }

  /**
   * Get the right direction
   */
  getRight(): Vector3 {
    return this.getForward().cross(this._up).normalize();
  }

  /**
   * Get the up direction (orthogonalized)
   */
  getUp(): Vector3 {
    return this.getRight().cross(this.getForward()).normalize();
  }

  // ==================== Camera Movement ====================

  /**
   * Move the camera along its forward axis
   */
  moveForward(distance: number): this {
    const forward = this.getForward();
    this._position = this._position.add(forward.multiplyScalar(distance));
    this._target = this._target.add(forward.multiplyScalar(distance));
    this.invalidateView();
    return this;
  }

  /**
   * Move the camera along its right axis
   */
  moveRight(distance: number): this {
    const right = this.getRight();
    this._position = this._position.add(right.multiplyScalar(distance));
    this._target = this._target.add(right.multiplyScalar(distance));
    this.invalidateView();
    return this;
  }

  /**
   * Move the camera along its up axis
   */
  moveUp(distance: number): this {
    const up = this.getUp();
    this._position = this._position.add(up.multiplyScalar(distance));
    this._target = this._target.add(up.multiplyScalar(distance));
    this.invalidateView();
    return this;
  }

  /**
   * Orbit around the target
   */
  orbit(yaw: number, pitch: number): this {
    const toCamera = this._position.sub(this._target);
    const distance = toCamera.length();

    // Current spherical coordinates
    const currentPhi = Math.atan2(toCamera.z, toCamera.x);
    const currentTheta = Math.acos(Math.max(-1, Math.min(1, toCamera.y / distance)));

    // Apply rotation
    const newPhi = currentPhi + yaw;
    const newTheta = Math.max(0.01, Math.min(Math.PI - 0.01, currentTheta + pitch));

    // Convert back to cartesian
    this._position = new Vector3(
      this._target.x + distance * Math.sin(newTheta) * Math.cos(newPhi),
      this._target.y + distance * Math.cos(newTheta),
      this._target.z + distance * Math.sin(newTheta) * Math.sin(newPhi)
    );

    this.invalidateView();
    return this;
  }

  /**
   * Zoom (dolly) towards/away from target
   */
  zoom(factor: number): this {
    const toTarget = this._target.sub(this._position);
    const distance = toTarget.length();
    const newDistance = Math.max(0.1, distance * factor);
    const direction = toTarget.normalize();
    this._position = this._target.sub(direction.multiplyScalar(newDistance));
    this.invalidateView();
    return this;
  }

  /**
   * Pan the camera (move target and position together)
   */
  pan(dx: number, dy: number): this {
    const right = this.getRight();
    const up = this.getUp();
    const offset = right.multiplyScalar(dx).add(up.multiplyScalar(dy));
    this._position = this._position.add(offset);
    this._target = this._target.add(offset);
    this.invalidateView();
    return this;
  }

  // ==================== Ray Casting ====================

  /**
   * Create a ray from screen coordinates (normalized device coordinates)
   * x, y should be in range [-1, 1]
   */
  screenToRay(x: number, y: number): Ray {
    // Get inverse view-projection matrix
    const invViewProj = this.getViewProjectionMatrix().invert();

    // Near point in NDC
    const nearPoint = new Vector3(x, y, -1).applyMatrix4(invViewProj);

    // Far point in NDC
    const farPoint = new Vector3(x, y, 1).applyMatrix4(invViewProj);

    // Ray direction
    const direction = farPoint.sub(nearPoint).normalize();

    return new Ray(nearPoint, direction);
  }

  /**
   * Create a ray from pixel coordinates
   */
  pixelToRay(px: number, py: number, width: number, height: number): Ray {
    // Convert pixel to NDC
    const x = (px / width) * 2 - 1;
    const y = 1 - (py / height) * 2;
    return this.screenToRay(x, y);
  }

  // ==================== Projection ====================

  /**
   * Project a 3D world point to screen coordinates (NDC, -1 to 1)
   */
  projectToNDC(worldPoint: Vector3): Vector3 {
    return worldPoint.applyMatrix4(this.getViewProjectionMatrix());
  }

  /**
   * Project a 3D world point to pixel coordinates
   */
  projectToPixel(worldPoint: Vector3, width: number, height: number): { x: number; y: number; z: number } {
    const ndc = this.projectToNDC(worldPoint);
    return {
      x: ((ndc.x + 1) / 2) * width,
      y: ((1 - ndc.y) / 2) * height,
      z: ndc.z,
    };
  }

  /**
   * Check if a point is in front of the camera
   */
  isPointInFront(worldPoint: Vector3): boolean {
    const ndc = this.projectToNDC(worldPoint);
    return ndc.z >= -1 && ndc.z <= 1;
  }

  // ==================== Cache Invalidation ====================

  private invalidateProjection(): void {
    this._projectionMatrix = null;
    this._viewProjectionMatrix = null;
  }

  private invalidateView(): void {
    this._viewMatrix = null;
    this._viewProjectionMatrix = null;
    this._inverseViewMatrix = null;
  }

  // ==================== Clone ====================

  clone(): Camera {
    const camera = new Camera({
      fov: this._fov,
      near: this._near,
      far: this._far,
      aspect: this._aspect,
      projection: this._projection,
      position: this._position.toArray(),
      lookAt: this._target.toArray(),
      up: this._up.toArray(),
      left: this._left,
      right: this._right,
      top: this._top,
      bottom: this._bottom,
    });
    return camera;
  }
}
