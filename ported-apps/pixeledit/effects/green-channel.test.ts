import { greenChannel } from './green-channel';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('greenChannel', () => {
  test('yellow → green only', () => {
    const { pixels, width } = createNamedColorGrid();
    greenChannel(pixels);
    expect(getPixel(pixels, width, ...at(3, 0))).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  });

  test('red → black', () => {
    const { pixels, width } = createNamedColorGrid();
    greenChannel(pixels);
    expect(getPixel(pixels, width, ...at(0, 0))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test('cyan → green', () => {
    const { pixels, width } = createNamedColorGrid();
    greenChannel(pixels);
    expect(getPixel(pixels, width, ...at(0, 1))).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  });
});
