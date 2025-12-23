import { gaussianBlur } from './gaussian-blur';
import { createGradientPixels, wasModified, clonePixels } from './test-utils';

describe('gaussianBlur', () => {
  test('blurs image', () => {
    const pixels = createGradientPixels(20, 20);
    const orig = clonePixels(pixels);
    const result = gaussianBlur(pixels, 20, 20, 2);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('more sigma = more blur', () => {
    const pixels = createGradientPixels(20, 20);
    const result1 = gaussianBlur(pixels, 20, 20, 1);
    const result2 = gaussianBlur(pixels, 20, 20, 3);
    // Compare variance - higher sigma should reduce variance more
    let var1 = 0, var2 = 0;
    for (let i = 0; i < 100; i += 4) {
      var1 += Math.abs(result1[i] - result1[i + 4] || 0);
      var2 += Math.abs(result2[i] - result2[i + 4] || 0);
    }
    expect(var2).toBeLessThanOrEqual(var1);
  });
});
