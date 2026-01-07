/**
 * Easing functions for animations
 *
 * Standard easing curves used across animation libraries.
 * All functions take a normalized time value [0, 1] and return [0, 1]
 */

export type EasingFunction = (t: number) => number;

/**
 * Linear interpolation (no easing)
 */
export const linear: EasingFunction = (t: number): number => t;

/**
 * Quadratic easing
 */
export const easeInQuad: EasingFunction = (t: number): number => t * t;
export const easeOutQuad: EasingFunction = (t: number): number => t * (2 - t);
export const easeInOutQuad: EasingFunction = (t: number): number =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

/**
 * Cubic easing
 */
export const easeInCubic: EasingFunction = (t: number): number => t * t * t;
export const easeOutCubic: EasingFunction = (t: number): number =>
  (--t) * t * t + 1;
export const easeInOutCubic: EasingFunction = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * (t - 2)) * (2 * (t - 2)) + 1;

/**
 * Quartic easing
 */
export const easeInQuart: EasingFunction = (t: number): number =>
  t * t * t * t;
export const easeOutQuart: EasingFunction = (t: number): number =>
  1 - (--t) * t * t * t;
export const easeInOutQuart: EasingFunction = (t: number): number =>
  t < 0.5
    ? 8 * t * t * t * t
    : 1 - 8 * (--t) * t * t * t;

/**
 * Quintic easing
 */
export const easeInQuint: EasingFunction = (t: number): number =>
  t * t * t * t * t;
export const easeOutQuint: EasingFunction = (t: number): number =>
  1 + (--t) * t * t * t * t;
export const easeInOutQuint: EasingFunction = (t: number): number =>
  t < 0.5
    ? 16 * t * t * t * t * t
    : 1 + 16 * (--t) * t * t * t * t;

/**
 * Sinusoidal easing
 */
export const easeInSine: EasingFunction = (t: number): number =>
  1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFunction = (t: number): number =>
  Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFunction = (t: number): number =>
  -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Exponential easing
 */
export const easeInExpo: EasingFunction = (t: number): number =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10);
export const easeOutExpo: EasingFunction = (t: number): number =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeInOutExpo: EasingFunction = (t: number): number =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;

/**
 * Circular easing
 */
export const easeInCirc: EasingFunction = (t: number): number =>
  1 - Math.sqrt(1 - Math.pow(t, 2));
export const easeOutCirc: EasingFunction = (t: number): number =>
  Math.sqrt(1 - Math.pow(t - 1, 2));
export const easeInOutCirc: EasingFunction = (t: number): number =>
  t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

/**
 * Elastic easing (spring-like oscillation)
 */
const c4 = (2 * Math.PI) / 3;
const c5 = (2 * Math.PI) / 4.5;

export const easeInElastic: EasingFunction = (t: number): number =>
  t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);

export const easeOutElastic: EasingFunction = (t: number): number =>
  t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;

export const easeInOutElastic: EasingFunction = (t: number): number =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;

/**
 * Back easing (slight overshoot)
 */
const c1 = 1.70158;
const c2 = c1 + 1;
const c3 = c1 + 1;

export const easeInBack: EasingFunction = (t: number): number =>
  c2 * t * t * t - c1 * t * t;

export const easeOutBack: EasingFunction = (t: number): number =>
  1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);

export const easeInOutBack: EasingFunction = (t: number): number => {
  const c5 = (c1 + 1) * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c5 + 1) * 2 * t - c5)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c5 + 1) * (t * 2 - 2) + c5) + 2) / 2;
};

/**
 * Bounce easing (bouncy effect)
 */
const c4_bounce = (2 * Math.PI) / 3;

export const easeOutBounce: EasingFunction = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const easeInBounce: EasingFunction = (t: number): number =>
  1 - easeOutBounce(1 - t);

export const easeInOutBounce: EasingFunction = (t: number): number =>
  t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2;

/**
 * Get easing function by name
 * Useful for string-based configuration
 */
export function getEasingFunction(name: string): EasingFunction {
  const easings: Record<string, EasingFunction> = {
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
  };

  return easings[name] || linear;
}

/**
 * Interpolate between two numbers with easing
 */
export function interpolate(
  from: number,
  to: number,
  t: number,
  easing: EasingFunction = linear
): number {
  return from + (to - from) * easing(t);
}

/**
 * Interpolate between two colors (hex) with easing
 */
export function interpolateColor(
  fromHex: string,
  toHex: string,
  t: number,
  easing: EasingFunction = linear
): string {
  const easedT = easing(t);

  const fromRgb = hexToRgb(fromHex);
  const toRgb = hexToRgb(toHex);

  const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * easedT);
  const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * easedT);
  const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * easedT);

  return rgbToHex(r, g, b);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}
