import { sharpenAggressive } from './sharpen-aggressive';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('sharpenAggressive', () => {
  test('applies strong sharpening', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = sharpenAggressive(pixels, width, height, 100);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('produces significant changes', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = sharpenAggressive(pixels, width, height, 100);
    let totalDiff = 0;
    for (let i = 0; i < pixels.length; i++) {
      totalDiff += Math.abs(result[i] - pixels[i]);
    }
    expect(totalDiff / pixels.length).toBeGreaterThan(1);
  });
});
