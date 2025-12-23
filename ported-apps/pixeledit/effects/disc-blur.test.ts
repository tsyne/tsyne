import { discBlur } from './disc-blur';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('discBlur', () => {
  test('blurs image', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = discBlur(pixels, width, height, 3);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('larger radius = more blur', () => {
    const { pixels: p1, width, height } = createNamedColorGrid();
    const { pixels: p2 } = createNamedColorGrid();
    const r1 = discBlur(p1, width, height, 2);
    const r2 = discBlur(p2, width, height, 5);
    // Larger radius should produce more averaging
    let var1 = 0, var2 = 0;
    for (let i = 0; i < 100; i += 4) {
      var1 += Math.abs(r1[i] - r1[i + 4] || 0);
      var2 += Math.abs(r2[i] - r2[i + 4] || 0);
    }
    expect(var2).toBeLessThanOrEqual(var1 + 20);
  });
});
