import { checkerboard } from './checkerboard';
import { createPixels, getPixel } from './test-utils';

describe('checkerboard', () => {
  test('creates alternating pattern', () => {
    const pixels = createPixels(20, 20);
    checkerboard(pixels, 20, 20, 5);
    const p1 = getPixel(pixels, 20, 2, 2);
    const p2 = getPixel(pixels, 20, 7, 2);
    expect(p1.r).not.toBe(p2.r);
  });

  test('uses custom colors', () => {
    const pixels = createPixels(20, 20);
    checkerboard(pixels, 20, 20, 10, { r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 });
    const p = getPixel(pixels, 20, 2, 2);
    expect(p.r).toBe(255);
    expect(p.b).toBe(0);
  });
});
