import { sunbeams } from './sunbeams';
import { createPixels, wasModified, clonePixels, getPixel } from './test-utils';

describe('sunbeams', () => {
  test('adds rays to image', () => {
    const pixels = createPixels(40, 40, { r: 50, g: 50, b: 50 });
    const orig = clonePixels(pixels);
    sunbeams(pixels, 40, 40, 20, 20, 8, 50);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('center is brighter', () => {
    const pixels = createPixels(40, 40, { r: 50, g: 50, b: 50 });
    sunbeams(pixels, 40, 40, 20, 20, 8, 80);
    const center = getPixel(pixels, 40, 20, 20);
    const edge = getPixel(pixels, 40, 0, 0);
    expect(center.r).toBeGreaterThan(edge.r);
  });
});
