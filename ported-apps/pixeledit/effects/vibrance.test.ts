import { vibrance } from './vibrance';
import { createNamedColorGrid, clonePixels, wasModified } from './test-utils';

describe('vibrance', () => {
  test('modifies colors', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    vibrance(pixels, 50);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('amount 0 = minimal change', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    vibrance(pixels, 0);
    let diff = 0;
    for (let i = 0; i < pixels.length; i++) diff += Math.abs(pixels[i] - orig[i]);
    expect(diff / pixels.length).toBeLessThan(1);
  });
});
