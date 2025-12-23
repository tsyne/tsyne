import { lightLeak } from './light-leak';
import { createNamedColorGrid, wasModified, clonePixels, getPixel } from './test-utils';

describe('lightLeak', () => {
  test('adds light to image', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    lightLeak(pixels, width, height, 50);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('top-right corner is brighter', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const cornerBefore = getPixel(pixels, width, width - 1, 0);
    lightLeak(pixels, width, height, 80);
    const cornerAfter = getPixel(pixels, width, width - 1, 0);
    expect(cornerAfter.r).toBeGreaterThanOrEqual(cornerBefore.r);
  });
});
