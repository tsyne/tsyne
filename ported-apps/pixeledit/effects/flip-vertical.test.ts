import { flipVertical } from './flip-vertical';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('flipVertical', () => {
  test('red at row 0 → row 3', () => {
    const { pixels, width, height } = createNamedColorGrid();
    flipVertical(pixels, width, height);
    expect(getPixel(pixels, width, ...at(0, 3))).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  test('black at row 2 → row 1', () => {
    const { pixels, width, height } = createNamedColorGrid();
    flipVertical(pixels, width, height);
    expect(getPixel(pixels, width, ...at(0, 1))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('double flip = original', () => {
    const { pixels, width, height } = createNamedColorGrid();
    flipVertical(pixels, width, height);
    flipVertical(pixels, width, height);
    expect(getPixel(pixels, width, ...at(0, 0))).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });
});
