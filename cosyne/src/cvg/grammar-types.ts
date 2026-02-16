/**
 * CVG Grammar — Types, constants, and animation helpers.
 *
 * Extracted from grammar.ts to reduce file size.  No circular dependencies.
 */

/** Structured event emitted by CvgContext on tap hit/miss. */
export interface CvgEvent {
  type: 'tap-hit' | 'tap-miss' | 'hover-in' | 'hover-out'
      | 'drag' | 'drag-end' | 'scroll' | 'key-down' | 'key-up'
      | 'double-click' | 'right-click' | 'tooltip-show' | 'tooltip-hide'
      | 'when-show' | 'when-hide';
  x: number;
  y: number;
  elementName?: string;
  elementIndex?: number;
  deltaX?: number;
  deltaY?: number;
  key?: string;
}

/** Gradient definition — stores stop colors and geometry for url(#id) resolution. */
export interface GradientDef {
  type: 'linear' | 'radial';
  stops: { offset: number; color: string }[];
  x1: number; y1: number; x2: number; y2: number;  // linear: gradient line
  cx?: number; cy?: number; r?: number;              // radial: center + radius (bbox 0-1)
  fx?: number; fy?: number;                          // radial: focal point (defaults to cx,cy)
  units?: 'userSpaceOnUse' | 'objectBoundingBox';   // default objectBoundingBox
  spreadMethod?: 'pad' | 'reflect' | 'repeat';      // default pad (clamp)
}

/** Resolved viewBox mapping for coordinate transforms */
export interface ViewBoxMapping {
  vb: import('./types').ViewBox;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;           // kept for mapLength() and test readability
  offsetX: number;         // kept for test assertions
  offsetY: number;         // kept for test assertions
  transform: import('./transform').AffineMatrix; // viewBox→canvas point transform
}

/** Easing function type: takes normalized t (0→1), returns eased value (0→1). */
export type EasingFn = (t: number) => number;

/** Built-in easing functions. */
export const Easing = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
} as const;

/** Options for .transition() and .animate() */
export interface AnimationOptions {
  duration?: number;         // ms, default 300
  easing?: EasingFn | keyof typeof Easing;  // default 'easeInOut'
  delay?: number;            // ms before start, default 0
  loop?: boolean;            // repeat indefinitely
  yoyo?: boolean;            // ping-pong (implies loop)
  onComplete?: () => void;   // fires when animation finishes (not on loop iterations)
}

/** @internal Minimal interface to break AnimationHandle → CvgContext cycle. */
interface AnimationContext {
  removeAnimation(id: number): void;
}

/** Handle returned by .transition()/.animate() — allows stopping the animation. */
export class AnimationHandle {
  /** @internal */ _id: number;
  /** @internal */ _context: AnimationContext | null = null;
  /** @internal */ _stopped = false;
  /** @internal */ _onComplete?: () => void;
  /** @internal */ _resolve?: () => void;
  /** @internal */ _promise: Promise<void>;

  constructor(id: number) {
    this._id = id;
    this._promise = new Promise<void>((resolve) => { this._resolve = resolve; });
  }

  /** Stop this animation immediately. */
  stop(): void {
    this._stopped = true;
    this._context?.removeAnimation(this._id);
    this._resolve?.();
  }

  /** Promise that resolves when the animation completes (or is stopped). */
  then(onFulfilled?: () => void): Promise<void> {
    return this._promise.then(onFulfilled);
  }
}

/** SVG geometry property names per shape type — used by updateSvgProps(). */
export const SVG_GEOM_KEYS: Record<string, string[]> = {
  circle: ['cx', 'cy', 'r'],
  rect: ['x', 'y', 'width', 'height'],
  line: ['x1', 'y1', 'x2', 'y2'],
};

// ─── Color / interpolation helpers ──────────────────────────────

/** Parse a hex color string to [r, g, b] (0-255). */
export function parseHexColor(color: string): [number, number, number] {
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

/** Interpolate between two hex colors. */
export function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = parseHexColor(from);
  const [r2, g2, b2] = parseHexColor(to);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Interpolate between two numbers. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Resolve an easing option to a function. */
export function resolveEasing(easing?: EasingFn | keyof typeof Easing): EasingFn {
  if (!easing) return Easing.easeInOut;
  if (typeof easing === 'function') return easing;
  return Easing[easing] ?? Easing.easeInOut;
}
