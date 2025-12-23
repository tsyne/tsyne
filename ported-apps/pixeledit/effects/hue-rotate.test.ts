import { hueRotate } from './hue-rotate';
import { createNamedColorGrid, getPixel, blockCenter, clonePixels, wasModified } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('hueRotate', () => {
  test('shifts colors', () => {
    const { pixels, width } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    hueRotate(pixels, 120);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('360° ≈ original', () => {
    const { pixels, width } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    hueRotate(pixels, 360);
    const p1 = getPixel(orig, width, ...at(0, 0));
    const p2 = getPixel(pixels, width, ...at(0, 0));
    expect(Math.abs(p1.r - p2.r)).toBeLessThan(5);
  });

  test('gray unchanged', () => {
    const { pixels, width } = createNamedColorGrid();
    hueRotate(pixels, 90);
    const p = getPixel(pixels, width, ...at(2, 2));
    expect(Math.abs(p.r - p.g)).toBeLessThan(5);
    expect(Math.abs(p.g - p.b)).toBeLessThan(5);
  });
});
