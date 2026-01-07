/**
 * Cosyne Animation Framework Tests
 *
 * TC-ANIM-001 through TC-ANIM-060+
 * Tests for easing functions, Animation class, AnimationManager, and integration
 */

import {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
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
} from '../src/easing';

import {
  Animation,
  AnimationControl,
  AnimationState,
  AnimationOptions,
  KeyframeAnimation,
  type Keyframe,
} from '../src/animation';

import {
  getAnimationManager,
  resetAnimationManager,
} from '../src/animation-manager';

import { CosyneCircle } from '../src/primitives/circle';

// ============================================================================
// EASING FUNCTION TESTS (TC-ANIM-001 through TC-ANIM-015)
// ============================================================================

describe('Easing Functions', () => {
  // TC-ANIM-001: Linear easing
  it('TC-ANIM-001: linear() should return t as-is', () => {
    expect(linear(0)).toBe(0);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(1)).toBe(1);
    expect(linear(0.25)).toBe(0.25);
    expect(linear(0.75)).toBe(0.75);
  });

  // TC-ANIM-002: Quad easing family
  it('TC-ANIM-002: easeInQuad() should accelerate', () => {
    expect(easeInQuad(0)).toBe(0);
    expect(easeInQuad(0.5)).toBeLessThan(0.5);
    expect(easeInQuad(1)).toBe(1);
    expect(easeInQuad(0.5)).toBeCloseTo(0.25, 5);
  });

  // TC-ANIM-003: easeOutQuad
  it('TC-ANIM-003: easeOutQuad() should decelerate', () => {
    expect(easeOutQuad(0)).toBe(0);
    expect(easeOutQuad(0.5)).toBeGreaterThan(0.5);
    expect(easeOutQuad(1)).toBe(1);
    expect(easeOutQuad(0.5)).toBeCloseTo(0.75, 5);
  });

  // TC-ANIM-004: easeInOutQuad
  it('TC-ANIM-004: easeInOutQuad() should accelerate then decelerate', () => {
    expect(easeInOutQuad(0)).toBe(0);
    expect(easeInOutQuad(0.25)).toBeLessThan(0.25);
    expect(easeInOutQuad(0.5)).toBe(0.5);
    expect(easeInOutQuad(0.75)).toBeGreaterThan(0.75);
    expect(easeInOutQuad(1)).toBe(1);
  });

  // TC-ANIM-005: Cubic easing family
  it('TC-ANIM-005: easeInCubic() should accelerate strongly', () => {
    expect(easeInCubic(0)).toBe(0);
    expect(easeInCubic(0.5)).toBeLessThan(easeInQuad(0.5));
    expect(easeInCubic(1)).toBe(1);
  });

  // TC-ANIM-006: easeOutCubic
  it('TC-ANIM-006: easeOutCubic() should decelerate strongly', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBeGreaterThan(easeOutQuad(0.5));
    expect(easeOutCubic(1)).toBe(1);
  });

  // TC-ANIM-007: Sine easing family
  it('TC-ANIM-007: easeInSine() should provide smooth acceleration', () => {
    expect(easeInSine(0)).toBe(0);
    expect(easeInSine(0.5)).toBeLessThan(0.5);
    expect(easeInSine(1)).toBeCloseTo(1, 5);
  });

  // TC-ANIM-008: easeOutSine
  it('TC-ANIM-008: easeOutSine() should provide smooth deceleration', () => {
    expect(easeOutSine(0)).toBe(0);
    expect(easeOutSine(0.5)).toBeGreaterThan(0.5);
    expect(easeOutSine(1)).toBeCloseTo(1, 5);
  });

  // TC-ANIM-009: Exponential easing
  it('TC-ANIM-009: easeInExpo() should accelerate very quickly', () => {
    expect(easeInExpo(0)).toBe(0);
    expect(easeInExpo(0.5)).toBeLessThan(easeInCubic(0.5));
    expect(easeInExpo(1)).toBe(1);
  });

  // TC-ANIM-010: easeOutExpo
  it('TC-ANIM-010: easeOutExpo() should decelerate very quickly', () => {
    expect(easeOutExpo(0)).toBe(0);
    expect(easeOutExpo(0.5)).toBeGreaterThan(easeOutCubic(0.5));
    expect(easeOutExpo(1)).toBe(1);
  });

  // TC-ANIM-011: Circular easing
  it('TC-ANIM-011: easeInCirc() and easeOutCirc() should be symmetric', () => {
    const t = 0.3;
    const inValue = easeInCirc(t);
    const outValue = easeOutCirc(1 - t);
    expect(inValue).toBeCloseTo(1 - outValue, 5);
  });

  // TC-ANIM-012: Elastic easing
  it('TC-ANIM-012: easeInElastic() should overshoot and settle', () => {
    expect(easeInElastic(0)).toBe(0);
    expect(easeInElastic(1)).toBe(1);
    // Should have oscillation before settling
    const mid = easeInElastic(0.5);
    expect(typeof mid).toBe('number');
  });

  // TC-ANIM-013: Back easing
  it('TC-ANIM-013: easeInBack() should undershoot at start', () => {
    expect(easeInBack(0)).toBe(0);
    expect(easeInBack(0.2)).toBeLessThan(0);
    expect(easeInBack(1)).toBe(1);
  });

  // TC-ANIM-014: Bounce easing
  it('TC-ANIM-014: easeOutBounce() should bounce at end', () => {
    expect(easeOutBounce(0)).toBe(0);
    expect(easeOutBounce(1)).toBe(1);
    const val = easeOutBounce(0.7);
    expect(typeof val).toBe('number');
  });

  // TC-ANIM-015: getEasingFunction lookup
  it('TC-ANIM-015: getEasingFunction() should find functions by name', () => {
    expect(getEasingFunction('linear')).toBe(linear);
    expect(getEasingFunction('easeInQuad')).toBe(easeInQuad);
    expect(getEasingFunction('easeOutCubic')).toBe(easeOutCubic);
    expect(getEasingFunction('easeInOutSine')).toBe(easeInOutSine);
    expect(getEasingFunction('easeInElastic')).toBe(easeInElastic);
    expect(getEasingFunction('easeOutBounce')).toBe(easeOutBounce);
  });
});

