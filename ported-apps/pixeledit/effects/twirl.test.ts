import { twirl } from './twirl';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('twirl', () => {
  test('creates twirl distortion', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = twirl(pixels, width, height, 180);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('angle 0 = no change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = twirl(pixels, width, height, 0);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff).toBe(0);
  });
});
