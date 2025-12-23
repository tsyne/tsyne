import { dither } from './dither';
import { createNamedColorGrid, clonePixels, wasModified } from './test-utils';

describe('dither', () => {
  test('produces only black and white pixels', () => {
    const { pixels, width, height } = createNamedColorGrid();
    dither(pixels, width, height);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i] === 0 || pixels[i] === 255).toBe(true);
    }
  });

  test('modifies image', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    dither(pixels, width, height);
    expect(wasModified(orig, pixels)).toBe(true);
  });
});
