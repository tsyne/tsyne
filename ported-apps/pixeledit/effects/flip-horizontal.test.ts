import { flipHorizontal } from './flip-horizontal';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('flipHorizontal', () => {
  test('red at col 0 → col 3', () => {
    const { pixels, width, height } = createNamedColorGrid();
    flipHorizontal(pixels, width, height);
    expect(getPixel(pixels, width, ...at(3, 0))).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  test('blue at col 2 → col 1', () => {
    const { pixels, width, height } = createNamedColorGrid();
    flipHorizontal(pixels, width, height);
    expect(getPixel(pixels, width, ...at(1, 0))).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  });

  test('double flip = original', () => {
    const { pixels, width, height } = createNamedColorGrid();
    flipHorizontal(pixels, width, height);
    flipHorizontal(pixels, width, height);
    expect(getPixel(pixels, width, ...at(0, 0))).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });
});
