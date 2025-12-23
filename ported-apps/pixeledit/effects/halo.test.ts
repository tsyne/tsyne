import { halo } from './halo';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('halo', () => {
  test('adds halo around bright areas', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = halo(pixels, width, height, 5, 50);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('increases brightness near white pixels', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = halo(pixels, width, height, 8, 80);
    // Sum should increase due to halos
    let origSum = 0, resultSum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      origSum += pixels[i];
      resultSum += result[i];
    }
    expect(resultSum).toBeGreaterThanOrEqual(origSum);
  });
});