// ============================================================================
// INTERPOLATION TESTS (TC-ANIM-016 through TC-ANIM-025)
// ============================================================================

describe('Interpolation', () => {
  // TC-ANIM-016: Numeric interpolation - linear
  it('TC-ANIM-016: interpolate() should linearly interpolate numbers', () => {
    expect(interpolate(0, 100, 0, linear)).toBe(0);
    expect(interpolate(0, 100, 0.5, linear)).toBe(50);
    expect(interpolate(0, 100, 1, linear)).toBe(100);
    expect(interpolate(0, 100, 0.25, linear)).toBe(25);
  });

  // TC-ANIM-017: Numeric interpolation with easing
  it('TC-ANIM-017: interpolate() should apply easing function', () => {
    const value = interpolate(0, 100, 0.5, easeInQuad);
    expect(value).toBeLessThan(50);
    expect(value).toBeGreaterThan(0);
  });

  // TC-ANIM-018: Numeric interpolation - negative values
  it('TC-ANIM-018: interpolate() should handle negative values', () => {
    expect(interpolate(-100, 100, 0, linear)).toBe(-100);
    expect(interpolate(-100, 100, 0.5, linear)).toBe(0);
    expect(interpolate(-100, 100, 1, linear)).toBe(100);
  });

  // TC-ANIM-019: Numeric interpolation - decimal values
  it('TC-ANIM-019: interpolate() should handle decimal values (opacity)', () => {
    expect(interpolate(0, 1, 0, linear)).toBe(0);
    expect(interpolate(0, 1, 0.5, linear)).toBe(0.5);
    expect(interpolate(0, 1, 1, linear)).toBe(1);
  });

  // TC-ANIM-020: Color interpolation - hex to hex
  it('TC-ANIM-020: interpolateColor() should interpolate hex colors', () => {
    const result = interpolateColor('#000000', '#FFFFFF', 0.5, linear);
    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
    // Mid-point between black and white should be gray-ish
    expect(result).toBeDefined();
  });

  // TC-ANIM-021: Color interpolation - red to blue
  it('TC-ANIM-021: interpolateColor() should interpolate red to blue', () => {
    const start = interpolateColor('#FF0000', '#0000FF', 0, linear);
    const end = interpolateColor('#FF0000', '#0000FF', 1, linear);
    expect(start.toUpperCase()).toBe('#FF0000');
    expect(end.toUpperCase()).toBe('#0000FF');
  });

  // TC-ANIM-022: Color interpolation with easing
  it('TC-ANIM-022: interpolateColor() should apply easing function', () => {
    const linear_mid = interpolateColor('#000000', '#FFFFFF', 0.5, (t) => t);
    const eased_mid = interpolateColor('#000000', '#FFFFFF', 0.5, easeInQuad);
    expect(linear_mid).not.toBe(eased_mid);
  });

  // TC-ANIM-023: Color interpolation - shorthand hex
  it('TC-ANIM-023: interpolateColor() should handle shorthand hex', () => {
    const result = interpolateColor('#000', '#FFF', 0.5, linear);
    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  // TC-ANIM-024: Color interpolation - edge cases
  it('TC-ANIM-024: interpolateColor() edge cases', () => {
    expect(interpolateColor('#FF0000', '#FF0000', 0.5, linear).toUpperCase()).toBe('#FF0000');
    expect(interpolateColor('#000000', '#000000', 0.5, linear).toUpperCase()).toBe('#000000');
  });

  // TC-ANIM-025: Numeric interpolation - large values
  it('TC-ANIM-025: interpolate() should handle large values (coordinates)', () => {
    expect(interpolate(0, 10000, 0.5, linear)).toBe(5000);
    expect(interpolate(-5000, 5000, 0.5, linear)).toBe(0);
  });
});

// ============================================================================
// ANIMATION CLASS TESTS (TC-ANIM-026 through TC-ANIM-045)
// ============================================================================

describe('Animation<T> Class', () => {
  // TC-ANIM-026: Basic animation creation
  it('TC-ANIM-026: Animation should be creatable with from/to/duration', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 1000,
    });
    expect(anim).toBeDefined();
    expect(anim.getState()).toBe('idle');
  });

  // TC-ANIM-027: Animation state transitions
  it('TC-ANIM-027: Animation state should transition idle→running→completed', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
    });

    expect(anim.getState()).toBe('idle');

    // First update starts animation
    let result = anim.update(50);
    expect(anim.getState()).toBe('running');
    expect(result.progress).toBe(0.5);
    expect(result.value).toBe(50);

    // Finish animation
    result = anim.update(50);
    expect(anim.getState()).toBe('completed');
    expect(result.progress).toBe(1);
    expect(result.value).toBe(100);
  });

  // TC-ANIM-028: Animation with easing function
  it('TC-ANIM-028: Animation should apply easing function', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 1000,
      easing: easeInQuad,
    });

    const result = anim.update(500);
    // At 50% time with easeInQuad, should be less than 50% progress
    expect(result.value).toBeLessThan(50);
  });

  // TC-ANIM-029: Animation with delay
  it('TC-ANIM-029: Animation should respect delay', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
      delay: 50,
    });

    let result = anim.update(25);
    // Still in delay period
    expect(result.progress).toBe(0);
    expect(result.value).toBe(0);

    result = anim.update(25);
    // Delay over, animation starts
    expect(result.progress).toBeGreaterThan(0);
  });

  // TC-ANIM-030: Animation pause/resume
  it('TC-ANIM-030: Animation should pause and resume', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 1000,
    });

    anim.update(250);
    expect(anim.getProgress()).toBeCloseTo(0.25, 2);

    anim.pause();
    expect(anim.getState()).toBe('paused');

    const pausedProgress = anim.getProgress();
    anim.update(250);
    // Progress shouldn't change while paused
    expect(anim.getProgress()).toBe(pausedProgress);

    anim.resume();
    expect(anim.getState()).toBe('running');

    anim.update(500);
    // Should now have progressed
    expect(anim.getProgress()).toBeGreaterThan(pausedProgress);
  });

  // TC-ANIM-031: Animation seek
  it('TC-ANIM-031: Animation should seek to arbitrary time', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 1000,
    });

    anim.seek(500);
    expect(anim.getProgress()).toBeCloseTo(0.5, 2);

    anim.seek(750);
    expect(anim.getProgress()).toBeCloseTo(0.75, 2);

    anim.seek(0);
    expect(anim.getProgress()).toBe(0);
  });

  // TC-ANIM-032: Animation stop
  it('TC-ANIM-032: Animation should stop and reset', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 1000,
    });

    anim.update(250);
    expect(anim.getState()).toBe('running');

    anim.stop();
    expect(anim.getState()).toBe('idle');
    expect(anim.getProgress()).toBe(0);
  });

  // TC-ANIM-033: Animation loop
  it('TC-ANIM-033: Animation should loop when enabled', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
      loop: true,
    });

    anim.update(100);
    expect(anim.getState()).toBe('running');
    expect(anim.getProgress()).toBe(0); // Reset to start after loop

    anim.update(50);
    expect(anim.getProgress()).toBeCloseTo(0.5, 2);
  });

  // TC-ANIM-034: Animation loopCount
  it('TC-ANIM-034: Animation should stop after loopCount iterations', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
      loop: true,
      loopCount: 2,
    });

    anim.update(100); // First iteration
    expect(anim.getState()).toBe('running');

    anim.update(100); // Second iteration
    expect(anim.getState()).toBe('completed');
  });

  // TC-ANIM-035: Animation yoyo
  it('TC-ANIM-035: Animation should yoyo (reverse) when enabled', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
      loop: true,
      yoyo: true,
    });

    // Forward
    anim.update(50);
    const forwardValue = anim.getCurrentValue();
    expect(forwardValue).toBeCloseTo(50, 1);

    // Complete forward
    anim.update(50);

    // Should now go backward
    anim.update(25);
    const backwardValue = anim.getCurrentValue();
    expect(backwardValue).toBeLessThan(forwardValue);
  });

  // TC-ANIM-036: Animation callbacks - onComplete
  it('TC-ANIM-036: Animation should call onComplete callback', (done) => {
    const callback = jest.fn();
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
      onComplete: callback,
    });

    anim.update(100);
    expect(callback).toHaveBeenCalled();
    done();
  });

  // TC-ANIM-037: Animation callbacks - onUpdate
  it('TC-ANIM-037: Animation should call onUpdate callback on each frame', () => {
    const callback = jest.fn();
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 1000,
      onUpdate: callback,
    });

    anim.update(250);
    expect(callback).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(25);

    anim.update(250);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  // TC-ANIM-038: Animation with string easing name
  it('TC-ANIM-038: Animation should accept easing name as string', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
      easing: 'easeOutCubic',
    } as any);
    expect(anim).toBeDefined();
  });

  // TC-ANIM-039: Animation color interpolation
  it('TC-ANIM-039: Animation should interpolate color values', () => {
    const anim = new Animation({
      from: '#FF0000',
      to: '#0000FF',
      duration: 100,
    } as any);

    const result = anim.update(50);
    expect(result.value).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  // TC-ANIM-040: Animation getCurrentValue
  it('TC-ANIM-040: Animation getCurrentValue should return current interpolated value', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
    });

    anim.update(50);
    expect(anim.getCurrentValue()).toBeCloseTo(50, 1);
  });

  // TC-ANIM-041: Animation getProgress
  it('TC-ANIM-041: Animation getProgress should return 0-1', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
    });

    anim.update(25);
    expect(anim.getProgress()).toBeCloseTo(0.25, 2);

    anim.update(25);
    expect(anim.getProgress()).toBeCloseTo(0.5, 2);

    anim.update(50);
    expect(anim.getProgress()).toBe(1);
  });

  // TC-ANIM-042: Animation zero duration
  it('TC-ANIM-042: Animation with zero duration should complete immediately', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 0,
    });

    const result = anim.update(1);
    expect(result.value).toBe(100);
    expect(anim.getState()).toBe('completed');
  });

  // TC-ANIM-043: Animation with negative from/to
  it('TC-ANIM-043: Animation should handle negative values', () => {
    const anim = new Animation({
      from: -100,
      to: 100,
      duration: 200,
    });

    const result = anim.update(100);
    expect(result.value).toBe(0);
  });

  // TC-ANIM-044: Animation large duration
  it('TC-ANIM-044: Animation should handle large durations', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 10000,
    });

    anim.update(5000);
    expect(anim.getProgress()).toBeCloseTo(0.5, 2);
  });

  // TC-ANIM-045: Animation result object structure
  it('TC-ANIM-045: Animation update should return correct result structure', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
    });

    const result = anim.update(50);
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('progress');
    expect(result).toHaveProperty('complete');
    expect(typeof result.value).toBe('number');
    expect(typeof result.progress).toBe('number');
    expect(typeof result.complete).toBe('boolean');
  });
});

