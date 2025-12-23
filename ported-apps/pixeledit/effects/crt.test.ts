import { crt } from './crt';
import { createNamedColorGrid, wasModified, clonePixels } from './test-utils';

describe('crt', () => {
  test('applies crt effect', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const orig = clonePixels(pixels);
    const result = crt(pixels, width, height);
    expect(wasModified(orig, result)).toBe(true);
  });

  test('corners are darker (vignette)', () => {
    const { pixels, width, height } = createNamedColorGrid();
    const result = crt(pixels, width, height);
    // Compare corner brightness to center brightness
    const cornerIdx = 0;
    const centerIdx = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
    const cornerBright = result[cornerIdx] + result[cornerIdx + 1] + result[cornerIdx + 2];
    const centerBright = result[centerIdx] + result[centerIdx + 1] + result[centerIdx + 2];
    expect(cornerBright).toBeLessThanOrEqual(centerBright + 100);
  });
});
