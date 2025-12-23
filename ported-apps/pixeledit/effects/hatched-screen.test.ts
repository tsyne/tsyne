import { hatchedScreen } from './hatched-screen';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('hatchedScreen', () => {
  test('creates hatched pattern', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    hatchedScreen(pixels, width, height, 4);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('only black and white output', () => {
    const { pixels, width, height } = createNamedColorGrid();
    hatchedScreen(pixels, width, height, 4);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i] === 0 || pixels[i] === 255).toBe(true);
    }
  });
});
