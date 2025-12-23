import { sepia } from './sepia';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

describe('sepia', () => {
  test('gray50 becomes warm-tinted (R > G > B)', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(2, 2);

    sepia(pixels);

    const p = getPixel(pixels, width, x, y);
    expect(p.r).toBeGreaterThan(p.g);
    expect(p.g).toBeGreaterThan(p.b);
  });

  test('white stays mostly white', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(0, 3);

    sepia(pixels);

    const p = getPixel(pixels, width, x, y);
    expect(p.r).toBe(255);
    expect(p.g).toBeGreaterThan(200);
  });

  test('black stays black', () => {
    const { pixels, width } = createNamedColorGrid();
    const { x, y } = blockCenter(0, 2);

    sepia(pixels);

    expect(getPixel(pixels, width, x, y)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });
});
