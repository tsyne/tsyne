import { thermal } from './thermal';
import { createNamedColorGrid, getPixel, blockCenter, clonePixels, wasModified } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('thermal', () => {
  test('modifies image', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    thermal(pixels);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('black → blue', () => {
    const { pixels, width } = createNamedColorGrid();
    thermal(pixels);
    const p = getPixel(pixels, width, ...at(0, 2));
    expect(p.b).toBe(255);
    expect(p.r).toBe(0);
  });

  test('white → red', () => {
    const { pixels, width } = createNamedColorGrid();
    thermal(pixels);
    const p = getPixel(pixels, width, ...at(0, 3));
    expect(p.r).toBe(255);
  });
});
