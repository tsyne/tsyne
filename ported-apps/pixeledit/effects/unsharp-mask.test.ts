import { unsharpMask } from './unsharp-mask';
import { createGradientPixels, wasModified, clonePixels } from './test-utils';

describe('unsharpMask', () => {
  test('sharpens image', () => {
    const pixels = createGradientPixels(20, 20);
    const orig = clonePixels(pixels);
    const result = unsharpMask(pixels, 20, 20, 1.5, 2);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('amount 0 = minimal change', () => {
    const pixels = createGradientPixels(20, 20);
    const orig = clonePixels(pixels);
    const result = unsharpMask(pixels, 20, 20, 0, 2);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff / result.length).toBeLessThan(1);
  });
});
