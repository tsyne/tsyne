import { ripple } from './ripple';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('ripple', () => {
  test('creates wave distortion', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = ripple(pixels, width, height, 5, 20);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('amplitude 0 = no change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = ripple(pixels, width, height, 0, 20);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff).toBe(0);
  });
});
