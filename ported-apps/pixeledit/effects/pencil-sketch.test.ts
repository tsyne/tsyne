import { pencilSketch } from './pencil-sketch';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('pencilSketch', () => {
  test('creates sketch effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = pencilSketch(pixels, width, height);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('output is mostly light (inverted edges)', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = pencilSketch(pixels, width, height);
    let lightPixels = 0;
    for (let i = 0; i < result.length; i += 4) {
      if (result[i] > 128) lightPixels++;
    }
    expect(lightPixels).toBeGreaterThan(result.length / 8);
  });
});
