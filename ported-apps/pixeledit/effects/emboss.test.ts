import { emboss } from './emboss';
import { createNamedColorGrid, getPixel, createPixels, wasModified } from './test-utils';

describe('emboss', () => {
  test('returns new array', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = emboss(pixels, width, height);
    expect(result).not.toBe(pixels);
  });

  test('uniform region tends toward neutral', () => {
    const pixels = createPixels(20, 20, { r: 100, g: 100, b: 100 });
    const result = emboss(pixels, 20, 20);
    const center = getPixel(result, 20, 10, 10);
    // Emboss of uniform area produces consistent values
    expect(center.r).toBe(center.g);
    expect(center.g).toBe(center.b);
  });

  test('modifies image with edges', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = emboss(pixels, width, height);
    expect(wasModified(pixels, result)).toBe(true);
  });
});
