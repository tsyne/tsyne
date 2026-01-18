/**
 * Base class for all Cosyne 3D primitives
 *
 * Provides common functionality for 3D objects including position, rotation,
 * scale, materials, and event handling.
 */

import { Vector3, Matrix4, Quaternion, Box3, Ray } from '../math3d';
import { Material, MaterialProperties } from '../material';
import { Binding, BindingFunction } from '../binding';

/**
 * 3D position binding type
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D rotation binding type (Euler angles in radians)
 */
export interface Rotation3D {
  x?: number;
  y?: number;
  z?: number;
}

/**
 * 3D scale binding type
 */
export interface Scale3D {
  x?: number;
  y?: number;
  z?: number;
}

/**
 * Hit information for 3D ray casting
 */
export interface Hit3D {
  /** Distance from ray origin to hit point */
  distance: number;
  /** Hit point in world coordinates */
  point: Vector3;
  /** Surface normal at hit point */
  normal: Vector3;
  /** Primitive that was hit */
  primitive: Primitive3D;
  /** UV coordinates if applicable */
  uv?: { u: number; v: number };
  /** Additional hit data (e.g., lat/lon for spheres) */
  data?: Record<string, any>;
}

/**
 * 3D event handlers
 */
export interface Primitive3DEventHandlers {
  onClick?: (hit: Hit3D) => void | Promise<void>;
  onHover?: (hit: Hit3D | null) => void;
  onDragStart?: (hit: Hit3D) => void;
  onDrag?: (hit: Hit3D, delta: Vector3) => void;
  onDragEnd?: () => void;
}

/**
 * Options for creating a 3D primitive
 */
export interface Primitive3DOptions {
  /** Custom ID for testing/debugging */
  id?: string;
  /** Initial position */
  position?: [number, number, number] | Position3D;
  /** Initial rotation (Euler angles in radians) */
  rotation?: [number, number, number] | Rotation3D;
  /** Initial scale */
  scale?: [number, number, number] | Scale3D | number;
  /** Material properties */
  material?: MaterialProperties;
  /** Whether to cast shadows */
  castShadow?: boolean;
  /** Whether to receive shadows */
  receiveShadow?: boolean;
  /** Whether the primitive is visible */
  visible?: boolean;
}

/**
 * Base class for all 3D primitives
 */
export abstract class Primitive3D {
  // Identification
  protected customId: string | undefined;

  // Transform
  protected _position: Vector3 = new Vector3(0, 0, 0);
  protected _rotation: Quaternion = Quaternion.identity();
  protected _scale: Vector3 = new Vector3(1, 1, 1);

  // Cached matrices
  protected _localMatrix: Matrix4 | null = null;
  protected _worldMatrix: Matrix4 | null = null;

  // Material
  protected _material: Material = Material.default();

  // Visibility and shadow
  protected _visible: boolean = true;
  protected _castShadow: boolean = true;
  protected _receiveShadow: boolean = true;

  // Parent-child hierarchy
  protected _parent: Primitive3D | null = null;
  protected _children: Primitive3D[] = [];

  // Bindings
  protected _positionBinding: Binding<Position3D | [number, number, number]> | null = null;
  protected _rotationBinding: Binding<Rotation3D | [number, number, number]> | null = null;
  protected _scaleBinding: Binding<Scale3D | [number, number, number] | number> | null = null;
  protected _materialBinding: Binding<MaterialProperties> | null = null;
  protected _visibleBinding: Binding<boolean> | null = null;

  // Event handlers
  protected _onClickHandler: ((hit: Hit3D) => void | Promise<void>) | null = null;
  protected _onHoverHandler: ((hit: Hit3D | null) => void) | null = null;
  protected _onDragStartHandler: ((hit: Hit3D) => void) | null = null;
  protected _onDragHandler: ((hit: Hit3D, delta: Vector3) => void) | null = null;
  protected _onDragEndHandler: (() => void) | null = null;

  // Passthrough mode (for decorative objects that shouldn't intercept events)
  protected _isPassthrough: boolean = false;

  // Scene reference (set when added to scene)
  protected _sceneId: string | null = null;

  constructor(options?: Primitive3DOptions) {
    if (options) {
      if (options.id) this.customId = options.id;
      if (options.position) this.setPosition(options.position);
      if (options.rotation) this.setRotation(options.rotation);
      if (options.scale) this.setScale(options.scale);
      if (options.material) this._material.setProperties(options.material);
      if (options.castShadow !== undefined) this._castShadow = options.castShadow;
      if (options.receiveShadow !== undefined) this._receiveShadow = options.receiveShadow;
      if (options.visible !== undefined) this._visible = options.visible;
    }
  }

