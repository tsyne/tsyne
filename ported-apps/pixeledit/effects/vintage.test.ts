import { vintage } from './vintage';
import { createNamedColorGrid, getPixel, blockCenter, clonePixels, wasModified } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('vintage', () => {
  test('warms colors (R > G > B adjustment)', () => {
    const { pixels, width } = createNamedColorGrid();
    vintage(pixels);
    const p = getPixel(pixels, width, ...at(2, 2)); // was gray50
    expect(p.r).toBeGreaterThan(p.g);
    expect(p.g).toBeGreaterThan(p.b);
  });

  test('modifies image', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    vintage(pixels);
    expect(wasModified(orig, pixels)).toBe(true);
  });
});
