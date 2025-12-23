import { clarity } from './clarity';
import { createGradientPixels, wasModified, clonePixels } from './test-utils';

describe('clarity', () => {
  test('enhances local contrast', () => {
    const pixels = createGradientPixels(20, 20);
    const orig = clonePixels(pixels);
    const result = clarity(pixels, 20, 20, 50);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('amount 0 = minimal change', () => {
    const pixels = createGradientPixels(20, 20);
    const orig = clonePixels(pixels);
    const result = clarity(pixels, 20, 20, 0);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff / result.length).toBeLessThan(1);
  });
});
