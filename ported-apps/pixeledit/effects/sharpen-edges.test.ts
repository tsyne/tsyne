import { sharpenEdges } from './sharpen-edges';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('sharpenEdges', () => {
  test('sharpens edge areas', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = sharpenEdges(pixels, width, height, 100);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('higher threshold = less modification', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const resultLow = sharpenEdges(pixels, width, height, 100, 10);
    const resultHigh = sharpenEdges(pixels, width, height, 100, 200);
    let diffLow = 0, diffHigh = 0;
    for (let i = 0; i < pixels.length; i++) {
      diffLow += Math.abs(resultLow[i] - pixels[i]);
      diffHigh += Math.abs(resultHigh[i] - pixels[i]);
    }
    expect(diffHigh).toBeLessThanOrEqual(diffLow);
  });
});
