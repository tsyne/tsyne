import { gradientFill, radialGradientFill } from './gradient-fill';
import { createPixels, getPixel, wasModified, clonePixels } from './test-utils';

describe('gradientFill', () => {
  test('creates horizontal gradient', () => {
    const pixels = createPixels(40, 40);
    const orig = clonePixels(pixels);
    gradientFill(pixels, 40, 40, { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('transitions between colors', () => {
    const pixels = createPixels(40, 40);
    gradientFill(pixels, 40, 40, { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0);
    const left = getPixel(pixels, 40, 5, 20);
    const right = getPixel(pixels, 40, 35, 20);
    expect(right.r).toBeGreaterThan(left.r);
  });
});

describe('radialGradientFill', () => {
  test('creates radial gradient', () => {
    const pixels = createPixels(40, 40);
    const orig = clonePixels(pixels);
    radialGradientFill(pixels, 40, 40, { r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 });
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('center is color1, edge is color2', () => {
    const pixels = createPixels(40, 40);
    radialGradientFill(pixels, 40, 40, { r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 });
    const center = getPixel(pixels, 40, 20, 20);
    const corner = getPixel(pixels, 40, 0, 0);
    expect(center.r).toBeGreaterThan(corner.r);
    expect(corner.b).toBeGreaterThan(center.b);
  });
});