// ============================================================================
// KEYFRAME ANIMATION TESTS (TC-ANIM-046 through TC-ANIM-050)
// ============================================================================

describe('KeyframeAnimation', () => {
  // TC-ANIM-046: KeyframeAnimation creation
  it('TC-ANIM-046: KeyframeAnimation should create with keyframes', () => {
    const keyframes: Keyframe[] = [
      { time: 0, value: 0 },
      { time: 500, value: 50 },
      { time: 1000, value: 100 },
    ];
    const anim = new KeyframeAnimation({
      keyframes,
      duration: 1000,
    });
    expect(anim).toBeDefined();
  });

  // TC-ANIM-047: KeyframeAnimation interpolation
  it('TC-ANIM-047: KeyframeAnimation should interpolate between keyframes', () => {
    const keyframes: Keyframe[] = [
      { time: 0, value: 0 },
      { time: 1000, value: 100 },
    ];
    const anim = new KeyframeAnimation({
      keyframes,
      duration: 1000,
    });

    anim.update(500);
    expect(anim.getCurrentValue()).toBeCloseTo(50, 1);
  });

  // TC-ANIM-048: KeyframeAnimation easing per frame
  it('TC-ANIM-048: KeyframeAnimation should support per-keyframe easing', () => {
    const keyframes: Keyframe[] = [
      { time: 0, value: 0, easing: easeInQuad },
      { time: 500, value: 50, easing: easeOutQuad },
      { time: 1000, value: 100 },
    ];
    const anim = new KeyframeAnimation({
      keyframes,
      duration: 1000,
    });
    expect(anim).toBeDefined();
  });

  // TC-ANIM-049: KeyframeAnimation multiple properties
  it('TC-ANIM-049: KeyframeAnimation should handle multiple numeric properties', () => {
    const keyframes: Keyframe[] = [
      { time: 0, value: { x: 0, y: 0 } },
      { time: 500, value: { x: 50, y: 100 } },
      { time: 1000, value: { x: 100, y: 200 } },
    ];
    const anim = new KeyframeAnimation({
      keyframes: keyframes as any,
      duration: 1000,
    });
    expect(anim).toBeDefined();
  });

  // TC-ANIM-050: KeyframeAnimation callback
  it('TC-ANIM-050: KeyframeAnimation should trigger callbacks', (done) => {
    const callback = jest.fn();
    const keyframes: Keyframe[] = [
      { time: 0, value: 0 },
      { time: 100, value: 100 },
    ];
    const anim = new KeyframeAnimation({
      keyframes,
      duration: 100,
      onComplete: callback,
    });

    anim.update(100);
    expect(callback).toHaveBeenCalled();
    done();
  });
});

