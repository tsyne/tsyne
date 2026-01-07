/**
 * Animation system for Cosyne primitives
 *
 * Provides keyframe-based animations with easing, timing control, and callbacks
 */

import { EasingFunction, linear, interpolate, interpolateColor } from './easing';

/**
 * Animation state
 */
export type AnimationState = 'idle' | 'running' | 'paused' | 'completed';

/**
 * Animation playback control
 */
export interface AnimationControl {
  pause(): void;
  resume(): void;
  seek(time: number): void;
  stop(): void;
  getProgress(): number;
  getState(): AnimationState;
}

/**
 * Animation options for configuring behavior
 */
export interface AnimationOptions<T = number> {
  from: T;
  to: T;
  duration: number; // milliseconds
  easing?: EasingFunction;
  delay?: number; // milliseconds before animation starts
  loop?: boolean;
  loopCount?: number; // number of times to loop (undefined = infinite)
  yoyo?: boolean; // reverse on each cycle
  onStart?: () => void;
  onFrame?: (value: T, progress: number) => void;
  onComplete?: () => void;
}

/**
 * Generic animation class for any numeric or color property
 */
export class Animation<T = number> implements AnimationControl {
  private state: AnimationState = 'idle';
  private currentTime: number = 0;
  private elapsedDelay: number = 0;
  private loopCount: number = 0;
  private isReversed: boolean = false;

  private onStart?: () => void;
  private onFrame?: (value: T, progress: number) => void;
  private onComplete?: () => void;

  private from: T;
  private to: T;
  private duration: number;
  private easing: EasingFunction;
  private delay: number;
  private loop: boolean;
  private maxLoops?: number;
  private yoyo: boolean;

  constructor(options: AnimationOptions<T>) {
    this.from = options.from;
    this.to = options.to;
    this.duration = options.duration;
    this.easing = options.easing || linear;
    this.delay = options.delay || 0;
    this.loop = options.loop || false;
    this.maxLoops = options.loopCount;
    this.yoyo = options.yoyo || false;
    this.onStart = options.onStart;
    this.onFrame = options.onFrame;
    this.onComplete = options.onComplete;
  }

  /**
   * Update animation by delta time (milliseconds)
   * Returns current interpolated value and whether animation is complete
   */
  update(deltaMs: number): { value: T; progress: number; complete: boolean } {
    if (this.state === 'idle') {
      this.state = 'running';
      this.onStart?.();
    }

    if (this.state !== 'running') {
      // Return last known value (either current or on pause)
      const progress = Math.min(1, this.currentTime / this.duration);
      return {
        value: this.interpolate(progress),
        progress,
        complete: false,
      };
    }

    // Handle delay
    if (this.elapsedDelay < this.delay) {
      this.elapsedDelay += deltaMs;
      return {
        value: this.from,
        progress: 0,
        complete: false,
      };
    }

    // Update animation time
    this.currentTime += deltaMs;

    // Handle loop/yoyo logic
    let animationTime = this.currentTime;
    let complete = false;

    if (animationTime >= this.duration) {
      if (this.loop) {
        this.loopCount++;
        if (this.maxLoops !== undefined && this.loopCount >= this.maxLoops) {
          complete = true;
          animationTime = this.duration;
        } else {
          if (this.yoyo) {
            this.isReversed = !this.isReversed;
          }
          animationTime = animationTime % this.duration;
        }
      } else {
        complete = true;
        animationTime = this.duration;
      }
    }

    // Calculate normalized time [0, 1]
    const normalizedTime = animationTime / this.duration;
    const progress = this.isReversed ? 1 - normalizedTime : normalizedTime;

    const value = this.interpolate(progress);
    this.onFrame?.(value, progress);

    if (complete) {
      this.state = 'completed';
      this.onComplete?.();
    }

    return { value, progress, complete };
  }

  /**
   * Interpolate value based on progress [0, 1]
   */
  private interpolate(progress: number): T {
    const easedProgress = this.easing(Math.min(1, Math.max(0, progress)));

    if (typeof this.from === 'number' && typeof this.to === 'number') {
      return interpolate(this.from, this.to, easedProgress) as T;
    }

    if (typeof this.from === 'string' && typeof this.to === 'string') {
      return interpolateColor(this.from, this.to, easedProgress) as T;
    }

    // Fallback: return from value
    return this.from;
  }

  /**
   * Get current interpolated value
   */
  getCurrentValue(): T {
    const normalizedTime = Math.min(1, Math.max(0, this.currentTime / this.duration));
    const progress = this.isReversed ? 1 - normalizedTime : normalizedTime;
    return this.interpolate(progress);
  }

  /**
   * Pause animation
   */
  pause(): void {
    if (this.state === 'running') {
      this.state = 'paused';
    }
  }

  /**
   * Resume paused animation
   */
  resume(): void {
    if (this.state === 'paused') {
      this.state = 'running';
    }
  }

