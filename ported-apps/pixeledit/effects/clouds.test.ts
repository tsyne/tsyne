import { clouds } from './clouds';
import { createPixels, wasModified, clonePixels } from './test-utils';

describe('clouds', () => {
  test('generates cloud pattern', () => {
    const pixels = createPixels(40, 40);
    const orig = clonePixels(pixels);
    clouds(pixels, 40, 40, 20);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('produces grayscale output', () => {
    const pixels = createPixels(40, 40);
    clouds(pixels, 40, 40, 20);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(pixels[i + 1]);
      expect(pixels[i + 1]).toBe(pixels[i + 2]);
    }
  });

  test('has variation', () => {
    const pixels = createPixels(40, 40);
    clouds(pixels, 40, 40, 20);
    let min = 255, max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      min = Math.min(min, pixels[i]);
      max = Math.max(max, pixels[i]);
    }
    expect(max - min).toBeGreaterThan(50);
  });
});
