import { medianFilter } from './median-filter';
import { createPixels, createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('medianFilter', () => {
  test('reduces noise', () => {
    const pixels = createPixels(20, 20, { r: 100, g: 100, b: 100 });
    // Add some noise
    pixels[0] = 255; pixels[1] = 0; pixels[2] = 255;
    const result = medianFilter(pixels, 20, 20, 1);
    // Noise should be reduced - not pure outlier values
    expect(result[0]).toBeLessThan(200);
  });

  test('modifies multicolor image', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = medianFilter(pixels, width, height, 2);
    expect(wasModified(orig, result)).toBe(true);
  });
});
