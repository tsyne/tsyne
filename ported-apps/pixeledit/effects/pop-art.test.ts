import { popArt } from './pop-art';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('popArt', () => {
  test('creates pop art effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = popArt(pixels, width, height);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('has black outlines', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = popArt(pixels, width, height);
    let blackPixels = 0;
    for (let i = 0; i < result.length; i += 4) {
      if (result[i] === 0 && result[i + 1] === 0 && result[i + 2] === 0) {
        blackPixels++;
      }
    }
    expect(blackPixels).toBeGreaterThan(0);
  });
});