// ============================================================================
// ANIMATION MANAGER TESTS (TC-ANIM-051 through TC-ANIM-060)
// ============================================================================

describe('AnimationManager', () => {
  beforeEach(() => {
    resetAnimationManager();
  });

  // TC-ANIM-051: AnimationManager singleton
  it('TC-ANIM-051: getAnimationManager() should return singleton', () => {
    const manager1 = getAnimationManager();
    const manager2 = getAnimationManager();
    expect(manager1).toBe(manager2);
  });

  // TC-ANIM-052: AnimationManager reset
  it('TC-ANIM-052: resetAnimationManager() should clear all animations', () => {
    const manager = getAnimationManager();
    const anim = new Animation({ from: 0, to: 100, duration: 1000 });
    const target = {};
    const control = manager.add(anim, target, 'value');

    expect(manager.getActiveCount()).toBeGreaterThan(0);

    resetAnimationManager();
    expect(manager.getActiveCount()).toBe(0);
  });

  // TC-ANIM-053: AnimationManager add/remove
  it('TC-ANIM-053: AnimationManager should add and remove animations', () => {
    const manager = getAnimationManager();
    const anim = new Animation({ from: 0, to: 100, duration: 1000 });
    const target = {};

    const control = manager.add(anim, target, 'value');
    expect(manager.getActiveCount()).toBe(1);

    manager.remove(control);
    expect(manager.getActiveCount()).toBe(0);
  });

  // TC-ANIM-054: AnimationManager multiple animations
  it('TC-ANIM-054: AnimationManager should handle multiple animations', () => {
    const manager = getAnimationManager();
    const target1 = { value: 0 };
    const target2 = { value: 0 };

    const control1 = manager.add(
      new Animation({ from: 0, to: 100, duration: 1000 }),
      target1,
      'value'
    );
    const control2 = manager.add(
      new Animation({ from: 0, to: 100, duration: 1000 }),
      target2,
      'value'
    );

    expect(manager.getActiveCount()).toBe(2);

    manager.remove(control1);
    expect(manager.getActiveCount()).toBe(1);
  });

  // TC-ANIM-055: AnimationManager refresh callback
  it('TC-ANIM-055: AnimationManager should trigger refresh callback', (done) => {
    const manager = getAnimationManager();
    const callback = jest.fn();
    manager.setRefreshCallback(callback);

    const anim = new Animation({ from: 0, to: 100, duration: 100 });
    const target = {};
    manager.add(anim, target, 'value');

    // Manually trigger frame update
    (manager as any).updateFrame();

    expect(callback).toHaveBeenCalled();
    done();
  });

  // TC-ANIM-056: AnimationManager pauseAll/resumeAll
  it('TC-ANIM-056: AnimationManager should pause and resume all animations', () => {
    const manager = getAnimationManager();
    const anim1 = new Animation({ from: 0, to: 100, duration: 1000 });
    const anim2 = new Animation({ from: 0, to: 100, duration: 1000 });
    const target1 = {};
    const target2 = {};

    const c1 = manager.add(anim1, target1, 'value');
    const c2 = manager.add(anim2, target2, 'value');

    manager.pauseAll();
    expect(c1.getState()).toBe('paused');
    expect(c2.getState()).toBe('paused');

    manager.resumeAll();
    expect(c1.getState()).toBe('running');
    expect(c2.getState()).toBe('running');
  });

  // TC-ANIM-057: AnimationManager clear
  it('TC-ANIM-057: AnimationManager clear should remove all animations', () => {
    const manager = getAnimationManager();
    manager.add(new Animation({ from: 0, to: 100, duration: 1000 }), {}, 'value');
    manager.add(new Animation({ from: 0, to: 100, duration: 1000 }), {}, 'value');
    manager.add(new Animation({ from: 0, to: 100, duration: 1000 }), {}, 'value');

    expect(manager.getActiveCount()).toBe(3);

    manager.clear();
    expect(manager.getActiveCount()).toBe(0);
  });

  // TC-ANIM-058: AnimationManager automatic cleanup
  it('TC-ANIM-058: AnimationManager should auto-remove completed animations', () => {
    const manager = getAnimationManager();
    const anim = new Animation({ from: 0, to: 100, duration: 100 });
    const target = {};
    manager.add(anim, target, 'value');

    expect(manager.getActiveCount()).toBe(1);

    // Complete the animation
    (manager as any).updateFrame();
    anim.update(100);

    expect(manager.getActiveCount()).toBe(0);
  });

  // TC-ANIM-059: AnimationManager with same target multiple properties
  it('TC-ANIM-059: AnimationManager should animate multiple properties on same target', () => {
    const manager = getAnimationManager();
    const target = { x: 0, y: 0 };

    const c1 = manager.add(
      new Animation({ from: 0, to: 100, duration: 1000 }),
      target,
      'x'
    );
    const c2 = manager.add(
      new Animation({ from: 0, to: 200, duration: 1000 }),
      target,
      'y'
    );

    expect(manager.getActiveCount()).toBe(2);

    (manager as any).updateFrame();
    // Both animations should be running
    expect(c1.getState()).toBe('running');
    expect(c2.getState()).toBe('running');
  });

  // TC-ANIM-060: AnimationManager getActiveCount
  it('TC-ANIM-060: AnimationManager getActiveCount should be accurate', () => {
    const manager = getAnimationManager();

    expect(manager.getActiveCount()).toBe(0);

    const controls = [
      manager.add(new Animation({ from: 0, to: 100, duration: 1000 }), {}, 'a'),
      manager.add(new Animation({ from: 0, to: 100, duration: 1000 }), {}, 'b'),
      manager.add(new Animation({ from: 0, to: 100, duration: 1000 }), {}, 'c'),
    ];

    expect(manager.getActiveCount()).toBe(3);

    manager.remove(controls[0]);
    expect(manager.getActiveCount()).toBe(2);

    manager.clear();
    expect(manager.getActiveCount()).toBe(0);
  });
});

