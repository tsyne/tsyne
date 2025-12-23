import { lightTunnel } from './light-tunnel';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('lightTunnel', () => {
  test('creates tunnel effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = lightTunnel(pixels, width, height, 50);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('rotation changes output', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result1 = lightTunnel(pixels, width, height, 50, 0);
    const result2 = lightTunnel(pixels, width, height, 50, 45);
    let diff = 0;
    for (let i = 0; i < result1.length; i++) diff += Math.abs(result1[i] - result2[i]);
    expect(diff).toBeGreaterThan(0);
  });
});
