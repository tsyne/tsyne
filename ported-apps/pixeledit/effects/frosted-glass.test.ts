import { frostedGlass } from './frosted-glass';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('frostedGlass', () => {
  test('scrambles pixels', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = frostedGlass(pixels, width, height, 5);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('amount 0 = minimal change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = frostedGlass(pixels, width, height, 0);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff / result.length).toBeLessThan(1);
  });
});