  // ==================== Abstract Methods ====================

  /**
   * Get the type name of this primitive
   */
  abstract get type(): string;

  /**
   * Intersect this primitive with a ray
   * Returns hit information or null if no intersection
   */
  abstract intersectRay(ray: Ray): Hit3D | null;

  /**
   * Get the axis-aligned bounding box in local space
   */
  abstract getLocalBoundingBox(): Box3;

  /**
   * Get serializable properties for bridge communication
   */
  abstract getProperties(): Record<string, any>;

  // ==================== Identification ====================

  /**
   * Get the custom ID
   */
  getId(): string | undefined {
    return this.customId;
  }

  /**
   * Set a custom ID for testing/debugging
   */
  withId(id: string): this {
    this.customId = id;
    return this;
  }

  /**
   * Get the scene ID this primitive belongs to
   */
  getSceneId(): string | null {
    return this._sceneId;
  }

  /**
   * Set the scene ID (called by context when added)
   */
  setSceneId(id: string | null): void {
    this._sceneId = id;
  }

  // ==================== Transform ====================

  get position(): Vector3 {
    return this._position;
  }

  set position(value: Vector3) {
    this._position = value;
    this.invalidateTransform();
  }

  get rotation(): Quaternion {
    return this._rotation;
  }

  set rotation(value: Quaternion) {
    this._rotation = value;
    this.invalidateTransform();
  }

  get scale(): Vector3 {
    return this._scale;
  }

  set scale(value: Vector3) {
    this._scale = value;
    this.invalidateTransform();
  }

  setPosition(pos: Position3D | [number, number, number]): this {
    if (Array.isArray(pos)) {
      this._position = Vector3.fromArray(pos);
    } else {
      this._position = new Vector3(pos.x, pos.y, pos.z);
    }
    this.invalidateTransform();
    return this;
  }

  setRotation(rot: Rotation3D | [number, number, number]): this {
    if (Array.isArray(rot)) {
      this._rotation = Quaternion.fromEuler(rot[0], rot[1], rot[2]);
    } else {
      this._rotation = Quaternion.fromEuler(rot.x || 0, rot.y || 0, rot.z || 0);
    }
    this.invalidateTransform();
    return this;
  }

  setRotationFromQuaternion(q: Quaternion): this {
    this._rotation = q;
    this.invalidateTransform();
    return this;
  }

  setScale(s: Scale3D | [number, number, number] | number): this {
    if (typeof s === 'number') {
      this._scale = new Vector3(s, s, s);
    } else if (Array.isArray(s)) {
      this._scale = Vector3.fromArray(s);
    } else {
      this._scale = new Vector3(s.x ?? 1, s.y ?? 1, s.z ?? 1);
    }
    this.invalidateTransform();
    return this;
  }

  /**
   * Translate the primitive
   */
  translate(dx: number, dy: number, dz: number): this {
    this._position = this._position.add(new Vector3(dx, dy, dz));
    this.invalidateTransform();
    return this;
  }

  /**
   * Rotate around an axis
   */
  rotateOnAxis(axis: Vector3, angle: number): this {
    const q = Quaternion.fromAxisAngle(axis, angle);
    this._rotation = this._rotation.multiply(q);
    this.invalidateTransform();
    return this;
  }

  /**
   * Rotate around X axis
   */
  rotateX(angle: number): this {
    return this.rotateOnAxis(Vector3.right(), angle);
  }

  /**
   * Rotate around Y axis
   */
  rotateY(angle: number): this {
    return this.rotateOnAxis(Vector3.up(), angle);
  }

  /**
   * Rotate around Z axis
   */
  rotateZ(angle: number): this {
    return this.rotateOnAxis(Vector3.forward(), angle);
  }

