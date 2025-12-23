import { blur } from './blur';
import { createNamedColorGrid, getPixel, clonePixels, wasModified } from './test-utils';

describe('blur', () => {
  test('returns new array', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = blur(pixels, width, height, 1);
    expect(result).not.toBe(pixels);
  });

  test('modifies pixel values', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = blur(pixels, width, height, 1);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('center of solid region stays same', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = blur(pixels, width, height, 1);
    // Center of red block (5,5) should still be reddish
    const p = getPixel(result, width, 5, 5);
    expect(p.r).toBeGreaterThan(200);
  });

  test('preserves array length', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = blur(pixels, width, height, 2);
    expect(result.length).toBe(pixels.length);
  });
});
