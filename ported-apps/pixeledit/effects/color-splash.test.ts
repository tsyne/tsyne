import { colorSplash } from './color-splash';
import { createNamedColorGrid, getPixel, blockCenter, wasModified, clonePixels } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('colorSplash', () => {
  test('keeps target color', () => {
    const { pixels, width } = createNamedColorGrid();
    // Keep red (255, 0, 0)
    colorSplash(pixels, 255, 0, 0, 50);
    const red = getPixel(pixels, width, ...at(0, 0));
    expect(red.r).toBe(255);
    expect(red.g).toBe(0);
    expect(red.b).toBe(0);
  });

  test('desaturates non-target colors', () => {
    const { pixels, width } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    // Keep red, green should become gray
    colorSplash(pixels, 255, 0, 0, 50);
    const green = getPixel(pixels, width, ...at(1, 0));
    expect(green.r).toBe(green.g);
    expect(green.g).toBe(green.b);
    expect(wasModified(orig, pixels)).toBe(true);
  });
});
