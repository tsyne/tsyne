import { noise } from './noise';
import { createPixels, wasModified, clonePixels } from './test-utils';

describe('noise', () => {
  test('adds noise to image', () => {
    const pixels = createPixels(20, 20, { r: 128, g: 128, b: 128 });
    const orig = clonePixels(pixels);
    noise(pixels, 50);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('amount 0 = no change', () => {
    const pixels = createPixels(20, 20, { r: 128, g: 128, b: 128 });
    const orig = clonePixels(pixels);
    noise(pixels, 0);
    let diff = 0;
    for (let i = 0; i < pixels.length; i++) diff += Math.abs(pixels[i] - orig[i]);
    expect(diff).toBe(0);
  });
});
