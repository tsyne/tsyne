import { grayscale } from './grayscale';
import { createNamedColorGrid, getPixel, blockCenter, toGray } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('grayscale', () => {
  test('magenta → gray ~105', () => {
    const { pixels, width } = createNamedColorGrid();
    grayscale(pixels);
    const p = getPixel(pixels, width, ...at(1, 1));
    expect(p.r).toBe(p.g);
    expect(Math.abs(p.r - toGray(255, 0, 255))).toBeLessThan(2);
  });

  test('red → gray ~76', () => {
    const { pixels, width } = createNamedColorGrid();
    grayscale(pixels);
    expect(Math.abs(getPixel(pixels, width, ...at(0, 0)).r - 76)).toBeLessThan(2);
  });

  test('green → gray ~150', () => {
    const { pixels, width } = createNamedColorGrid();
    grayscale(pixels);
    expect(Math.abs(getPixel(pixels, width, ...at(1, 0)).r - 150)).toBeLessThan(2);
  });

  test('blue → gray ~29', () => {
    const { pixels, width } = createNamedColorGrid();
    grayscale(pixels);
    expect(Math.abs(getPixel(pixels, width, ...at(2, 0)).r - 29)).toBeLessThan(2);
  });

  test('gray50 stays ~128', () => {
    const { pixels, width } = createNamedColorGrid();
    grayscale(pixels);
    expect(Math.abs(getPixel(pixels, width, ...at(2, 2)).r - 128)).toBeLessThan(2);
  });
});
