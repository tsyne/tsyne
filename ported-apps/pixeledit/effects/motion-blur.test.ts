import { motionBlur } from './motion-blur';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('motionBlur', () => {
  test('blurs along direction', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = motionBlur(pixels, width, height, 0, 5);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('distance 0 = minimal change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = motionBlur(pixels, width, height, 45, 0);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff / result.length).toBeLessThan(1);
  });
});
