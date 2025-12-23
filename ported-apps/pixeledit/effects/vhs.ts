import { filmGrain } from './film-grain';
import { scanlines } from './scanlines';
import { chromaticAberration } from './chromatic-aberration';

/** VHS effect (noise + scanlines + color shift) */
export function vhs(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // Add noise
  filmGrain(pixels, 40);

  // Add scanlines
  scanlines(pixels, width, height, 3, 20);

  // Chromatic aberration
  const result = chromaticAberration(pixels, width, height, 2);

  // Color shift (reduce green slightly)
  for (let i = 0; i < result.length; i += 4) {
    result[i + 1] = Math.max(0, result[i + 1] - 10);
  }

  return result;
}
