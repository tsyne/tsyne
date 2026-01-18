/**
 * Cosyne3dContext - Main builder for declarative 3D scene compositions
 *
 * The Cosyne3dContext provides a fluent API for creating and managing
 * 3D scenes with primitives, lights, cameras, and event handling.
 */

import { BindingRegistry, CollectionBinding, CollectionBindingOptions } from './binding';
import {
  Primitive3D,
  Position3D,
  Hit3D,
  Sphere3D,
  SphereOptions,
  Box3D,
  BoxOptions,
  Plane3D,
  PlaneOptions,
  Cylinder3D,
  CylinderOptions,
} from './primitives3d';
import { Camera, CameraOptions } from './camera';
import { Light, LightOptions, createLight, LightManager } from './light';
import { Vector3, Ray, Quaternion } from './math3d';
import { MaterialProperties } from './material';

/**
 * Options for creating a Cosyne3dContext
 */
export interface Cosyne3dContextOptions {
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Background color */
  backgroundColor?: string;
  /** Enable antialiasing (for renderer) */
  antialias?: boolean;
}

/**
 * Transform options for nested coordinate systems
 */
export interface Transform3DOptions {
  /** Translation */
  translate?: [number, number, number];
  /** Rotation in radians (Euler angles) */
  rotate?: [number, number, number];
  /** Scale */
  scale?: [number, number, number] | number;
}

/**
 * Scene statistics
 */
export interface SceneStats {
  primitiveCount: number;
  lightCount: number;
  visibleCount: number;
}

/**
 * Collection builder for 3D primitives
 */
export interface Collection3DBuilder<T, P extends Primitive3D> {
  bindTo(options: CollectionBindingOptions<T, P>): Collection3DBuilder<T, P>;
  evaluate(): P[];
  getItems(): P[];
}

/**
 * Main Cosyne 3D builder context
 */
export class Cosyne3dContext {
  // Configuration
  private width: number = 800;
  private height: number = 600;
  private backgroundColor: string = '#000000';
  private antialias: boolean = true;

  // Scene contents
  private allPrimitives: Primitive3D[] = [];
  private primitivesById: Map<string, Primitive3D> = new Map();
  private bindingRegistry: BindingRegistry = new BindingRegistry();
  private lightManager: LightManager = new LightManager();
  private camera: Camera;

  // Transform stack for nested transforms
  private transformStack: Transform3DOptions[] = [];

  // Builder function for rebuild
  private builder?: (context: Cosyne3dContext) => void;

  // Scene ID for bridge communication
  private sceneId: string;

  // Hover tracking
  private hoveredPrimitive: Primitive3D | null = null;

  // App reference (for bridge communication)
  private app: any;

