import { normalize } from './normalize';
import { createPixels, getPixel } from './test-utils';

describe('normalize', () => {
  test('stretches contrast to full range', () => {
    // Create low-contrast image (50-150 range)
    const pixels = createPixels(10, 10, { r: 100, g: 100, b: 100 });
    pixels[0] = 50; pixels[1] = 50; pixels[2] = 50;
    pixels[4] = 150; pixels[5] = 150; pixels[6] = 150;
    normalize(pixels);
    // Should now span 0-255
    expect(getPixel(pixels, 10, 0, 0).r).toBe(0);
    expect(getPixel(pixels, 10, 1, 0).r).toBe(255);
  });

  test('uniform image stays uniform', () => {
    const pixels = createPixels(10, 10, { r: 128, g: 128, b: 128 });
    normalize(pixels);
    // All same value → all become 0 (min = max case)
    const p = getPixel(pixels, 10, 5, 5);
    expect(p.r).toBe(p.g);
  });
});
