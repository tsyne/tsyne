import { cmykHalftone } from './cmyk-halftone';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('cmykHalftone', () => {
  test('creates CMYK dot pattern', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = cmykHalftone(pixels, width, height, 5);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('preserves some color information', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = cmykHalftone(pixels, width, height, 4);
    // Should have variety of colors, not just black and white
    const colors = new Set<string>();
    for (let i = 0; i < result.length; i += 4) {
      colors.add(`${result[i]},${result[i + 1]},${result[i + 2]}`);
    }
    expect(colors.size).toBeGreaterThan(2);
  });
});
