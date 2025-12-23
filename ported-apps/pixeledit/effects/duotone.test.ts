import { duotone } from './duotone';
import { createNamedColorGrid, getPixel, blockCenter, wasModified, clonePixels } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('duotone', () => {
  test('black → dark color', () => {
    const { pixels, width } = createNamedColorGrid();
    // Blue to yellow duotone
    duotone(pixels, 0, 0, 255, 255, 255, 0);
    const black = getPixel(pixels, width, ...at(0, 2));
    expect(black.b).toBeGreaterThan(200); // Close to dark color (blue)
  });

  test('white → light color', () => {
    const { pixels, width } = createNamedColorGrid();
    // Blue to yellow duotone
    duotone(pixels, 0, 0, 255, 255, 255, 0);
    const white = getPixel(pixels, width, ...at(0, 3));
    expect(white.r).toBeGreaterThan(200); // Close to light color (yellow)
  });

  test('modifies image', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    duotone(pixels, 50, 0, 100, 255, 200, 150);
    expect(wasModified(orig, pixels)).toBe(true);
  });
});
