import { blueChannel } from './blue-channel';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('blueChannel', () => {
  test('purple → blue only', () => {
    const { pixels, width } = createNamedColorGrid();
    blueChannel(pixels);
    expect(getPixel(pixels, width, ...at(3, 1))).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  });

  test('red → black', () => {
    const { pixels, width } = createNamedColorGrid();
    blueChannel(pixels);
    expect(getPixel(pixels, width, ...at(0, 0))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('magenta → blue', () => {
    const { pixels, width } = createNamedColorGrid();
    blueChannel(pixels);
    expect(getPixel(pixels, width, ...at(1, 1))).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  });
});
