import { pinch } from './pinch';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('pinch', () => {
  test('distorts image inward', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = pinch(pixels, width, height, 50);
    expect(wasModified(orig, result)).toBe(true);
  });
});
