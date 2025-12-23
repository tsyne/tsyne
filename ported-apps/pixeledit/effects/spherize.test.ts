import { spherize } from './spherize';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('spherize', () => {
  test('distorts image', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = spherize(pixels, width, height, 50);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('center is less affected than edges', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = spherize(pixels, width, height, 50);
    // Center pixel should be close to original
    const centerIdx = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
    expect(Math.abs(result[centerIdx] - pixels[centerIdx])).toBeLessThan(50);
  });
});
