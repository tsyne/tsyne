import { spinBlur } from './spin-blur';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('spinBlur', () => {
  test('creates rotational blur', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = spinBlur(pixels, width, height, 30);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('angle 0 = minimal change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = spinBlur(pixels, width, height, 0);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff / result.length).toBeLessThan(1);
  });

  test('larger angle = more blur', () => {
    const { pixels: p1, width, height } = createNamedColorGrid();
    const { pixels: p2 } = createNamedColorGrid();
    const r1 = spinBlur(p1, width, height, 10);
    const r2 = spinBlur(p2, width, height, 45);
    let diff1 = 0, diff2 = 0;
    for (let i = 0; i < p1.length; i++) {
      diff1 += Math.abs(r1[i] - p1[i]);
      diff2 += Math.abs(r2[i] - p2[i]);
    }
    expect(diff2).toBeGreaterThanOrEqual(diff1);
  });
});
