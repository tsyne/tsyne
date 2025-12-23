import { displacementMap, generateNoiseMap } from './displacement-map';
import { createNamedColorGrid, wasModified, clonePixels, createPixels } from './test-utils';

describe('displacementMap', () => {
  test('displaces pixels based on map', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const map = generateNoiseMap(width, height, 5);
    const orig = clonePixels(pixels);
    const result = displacementMap(pixels, width, height, map, 10, 10);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('neutral map (128,128) = no displacement', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const map = createPixels(width, height, { r: 128, g: 128, b: 128 });
    const orig = clonePixels(pixels);
    const result = displacementMap(pixels, width, height, map, 10, 10);
    let diff = 0;
    for (let i = 0; i < result.length; i++) diff += Math.abs(result[i] - orig[i]);
    expect(diff).toBe(0);
  });
});

describe('generateNoiseMap', () => {
  test('creates noise pattern', () => {
    const map = generateNoiseMap(40, 40, 5);
    expect(map.length).toBe(40 * 40 * 4);
    // Should have variation
    let hasVariation = false;
    for (let i = 4; i < map.length; i += 4) {
      if (map[i] !== map[0]) hasVariation = true;
    }
    expect(hasVariation).toBe(true);
  });
});