  /**
   * Seek to specific time (milliseconds)
   */
  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.duration));
  }

  /**
   * Stop animation and reset to initial state
   */
  stop(): void {
    this.state = 'idle';
    this.currentTime = 0;
    this.elapsedDelay = 0;
    this.loopCount = 0;
    this.isReversed = false;
  }

  /**
   * Get animation progress [0, 1]
   */
  getProgress(): number {
    return Math.min(1, this.currentTime / this.duration);
  }

  /**
   * Get animation state
   */
  getState(): AnimationState {
    return this.state;
  }

  /**
   * Check if animation is running
   */
  isRunning(): boolean {
    return this.state === 'running';
  }

  /**
   * Check if animation is complete
   */
  isComplete(): boolean {
    return this.state === 'completed';
  }
}

/**
 * Keyframe animation for multiple property changes
 */
export interface Keyframe {
  time: number; // Time in milliseconds
  value: number | string | Record<string, number | string>;
  easing?: EasingFunction;
}

/**
 * Keyframe animation options
 */
export interface KeyframeAnimationOptions {
  keyframes: Keyframe[];
  duration: number;
  onFrame?: (values: Record<string, number | string>) => void;
  onComplete?: () => void;
}

/**
 * Keyframe-based animation
 */
export class KeyframeAnimation implements AnimationControl {
  private state: AnimationState = 'idle';
  private currentTime: number = 0;
  private keyframes: Keyframe[];
  private duration: number;
  private onFrame?: (values: Record<string, number | string>) => void;
  private onComplete?: () => void;

  constructor(options: KeyframeAnimationOptions) {
    this.keyframes = options.keyframes.sort((a, b) => a.time - b.time);
    this.duration = options.duration;
    this.onFrame = options.onFrame;
    this.onComplete = options.onComplete;
  }

  /**
   * Update animation by delta time
   */
  update(deltaMs: number): Record<string, number | string> {
    if (this.state === 'idle') {
      this.state = 'running';
    }

    if (this.state !== 'running') {
      return {};
    }

    this.currentTime += deltaMs;

    if (this.currentTime >= this.duration) {
      this.state = 'completed';
      this.onComplete?.();
      this.currentTime = this.duration;
    }

    const values = this.interpolateKeyframes(this.currentTime);
    this.onFrame?.(values);

    return values;
  }

  /**
   * Current interpolated value
   */
  private currentValue: number | string | Record<string, number | string> = 0;

  /**
   * Get current interpolated value
   */
  getCurrentValue(): number | string | Record<string, number | string> {
    return this.currentValue;
  }

  /**
   * Interpolate between keyframes at given time
   */
  private interpolateKeyframes(timeMs: number): Record<string, number | string> {
    // Find the keyframes to interpolate between
    let prevKeyframe = this.keyframes[0];
    let nextKeyframe = this.keyframes[this.keyframes.length - 1];

    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (timeMs >= this.keyframes[i].time && timeMs <= this.keyframes[i + 1].time) {
        prevKeyframe = this.keyframes[i];
        nextKeyframe = this.keyframes[i + 1];
        break;
      }
    }

    const timeRange = nextKeyframe.time - prevKeyframe.time;
    const localProgress = timeRange > 0 ? (timeMs - prevKeyframe.time) / timeRange : 0;
    const easing = prevKeyframe.easing || linear;
    const easedProgress = easing(localProgress);

    const prevValue = prevKeyframe.value;
    const nextValue = nextKeyframe.value;

    // Handle simple numeric values
    if (typeof prevValue === 'number' && typeof nextValue === 'number') {
      this.currentValue = interpolate(prevValue, nextValue, easedProgress);
      return { value: this.currentValue };
    }

    // Handle color string values
    if (typeof prevValue === 'string' && typeof nextValue === 'string') {
      this.currentValue = interpolateColor(prevValue, nextValue, easedProgress);
      return { value: this.currentValue };
    }

    // Handle object values (multiple properties)
    if (typeof prevValue === 'object' && typeof nextValue === 'object') {
      const result: Record<string, number | string> = {};
      for (const [key, value] of Object.entries(prevValue)) {
        const nextVal = (nextValue as Record<string, number | string>)[key];
        if (nextVal !== undefined) {
          if (typeof value === 'number' && typeof nextVal === 'number') {
            result[key] = interpolate(value, nextVal, easedProgress);
          } else if (typeof value === 'string' && typeof nextVal === 'string') {
            result[key] = interpolateColor(value, nextVal, easedProgress);
          } else {
            result[key] = value;
          }
        }
      }
      this.currentValue = result;
      return result;
    }

    return {};
  }

  pause(): void {
    if (this.state === 'running') {
      this.state = 'paused';
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'running';
    }
  }

  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.duration));
  }

  stop(): void {
    this.state = 'idle';
    this.currentTime = 0;
  }

  getProgress(): number {
    return Math.min(1, this.currentTime / this.duration);
  }

  getState(): AnimationState {
    return this.state;
  }
}
