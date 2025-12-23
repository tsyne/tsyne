import { saturation } from './saturation';
import { createNamedColorGrid, getPixel, blockCenter, clonePixels, wasModified } from './test-utils';

describe('saturation', () => {
  test('increases color intensity', () => {
    const { pixels, width } = createNamedColorGrid();
    const orig = clonePixels(pixels);

    saturation(pixels, 50);

    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('gray stays gray (no color to saturate)', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(2, 2); // gray50

    saturation(pixels, 100);

    const p = getPixel(pixels, width, x, y);
    expect(p.r).toBe(p.g);
    expect(p.g).toBe(p.b);
  });

  test('-100 desaturates to grayscale', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(0, 0); // red

    saturation(pixels, -100);

    const p = getPixel(pixels, width, x, y);
    expect(Math.abs(p.r - p.g)).toBeLessThan(2);
    expect(Math.abs(p.g - p.b)).toBeLessThan(2);
  });
});
