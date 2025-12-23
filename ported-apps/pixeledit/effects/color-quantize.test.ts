import { colorQuantize } from './color-quantize';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('colorQuantize', () => {
  test('reduces color count', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    colorQuantize(pixels, 8);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('fewer colors = fewer unique values', () => {
    const { pixels: p1 } = createNamedColorGrid();
    const { pixels: p2 } = createNamedColorGrid();
    colorQuantize(p1, 8);
    colorQuantize(p2, 64);
    const unique1 = new Set<string>();
    const unique2 = new Set<string>();
    for (let i = 0; i < p1.length; i += 4) {
      unique1.add(`${p1[i]},${p1[i + 1]},${p1[i + 2]}`);
      unique2.add(`${p2[i]},${p2[i + 1]},${p2[i + 2]}`);
    }
    expect(unique1.size).toBeLessThanOrEqual(unique2.size);
  });
});
