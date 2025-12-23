import { bloom } from './bloom';
import { createNamedColorGrid, wasModified, clonePixels, getPixel, blockCenter } from './test-utils';

const at = (c: number, r: number) => { const { x, y } = blockCenter(c, r); return [x, y] as const; };

describe('bloom', () => {
  test('adds glow to bright areas', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = bloom(pixels, width, height, 200, 50, 3);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('white areas bloom', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = bloom(pixels, width, height, 200, 80, 5);
    // Area near white should have some bloom spillover
    const nearWhite = getPixel(result, width, ...at(0, 3));
    expect(nearWhite.r).toBeGreaterThanOrEqual(200);
  });
});
