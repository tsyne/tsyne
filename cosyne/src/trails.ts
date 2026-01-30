/**
 * Trail Effect System
 *
 * A system for creating animated trails with fade/decay effects.
 * Useful for drawing trails, motion blur, particle trails, and
 * persistence of vision effects.
 */

/**
 * A single point in a trail
 */
export interface TrailPoint<T = Record<string, unknown>> {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Age of the point (0 = new, 1 = fully faded) */
  age: number;
  /** Optional custom data associated with this point */
  data?: T;
}

/**
 * Options for trail configuration
 */
export interface TrailOptions {
  /** Maximum number of points in the trail (default: 50) */
  maxLength?: number;
  /** How fast points age per step (default: 0.02) */
  fadeSpeed?: number;
  /** Whether to auto-remove fully faded points (default: true) */
  autoRemove?: boolean;
}

/**
 * Trail manager for tracking and aging points
 */
export class Trail<T = Record<string, unknown>> {
  private points: TrailPoint<T>[] = [];
  private maxLength: number;
  private fadeSpeed: number;
  private autoRemove: boolean;

  constructor(options: TrailOptions = {}) {
    this.maxLength = options.maxLength ?? 50;
    this.fadeSpeed = options.fadeSpeed ?? 0.02;
    this.autoRemove = options.autoRemove ?? true;
  }

  /**
   * Add a point to the trail
   */
  addPoint(x: number, y: number, data?: T): void {
    this.points.push({ x, y, age: 0, data });

    // Limit trail length
    while (this.points.length > this.maxLength) {
      this.points.shift();
    }
  }

  /**
   * Step the animation - ages all points and optionally removes faded ones
   */
  step(): void {
    for (const point of this.points) {
      point.age += this.fadeSpeed;
    }

    if (this.autoRemove) {
      this.points = this.points.filter((p) => p.age < 1);
    }
  }

  /**
   * Get all points in the trail
   */
  getPoints(): readonly TrailPoint<T>[] {
    return this.points;
  }

  /**
   * Get points that are still visible (age < 1)
   */
  getVisiblePoints(): TrailPoint<T>[] {
    return this.points.filter((p) => p.age < 1);
  }

  /**
   * Get the alpha (opacity) for a point based on its age
   * Returns 1 for new points, 0 for fully faded
   */
  getAlpha(point: TrailPoint<T>): number {
    return Math.max(0, 1 - point.age);
  }

  /**
   * Clear all points from the trail
   */
  clear(): void {
    this.points = [];
  }

  /**
   * Get the number of points in the trail
   */
  get length(): number {
    return this.points.length;
  }

  /**
   * Check if trail is empty
   */
  get isEmpty(): boolean {
    return this.points.length === 0;
  }

  /**
   * Set the maximum trail length
   */
  setMaxLength(length: number): void {
    this.maxLength = Math.max(1, length);
    while (this.points.length > this.maxLength) {
      this.points.shift();
    }
  }

  /**
   * Set the fade speed
   */
  setFadeSpeed(speed: number): void {
    this.fadeSpeed = Math.max(0, speed);
  }

  /**
   * Get the most recent point (or undefined if empty)
   */
  getLastPoint(): TrailPoint<T> | undefined {
    return this.points[this.points.length - 1];
  }

  /**
   * Get the oldest point (or undefined if empty)
   */
  getFirstPoint(): TrailPoint<T> | undefined {
    return this.points[0];
  }

  /**
   * Iterate over points with callback
   */
  forEach(callback: (point: TrailPoint<T>, index: number, alpha: number) => void): void {
    this.points.forEach((point, index) => {
      callback(point, index, this.getAlpha(point));
    });
  }

  /**
   * Map over points with callback
   */
  map<R>(callback: (point: TrailPoint<T>, index: number, alpha: number) => R): R[] {
    return this.points.map((point, index) => callback(point, index, this.getAlpha(point)));
  }
}

/**
 * Color trail - a trail that also stores color information
 */
export interface ColorTrailPoint extends TrailPoint<{ color: string }> {
  data: { color: string };
}

/**
 * Create a color trail with color-generating function
 */
