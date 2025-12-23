import { lensBlur } from './lens-blur';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('lensBlur', () => {
  test('blurs image', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = lensBlur(pixels, width, height, 3, 50);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('brightness boosts highlights', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result1 = lensBlur(pixels, width, height, 3, 0);
    const result2 = lensBlur(pixels, width, height, 3, 100);
    // High brightness should increase bright areas more
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < result1.length; i += 4) {
      sum1 += result1[i];
      sum2 += result2[i];
    }
    expect(sum2).toBeGreaterThanOrEqual(sum1);
  });
});
