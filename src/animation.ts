/**
 * Tsyne Animation System
 *
 * Provides a terse, D3-inspired animation API for canvas objects.
 *
 * Usage:
 *   line.to({ alpha: 0 }, 500);
 *   line.to({ alpha: 0, y: 100 }, { ms: 500, ease: 'inOut' });
 *   line.to({ y: 100 }, 200).to({ alpha: 0 }, 300);
 */

export type EasingType = 'linear' | 'inOut' | 'in' | 'out' | 'elastic' | 'bounce';

// Custom easing function type
export type EasingFunction = (t: number) => number;

// Can pass either a named easing or a custom function
export type EasingSpec = EasingType | EasingFunction;

export interface AnimateOptions {
  ms: number;
  ease?: EasingSpec;
  delay?: number;
  onEnd?: () => void;
}

export interface AnimationFrame {
  progress: number;  // 0..1
  elapsed: number;   // ms since start
  value: Record<string, number>;  // current interpolated values
}

type FrameCallback = (frame: AnimationFrame) => void;

// Easing functions
const easings: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => t * (2 - t),
  inOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
};

// ============================================================================
// Cubic Bezier Easing - CSS cubic-bezier(x1, y1, x2, y2) style
// ============================================================================

/**
 * Creates a cubic-bezier easing function like CSS cubic-bezier(x1, y1, x2, y2).
 * Control points P0=(0,0) and P3=(1,1) are implicit.
 *
 * Usage:
 *   const ease = cubicBezier(0.42, 0, 0.58, 1);  // ease-in-out
 *   circle.to({ x: 100 }, { ms: 500, ease });
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  // Pre-calculate polynomial coefficients for the bezier curve
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  // Sample x(t) - the x coordinate at parameter t
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;

  // Sample y(t) - the y coordinate at parameter t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;

  // Derivative of x(t)
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  // Find t for a given x using Newton-Raphson iteration
  const solveForT = (x: number): number => {
    // Initial guess using linear interpolation
    let t = x;

    // Newton-Raphson iteration (usually converges in 4-5 iterations)
    for (let i = 0; i < 8; i++) {
      const xEst = sampleX(t) - x;
      if (Math.abs(xEst) < 1e-6) return t;

      const deriv = sampleDerivX(t);
      if (Math.abs(deriv) < 1e-6) break;

      t -= xEst / deriv;
    }

    // Fall back to binary search if Newton-Raphson fails
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const xEst = sampleX(t);
      if (Math.abs(xEst - x) < 1e-6) return t;
      if (x > xEst) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveForT(x));
  };
}

// Common CSS easing presets as cubic-bezier curves
export const bezier = {
  // CSS named easings
  ease: cubicBezier(0.25, 0.1, 0.25, 1),
  easeIn: cubicBezier(0.42, 0, 1, 1),
  easeOut: cubicBezier(0, 0, 0.58, 1),
  easeInOut: cubicBezier(0.42, 0, 0.58, 1),

  // Material Design / standard curves
  standard: cubicBezier(0.4, 0, 0.2, 1),
  decelerate: cubicBezier(0, 0, 0.2, 1),
  accelerate: cubicBezier(0.4, 0, 1, 1),

  // Dramatic curves
  snappy: cubicBezier(0.5, 0, 0.1, 1),
  overshoot: cubicBezier(0.34, 1.56, 0.64, 1),
  anticipate: cubicBezier(0.68, -0.55, 0.265, 1.55),

  // Sine curves
  inSine: cubicBezier(0.47, 0, 0.745, 0.715),
  outSine: cubicBezier(0.39, 0.575, 0.565, 1),
  inOutSine: cubicBezier(0.445, 0.05, 0.55, 0.95),

  // Quad curves
  inQuad: cubicBezier(0.55, 0.085, 0.68, 0.53),
  outQuad: cubicBezier(0.25, 0.46, 0.45, 0.94),
  inOutQuad: cubicBezier(0.455, 0.03, 0.515, 0.955),

  // Cubic curves
  inCubic: cubicBezier(0.55, 0.055, 0.675, 0.19),
  outCubic: cubicBezier(0.215, 0.61, 0.355, 1),
  inOutCubic: cubicBezier(0.645, 0.045, 0.355, 1),

  // Expo curves
  inExpo: cubicBezier(0.95, 0.05, 0.795, 0.035),
  outExpo: cubicBezier(0.19, 1, 0.22, 1),
  inOutExpo: cubicBezier(1, 0, 0, 1),

  // Back curves (with overshoot)
  inBack: cubicBezier(0.6, -0.28, 0.735, 0.045),
  outBack: cubicBezier(0.175, 0.885, 0.32, 1.275),
  inOutBack: cubicBezier(0.68, -0.55, 0.265, 1.55),
};

/**
 * Calculates the coordinates of a point on a Bezier curve of any degree.
 *
 * @param points An array of control points {x, y}. The degree of the curve is `points.length - 1`.
 * @param t The interpolation parameter, from 0 to 1.
 * @returns The {x, y} coordinates of the point on the curve.
 */
export function getPointOnBezier(
  points: { x: number; y: number }[],
  t: number
): { x: number; y: number } {
  if (!points || points.length === 0) {
    return { x: 0, y: 0 };
  }

  let interpolated = points;
  while (interpolated.length > 1) {
    const newPoints = [];
    for (let i = 0; i < interpolated.length - 1; i++) {
      const x = (1 - t) * interpolated[i].x + t * interpolated[i + 1].x;
      const y = (1 - t) * interpolated[i].y + t * interpolated[i + 1].y;
      newPoints.push({ x, y });
    }
    interpolated = newPoints;
  }
  return interpolated[0];
}

