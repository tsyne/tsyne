import { spotlight } from './spotlight';
import { createPixels, getPixel, wasModified, clonePixels } from './test-utils';

describe('spotlight', () => {
  test('darkens areas outside spotlight', () => {
    const pixels = createPixels(40, 40, { r: 200, g: 200, b: 200 });
    const orig = clonePixels(pixels);
    spotlight(pixels, 40, 40, 20, 20, 10, 100);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('center is brighter than edges', () => {
    const pixels = createPixels(40, 40, { r: 200, g: 200, b: 200 });
    spotlight(pixels, 40, 40, 20, 20, 10, 100);
    const center = getPixel(pixels, 40, 20, 20);
    const edge = getPixel(pixels, 40, 0, 0);
    expect(center.r).toBeGreaterThan(edge.r);
  });
});
