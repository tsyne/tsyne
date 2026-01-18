/**
 * Cosyne - Declarative Canvas Grammar for Tsyne
 *
 * A pseudo-declarative canvas library with data binding and reactive updates.
 */

export { CosyneContext, cosyne, registerCosyneContext, refreshAllCosyneContexts, rebuildAllCosyneContexts, clearAllCosyneContexts } from './context';
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
export {
  LinearScale,
  LogScale,
  SqrtScale,
  PowerScale,
  OrdinalScale,
  scale,
  type ScaleType,
  type ScaleDomain,
  type LinearScaleOptions,
  type OrdinalScaleOptions,
} from './scales';
export { Axis, GridLines, type AxisOptions, type AxisOrientation, type AnyScale } from './axes';
export {
  LineChart,
  MultiLineChart,
  type InterpolationType,
  type LineChartPoint,
  type LineChartOptions,
} from './line-chart';
export {
  ZoomPan,
  Brush,
  type ZoomPanState,
  type ZoomPanOptions,
  type BrushExtent,
  type BrushOptions,
} from './zoom-pan';
export {
  Particle,
  Emitter,
  ParticleSystem,
  type Vector2D,
  type ParticleOptions,
  type EmitterOptions,
} from './particle-system';
export {
  MarkerRenderer,
  MarkerAnchor,
  CUSTOM_MARKERS,
  isCustomMarker,
  type BuiltInMarkerType,
  type CustomMarker,
  type MarkerType,
  type MarkerConfig,
} from './markers';
export {
  EffectRenderer,
  EffectsAnchor,
  type DropShadowOptions,
  type GlowOptions,
  type TextShadowOptions,
  type TextStrokeOptions,
  type TextGlowOptions,
} from './effects';
export {
  LinearGradient,
  RadialGradient,
  PRESET_GRADIENTS,
  createGradient,
  type ColorStop,
} from './gradients';
export {
  ClippingRegion,
  ClippingUtils,
  type ClippingShape,
  type CircleClip,
  type RectClip,
  type PolygonClip,
  type PathClip,
  type ClipPath,
} from './clipping';

// Cosyne 3D exports
export * from './index3d';
