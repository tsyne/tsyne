import { swapChannels } from './swap-channels';
import { createNamedColorGrid, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('swapChannels', () => {
  test('rgb-bgr swaps R and B', () => {
    const { pixels, width } = createNamedColorGrid();
    swapChannels(pixels, 'rgb-bgr');
    // Red (255,0,0) → Blue (0,0,255)
    expect(getPixel(pixels, width, ...at(0, 0))).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  });

  test('rgb-gbr rotates channels', () => {
    const { pixels, width } = createNamedColorGrid();
    swapChannels(pixels, 'rgb-gbr');
    // Red (255,0,0) → (0,0,255)
    expect(getPixel(pixels, width, ...at(0, 0))).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  });

  test('rgb-brg rotates channels opposite', () => {
    const { pixels, width } = createNamedColorGrid();
    swapChannels(pixels, 'rgb-brg');
    // Red (255,0,0) → (0,255,0)
    expect(getPixel(pixels, width, ...at(0, 0))).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  });
});
