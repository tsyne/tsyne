import { invert } from './invert';
import { createNamedColorGrid, getPixel, blockCenter, clonePixels } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('invert', () => {
  test('magenta → green', () => {
    const { pixels, width } = createNamedColorGrid();
    invert(pixels);
    expect(getPixel(pixels, width, ...at(1, 1))).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  });

  test('black → white', () => {
    const { pixels, width } = createNamedColorGrid();
    invert(pixels);
    expect(getPixel(pixels, width, ...at(0, 2))).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  test('cyan → red', () => {
    const { pixels, width } = createNamedColorGrid();
    invert(pixels);
    expect(getPixel(pixels, width, ...at(0, 1))).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  test('double invert = original', () => {
    const { pixels, width } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    invert(pixels);
    invert(pixels);
    expect(getPixel(pixels, width, 5, 5)).toEqual(getPixel(orig, width, 5, 5));
  });
});
