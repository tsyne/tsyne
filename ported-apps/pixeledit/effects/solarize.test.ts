import { solarize } from './solarize';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('solarize', () => {
  test('red (255,0,0) → (0,0,0)', () => {
    const { pixels, width } = createNamedColorGrid();
    solarize(pixels, 128);
    expect(getPixel(pixels, width, ...at(0, 0))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('black unchanged', () => {
    const { pixels, width } = createNamedColorGrid();
    solarize(pixels, 128);
    expect(getPixel(pixels, width, ...at(0, 2))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('gray50 (128) unchanged', () => {
    const { pixels, width } = createNamedColorGrid();
    solarize(pixels, 128);
    expect(getPixel(pixels, width, ...at(2, 2))).toEqual({ r: 128, g: 128, b: 128, a: 255 });
  });

  test('white → black', () => {
    const { pixels, width } = createNamedColorGrid();
    solarize(pixels, 128);
    expect(getPixel(pixels, width, ...at(0, 3))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });
});
