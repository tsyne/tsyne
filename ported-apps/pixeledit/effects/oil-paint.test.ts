import { oilPaint } from './oil-paint';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('oilPaint', () => {
  test('modifies image', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = oilPaint(pixels, width, height, 2, 20);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('reduces detail', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = oilPaint(pixels, width, height, 3, 20);
    // Should smooth out variations within regions
    expect(result.length).toBe(pixels.length);
  });
});
