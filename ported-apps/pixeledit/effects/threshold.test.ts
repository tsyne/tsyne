import { threshold } from './threshold';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('threshold', () => {
  test('white stays white', () => {
    const { pixels, width } = createNamedColorGrid();
    threshold(pixels, 128);
    expect(getPixel(pixels, width, ...at(0, 3))).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  test('black stays black', () => {
    const { pixels, width } = createNamedColorGrid();
    threshold(pixels, 128);
    expect(getPixel(pixels, width, ...at(0, 2))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('green (luma ~150) → white', () => {
    const { pixels, width } = createNamedColorGrid();
    threshold(pixels, 128);
    expect(getPixel(pixels, width, ...at(1, 0))).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  test('blue (luma ~29) → black', () => {
    const { pixels, width } = createNamedColorGrid();
    threshold(pixels, 128);
    expect(getPixel(pixels, width, ...at(2, 0))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('all pixels are 0 or 255', () => {
    const { pixels } = createNamedColorGrid();
    threshold(pixels, 128);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i] === 0 || pixels[i] === 255).toBe(true);
    }
  });
});
