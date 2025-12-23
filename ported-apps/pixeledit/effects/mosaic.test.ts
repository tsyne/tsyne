import { mosaic } from './mosaic';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('mosaic', () => {
  test('creates mosaic effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = mosaic(pixels, width, height, 10);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('larger cells = fewer unique regions', () => {
    const { pixels: p1, width, height } = createNamedColorGrid();
    const { pixels: p2 } = createNamedColorGrid();
    const r1 = mosaic(p1, width, height, 5);
    const r2 = mosaic(p2, width, height, 15);
    // Larger cells should produce fewer distinct color regions
    const unique1 = new Set<string>();
    const unique2 = new Set<string>();
    for (let i = 0; i < r1.length; i += 4) {
      unique1.add(`${r1[i]},${r1[i + 1]},${r1[i + 2]}`);
      unique2.add(`${r2[i]},${r2[i + 1]},${r2[i + 2]}`);
    }
    expect(unique2.size).toBeLessThanOrEqual(unique1.size);
  });
});