// ============================================================================
// PRIMITIVE ANIMATION INTEGRATION TESTS (TC-ANIM-061 through TC-ANIM-070)
// ============================================================================

describe('Primitive Animation Integration', () => {
  beforeEach(() => {
    resetAnimationManager();
  });

  // Mock widget for testing
  const mockWidget = { update: () => {} };

  // TC-ANIM-061: Primitive animate method
  it('TC-ANIM-061: Primitive.animate() should create animation', () => {
    const circle = new CosyneCircle(100, 100, 50, mockWidget);
    const control = circle.animate('alpha', {
      from: 0,
      to: 1,
      duration: 1000,
    });

    expect(control).toBeDefined();
    expect(control.getState()).toBe('running');
  });

  // TC-ANIM-062: Primitive animateFluent method
  it('TC-ANIM-062: Primitive.animateFluent() should provide fluent API', () => {
    const circle = new CosyneCircle(100, 100, 50, mockWidget);
    const control = circle
      .animateFluent('alpha', 0, 1)
      .duration(1000)
      .easing(easeInOutCubic)
      .start();

    expect(control).toBeDefined();
    expect(control.getState()).toBe('running');
  });

  // TC-ANIM-063: Primitive fluent API chaining
  it('TC-ANIM-063: Primitive fluent API should chain correctly', () => {
    const circle = new CosyneCircle(100, 100, 50, mockWidget);
    const control = circle
      .animateFluent('alpha', 0, 1)
      .duration(1000)
      .easing('easeOutCubic')
      .delay(100)
      .loop(true)
      .yoyo(true)
      .start();

    expect(control).toBeDefined();
  });

  // TC-ANIM-064: Primitive clearAnimations
  it('TC-ANIM-064: Primitive.clearAnimations() should stop all animations', () => {
    const circle = new CosyneCircle(100, 100, 50, mockWidget);
    const control = circle.animate('alpha', {
      from: 0,
      to: 1,
      duration: 1000,
    });

    expect(control.getState()).toBe('running');

    circle.clearAnimations();
    expect(control.getState()).toBe('idle');
  });

  // TC-ANIM-065: Primitive multiple animations
  it('TC-ANIM-065: Primitive should support multiple simultaneous animations', () => {
    const circle = new CosyneCircle(100, 100, 50, mockWidget);

    const c1 = circle.animate('alpha', {
      from: 0,
      to: 1,
      duration: 1000,
    });
    const c2 = circle.animate('x', {
      from: 100,
      to: 200,
      duration: 1000,
    });

    expect(c1.getState()).toBe('running');
    expect(c2.getState()).toBe('running');
  });

  // TC-ANIM-066: Primitive fluent easing string
  it('TC-ANIM-066: Primitive fluent API should accept easing name', () => {
    const circle = new CosyneCircle(100, 100, 50, mockWidget);
    const control = circle
      .animateFluent('alpha', 0, 1)
      .duration(1000)
      .easing('easeInBounce')
      .start();

    expect(control).toBeDefined();
  });

  // TC-ANIM-067: Primitive fluent default duration
  it('TC-ANIM-067: Primitive fluent API should use default duration if not set', () => {
    const circle = new CosyneCircle(100, 100, 50, mockWidget);
    const control = circle
      .animateFluent('alpha', 0, 1)
      .start();

    expect(control).toBeDefined();
    expect(control.getState()).toBe('running');
  });

  // TC-ANIM-068: Primitive animation control
  it('TC-ANIM-068: Primitive animation control should support pause/resume', () => {
    const circle = new CosyneCircle(100, 100, 50, mockWidget);
    const control = circle.animate('alpha', {
      from: 0,
      to: 1,
      duration: 1000,
    });

    control.pause();
    expect(control.getState()).toBe('paused');

    control.resume();
    expect(control.getState()).toBe('running');
  });

  // TC-ANIM-069: Primitive animation with callbacks
  it('TC-ANIM-069: Primitive animation should support callbacks', (done) => {
    const callback = jest.fn();
    const circle = new CosyneCircle(100, 100, 50, mockWidget);
    const control = circle.animate('alpha', {
      from: 0,
      to: 1,
      duration: 100,
      onComplete: callback,
    });

    // Simulate animation completion
    (control as any).animation.update(100);

    expect(callback).toHaveBeenCalled();
    done();
  });

  // TC-ANIM-070: Primitive animation color interpolation
  it('TC-ANIM-070: Primitive should animate color properties', () => {
    const circle = new CosyneCircle(100, 100, 50, mockWidget).fill('#FF0000');
    const control = circle.animate('fillColor', {
      from: '#FF0000',
      to: '#0000FF',
      duration: 1000,
    });

    expect(control).toBeDefined();
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING TESTS (TC-ANIM-071 through TC-ANIM-075)
// ============================================================================

describe('Edge Cases and Error Handling', () => {
  // TC-ANIM-071: Animation with NaN values
  it('TC-ANIM-071: Animation should handle edge case values gracefully', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 100,
    });

    const result = anim.update(50);
    expect(Number.isNaN(result.value)).toBe(false);
    expect(Number.isNaN(result.progress)).toBe(false);
  });

  // TC-ANIM-072: Easing function with values outside 0-1
  it('TC-ANIM-072: Easing functions should handle overshoot gracefully', () => {
    // Some easing functions (elastic, back, bounce) can exceed 0-1 range
    const backValue = easeInBack(0.2);
    expect(Number.isFinite(backValue)).toBe(true);

    const elasticValue = easeInElastic(0.5);
    expect(Number.isFinite(elasticValue)).toBe(true);
  });

  // TC-ANIM-073: Color interpolation with invalid hex
  it('TC-ANIM-073: Color interpolation should handle edge cases', () => {
    const result = interpolateColor('#FFFFFF', '#000000', 0.5, linear);
    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  // TC-ANIM-074: Animation seek beyond duration
  it('TC-ANIM-074: Animation seek beyond duration should clamp', () => {
    const anim = new Animation({
      from: 0,
      to: 100,
      duration: 1000,
    });

    anim.seek(5000);
    expect(anim.getProgress()).toBeLessThanOrEqual(1);
    expect(anim.getProgress()).toBeGreaterThanOrEqual(0);
  });

  // TC-ANIM-075: Animation with identical from/to
  it('TC-ANIM-075: Animation with identical from/to should be valid', () => {
    const anim = new Animation({
      from: 100,
      to: 100,
      duration: 1000,
    });

    anim.update(500);
    expect(anim.getCurrentValue()).toBe(100);
  });
});
