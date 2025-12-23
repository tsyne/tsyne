import { crossProcess } from './cross-process';
import { createNamedColorGrid, clonePixels, wasModified } from './test-utils';

describe('crossProcess', () => {
  test('modifies colors', () => {
    const { pixels } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    crossProcess(pixels);
    expect(wasModified(orig, pixels)).toBe(true);
  });

  test('boosts blue channel', () => {
    const { pixels } = createNamedColorGrid();
    const origBlue = pixels[2]; // First pixel blue
    crossProcess(pixels);
    expect(pixels[2]).toBeGreaterThan(origBlue);
  });
});
