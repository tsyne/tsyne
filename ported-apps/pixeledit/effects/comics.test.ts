import { comics } from './comics';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('comics', () => {
  test('creates comic book effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = comics(pixels, width, height, 4);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('has black outlines', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = comics(pixels, width, height, 4);
    let blackPixels = 0;
    for (let i = 0; i < result.length; i += 4) {
      if (result[i] === 0 && result[i + 1] === 0 && result[i + 2] === 0) {
        blackPixels++;
      }
    }
    expect(blackPixels).toBeGreaterThan(0);
  });

  test('reduces color palette', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = comics(pixels, width, height, 4);
    const uniqueColors = new Set<string>();
    for (let i = 0; i < result.length; i += 4) {
      uniqueColors.add(`${result[i]},${result[i + 1]},${result[i + 2]}`);
    }
    // Should have fewer unique colors than original due to posterization
    expect(uniqueColors.size).toBeLessThan(100);
  });
});
