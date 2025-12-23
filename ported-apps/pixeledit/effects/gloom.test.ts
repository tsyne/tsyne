import { gloom } from './gloom';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('gloom', () => {
  test('darkens image', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = gloom(pixels, width, height, 128, 50, 3);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('reduces overall brightness', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = gloom(pixels, width, height, 128, 80, 3);
    let origSum = 0, resultSum = 0;
    for (let i = 0; i < orig.length; i += 4) {
      origSum += orig[i] + orig[i + 1] + orig[i + 2];
      resultSum += result[i] + result[i + 1] + result[i + 2];
    }
    expect(resultSum).toBeLessThanOrEqual(origSum);
  });
});
