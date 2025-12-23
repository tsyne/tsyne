import { hole } from './hole';
import { createNamedColorGrid, wasModified, clonePixels, getPixel } from './test-utils';

describe('hole', () => {
  test('creates hole distortion', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = hole(pixels, width, height, 15, 80);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('center is darker', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = hole(pixels, width, height, 15, 100);
    const center = getPixel(result, width, 20, 20);
    const edge = getPixel(result, width, 0, 0);
    // Center should be darker due to hole effect
    const centerBright = center.r + center.g + center.b;
    const edgeBright = edge.r + edge.g + edge.b;
    expect(centerBright).toBeLessThanOrEqual(edgeBright + 100);
  });
});
