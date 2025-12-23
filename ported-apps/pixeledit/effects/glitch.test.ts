import { glitch } from './glitch';
import { createNamedColorGrid, clonePixels, wasModified } from './test-utils';

describe('glitch', () => {
  test('intensity 0 = no change', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    glitch(pixels, width, height, 0);
    expect(wasModified(orig, pixels)).toBe(false);
  });

  test('high intensity modifies image (probabilistic)', () => {
    let modified = false;
    for (let i = 0; i < 5; i++) {
      const { pixels, width, height } = createNamedColorGrid();
      const orig = clonePixels(pixels);
      glitch(pixels, width, height, 50);
      if (wasModified(orig, pixels)) { modified = true; break; }
    }
    expect(modified).toBe(true);
  });
});