  constructor(app: any, options?: Cosyne3dContextOptions) {
    this.app = app;
    this.sceneId = `scene3d_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (options) {
      if (options.width) this.width = options.width;
      if (options.height) this.height = options.height;
      if (options.backgroundColor) this.backgroundColor = options.backgroundColor;
      if (options.antialias !== undefined) this.antialias = options.antialias;
    }

    // Create default camera
    this.camera = new Camera({
      fov: 60,
      aspect: this.width / this.height,
      near: 0.1,
      far: 1000,
      position: [0, 5, 10],
      lookAt: [0, 0, 0],
    });
  }

  // ==================== Scene Configuration ====================

  getSceneId(): string {
    return this.sceneId;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  setSize(width: number, height: number): this {
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    return this;
  }

  getBackgroundColor(): string {
    return this.backgroundColor;
  }

  setBackgroundColor(color: string): this {
    this.backgroundColor = color;
    return this;
  }

  // ==================== Builder Pattern ====================

  setBuilder(builder: (context: Cosyne3dContext) => void): void {
    this.builder = builder;
  }

  rebuild(): void {
    if (!this.builder) return;

    // Clear existing primitives
    this.allPrimitives = [];
    this.primitivesById.clear();
    this.bindingRegistry.clear();

    // Re-run builder
    this.builder(this);
  }

  // ==================== Primitive Factory Methods ====================

  /**
   * Create a sphere primitive
   */
  sphere(options?: SphereOptions): Sphere3D {
    const sphere = new Sphere3D(options);
    this.applyCurrentTransform(sphere);
    this.trackPrimitive(sphere);
    return sphere;
  }

  /**
   * Create a box primitive
   */
  box(options?: BoxOptions): Box3D {
    const box = new Box3D(options);
    this.applyCurrentTransform(box);
    this.trackPrimitive(box);
    return box;
  }

  /**
   * Create a plane primitive
   */
  plane(options?: PlaneOptions): Plane3D {
    const plane = new Plane3D(options);
    this.applyCurrentTransform(plane);
    this.trackPrimitive(plane);
    return plane;
  }

  /**
   * Create a cylinder primitive
   */
  cylinder(options?: CylinderOptions): Cylinder3D {
    const cylinder = new Cylinder3D(options);
    this.applyCurrentTransform(cylinder);
    this.trackPrimitive(cylinder);
    return cylinder;
  }

  // ==================== Collection Builders ====================

  /**
   * Create a collection of spheres
   */
  spheres<T>(): Collection3DBuilder<T, Sphere3D> {
    return this.createCollectionBuilder<T, Sphere3D>();
  }

  /**
   * Create a collection of boxes
   */
  boxes<T>(): Collection3DBuilder<T, Box3D> {
    return this.createCollectionBuilder<T, Box3D>();
  }

  /**
   * Create a collection of planes
   */
  planes<T>(): Collection3DBuilder<T, Plane3D> {
    return this.createCollectionBuilder<T, Plane3D>();
  }

  /**
   * Create a collection of cylinders
   */
  cylinders<T>(): Collection3DBuilder<T, Cylinder3D> {
    return this.createCollectionBuilder<T, Cylinder3D>();
  }

  private createCollectionBuilder<T, P extends Primitive3D>(): Collection3DBuilder<T, P> {
    let binding: CollectionBinding<T, P> | null = null;
    let items: P[] = [];

    const builder: Collection3DBuilder<T, P> = {
      bindTo: (options: CollectionBindingOptions<T, P>) => {
        binding = new CollectionBinding<T, P>({
          items: options.items,
          render: (item, index) => {
            const primitive = options.render(item, index);
            this.trackPrimitive(primitive);
            return primitive;
          },
          trackBy: options.trackBy,
        });
        this.bindingRegistry.registerCollection(binding);
        return builder;
      },
      evaluate: () => {
        if (binding) {
          const result = binding.evaluate();
          items = result.results;

          // Remove deleted items from tracking
          for (const removed of result.removed) {
            this.removePrimitive(removed);
          }
        }
        return items;
      },
      getItems: () => items,
    };

    return builder;
  }

  // ==================== Transform ====================

  /**
   * Apply a transform to nested content
   */
  transform(options: Transform3DOptions, builder: (ctx: Cosyne3dContext) => void): this {
    this.transformStack.push(options);
    builder(this);
    this.transformStack.pop();
    return this;
  }

  private applyCurrentTransform(primitive: Primitive3D): void {
    if (this.transformStack.length === 0) return;

    // Apply transforms from bottom to top
    let position = primitive.position;
    let rotation = primitive.rotation;
    let scale = primitive.scale;

    for (const transform of this.transformStack) {
      // Apply rotation to position offset (rotate the primitive's position around parent origin)
      if (transform.rotate) {
        const parentRotation = Quaternion.fromEuler(
          transform.rotate[0],
          transform.rotate[1],
          transform.rotate[2]
        );
        // Rotate the position vector by parent rotation
        position = position.applyQuaternion(parentRotation);
        // Compose rotations: parent rotation * child rotation
        rotation = parentRotation.multiply(rotation);
      }

      if (transform.translate) {
        position = position.add(Vector3.fromArray(transform.translate));
      }

      if (transform.scale) {
        const s = typeof transform.scale === 'number'
          ? new Vector3(transform.scale, transform.scale, transform.scale)
          : Vector3.fromArray(transform.scale);
        // Scale affects position offset as well
        position = position.multiply(s);
        scale = scale.multiply(s);
      }
    }

    primitive.position = position;
    primitive.setRotationFromQuaternion(rotation);
    primitive.scale = scale;
  }

  // ==================== Camera ====================

  /**
   * Configure the camera
   */
  setCamera(options: CameraOptions): Camera {
    const cam = new Camera(options);
    cam.aspect = this.width / this.height;
    this.camera = cam;
    return cam;
  }

  /**
   * Get the current camera
   */
  getCamera(): Camera {
    return this.camera;
  }

  // ==================== Lights ====================

  /**
   * Add a light to the scene
   */
  light(options: LightOptions): Light {
    const light = createLight(options);
    this.lightManager.addLight(light);
    return light;
  }

  /**
   * Get the light manager
   */
  getLightManager(): LightManager {
    return this.lightManager;
  }

  /**
   * Get all lights
   */
  getLights(): Light[] {
    return this.lightManager.getLights();
  }

  // ==================== Primitive Management ====================

  private trackPrimitive(primitive: Primitive3D): void {
    primitive.setSceneId(this.sceneId);
    this.allPrimitives.push(primitive);

    const id = primitive.getId();
    if (id) {
      this.primitivesById.set(id, primitive);
    }
  }

  private removePrimitive(primitive: Primitive3D): void {
    const index = this.allPrimitives.indexOf(primitive);
    if (index !== -1) {
      this.allPrimitives.splice(index, 1);
    }

    const id = primitive.getId();
    if (id) {
      this.primitivesById.delete(id);
    }

    primitive.dispose();
  }

  /**
   * Get a primitive by its custom ID
   */
  getPrimitiveById(id: string): Primitive3D | undefined {
    return this.primitivesById.get(id);
  }

  /**
   * Get all primitives
   */
  getAllPrimitives(): Primitive3D[] {
    return [...this.allPrimitives];
  }

  /**
   * Get visible primitives
   */
  getVisiblePrimitives(): Primitive3D[] {
    return this.allPrimitives.filter(p => p.visible);
  }

  /**
   * Get scene statistics
   */
  getStats(): SceneStats {
    return {
      primitiveCount: this.allPrimitives.length,
      lightCount: this.lightManager.getLights().length,
      visibleCount: this.allPrimitives.filter(p => p.visible).length,
    };
  }

  // ==================== Bindings ====================

  /**
   * Refresh all bindings - re-evaluates binding functions and updates primitives
   */
  refreshBindings(): void {
    // Refresh camera bindings
    this.camera.refreshBindings();

    // Refresh primitive bindings
    for (const primitive of this.allPrimitives) {
      primitive.refreshBindings();
    }

    // Evaluate collections
    this.bindingRegistry.refreshCollections();
  }

  // ==================== Ray Casting ====================

  /**
   * Cast a ray from pixel coordinates and find intersections
   */
  raycastFromPixel(px: number, py: number): Hit3D[] {
    const ray = this.camera.pixelToRay(px, py, this.width, this.height);
    return this.raycast(ray);
  }

  /**
   * Cast a ray from normalized device coordinates (-1 to 1)
   */
  raycastFromNDC(x: number, y: number): Hit3D[] {
    const ray = this.camera.screenToRay(x, y);
    return this.raycast(ray);
  }

  /**
   * Cast a ray and find all intersecting primitives
   */
  raycast(ray: Ray): Hit3D[] {
    const hits: Hit3D[] = [];

    for (const primitive of this.allPrimitives) {
      if (!primitive.visible || primitive.isPassthroughEnabled()) continue;

      const hit = primitive.intersectRay(ray);
      if (hit) {
        hits.push(hit);
      }
    }

    // Sort by distance (closest first)
    hits.sort((a, b) => a.distance - b.distance);

    return hits;
  }

  /**
   * Get the closest hit from a ray
   */
  raycastClosest(ray: Ray): Hit3D | null {
    const hits = this.raycast(ray);
    return hits.length > 0 ? hits[0] : null;
  }

  // ==================== Event Handling ====================

  /**
   * Handle click at pixel coordinates
   */
  async handleClick(px: number, py: number): Promise<void> {
    const hits = this.raycastFromPixel(px, py);

    if (hits.length > 0) {
      const hit = hits[0];
      const handler = hit.primitive.getClickHandler();
      if (handler) {
        await handler(hit);
      }
    }
  }

  /**
   * Handle mouse move at pixel coordinates
   */
  handleMouseMove(px: number, py: number): void {
    const hits = this.raycastFromPixel(px, py);
    const topHit = hits.length > 0 ? hits[0] : null;
    const topPrimitive = topHit?.primitive || null;

    // Handle hover leave
    if (this.hoveredPrimitive && this.hoveredPrimitive !== topPrimitive) {
      const leaveHandler = this.hoveredPrimitive.getHoverHandler();
      if (leaveHandler) {
        leaveHandler(null);
      }
    }

    // Handle hover enter
    if (topPrimitive && topPrimitive !== this.hoveredPrimitive) {
      const enterHandler = topPrimitive.getHoverHandler();
      if (enterHandler) {
        enterHandler(topHit!);
      }
    }

    // Update hover state
    this.hoveredPrimitive = topPrimitive;
  }

  // ==================== Cleanup ====================

  /**
   * Clear all primitives and lights
   */
  clear(): void {
    for (const primitive of this.allPrimitives) {
      primitive.dispose();
    }
    this.allPrimitives = [];
    this.primitivesById.clear();
    this.bindingRegistry.clear();
    this.lightManager.clear();
    this.hoveredPrimitive = null;
  }

  /**
   * Dispose the context
   */
  dispose(): void {
    this.clear();
  }
}

// ==================== Global Registry ====================

let contextRegistry: Cosyne3dContext[] = [];

/**
 * Factory function to create a Cosyne3d context
 */
export function cosyne3d(
  app: any,
  builder: (context: Cosyne3dContext) => void,
  options?: Cosyne3dContextOptions
): Cosyne3dContext {
  const context = new Cosyne3dContext(app, options);
  context.setBuilder(builder);
  registerCosyne3dContext(context);
  builder(context);
  return context;
}

/**
 * Register a Cosyne3d context in the global registry
 */
export function registerCosyne3dContext(context: Cosyne3dContext): void {
  if (!contextRegistry.includes(context)) {
    contextRegistry.push(context);
  }
}

/**
 * Unregister a Cosyne3d context
 */
export function unregisterCosyne3dContext(context: Cosyne3dContext): void {
  const index = contextRegistry.indexOf(context);
  if (index !== -1) {
    contextRegistry.splice(index, 1);
  }
}

/**
 * Refresh all registered Cosyne3d contexts
 */
export function refreshAllCosyne3dContexts(): void {
  for (const context of contextRegistry) {
    context.refreshBindings();
  }
}

/**
 * Rebuild all registered Cosyne3d contexts
 */
export function rebuildAllCosyne3dContexts(): void {
  for (const context of contextRegistry) {
    context.rebuild();
  }
}

/**
 * Clear all registered Cosyne3d contexts
 */
export function clearAllCosyne3dContexts(): void {
  for (const context of contextRegistry) {
    context.dispose();
  }
  contextRegistry = [];
}

/**
 * Get all registered contexts
 */
export function getAllCosyne3dContexts(): Cosyne3dContext[] {
  return [...contextRegistry];
}
