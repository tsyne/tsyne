import { zoomBlur } from './zoom-blur';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('zoomBlur', () => {
  test('creates zoom blur effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = zoomBlur(pixels, width, height, 20);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('amount 0 = minimal change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = zoomBlur(pixels, width, height, 0);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff / result.length).toBeLessThan(1);
  });
});