  /**
   * Look at a target point
   */
  lookAt(target: Vector3): this {
    const direction = target.sub(this._position).normalize();
    const up = Vector3.up();

    if (Math.abs(direction.y) > 0.99) {
      // Looking straight up or down - use different up vector
      const right = Vector3.right();
      const newUp = direction.cross(right).normalize();
      const newRight = newUp.cross(direction).normalize();

      const m = new Matrix4();
      m.elements[0] = newRight.x;
      m.elements[1] = newRight.y;
      m.elements[2] = newRight.z;
      m.elements[4] = newUp.x;
      m.elements[5] = newUp.y;
      m.elements[6] = newUp.z;
      m.elements[8] = direction.x;
      m.elements[9] = direction.y;
      m.elements[10] = direction.z;

      this._rotation = Quaternion.fromRotationMatrix(m);
    } else {
      const right = up.cross(direction).normalize();
      const newUp = direction.cross(right).normalize();

      const m = new Matrix4();
      m.elements[0] = right.x;
      m.elements[1] = right.y;
      m.elements[2] = right.z;
      m.elements[4] = newUp.x;
      m.elements[5] = newUp.y;
      m.elements[6] = newUp.z;
      m.elements[8] = direction.x;
      m.elements[9] = direction.y;
      m.elements[10] = direction.z;

      this._rotation = Quaternion.fromRotationMatrix(m);
    }

    this.invalidateTransform();
    return this;
  }

  // ==================== Matrices ====================

  /**
   * Get local transformation matrix
   */
  getLocalMatrix(): Matrix4 {
    if (!this._localMatrix) {
      this._localMatrix = new Matrix4();
      this._localMatrix.compose(this._position, this._rotation, this._scale);
    }
    return this._localMatrix;
  }

  /**
   * Get world transformation matrix (includes parent transforms)
   */
  getWorldMatrix(): Matrix4 {
    if (!this._worldMatrix) {
      const local = this.getLocalMatrix();
      if (this._parent) {
        this._worldMatrix = this._parent.getWorldMatrix().multiply(local);
      } else {
        this._worldMatrix = local.clone();
      }
    }
    return this._worldMatrix;
  }

  /**
   * Get world position
   */
  getWorldPosition(): Vector3 {
    return this.getWorldMatrix().getPosition();
  }

  /**
   * Invalidate cached transform matrices
   */
  protected invalidateTransform(): void {
    this._localMatrix = null;
    this._worldMatrix = null;

    // Also invalidate children
    for (const child of this._children) {
      child.invalidateTransform();
    }
  }

  // ==================== Hierarchy ====================

  get parent(): Primitive3D | null {
    return this._parent;
  }

  get children(): Primitive3D[] {
    return [...this._children];
  }

  /**
   * Add a child primitive
   */
  add(child: Primitive3D): this {
    if (child._parent) {
      child._parent.remove(child);
    }
    child._parent = this;
    this._children.push(child);
    child.invalidateTransform();
    return this;
  }

  /**
   * Remove a child primitive
   */
  remove(child: Primitive3D): this {
    const index = this._children.indexOf(child);
    if (index !== -1) {
      this._children.splice(index, 1);
      child._parent = null;
      child.invalidateTransform();
    }
    return this;
  }

  /**
   * Remove all children
   */
  removeAll(): this {
    for (const child of this._children) {
      child._parent = null;
      child.invalidateTransform();
    }
    this._children = [];
    return this;
  }

  // ==================== Material ====================

  get material(): Material {
    return this._material;
  }

  set material(value: Material) {
    this._material = value;
  }

  /**
   * Set material properties (fluent API)
   */
  setMaterial(props: MaterialProperties): this {
    this._material.setProperties(props);
    return this;
  }

  // ==================== Visibility and Shadow ====================

  get visible(): boolean {
    return this._visible;
  }

  set visible(value: boolean) {
    this._visible = value;
  }

  get castShadow(): boolean {
    return this._castShadow;
  }

  setCastShadow(value: boolean): this {
    this._castShadow = value;
    return this;
  }

  get receiveShadow(): boolean {
    return this._receiveShadow;
  }

  setReceiveShadow(value: boolean): this {
    this._receiveShadow = value;
    return this;
  }

  /**
   * Set visibility (fluent API)
   */
  setVisible(visible: boolean): this {
    this._visible = visible;
    return this;
  }

  /**
   * Show the primitive
   */
  show(): this {
    this._visible = true;
    return this;
  }

  /**
   * Hide the primitive
   */
  hide(): this {
    this._visible = false;
    return this;
  }

  // ==================== Bindings ====================

  bindPosition(fn: BindingFunction<Position3D | [number, number, number]>): this {
    this._positionBinding = new Binding(fn);
    return this;
  }

  bindRotation(fn: BindingFunction<Rotation3D | [number, number, number]>): this {
    this._rotationBinding = new Binding(fn);
    return this;
  }

