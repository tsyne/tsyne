import { scanlines } from './scanlines';
import { vignette } from './vignette';
import { chromaticAberration } from './chromatic-aberration';

/** CRT effect (scanlines + vignette + chromatic aberration) */
export function crt(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  // Apply scanlines
  scanlines(pixels, width, height, 2, 30);

  // Apply vignette
  vignette(pixels, width, height, 0.4);

  // Add slight chromatic aberration
  return chromaticAberration(pixels, width, height, 1);
}
