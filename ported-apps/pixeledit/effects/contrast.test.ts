import { contrast } from './contrast';
import { createNamedColorGrid, getPixel, blockCenter, clonePixels, wasModified } from './test-utils';

describe('contrast', () => {
  test('increases difference from midpoint', () => {
    const { pixels, width } = createNamedColorGrid();
    const orig = clonePixels(pixels);

    contrast(pixels, 50);

    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('gray50 (128) stays near midpoint', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(2, 2);

    contrast(pixels, 50);

    const p = getPixel(pixels, width, x, y);
    expect(Math.abs(p.r - 128)).toBeLessThan(5);
  });

  test('white stays white at high contrast', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(0, 3); // white

    contrast(pixels, 100);

    expect(getPixel(pixels, width, x, y)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  test('black stays black at high contrast', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(0, 2); // black

    contrast(pixels, 100);

    expect(getPixel(pixels, width, x, y)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });
});
