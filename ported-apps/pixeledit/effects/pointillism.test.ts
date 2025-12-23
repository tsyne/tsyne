import { pointillism } from './pointillism';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('pointillism', () => {
  test('creates dot pattern', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = pointillism(pixels, width, height, 4, 30);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('higher density = more dots', () => {
    const { pixels: p1, width, height } = createNamedColorGrid();
    const { pixels: p2 } = createNamedColorGrid();
    const r1 = pointillism(p1, width, height, 3, 10);
    const r2 = pointillism(p2, width, height, 3, 50);
    // Higher density should have fewer white pixels remaining
    let white1 = 0, white2 = 0;
    for (let i = 0; i < r1.length; i += 4) {
      if (r1[i] === 255 && r1[i + 1] === 255 && r1[i + 2] === 255) white1++;
      if (r2[i] === 255 && r2[i + 1] === 255 && r2[i + 2] === 255) white2++;
    }
    expect(white2).toBeLessThanOrEqual(white1);
  });
});
