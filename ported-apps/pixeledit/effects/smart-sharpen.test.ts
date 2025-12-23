import { smartSharpen } from './smart-sharpen';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('smartSharpen', () => {
  test('sharpens edges', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = smartSharpen(pixels, width, height, 100, 2, 5);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('threshold prevents noise sharpening', () => {
    const { pixels, width, height } = createNamedColorGrid();
    // High threshold should result in less modification
    const resultLow = smartSharpen(pixels, width, height, 100, 2, 5);
    const resultHigh = smartSharpen(pixels, width, height, 100, 2, 100);
    let diffLow = 0, diffHigh = 0;
    for (let i = 0; i < pixels.length; i++) {
      diffLow += Math.abs(resultLow[i] - pixels[i]);
      diffHigh += Math.abs(resultHigh[i] - pixels[i]);
    }
    expect(diffHigh).toBeLessThanOrEqual(diffLow);
  });
});
