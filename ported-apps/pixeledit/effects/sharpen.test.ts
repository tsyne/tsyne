import { sharpen } from './sharpen';
import { createNamedColorGrid, clonePixels, wasModified } from './test-utils';

describe('sharpen', () => {
  test('returns new array', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = sharpen(pixels, width, height, 50);
    expect(result).not.toBe(pixels);
  });

  test('modifies edge pixels', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = sharpen(pixels, width, height, 100);
    expect(wasModified(pixels, result)).toBe(true);
  });

  test('amount 0 ≈ original', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = sharpen(pixels, width, height, 0);
    // Should be very close to original
    let diff = 0;
    for (let i = 0; i < pixels.length; i++) diff += Math.abs(pixels[i] - result[i]);
    expect(diff / pixels.length).toBeLessThan(1);
  });
});
