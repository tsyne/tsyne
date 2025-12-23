import { rotate180 } from './rotate-180';
import { createPixels, getPixel } from './test-utils';

describe('rotate180', () => {
  test('top-left red → bottom-right red', () => {
    const px = createPixels(4, 4);
    px[0] = 255; px[1] = 0; px[2] = 0;
    rotate180(px, 4, 4);
    expect(getPixel(px, 4, 3, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  test('double rotate = original', () => {
    const px = createPixels(4, 4);
    px[0] = 255; px[1] = 0; px[2] = 0;
    rotate180(px, 4, 4);
    rotate180(px, 4, 4);
    expect(getPixel(px, 4, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });
});
