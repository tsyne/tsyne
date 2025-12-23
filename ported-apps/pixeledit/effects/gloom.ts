import { blur } from './blur';

/** Gloom effect - darkening and muting, opposite of bloom */
export function gloom(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  intensity: number,
  radius: number
): Uint8ClampedArray {
  // Extract dark areas
  const dark = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    if (lum < threshold) {
      dark[i] = 255 - pixels[i];
      dark[i + 1] = 255 - pixels[i + 1];
      dark[i + 2] = 255 - pixels[i + 2];
    }
    dark[i + 3] = 255;
  }

  // Blur the dark areas
  const blurred = blur(dark, width, height, radius);

  // Subtract from original (darken)
  const output = new Uint8ClampedArray(pixels.length);
  const factor = intensity / 100;

  for (let i = 0; i < pixels.length; i += 4) {
    output[i] = Math.max(0, pixels[i] - blurred[i] * factor);
    output[i + 1] = Math.max(0, pixels[i + 1] - blurred[i + 1] * factor);
    output[i + 2] = Math.max(0, pixels[i + 2] - blurred[i + 2] * factor);
    output[i + 3] = pixels[i + 3];
  }

  return output;
}
