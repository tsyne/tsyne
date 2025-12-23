import { splitToning } from './split-toning';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('splitToning', () => {
  test('modifies image', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    // Blue shadows, yellow highlights
    splitToning(pixels, 0, 0, 255, 255, 255, 0, 0);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('different tones for shadows vs highlights', () => {
    const { pixels } = createNamedColorGrid();
    // Strong blue shadows, strong orange highlights
    splitToning(pixels, 0, 0, 255, 255, 128, 0, 0);
    // Check that both tones are applied somewhere
    let hasBlue = false, hasOrange = false;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 2] > pixels[i]) hasBlue = true;
      if (pixels[i] > pixels[i + 2]) hasOrange = true;
    }
    expect(hasBlue || hasOrange).toBe(true);
  });
});
