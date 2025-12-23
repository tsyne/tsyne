import { swirl } from './swirl';
import { createNamedColorGrid, getPixel, clonePixels, wasModified } from './test-utils';

describe('swirl', () => {
  test('returns new array', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = swirl(pixels, width, height, 1);
    expect(result).not.toBe(pixels);
  });

  test('modifies center region', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = swirl(pixels, width, height, 2);
    expect(wasModified(pixels, result)).toBe(true);
  });

  test('strength 0 = minimal change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = swirl(pixels, width, height, 0);
    // Center should be largely unchanged
    const origCenter = getPixel(pixels, width, 20, 20);
    const newCenter = getPixel(result, width, 20, 20);
    expect(Math.abs(origCenter.r - newCenter.r)).toBeLessThan(10);
  });

  test('corners unchanged (outside swirl radius)', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const origCorner = getPixel(pixels, width, 0, 0);
    const result = swirl(pixels, width, height, 2);
    expect(getPixel(result, width, 0, 0)).toEqual(origCorner);
  });
});
