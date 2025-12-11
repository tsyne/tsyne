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

export interface AnimateOptions {
  ms: number;
  ease?: EasingType;
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
  private easing: EasingType;
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
      this.easing = 'inOut';
      this.delayMs = 0;
    } else {
      this.duration = options.ms;
      this.easing = options.ease || 'inOut';
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
      const progress = easings[this.easing](rawProgress);

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