/** Helper to resolve easing spec to function */
function resolveEasing(ease: EasingSpec): EasingFunction {
  if (typeof ease === 'function') return ease;
  return easings[ease] || easings.inOut;
}

/**
 * Interpolate between two values
 */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Parse color string to RGBA components
 */
function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 255
      };
    } else if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16)
      };
    }
  }
  return null;
}

/**
 * Convert RGBA to hex string
 */
function toHexColor(r: number, g: number, b: number, a: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
}

/**
 * Animation instance - returned by .to() for chaining
 */
export class Animation {
  private target: Animatable;
  private from: Record<string, any> = {};
  private toValues: Record<string, any>;
  private duration: number;
  private easingFn: EasingFunction;
  private delayMs: number;
  private onEndCallback?: () => void;
  private frameCallback?: FrameCallback;
  private startTime: number = 0;
  private started: boolean = false;
  private completed: boolean = false;
  private nextAnimation?: Animation;
  private tickerStop?: () => void;

  constructor(
    target: Animatable,
    toValues: Record<string, any>,
    options: number | AnimateOptions,
    frameCallback?: FrameCallback
  ) {
    this.target = target;
    this.toValues = toValues;
    this.frameCallback = frameCallback;

    if (typeof options === 'number') {
      this.duration = options;
      this.easingFn = easings.inOut;
      this.delayMs = 0;
    } else {
      this.duration = options.ms;
      this.easingFn = resolveEasing(options.ease || 'inOut');
      this.delayMs = options.delay || 0;
      this.onEndCallback = options.onEnd;
    }
  }

  /**
   * Chain another animation after this one
   */
  to(
    toValues: Record<string, any>,
    options: number | AnimateOptions,
    frameCallback?: FrameCallback
  ): Animation {
    this.nextAnimation = new Animation(this.target, toValues, options, frameCallback);
    return this.nextAnimation;
  }

  /**
   * Start the animation
   */
  start(ticker: (ms: number, callback: () => void) => () => void): void {
    // Capture starting values
    this.from = this.target.getAnimatableValues();

    this.tickerStop = ticker(16, () => {
      if (!this.started) {
        this.startTime = Date.now();
        this.started = true;
      }

      const elapsed = Date.now() - this.startTime;

      // Handle delay
      if (elapsed < this.delayMs) {
        return;
      }

      const animElapsed = elapsed - this.delayMs;
      const rawProgress = Math.min(1, animElapsed / this.duration);
      const progress = this.easingFn(rawProgress);

      // Interpolate values
      const currentValues: Record<string, any> = {};
      for (const key of Object.keys(this.toValues)) {
        const fromVal = this.from[key];
        const toVal = this.toValues[key];

        if (typeof fromVal === 'number' && typeof toVal === 'number') {
          currentValues[key] = lerp(fromVal, toVal, progress);
        } else if (typeof fromVal === 'string' && typeof toVal === 'string') {
          // Color interpolation
          const fromColor = parseColor(fromVal);
          const toColor = parseColor(toVal);
          if (fromColor && toColor) {
            currentValues[key] = toHexColor(
              lerp(fromColor.r, toColor.r, progress),
              lerp(fromColor.g, toColor.g, progress),
              lerp(fromColor.b, toColor.b, progress),
              lerp(fromColor.a, toColor.a, progress)
            );
          }
        }
      }

      // Apply values
      this.target.applyAnimatedValues(currentValues);

      // Call frame callback if provided
      if (this.frameCallback) {
        this.frameCallback({
          progress,
          elapsed: animElapsed,
          value: currentValues
        });
      }

      // Check completion
      if (rawProgress >= 1 && !this.completed) {
        this.completed = true;
        if (this.tickerStop) {
          this.tickerStop();
        }
        if (this.onEndCallback) {
          this.onEndCallback();
        }
        // Start next animation in chain
        if (this.nextAnimation) {
          this.nextAnimation.start(ticker);
        }
      }
    });
  }

  /**
   * Stop the animation
   */
  stop(): void {
    if (this.tickerStop) {
      this.tickerStop();
    }
  }
}

/**
 * Interface for animatable objects
 */
export interface Animatable {
  getAnimatableValues(): Record<string, any>;
  applyAnimatedValues(values: Record<string, any>): void;
  to(
    toValues: Record<string, any>,
    options: number | AnimateOptions,
    frameCallback?: FrameCallback
  ): Animation;
}

/**
 * Mixin to add animation capabilities to canvas objects
 */
export function makeAnimatable<T extends { update: (values: any) => Promise<void> }>(
  obj: T,
  getCurrentValues: () => Record<string, any>,
  ticker: (ms: number, callback: () => void) => () => void
): T & Animatable {
  const animatable = obj as T & Animatable;

  animatable.getAnimatableValues = getCurrentValues;

  animatable.applyAnimatedValues = (values: Record<string, any>) => {
    obj.update(values);
  };

  animatable.to = (
    toValues: Record<string, any>,
    options: number | AnimateOptions,
    frameCallback?: FrameCallback
  ): Animation => {
    const animation = new Animation(animatable, toValues, options, frameCallback);
    animation.start(ticker);
    return animation;
  };

  return animatable;
}

/**
 * Sugar methods for common animations
 */
export interface AnimationSugar {
  fadeOut(ms: number): Animation;
  fadeIn(ms: number): Animation;
  moveTo(x: number, y: number, ms: number): Animation;
}

export function addAnimationSugar<T extends Animatable>(obj: T): T & AnimationSugar {
  const withSugar = obj as T & AnimationSugar;

  withSugar.fadeOut = (ms: number) => obj.to({ alpha: 0 }, ms);
  withSugar.fadeIn = (ms: number) => obj.to({ alpha: 1 }, ms);
  withSugar.moveTo = (x: number, y: number, ms: number) => obj.to({ x, y }, ms);

  return withSugar;
}
