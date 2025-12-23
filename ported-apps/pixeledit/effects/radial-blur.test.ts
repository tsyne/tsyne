import { radialBlur } from './radial-blur';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('radialBlur', () => {
  test('blurs away from center', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = radialBlur(pixels, width, height, 10);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('center has less blur than edges', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = radialBlur(pixels, width, height, 20);
    // Center should be closer to original than corners
    const centerIdx = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
    const cornerIdx = 0;
    const centerDiff = Math.abs(result[centerIdx] - pixels[centerIdx]);
    const cornerDiff = Math.abs(result[cornerIdx] - pixels[cornerIdx]);
    expect(centerDiff).toBeLessThanOrEqual(cornerDiff + 10);
  });
});
