import { blur } from './blur';

/** Bloom effect - glow on bright areas */
export function bloom(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  intensity: number,
  radius: number
): Uint8ClampedArray {
  // Extract bright areas
  const bright = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    if (lum > threshold) {
      bright[i] = pixels[i];
      bright[i + 1] = pixels[i + 1];
      bright[i + 2] = pixels[i + 2];
    }
    bright[i + 3] = 255;
  }

  // Blur the bright areas
  const blurred = blur(bright, width, height, radius);

  // Blend with original
  const output = new Uint8ClampedArray(pixels.length);
  const factor = intensity / 100;

  for (let i = 0; i < pixels.length; i += 4) {
    output[i] = Math.min(255, pixels[i] + blurred[i] * factor);
    output[i + 1] = Math.min(255, pixels[i + 1] + blurred[i + 1] * factor);
    output[i + 2] = Math.min(255, pixels[i + 2] + blurred[i + 2] * factor);
    output[i + 3] = pixels[i + 3];
  }

  return output;
}
