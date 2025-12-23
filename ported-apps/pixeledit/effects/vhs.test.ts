import { vhs } from './vhs';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('vhs', () => {
  test('applies vhs effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = vhs(pixels, width, height);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('reduces green channel', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = vhs(pixels, width, height);
    // Green should generally be reduced
    let greenDiff = 0;
    for (let i = 0; i < result.length; i += 4) {
      greenDiff += orig[i + 1] - result[i + 1];
    }
    expect(greenDiff).toBeGreaterThan(0);
  });
});