  bindScale(fn: BindingFunction<Scale3D | [number, number, number] | number>): this {
    this._scaleBinding = new Binding(fn);
    return this;
  }

  bindMaterial(fn: BindingFunction<MaterialProperties>): this {
    this._materialBinding = new Binding(fn);
    return this;
  }

  bindVisible(fn: BindingFunction<boolean>): this {
    this._visibleBinding = new Binding(fn);
    return this;
  }

  getPositionBinding(): Binding<Position3D | [number, number, number]> | null {
    return this._positionBinding;
  }

  getRotationBinding(): Binding<Rotation3D | [number, number, number]> | null {
    return this._rotationBinding;
  }

  getScaleBinding(): Binding<Scale3D | [number, number, number] | number> | null {
    return this._scaleBinding;
  }

  getMaterialBinding(): Binding<MaterialProperties> | null {
    return this._materialBinding;
  }

  getVisibleBinding(): Binding<boolean> | null {
    return this._visibleBinding;
  }

  /**
   * Evaluate and apply all bindings
   */
  refreshBindings(): void {
    if (this._positionBinding) {
      this.setPosition(this._positionBinding.evaluate());
    }
    if (this._rotationBinding) {
      this.setRotation(this._rotationBinding.evaluate());
    }
    if (this._scaleBinding) {
      this.setScale(this._scaleBinding.evaluate());
    }
    if (this._materialBinding) {
      this._material.setProperties(this._materialBinding.evaluate());
    }
    if (this._visibleBinding) {
      this._visible = this._visibleBinding.evaluate();
    }

    // Refresh children too
    for (const child of this._children) {
      child.refreshBindings();
    }
  }

  // ==================== Event Handlers ====================

  onClick(handler: (hit: Hit3D) => void | Promise<void>): this {
    this._onClickHandler = handler;
    return this;
  }

  onHover(handler: (hit: Hit3D | null) => void): this {
    this._onHoverHandler = handler;
    return this;
  }

  onDragStart(handler: (hit: Hit3D) => void): this {
    this._onDragStartHandler = handler;
    return this;
  }

  onDrag(handler: (hit: Hit3D, delta: Vector3) => void): this {
    this._onDragHandler = handler;
    return this;
  }

  onDragEnd(handler: () => void): this {
    this._onDragEndHandler = handler;
    return this;
  }

  getClickHandler(): ((hit: Hit3D) => void | Promise<void>) | null {
    return this._onClickHandler;
  }

  getHoverHandler(): ((hit: Hit3D | null) => void) | null {
    return this._onHoverHandler;
  }

  getDragStartHandler(): ((hit: Hit3D) => void) | null {
    return this._onDragStartHandler;
  }

  getDragHandler(): ((hit: Hit3D, delta: Vector3) => void) | null {
    return this._onDragHandler;
  }

  getDragEndHandler(): (() => void) | null {
    return this._onDragEndHandler;
  }

  hasEventHandlers(): boolean {
    return !!(
      this._onClickHandler ||
      this._onHoverHandler ||
      this._onDragStartHandler ||
      this._onDragHandler ||
      this._onDragEndHandler
    );
  }

  // ==================== Passthrough ====================

  passthrough(enabled: boolean = true): this {
    this._isPassthrough = enabled;
    return this;
  }

  isPassthroughEnabled(): boolean {
    return this._isPassthrough;
  }

  // ==================== Bounding Box ====================

  /**
   * Get axis-aligned bounding box in world space
   */
  getWorldBoundingBox(): Box3 {
    const localBox = this.getLocalBoundingBox();
    return localBox.applyMatrix4(this.getWorldMatrix());
  }

  // ==================== Utility ====================

  /**
   * Clone this primitive (without children or event handlers)
   */
  abstract clone(): Primitive3D;

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Remove from parent
    if (this._parent) {
      this._parent.remove(this);
    }

    // Dispose children
    for (const child of [...this._children]) {
      child.dispose();
    }

    // Clear references
    this._children = [];
    this._parent = null;
    this._onClickHandler = null;
    this._onHoverHandler = null;
    this._onDragStartHandler = null;
    this._onDragHandler = null;
    this._onDragEndHandler = null;
    this._positionBinding = null;
    this._rotationBinding = null;
    this._scaleBinding = null;
    this._materialBinding = null;
    this._visibleBinding = null;
  }
}
