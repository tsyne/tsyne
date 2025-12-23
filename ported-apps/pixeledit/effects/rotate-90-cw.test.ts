import { rotate90CW } from './rotate-90-cw';
import { createPixels, getPixel } from './test-utils';

describe('rotate90CW', () => {
  test('swaps dimensions', () => {
    const px = createPixels(40, 80);
    const result = rotate90CW(px, 40, 80);
    expect(result.width).toBe(80);
    expect(result.height).toBe(40);
  });

  test('top-left red → top-right red', () => {
    const px = createPixels(4, 4);
    px[0] = 255; px[1] = 0; px[2] = 0; // top-left red
    const result = rotate90CW(px, 4, 4);
    expect(getPixel(result.pixels, result.width, 3, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  test('4x rotate = original', () => {
    const px = createPixels(4, 4);
    px[0] = 255; px[1] = 0; px[2] = 0;
    let r = rotate90CW(px, 4, 4);
    r = rotate90CW(r.pixels, r.width, r.height);
    r = rotate90CW(r.pixels, r.width, r.height);
    r = rotate90CW(r.pixels, r.width, r.height);
    expect(getPixel(r.pixels, r.width, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });
});
