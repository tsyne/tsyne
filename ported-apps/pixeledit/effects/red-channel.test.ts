import { redChannel } from './red-channel';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('redChannel', () => {
  test('magenta → red only', () => {
    const { pixels, width } = createNamedColorGrid();
    redChannel(pixels);
    expect(getPixel(pixels, width, ...at(1, 1))).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  test('green → black', () => {
    const { pixels, width } = createNamedColorGrid();
    redChannel(pixels);
    expect(getPixel(pixels, width, ...at(1, 0))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('yellow → red', () => {
    const { pixels, width } = createNamedColorGrid();
    redChannel(pixels);
    expect(getPixel(pixels, width, ...at(3, 0))).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });
});
