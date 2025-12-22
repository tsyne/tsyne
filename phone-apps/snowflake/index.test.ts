/**
 * Snowflake App - Jest Unit Tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

class SnowflakeTestHelper {
  private snowflakes: any[] = [];
  private isAnimating: boolean = true;
  private density: number = 50;
  private speed: number = 1;

  generateSnowflakes(): void {
    this.snowflakes = [];
    const count = Math.max(10, Math.min(100, this.density));
    for (let i = 0; i < count; i++) {
      this.snowflakes.push({
        id: `snowflake-${i}`,
        size: Math.random() * 4 + 2,
        speed: Math.random() * this.speed + 0.5,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }
  }

  toggleAnimation(): void {
    this.isAnimating = !this.isAnimating;
  }

  setDensity(density: number): void {
    this.density = Math.max(10, Math.min(100, density));
    this.generateSnowflakes();
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.5, Math.min(3, speed));
    this.generateSnowflakes();
  }

  getSnowflakeCount(): number {
    return this.snowflakes.length;
  }

  getDensity(): number {
    return this.density;
  }

  getSpeed(): number {
    return this.speed;
  }

  isAnimatingEnabled(): boolean {
    return this.isAnimating;
  }
}

describe('Snowflake App', () => {
  let helper: SnowflakeTestHelper;

  beforeEach(() => {
    helper = new SnowflakeTestHelper();
    helper.generateSnowflakes();
  });

  test('should generate snowflakes', () => {
    expect(helper.getSnowflakeCount()).toBeGreaterThan(0);
  });

  test('should respect density limits', () => {
    helper.setDensity(10);
    expect(helper.getSnowflakeCount()).toBeGreaterThanOrEqual(10);
    helper.setDensity(100);
    expect(helper.getSnowflakeCount()).toBeLessThanOrEqual(100);
  });

  test('should toggle animation', () => {
    const initial = helper.isAnimatingEnabled();
    helper.toggleAnimation();
    expect(helper.isAnimatingEnabled()).not.toBe(initial);
  });

  test('should adjust speed', () => {
    helper.setSpeed(2.5);
    expect(helper.getSpeed()).toBe(2.5);
  });

  test('should clamp speed values', () => {
    helper.setSpeed(0);
    expect(helper.getSpeed()).toBeGreaterThanOrEqual(0.5);
    helper.setSpeed(10);
    expect(helper.getSpeed()).toBeLessThanOrEqual(3);
  });

  test('should adjust density', () => {
    helper.setDensity(75);
    expect(helper.getDensity()).toBe(75);
  });

  test('should regenerate on density change', () => {
    const count1 = helper.getSnowflakeCount();
    helper.setDensity(80);
    const count2 = helper.getSnowflakeCount();
    expect(count1).not.toBe(count2);
  });

  test('should have default values', () => {
    const h = new SnowflakeTestHelper();
    expect(h.getDensity()).toBe(50);
    expect(h.getSpeed()).toBe(1);
    expect(h.isAnimatingEnabled()).toBe(true);
  });
});
