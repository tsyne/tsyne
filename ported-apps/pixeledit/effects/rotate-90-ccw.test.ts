import { rotate90CCW } from './rotate-90-ccw';
import { createPixels, getPixel } from './test-utils';

describe('rotate90CCW', () => {
  test('swaps dimensions', () => {
    const px = createPixels(40, 80);
    const result = rotate90CCW(px, 40, 80);
    expect(result.width).toBe(80);
    expect(result.height).toBe(40);
  });

  test('top-left red → bottom-left red', () => {
    const px = createPixels(4, 4);
    px[0] = 255; px[1] = 0; px[2] = 0;
    const result = rotate90CCW(px, 4, 4);
    expect(getPixel(result.pixels, result.width, 0, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  test('4x rotate = original', () => {
    const px = createPixels(4, 4);
    px[0] = 255; px[1] = 0; px[2] = 0;
    let r = rotate90CCW(px, 4, 4);
    r = rotate90CCW(r.pixels, r.width, r.height);
    r = rotate90CCW(r.pixels, r.width, r.height);
    r = rotate90CCW(r.pixels, r.width, r.height);
    expect(getPixel(r.pixels, r.width, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });
});
