import { scanlines } from './scanlines';
import { createPixels, wasModified, clonePixels } from './test-utils';

describe('scanlines', () => {
  test('adds dark lines', () => {
    const pixels = createPixels(20, 20, { r: 200, g: 200, b: 200 });
    const orig = clonePixels(pixels);
    scanlines(pixels, 20, 20, 2, 50);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('every nth line is darker', () => {
    const pixels = createPixels(20, 20, { r: 200, g: 200, b: 200 });
    scanlines(pixels, 20, 20, 2, 50);
    // Line 0 should be darker than line 1
    const idx0 = 0;
    const idx1 = 20 * 4;
    expect(pixels[idx0]).toBeLessThan(pixels[idx1]);
  });
});
