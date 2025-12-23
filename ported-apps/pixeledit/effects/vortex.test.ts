import { vortex } from './vortex';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('vortex', () => {
  test('creates spiral distortion', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = vortex(pixels, width, height, 180);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('strength 0 = no change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = vortex(pixels, width, height, 0);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff).toBe(0);
  });

  test('negative strength rotates opposite direction', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result1 = vortex(pixels, width, height, 90);
    const result2 = vortex(pixels, width, height, -90);
    let diff = 0;
    for (let i = 0; i < result1.length; i++) diff += Math.abs(result1[i] - result2[i]);
    expect(diff).toBeGreaterThan(0);
  });
});
