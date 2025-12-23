import { circularScreen } from './circular-screen';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('circularScreen', () => {
  test('creates circular pattern', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    circularScreen(pixels, width, height, 5);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('only black and white output', () => {
    const { pixels, width, height } = createNamedColorGrid();
    circularScreen(pixels, width, height, 5);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i] === 0 || pixels[i] === 255).toBe(true);
    }
  });
});
