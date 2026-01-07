/**
 * Global animation manager using requestAnimationFrame
 *
 * Coordinates all active animations and triggers refresh on each frame
 */

import { Animation, AnimationControl } from './animation';

// Browser globals (not available in Node.js)
declare const requestAnimationFrame: ((callback: () => void) => number) | undefined;
declare const cancelAnimationFrame: ((id: number) => void) | undefined;

/**
 * Tracks an animation with its target object and property
 */
interface AnimationTracker {
  animation: Animation<any>;
  target: Record<string, any>;
  property: string;
  control: AnimationControl;
}

/**
 * Global animation manager singleton
 */
class AnimationManagerImpl {
  private animations: Set<AnimationTracker> = new Set();
  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private refreshCallback?: () => void;
  private isRunning: boolean = false;

  /**
   * Register refresh callback (called after each animation frame)
   */
  setRefreshCallback(callback: () => void): void {
    this.refreshCallback = callback;
  }

  /**
   * Add animation to manager
   */
  add<T = number>(
    animation: Animation<T>,
    target: Record<string, any>,
    property: string
  ): AnimationControl {
    const tracker: AnimationTracker = {
      animation,
      target,
      property,
      control: animation,
    };

    this.animations.add(tracker);

    if (!this.isRunning) {
      this.start();
    }

    return animation;
  }

  /**
   * Remove animation from manager
   */
  remove(control: AnimationControl): void {
    for (const tracker of this.animations) {
      if (tracker.control === control) {
        this.animations.delete(tracker);
        break;
      }
    }

    if (this.animations.size === 0) {
      this.stop();
    }
  }

  /**
   * Start animation loop
   */
  private start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastFrameTime = Date.now();
    this.scheduleFrame();
  }

  /**
   * Stop animation loop
   */
  private stop(): void {
    if (this.rafId !== null) {
      // Use cancelAnimationFrame if available (browser), clearTimeout otherwise (Node.js)
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.rafId);
      } else {
        clearTimeout(this.rafId);
      }
      this.rafId = null;
    }
    this.isRunning = false;
  }

  /**
   * Schedule next animation frame
   */
  private scheduleFrame(): void {
    // Use requestAnimationFrame if available (browser), setTimeout otherwise (Node.js)
    const scheduleCallback = (callback: () => void): number => {
      if (typeof requestAnimationFrame !== 'undefined') {
        return requestAnimationFrame(callback);
      } else {
        // ~60fps fallback for Node.js
        return setTimeout(callback, 16) as unknown as number;
      }
    };

    this.rafId = scheduleCallback(() => {
      const now = Date.now();
      const deltaMs = now - this.lastFrameTime;
      this.lastFrameTime = now;

      // Update all animations
      const completedAnimations: AnimationTracker[] = [];

      for (const tracker of this.animations) {
        const { value, complete } = tracker.animation.update(deltaMs);
        tracker.target[tracker.property] = value;

        if (complete) {
          completedAnimations.push(tracker);
        }
      }

      // Remove completed animations
      for (const tracker of completedAnimations) {
        this.animations.delete(tracker);
      }

      // Trigger refresh callback
      if (this.refreshCallback) {
        this.refreshCallback();
      }

      // Continue loop if there are active animations
      if (this.animations.size > 0) {
        this.scheduleFrame();
      } else {
        this.stop();
      }
    });
  }

  /**
   * Get number of active animations
   */
  getActiveCount(): number {
    return this.animations.size;
  }

  /**
   * Clear all animations
   */
  clear(): void {
    this.animations.clear();
    this.stop();
  }

  /**
   * Pause all animations
   */
  pauseAll(): void {
    for (const { control } of this.animations) {
      control.pause();
    }
  }

  /**
   * Resume all animations
   */
  resumeAll(): void {
    for (const { control } of this.animations) {
      control.resume();
    }
  }
}

// Global singleton instance
let instance: AnimationManagerImpl | null = null;

/**
 * Get the global animation manager instance
 */
export function getAnimationManager(): AnimationManagerImpl {
  if (!instance) {
    instance = new AnimationManagerImpl();
  }
  return instance;
}

/**
 * Reset animation manager (for testing)
 */
export function resetAnimationManager(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}
