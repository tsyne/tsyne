import { tint } from './tint';
import { createNamedColorGrid, getPixel, blockCenter, clonePixels, wasModified } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('tint', () => {
  test('strength 0 = no change', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    tint(pixels, 255, 0, 0, 0);
    expect(wasModified(orig, pixels)).toBe(false);
  });

  test('red tint shifts toward red', () => {
    const { pixels, width } = createNamedColorGrid();
    const before = getPixel(pixels, width, ...at(2, 2)).r;
    tint(pixels, 255, 0, 0, 50);
    expect(getPixel(pixels, width, ...at(2, 2)).r).toBeGreaterThan(before);
  });
});
