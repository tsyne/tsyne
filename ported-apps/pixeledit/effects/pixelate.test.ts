import { pixelate } from './pixelate';
import { createNamedColorGrid, getPixel, clonePixels, wasModified, createPixels } from './test-utils';

describe('pixelate', () => {
  test('modifies gradient image', () => {
    // Create gradient for testing
    const w = 20, h = 20;
    const pixels = createPixels(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        pixels[i] = Math.floor((x / w) * 255);
      }
    }
    const orig = clonePixels(pixels);
    pixelate(pixels, w, h, 5);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('pixels in same block have same color', () => {
    const { pixels, width, height } = createNamedColorGrid();
    pixelate(pixels, width, height, 20); // Larger block spans multiple colors
    const p1 = getPixel(pixels, width, 0, 0);
    const p2 = getPixel(pixels, width, 19, 19);
    expect(p1.r).toBe(p2.r);
    expect(p1.g).toBe(p2.g);
    expect(p1.b).toBe(p2.b);
  });

  test('blockSize 1 = no change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    pixelate(pixels, width, height, 1);
    expect(wasModified(orig, pixels)).toBe(false);
  });
});
