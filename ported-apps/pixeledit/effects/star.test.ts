import { star } from './star';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('star', () => {
  test('adds star rays to bright areas', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = star(pixels, width, height, 10, 4);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('increases overall brightness', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = star(pixels, width, height, 15, 6);
    let origSum = 0, resultSum = 0;
    for (let i = 0; i < orig.length; i += 4) {
      origSum += orig[i];
      resultSum += result[i];
    }
    expect(resultSum).toBeGreaterThanOrEqual(origSum);
  });
});
