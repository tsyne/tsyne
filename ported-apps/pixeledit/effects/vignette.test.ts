import { vignette } from './vignette';
import { createNamedColorGrid, getPixel, createPixels } from './test-utils';

describe('vignette', () => {
  test('corners get darker', () => {
    // Use uniform image so we can compare corner to its original value
    const w = 40, h = 40;
    const pixels = createPixels(w, h, { r: 200, g: 200, b: 200 });
    const beforeCorner = getPixel(pixels, w, 0, 0).r;
    vignette(pixels, w, h, 0.5);
    expect(getPixel(pixels, w, 0, 0).r).toBeLessThan(beforeCorner);
  });

  test('strength 0 = no change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const beforeCorner = getPixel(pixels, width, 0, 0).r;
    vignette(pixels, width, height, 0);
    expect(getPixel(pixels, width, 0, 0).r).toBe(beforeCorner);
  });

  test('center less affected than corners', () => {
    const w = 40, h = 40;
    const pixels = createPixels(w, h, { r: 200, g: 200, b: 200 });
    vignette(pixels, w, h, 0.5);
    const corner = getPixel(pixels, w, 0, 0).r;
    const center = getPixel(pixels, w, 20, 20).r;
    expect(center).toBeGreaterThan(corner);
  });
});
