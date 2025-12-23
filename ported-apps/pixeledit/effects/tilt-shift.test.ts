import { tiltShift } from './tilt-shift';
import { createNamedColorGrid, wasModified, clonePixels, getPixel } from './test-utils';

describe('tiltShift', () => {
  test('creates tilt-shift effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = tiltShift(pixels, width, height, 20, 10, 3);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('focus area is sharper than blur area', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = tiltShift(pixels, width, height, 20, 10, 5);
    // Focus area (y=20) should be closer to original than blur area (y=0)
    const focusDiff = Math.abs(result[(20 * width + 20) * 4] - orig[(20 * width + 20) * 4]);
    const blurDiff = Math.abs(result[(0 * width + 20) * 4] - orig[(0 * width + 20) * 4]);
    expect(focusDiff).toBeLessThanOrEqual(blurDiff + 10);
  });
});
