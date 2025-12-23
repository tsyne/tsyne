import { posterize } from './posterize';
import { createNamedColorGrid, getPixel, blockCenter, clonePixels, wasModified } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('posterize', () => {
  test('reduces color levels', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    posterize(pixels, 4);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('level 2 produces only 0 or 255', () => {
    const { pixels } = createNamedColorGrid();
    posterize(pixels, 2);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i] === 0 || pixels[i] === 255).toBe(true);
    }
  });

  test('black stays black', () => {
    const { pixels, width } = createNamedColorGrid();
    posterize(pixels, 4);
    expect(getPixel(pixels, width, ...at(0, 2))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('white stays white', () => {
    const { pixels, width } = createNamedColorGrid();
    posterize(pixels, 4);
    expect(getPixel(pixels, width, ...at(0, 3))).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });
});
