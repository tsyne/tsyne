import { cartoon } from './cartoon';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('cartoon', () => {
  test('creates cartoon effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = cartoon(pixels, width, height, 5, 50);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('fewer levels = more posterized', () => {
    const { pixels: pixels1, width, height } = createNamedColorGrid();
    const { pixels: pixels2 } = createNamedColorGrid();
    const result1 = cartoon(pixels1, width, height, 3, 50);
    const result2 = cartoon(pixels2, width, height, 10, 50);
    // Fewer levels should have fewer unique colors
    const unique1 = new Set<string>();
    const unique2 = new Set<string>();
    for (let i = 0; i < result1.length; i += 4) {
      unique1.add(`${result1[i]},${result1[i + 1]},${result1[i + 2]}`);
      unique2.add(`${result2[i]},${result2[i + 1]},${result2[i + 2]}`);
    }
    expect(unique1.size).toBeLessThanOrEqual(unique2.size);
  });
});
