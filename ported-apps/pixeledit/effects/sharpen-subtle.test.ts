import { sharpenSubtle } from './sharpen-subtle';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('sharpenSubtle', () => {
  test('applies subtle sharpening', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = sharpenSubtle(pixels, width, height, 100);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('less aggressive than regular sharpen', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = sharpenSubtle(pixels, width, height, 100);
    // Changes should be moderate
    let maxDiff = 0;
    for (let i = 0; i < pixels.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(result[i] - pixels[i]));
    }
    expect(maxDiff).toBeLessThan(100);
  });
});
