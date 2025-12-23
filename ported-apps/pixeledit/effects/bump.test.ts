import { bump } from './bump';
import { createNamedColorGrid, wasModified, clonePixels, getPixel } from './test-utils';

describe('bump', () => {
  test('creates bump distortion', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = bump(pixels, width, height, 20, 20, 15, 50);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('center is affected most', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = bump(pixels, width, height, 20, 20, 15, 80);
    // Check that center region is modified
    const centerIdx = (20 * width + 20) * 4;
    const edgeIdx = (0 * width + 0) * 4;
    const centerDiff = Math.abs(result[centerIdx] - orig[centerIdx]);
    const edgeDiff = Math.abs(result[edgeIdx] - orig[edgeIdx]);
    expect(centerDiff).toBeGreaterThanOrEqual(edgeDiff);
  });
});
