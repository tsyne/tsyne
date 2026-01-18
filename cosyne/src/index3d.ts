/**
 * Cosyne 3D - Declarative 3D Scene Graphs
 *
 * Extends Cosyne's 2D canvas primitives to 3D with the same fluent API,
 * maintaining the pseudo-declarative style.
 *
 * @example
 * ```typescript
 * import { cosyne3d, refreshAllCosyne3dContexts } from 'tsyne';
 *
 * cosyne3d(a, (c) => {
 *   // 3D primitives with fluent API
 *   c.sphere({ radius: 50, position: [0, 0, 0] })
 *     .setMaterial({ color: '#ff0000', shininess: 0.8 })
 *     .bindRotation(() => ({ y: state.angle }))
 *     .onClick((hit) => selectPlanet(hit.data?.lat, hit.data?.lon))
 *     .withId('sun');
 *
 *   c.box({ size: [10, 10, 10] })
 *     .bindPosition(() => state.playerPos)
 *     .setCastShadow(true)
 *     .withId('player');
 *
 *   // Lighting
 *   c.light({ type: 'directional', direction: [1, -1, 1], intensity: 0.8 });
 *   c.light({ type: 'ambient', intensity: 0.3 });
 *
 *   // Camera
 *   c.setCamera({ fov: 60, near: 0.1, far: 1000 })
 *     .setPosition([0, 20, 100])
 *     .bindLookAt(() => state.target);
 *
 *   // Collections
 *   c.spheres().bindTo({
 *     items: () => state.planets,
 *     trackBy: (p) => p.id,
 *     render: (p) => c.sphere({
 *       position: p.position,
 *       radius: p.radius,
 *       material: { color: p.color }
 *     })
 *   });
 *
 *   // Transforms (nested coordinate systems)
 *   c.transform({ translate: [50, 0, 0], rotate: [0, state.orbitAngle, 0] }, (inner) => {
 *     inner.sphere({ radius: 10, position: [30, 0, 0] })
 *       .setMaterial({ color: '#0088ff' })
 *       .withId('orbiting-moon');
 *   });
 * });
 *
 * // After state changes, refresh bindings
 * state.angle += 0.01;
 * refreshAllCosyne3dContexts();
 * ```
 */

// Context and factory
export {
  Cosyne3dContext,
  Cosyne3dContextOptions,
  Transform3DOptions,
  SceneStats,
  Collection3DBuilder,
  cosyne3d,
  registerCosyne3dContext,
  unregisterCosyne3dContext,
  refreshAllCosyne3dContexts,
  rebuildAllCosyne3dContexts,
  clearAllCosyne3dContexts,
  getAllCosyne3dContexts,
} from './context3d';

// 3D Primitives
export {
  // Base class
  Primitive3D,
  Primitive3DOptions,
  Position3D,
  Rotation3D,
  Scale3D,
  Hit3D,
  Primitive3DEventHandlers,

  // Sphere
  Sphere3D,
  SphereOptions,
  sphere,

  // Box
  Box3D,
  BoxOptions,
  box,
  cube,

  // Plane
  Plane3D,
  PlaneOptions,
  plane,
  ground,

  // Cylinder
  Cylinder3D,
  CylinderOptions,
  cylinder,
  cone,
} from './primitives3d';

// Camera
export {
  Camera,
  CameraOptions,
  CameraProjection,
} from './camera';

// Lights
export {
  Light,
  LightType,
  LightOptions,
  BaseLightOptions,
  DirectionalLight,
  DirectionalLightOptions,
  PointLight,
  PointLightOptions,
  AmbientLight,
  AmbientLightOptions,
  SpotLight,
  SpotLightOptions,
  createLight,
  LightManager,
} from './light';

// Materials
export {
  Material,
  MaterialProperties,
  ColorRGBA,
  parseColor,
  colorToHex,
  lerpColor,
  applyLighting,
  calculateSpecular,
  Materials,
} from './material';

// 3D Math
export {
  Vector3,
  Matrix4,
  Quaternion,
  Ray,
  Box3,
  degToRad,
  radToDeg,
  clamp,
  lerp,
} from './math3d';
