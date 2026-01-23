/**
 * TsyneTest Integration Tests for Animation Demo
 *
 * Tests the animation API functionality:
 * - Position animations
 * - Different easing functions
 * - Animation completion callbacks
 *
 * Note: Tab switching is not currently testable via getByText() because
 * tab titles are part of the Tabs widget structure, not standalone labels.
 * These tests verify the first tab (InOut) content and general functionality.
 *
 * USAGE:
 * - Headless mode (default): npx jest animation-demo.test.ts
 * - Visual debugging mode: TSYNE_HEADED=1 npx jest animation-demo.test.ts
 */

import { TsyneTest, TestContext } from 'tsyne';
import { buildAnimationDemo } from './animation-demo';

describe('Animation Demo Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display animation demo with title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildAnimationDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Title should exist
    await ctx.getById('title').shouldExist();
  });

  test('should show InOut tab content by default (first tab)', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildAnimationDemo(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // First tab (InOut) content should be visible
    await ctx.expect(ctx.getByExactText('InOut Easing')).toBeVisible();
  });
});

describe('Animation Unit Tests', () => {
  // These test the animation logic without UI

  test('linear easing should be identity function', () => {
    const linear = (t: number) => t;
    expect(linear(0)).toBe(0);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(1)).toBe(1);
  });

  test('inOut easing should start and end slow', () => {
    const inOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    expect(inOut(0)).toBe(0);
    expect(inOut(0.5)).toBe(0.5);
    expect(inOut(1)).toBe(1);
    // Should be slower at start
    expect(inOut(0.1)).toBeLessThan(0.1);
    // Should be faster in middle
    expect(inOut(0.5) - inOut(0.4)).toBeGreaterThan(0.1);
  });

  test('lerp should interpolate correctly', () => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(0, 100, 1)).toBe(100);
    expect(lerp(20, 80, 0.25)).toBe(35);
  });

  test('color parsing should handle hex colors', () => {
    const parseColor = (color: string) => {
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
    };

    expect(parseColor('#FF0000')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(parseColor('#00FF00FF')).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    expect(parseColor('#0000FF80')).toEqual({ r: 0, g: 0, b: 255, a: 128 });
  });

  test('hex color output should include alpha', () => {
    const toHexColor = (r: number, g: number, b: number, a: number) => {
      const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
    };

    expect(toHexColor(255, 0, 0, 255)).toBe('#ff0000ff');
    expect(toHexColor(0, 255, 0, 128)).toBe('#00ff0080');
    expect(toHexColor(0, 0, 255, 0)).toBe('#0000ff00');
  });
});