export class ColorTrail extends Trail<{ color: string }> {
  private colorFn: (t: number) => string;
  private time: number = 0;

  constructor(
    colorFn: (t: number) => string = () => '#ffffff',
    options: TrailOptions = {}
  ) {
    super(options);
    this.colorFn = colorFn;
  }

  /**
   * Add a point with auto-generated color based on time
   */
  addColorPoint(x: number, y: number): void {
    this.addPoint(x, y, { color: this.colorFn(this.time) });
  }

  /**
   * Step the animation and increment time
   */
  override step(): void {
    super.step();
    this.time += 0.01;
  }

  /**
   * Set the color generation function
   */
  setColorFunction(fn: (t: number) => string): void {
    this.colorFn = fn;
  }

  /**
   * Get the current time value
   */
  getTime(): number {
    return this.time;
  }

  /**
   * Reset time to 0
   */
  resetTime(): void {
    this.time = 0;
  }
}

/**
 * Multi-trail manager for handling multiple trails simultaneously
 */
export class MultiTrail<T = Record<string, unknown>> {
  private trails: Map<string, Trail<T>> = new Map();
  private defaultOptions: TrailOptions;

  constructor(options: TrailOptions = {}) {
    this.defaultOptions = options;
  }

  /**
   * Get or create a trail by ID
   */
  getTrail(id: string): Trail<T> {
    let trail = this.trails.get(id);
    if (!trail) {
      trail = new Trail<T>(this.defaultOptions);
      this.trails.set(id, trail);
    }
    return trail;
  }

  /**
   * Add a point to a specific trail
   */
  addPoint(id: string, x: number, y: number, data?: T): void {
    this.getTrail(id).addPoint(x, y, data);
  }

  /**
   * Step all trails
   */
  step(): void {
    for (const trail of this.trails.values()) {
      trail.step();
    }
  }

  /**
   * Clear a specific trail
   */
  clearTrail(id: string): void {
    this.trails.get(id)?.clear();
  }

  /**
   * Clear all trails
   */
  clearAll(): void {
    for (const trail of this.trails.values()) {
      trail.clear();
    }
  }

  /**
   * Remove a trail entirely
   */
  removeTrail(id: string): void {
    this.trails.delete(id);
  }

  /**
   * Get all trail IDs
   */
  getTrailIds(): string[] {
    return Array.from(this.trails.keys());
  }

  /**
   * Iterate over all trails
   */
  forEach(callback: (trail: Trail<T>, id: string) => void): void {
    this.trails.forEach((trail, id) => callback(trail, id));
  }
}

/**
 * Common color functions for trails
 */
export const trailColors = {
  /** Rainbow cycling colors */
  rainbow: (t: number) => `hsl(${(t * 360) % 360}, 80%, 60%)`,

  /** Fire colors (red to yellow) */
  fire: (t: number) => `hsl(${(t * 60) % 60}, 100%, ${50 + Math.sin(t * 10) * 20}%)`,

  /** Ice colors (cyan to blue) */
  ice: (t: number) => `hsl(${180 + (t * 60) % 60}, 70%, ${50 + Math.sin(t * 10) * 20}%)`,

  /** Neon colors (magenta to cyan) */
  neon: (t: number) => `hsl(${(t * 120 + 280) % 360}, 100%, 60%)`,

  /** Single white color */
  white: () => '#ffffff',

  /** Single color factory */
  solid: (color: string) => () => color,

  /** Gradient between two colors */
  gradient: (color1: string, color2: string) => {
    // Parse hex colors
    const parse = (c: string) => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(c);
      return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128];
    };
    const c1 = parse(color1);
    const c2 = parse(color2);

    return (t: number) => {
      const f = (Math.sin(t * Math.PI * 2) + 1) / 2;
      const r = Math.floor(c1[0] + (c2[0] - c1[0]) * f);
      const g = Math.floor(c1[1] + (c2[1] - c1[1]) * f);
      const b = Math.floor(c1[2] + (c2[2] - c1[2]) * f);
      return `rgb(${r}, ${g}, ${b})`;
    };
  },
};
