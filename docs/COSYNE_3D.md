# Cosyne 3D API Reference

Cosyne 3D extends Tsyne's declarative canvas primitives to 3D scene composition.

## Table of Contents

- [Core Classes](#core-classes)
- [Primitives](#primitives)
- [Materials](#materials)
- [Lighting](#lighting)
- [Camera](#camera)
- [Math Utilities](#math-utilities)
- [Context and Registry](#context-and-registry)

---

## Core Classes

### Cosyne3dContext

The main builder class for creating 3D scenes.

```typescript
class Cosyne3dContext {
  constructor(app: any, options?: Cosyne3dContextOptions);

  // Configuration
  getSceneId(): string;
  getWidth(): number;
  getHeight(): number;
  setSize(width: number, height: number): this;
  getBackgroundColor(): string;
  setBackgroundColor(color: string): this;

  // Primitive factories
  sphere(options?: SphereOptions): Sphere3D;
  box(options?: BoxOptions): Box3D;
  plane(options?: PlaneOptions): Plane3D;
  cylinder(options?: CylinderOptions): Cylinder3D;

  // Collection builders
  spheres<T>(): Collection3DBuilder<T, Sphere3D>;
  boxes<T>(): Collection3DBuilder<T, Box3D>;
  planes<T>(): Collection3DBuilder<T, Plane3D>;
  cylinders<T>(): Collection3DBuilder<T, Cylinder3D>;

  // Transforms
  transform(options: Transform3DOptions, builder: (ctx: Cosyne3dContext) => void): this;

  // Camera
  setCamera(options: CameraOptions): Camera;
  getCamera(): Camera;

  // Lights
  light(options: LightOptions): Light;
  getLightManager(): LightManager;
  getLights(): Light[];

  // Primitive management
  getPrimitiveById(id: string): Primitive3D | undefined;
  getAllPrimitives(): Primitive3D[];
  getVisiblePrimitives(): Primitive3D[];
  getStats(): SceneStats;

  // Bindings
  refreshBindings(): void;

  // Ray casting
  raycastFromPixel(px: number, py: number): Hit3D[];
  raycastFromNDC(x: number, y: number): Hit3D[];
  raycast(ray: Ray): Hit3D[];
  raycastClosest(ray: Ray): Hit3D | null;

  // Event handling
  handleClick(px: number, py: number): Promise<void>;
  handleMouseMove(px: number, py: number): void;

  // Cleanup
  clear(): void;
  dispose(): void;
}
```

### Cosyne3dContextOptions

```typescript
interface Cosyne3dContextOptions {
  width?: number;           // Canvas width (default: 800)
  height?: number;          // Canvas height (default: 600)
  backgroundColor?: string; // Background color (default: '#000000')
  antialias?: boolean;      // Enable antialiasing (default: true)
}
```

### Transform3DOptions

```typescript
interface Transform3DOptions {
  translate?: [number, number, number];
  rotate?: [number, number, number];  // Euler angles in radians
  scale?: [number, number, number] | number;
}
```

### SceneStats

```typescript
interface SceneStats {
  primitiveCount: number;
  lightCount: number;
  visibleCount: number;
}
```

### Hit3D

```typescript
interface Hit3D {
  distance: number;       // Distance from ray origin
  point: Vector3;         // World-space hit point
  normal: Vector3;        // Surface normal at hit point
  primitive: Primitive3D; // The primitive that was hit
  uv?: { u: number; v: number }; // Texture coordinates
  data?: any;             // Primitive-specific data (face, lat/lon, etc.)
}
```

---

## Primitives

### Primitive3D (Base Class)

```typescript
abstract class Primitive3D {
  // Identity
  withId(id: string): this;
  getId(): string | null;

  // Transform
  get position(): Vector3;
  set position(v: Vector3);
  setPosition(pos: [number, number, number] | { x: number; y: number; z: number }): this;

  get rotation(): Quaternion;
  set rotation(q: Quaternion);
  setRotation(euler: [number, number, number]): this;

  get scale(): Vector3;
  set scale(v: Vector3);
  setScale(s: number | [number, number, number]): this;

  translate(x: number, y: number, z: number): this;
  rotateX(angle: number): this;
  rotateY(angle: number): this;
  rotateZ(angle: number): this;
  lookAt(target: Vector3): this;

  // Material
  get material(): Material;
  setMaterial(props: MaterialProperties): this;

  // Visibility
  get visible(): boolean;
  setVisible(v: boolean): this;
  show(): this;
  hide(): this;

  // Shadows
  get castShadow(): boolean;
  setCastShadow(v: boolean): this;
  get receiveShadow(): boolean;
  setReceiveShadow(v: boolean): this;

  // Hierarchy
  get parent(): Primitive3D | null;
  get children(): Primitive3D[];
  add(child: Primitive3D): this;
  remove(child: Primitive3D): this;
  removeAll(): this;

  // Bindings
  bindPosition(fn: () => [number, number, number]): this;
  bindRotation(fn: () => [number, number, number]): this;
  bindScale(fn: () => number | [number, number, number]): this;
  bindMaterial(fn: () => MaterialProperties): this;
  bindVisible(fn: () => boolean): this;
  refreshBindings(): void;

  // Events
  onClick(handler: (hit: Hit3D) => void | Promise<void>): this;
  onHover(handler: (hit: Hit3D | null) => void): this;
  onDragStart(handler: (hit: Hit3D) => void): this;
  onDrag(handler: (hit: Hit3D) => void): this;
  onDragEnd(handler: () => void): this;
  passthrough(enabled?: boolean): this;

  // Hit testing
  abstract intersectRay(ray: Ray): Hit3D | null;
  getLocalBoundingBox(): Box3;
  getWorldBoundingBox(): Box3;

  // World transforms
  getWorldMatrix(): Matrix4;
  getWorldPosition(): Vector3;

  // Serialization
  getProperties(): Record<string, any>;
  clone(): Primitive3D;
  dispose(): void;
}
```

### Sphere3D

```typescript
class Sphere3D extends Primitive3D {
  constructor(options?: SphereOptions);

  get radius(): number;
  set radius(v: number);
  setRadius(r: number): this;
  bindRadius(fn: () => number): this;

  get widthSegments(): number;
  set widthSegments(v: number);
  get heightSegments(): number;
  set heightSegments(v: number);

  getPointOnSurface(lat: number, lon: number): Vector3;
  getNormalAtSurface(lat: number, lon: number): Vector3;
}

interface SphereOptions extends Primitive3DOptions {
  radius?: number;          // Default: 1
  widthSegments?: number;   // Default: 32
  heightSegments?: number;  // Default: 16
}

// Factory function
function sphere(options?: SphereOptions): Sphere3D;
```

### Box3D

```typescript
class Box3D extends Primitive3D {
  constructor(options?: BoxOptions);

  get width(): number;
  set width(v: number);
  get height(): number;
  set height(v: number);
  get depth(): number;
  set depth(v: number);

  setSize(size: number | [number, number, number]): this;
  bindSize(fn: () => number | [number, number, number]): this;

  getFaceVertices(face: BoxFace): Vector3[];
  getFaceCenter(face: BoxFace): Vector3;
}

type BoxFace = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right';

interface BoxOptions extends Primitive3DOptions {
  size?: number | [number, number, number];
  width?: number;   // Default: 1
  height?: number;  // Default: 1
  depth?: number;   // Default: 1
}

// Factory functions
function box(options?: BoxOptions): Box3D;
function cube(size: number, options?: Omit<BoxOptions, 'size'>): Box3D;
```

### Plane3D

```typescript
class Plane3D extends Primitive3D {
  constructor(options?: PlaneOptions);

  get width(): number;
  set width(v: number);
  get height(): number;
  set height(v: number);

  setSize(size: number | [number, number]): this;
  bindSize(fn: () => number | [number, number]): this;

  getCorners(): Vector3[];
  getWorldNormal(): Vector3;
}

interface PlaneOptions extends Primitive3DOptions {
  size?: number | [number, number];
  width?: number;           // Default: 10
  height?: number;          // Default: 10
  widthSegments?: number;   // Default: 1
  heightSegments?: number;  // Default: 1
}

// Factory functions
function plane(options?: PlaneOptions): Plane3D;
function ground(size?: number, options?: PlaneOptions): Plane3D;
```

### Cylinder3D

```typescript
class Cylinder3D extends Primitive3D {
  constructor(options?: CylinderOptions);

  get radiusTop(): number;
  set radiusTop(v: number);
  get radiusBottom(): number;
  set radiusBottom(v: number);
  get height(): number;
  set height(v: number);
  get openEnded(): boolean;
  set openEnded(v: boolean);

  setRadius(r: number): this;
  setHeight(h: number): this;
  bindRadius(fn: () => number): this;
  bindHeight(fn: () => number): this;
}

interface CylinderOptions extends Primitive3DOptions {
  radius?: number;          // Sets both radiusTop and radiusBottom
  radiusTop?: number;       // Default: 1
  radiusBottom?: number;    // Default: 1
  height?: number;          // Default: 2
  radialSegments?: number;  // Default: 32
  heightSegments?: number;  // Default: 1
  openEnded?: boolean;      // Default: false
}

// Factory functions
function cylinder(options?: CylinderOptions): Cylinder3D;
function cone(radius: number, height: number, options?: CylinderOptions): Cylinder3D;
```

---

## Materials

### Material

```typescript
class Material {
  constructor(props?: MaterialProperties);

  get color(): string;
  set color(v: string);
  get shininess(): number;
  set shininess(v: number);
  get opacity(): number;
  set opacity(v: number);
  get emissive(): string;
  set emissive(v: string);
  get transparent(): boolean;
  get wireframe(): boolean;
  set wireframe(v: boolean);
  get flatShading(): boolean;
  set flatShading(v: boolean);
  get doubleSided(): boolean;
  set doubleSided(v: boolean);

  setProperties(props: MaterialProperties): void;
  toProperties(): MaterialProperties;
  clone(): Material;
}

interface MaterialProperties {
  color?: string;         // Hex color (default: '#888888')
  shininess?: number;     // 0-100 (default: 30)
  opacity?: number;       // 0-1 (default: 1)
  emissive?: string;      // Emissive color (default: '#000000')
  wireframe?: boolean;    // Wireframe mode (default: false)
  flatShading?: boolean;  // Flat shading (default: false)
  doubleSided?: boolean;  // Double-sided (default: false)
}
```

### Preset Materials

```typescript
const Materials = {
  red(): MaterialProperties;
  green(): MaterialProperties;
  blue(): MaterialProperties;
  white(): MaterialProperties;
  black(): MaterialProperties;
  gold(): MaterialProperties;
  silver(): MaterialProperties;
  copper(): MaterialProperties;
  glass(): MaterialProperties;    // Transparent
  rubber(): MaterialProperties;   // Matte
  chrome(): MaterialProperties;   // Reflective
  plastic(): MaterialProperties;
  wood(): MaterialProperties;
  emissive(color: string): MaterialProperties;
  wireframe(color?: string): MaterialProperties;
};
```

---

## Lighting

### Light Types

```typescript
type LightOptions =
  | AmbientLightOptions
  | DirectionalLightOptions
  | PointLightOptions
  | SpotLightOptions;

interface BaseLightOptions {
  color?: string;     // Default: '#ffffff'
  intensity?: number; // Default: 1.0
  castShadow?: boolean;
}

interface AmbientLightOptions extends BaseLightOptions {
  type: 'ambient';
}

interface DirectionalLightOptions extends BaseLightOptions {
  type: 'directional';
  direction?: [number, number, number]; // Default: [0, -1, 0]
}

interface PointLightOptions extends BaseLightOptions {
  type: 'point';
  position?: [number, number, number];
  range?: number;     // Default: Infinity
  decay?: number;     // Default: 2
}

interface SpotLightOptions extends BaseLightOptions {
  type: 'spot';
  position?: [number, number, number];
  direction?: [number, number, number];
  innerAngle?: number; // Radians, default: 0.3
  outerAngle?: number; // Radians, default: 0.5
  range?: number;
}
```

### Light Classes

```typescript
abstract class Light {
  get color(): string;
  set color(v: string);
  get intensity(): number;
  set intensity(v: number);
  get enabled(): boolean;
  set enabled(v: boolean);

  abstract calculateIntensityAt(point: Vector3, normal: Vector3): number;
}

class AmbientLight extends Light { }
class DirectionalLight extends Light {
  get direction(): Vector3;
}
class PointLight extends Light {
  get position(): Vector3;
}
class SpotLight extends Light {
  get position(): Vector3;
  get direction(): Vector3;
}
```

### LightManager

```typescript
class LightManager {
  addLight(light: Light): void;
  removeLight(light: Light): void;
  getLights(): Light[];
  getAmbientLights(): AmbientLight[];
  getDirectionalLights(): DirectionalLight[];
  getPointLights(): PointLight[];
  getSpotLights(): SpotLight[];
  clear(): void;
}
```

---

## Camera

```typescript
class Camera {
  constructor(options?: CameraOptions);

  // Properties
  get position(): Vector3;
  set position(v: Vector3);
  get lookAt(): Vector3;
  set lookAt(v: Vector3);
  get up(): Vector3;
  set up(v: Vector3);
  get fov(): number;
  set fov(v: number);
  get aspect(): number;
  set aspect(v: number);
  get near(): number;
  set near(v: number);
  get far(): number;
  set far(v: number);
  get projection(): 'perspective' | 'orthographic';

  // Matrices
  getViewMatrix(): Matrix4;
  getProjectionMatrix(): Matrix4;

  // Ray generation
  screenToRay(ndcX: number, ndcY: number): Ray;
  pixelToRay(px: number, py: number, width: number, height: number): Ray;

  // Movement
  orbit(deltaX: number, deltaY: number): void;
  zoom(delta: number): void;
  pan(deltaX: number, deltaY: number): void;

  // Bindings
  bindPosition(fn: () => [number, number, number]): this;
  bindLookAt(fn: () => [number, number, number]): this;
  refreshBindings(): void;
}

interface CameraOptions {
  projection?: 'perspective' | 'orthographic';
  fov?: number;       // Field of view in degrees (default: 60)
  aspect?: number;    // Aspect ratio (default: 1)
  near?: number;      // Near clip (default: 0.1)
  far?: number;       // Far clip (default: 1000)
  position?: [number, number, number];
  lookAt?: [number, number, number];
  up?: [number, number, number];
  orthoSize?: number; // For orthographic projection
}
```

---

## Math Utilities

### Vector3

```typescript
class Vector3 {
  constructor(x?: number, y?: number, z?: number);

  x: number;
  y: number;
  z: number;

  // Static constructors
  static zero(): Vector3;
  static one(): Vector3;
  static up(): Vector3;
  static down(): Vector3;
  static right(): Vector3;
  static left(): Vector3;
  static forward(): Vector3;
  static back(): Vector3;
  static fromArray(arr: [number, number, number]): Vector3;

  // Arithmetic
  add(v: Vector3): Vector3;
  sub(v: Vector3): Vector3;
  multiply(v: Vector3): Vector3;
  multiplyScalar(s: number): Vector3;
  divide(v: Vector3): Vector3;
  divideScalar(s: number): Vector3;
  negate(): Vector3;

  // Operations
  dot(v: Vector3): number;
  cross(v: Vector3): Vector3;
  length(): number;
  lengthSquared(): number;
  normalize(): Vector3;
  distanceTo(v: Vector3): number;
  lerp(v: Vector3, t: number): Vector3;
  clamp(min: Vector3, max: Vector3): Vector3;

  // Transforms
  applyMatrix4(m: Matrix4): Vector3;
  applyQuaternion(q: Quaternion): Vector3;

  // Comparison
  equals(v: Vector3): boolean;

  // Conversion
  toArray(): [number, number, number];
  clone(): Vector3;
}
```

### Matrix4

```typescript
class Matrix4 {
  elements: number[]; // Column-major 16-element array

  // Static constructors
  static identity(): Matrix4;
  static translation(x: number, y: number, z: number): Matrix4;
  static rotationX(angle: number): Matrix4;
  static rotationY(angle: number): Matrix4;
  static rotationZ(angle: number): Matrix4;
  static scaling(x: number, y: number, z: number): Matrix4;
  static lookAt(eye: Vector3, target: Vector3, up: Vector3): Matrix4;
  static perspective(fov: number, aspect: number, near: number, far: number): Matrix4;
  static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4;
  static fromQuaternion(q: Quaternion): Matrix4;

  // Operations
  multiply(m: Matrix4): Matrix4;
  invert(): Matrix4;
  transpose(): Matrix4;
  determinant(): number;
  extractRotation(): Matrix4;

  clone(): Matrix4;
}
```

### Quaternion

```typescript
class Quaternion {
  constructor(x?: number, y?: number, z?: number, w?: number);

  x: number;
  y: number;
  z: number;
  w: number;

  // Static constructors
  static identity(): Quaternion;
  static fromAxisAngle(axis: Vector3, angle: number): Quaternion;
  static fromEuler(x: number, y: number, z: number): Quaternion;
  static fromMatrix4(m: Matrix4): Quaternion;

  // Operations
  multiply(q: Quaternion): Quaternion;
  conjugate(): Quaternion;
  inverse(): Quaternion;
  normalize(): Quaternion;
  slerp(q: Quaternion, t: number): Quaternion;

  // Conversion
  toEuler(): { x: number; y: number; z: number };
  toMatrix4(): Matrix4;

  length(): number;
  clone(): Quaternion;
}
```

### Ray

```typescript
class Ray {
  constructor(origin: Vector3, direction: Vector3);

  origin: Vector3;
  direction: Vector3;

  at(t: number): Vector3;
  closestPointToPoint(point: Vector3): Vector3;
  distanceToPoint(point: Vector3): number;
  applyMatrix4(m: Matrix4): Ray;
  clone(): Ray;
}
```

### Box3

```typescript
class Box3 {
  constructor(min?: Vector3, max?: Vector3);

  min: Vector3;
  max: Vector3;

  static empty(): Box3;
  static fromCenterAndSize(center: Vector3, size: Vector3): Box3;

  isEmpty(): boolean;
  getCenter(): Vector3;
  getSize(): Vector3;
  containsPoint(point: Vector3): boolean;
  containsBox(box: Box3): boolean;
  intersectsBox(box: Box3): boolean;
  expandByPoint(point: Vector3): this;
  expandByScalar(scalar: number): this;
  union(box: Box3): Box3;
  intersection(box: Box3): Box3;
  applyMatrix4(m: Matrix4): Box3;
  clone(): Box3;
}
```

---

## Context and Registry

### Global Functions

```typescript
// Create a scene
function cosyne3d(
  app: any,
  builder: (context: Cosyne3dContext) => void,
  options?: Cosyne3dContextOptions
): Cosyne3dContext;

// Registry management
function registerCosyne3dContext(context: Cosyne3dContext): void;
function unregisterCosyne3dContext(context: Cosyne3dContext): void;
function getAllCosyne3dContexts(): Cosyne3dContext[];

// Global refresh/rebuild
function refreshAllCosyne3dContexts(): void;  // Update bindings
function rebuildAllCosyne3dContexts(): void;  // Full rebuild
function clearAllCosyne3dContexts(): void;    // Dispose all
```

### Collection Builder

```typescript
interface Collection3DBuilder<T, P extends Primitive3D> {
  bindTo(options: CollectionBindingOptions<T, P>): Collection3DBuilder<T, P>;
  evaluate(): P[];
  getItems(): P[];
}

interface CollectionBindingOptions<T, P> {
  items: () => T[];
  render: (item: T, index: number) => P;
  trackBy: (item: T, index: number) => string | number;
}
```
