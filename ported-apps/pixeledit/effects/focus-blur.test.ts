import { focusBlur } from './focus-blur';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('focusBlur', () => {
  test('creates focus blur effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = focusBlur(pixels, width, height, 20, 20, 10, 5);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('focus point is sharp', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = focusBlur(pixels, width, height, 20, 20, 10, 5);
    // Focus point should be close to original
    const focusIdx = (20 * width + 20) * 4;
    expect(Math.abs(result[focusIdx] - orig[focusIdx])).toBeLessThan(5);
  });
});
