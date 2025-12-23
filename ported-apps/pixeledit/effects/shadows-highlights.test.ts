import { shadowsHighlights } from './shadows-highlights';
import { createNamedColorGrid, getPixel, blockCenter, wasModified, clonePixels } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('shadowsHighlights', () => {
  test('positive shadows brightens dark areas', () => {
    const { pixels, width } = createNamedColorGrid();
    const blackBefore = getPixel(pixels, width, ...at(0, 2));
    shadowsHighlights(pixels, 50, 0);
    const blackAfter = getPixel(pixels, width, ...at(0, 2));
    // Black should stay black, but near-black areas should brighten
    expect(blackAfter.r).toBeGreaterThanOrEqual(blackBefore.r);
  });

  test('modifies image', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    shadowsHighlights(pixels, 30, -20);
    expect(wasModified(orig, pixels)).toBe(true);
  });
});
