import { gamma } from './gamma';
import { createNamedColorGrid, getPixel, blockCenter, clonePixels, wasModified } from './test-utils';

describe('gamma', () => {
  test('gamma > 1 brightens midtones (inverse correction)', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(2, 2); // gray50
    const before = getPixel(pixels, width, x, y).r;

    gamma(pixels, 2.2);

    expect(getPixel(pixels, width, x, y).r).toBeGreaterThan(before);
  });

  test('gamma < 1 darkens midtones', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(2, 2);
    const before = getPixel(pixels, width, x, y).r;

    gamma(pixels, 0.5);

    expect(getPixel(pixels, width, x, y).r).toBeLessThan(before);
  });

  test('black stays black', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(0, 2);

    gamma(pixels, 2.2);

    expect(getPixel(pixels, width, x, y)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('white stays white', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(0, 3);

    gamma(pixels, 2.2);

    expect(getPixel(pixels, width, x, y)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });
});
