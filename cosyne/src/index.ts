/**
 * Cosyne - Declarative Canvas Grammar for Tsyne
 *
 * A pseudo-declarative canvas library with data binding and reactive updates.
 */

export { CosyneContext, cosyne, registerCosyneContext, refreshAllCosyneContexts, clearAllCosyneContexts } from './context';
export { Binding, BindingRegistry, PositionBinding, BindingFunction, CollectionBinding, CollectionBindingOptions } from './binding';
export * from './primitives';
export { SphericalProjection, IsometricProjection, Graticule, type Projection, type Point3D, type Point2D, type RotationAngles } from './projections';
export { TransformMatrix, TransformStack, type TransformOptions } from './transforms';
export { ForeignObject, ForeignObjectCollection, type ForeignOptions } from './foreign';
export { EventRouter, DefaultHitTesters, type HitTester, type HitTestResult } from './events';
export { enableEventHandling, disableEventHandling, getEventRouter, type EventHandlingOptions } from './event-router-integration';
export {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
  getEasingFunction,
  interpolate,
  interpolateColor,
  type EasingFunction,
} from './easing';
export {
  Animation,
  KeyframeAnimation,
  type AnimationState,
  type AnimationControl,
  type AnimationOptions,
  type Keyframe,
} from './animation';
export { AnimationManager } from './animation-manager';
