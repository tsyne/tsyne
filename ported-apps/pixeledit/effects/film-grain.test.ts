import { filmGrain } from './film-grain';
import { createPixels, clonePixels, wasModified } from './test-utils';

describe('filmGrain', () => {
  test('modifies pixels (probabilistic)', () => {
    let modified = false;
    for (let i = 0; i < 5; i++) {
      const pixels = createPixels(20, 20, { r: 128, g: 128, b: 128 });
      const orig = clonePixels(pixels);
      filmGrain(pixels, 50);
      if (wasModified(orig, pixels)) { modified = true; break; }
    }
    expect(modified).toBe(true);
  });

  test('amount 0 = no change', () => {
    const pixels = createPixels(10, 10, { r: 100, g: 100, b: 100 });
    const orig = clonePixels(pixels);
    filmGrain(pixels, 0);
    expect(wasModified(orig, pixels)).toBe(false);
  });
});
