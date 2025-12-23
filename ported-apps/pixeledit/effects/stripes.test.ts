import { stripes } from './stripes';
import { createPixels, getPixel } from './test-utils';

describe('stripes', () => {
  test('creates horizontal stripes at angle 0', () => {
    const pixels = createPixels(20, 20);
    stripes(pixels, 20, 20, 5, 0);
    const p1 = getPixel(pixels, 20, 2, 0);
    const p2 = getPixel(pixels, 20, 7, 0);
    expect(p1.r).not.toBe(p2.r);
  });

  test('uses custom colors', () => {
    const pixels = createPixels(20, 20);
    stripes(pixels, 20, 20, 10, 0, { r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 });
    const p = getPixel(pixels, 20, 2, 0);
    expect(p.r).toBe(255);
  });
});
