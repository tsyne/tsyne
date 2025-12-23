import { exposure } from './exposure';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('exposure', () => {
  test('+1 stop doubles brightness', () => {
    const { pixels, width } = createNamedColorGrid();
    exposure(pixels, 1);
    // gray50 (128) * 2 = 256 → clamped to 255
    expect(getPixel(pixels, width, ...at(2, 2))).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  test('-1 stop halves brightness', () => {
    const { pixels, width } = createNamedColorGrid();
    exposure(pixels, -1);
    // gray50 (128) / 2 = 64
    expect(getPixel(pixels, width, ...at(2, 2))).toEqual({ r: 64, g: 64, b: 64, a: 255 });
  });

  test('black unchanged', () => {
    const { pixels, width } = createNamedColorGrid();
    exposure(pixels, 2);
    expect(getPixel(pixels, width, ...at(0, 2))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });
});
