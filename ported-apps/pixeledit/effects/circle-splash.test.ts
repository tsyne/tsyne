import { circleSplash } from './circle-splash';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('circleSplash', () => {
  test('creates splash distortion', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = circleSplash(pixels, width, height, undefined, undefined, 50);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('strength 0 = minimal change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = circleSplash(pixels, width, height, undefined, undefined, 0);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff / result.length).toBeLessThan(1);
  });
});
